import { EventEmitter } from 'node:events';
import { NotFoundError, ValidationError, ConflictError } from '../lib/errors.js';
const ORDER_TYPE_MAP = {
    0: 'Buy',
    1: 'Sell',
    2: 'BuyLimit',
    3: 'SellLimit',
    4: 'BuyStop',
    5: 'SellStop',
};
// ---- Service ----
export class OrderGroupService extends EventEmitter {
    orderGroupRepo;
    accountGroupRepo;
    accountRepo;
    mt5Sdk;
    pushService;
    spreadSubscriptionRepo;
    spreadService = null;
    constructor(orderGroupRepo, accountGroupRepo, accountRepo, mt5Sdk, pushService, spreadSubscriptionRepo) {
        super();
        this.orderGroupRepo = orderGroupRepo;
        this.accountGroupRepo = accountGroupRepo;
        this.accountRepo = accountRepo;
        this.mt5Sdk = mt5Sdk;
        this.pushService = pushService;
        this.spreadSubscriptionRepo = spreadSubscriptionRepo;
    }
    setSpreadService(spreadService) {
        this.spreadService = spreadService;
    }
    async list(filter) {
        if (filter.createdDateFrom && filter.createdDateTo && filter.createdDateFrom > filter.createdDateTo) {
            throw new ValidationError('开始日期不能晚于结束日期');
        }
        const page = filter.page ?? 1;
        const pageSize = filter.pageSize ?? 20;
        const repoFilter = { ...filter, ...buildCreatedAtRangeFilter(filter), page, pageSize };
        const [groups, total] = await Promise.all([
            this.orderGroupRepo.findAllWithItems(repoFilter),
            this.orderGroupRepo.countAll(repoFilter),
        ]);
        const data = await Promise.all(groups.map((g) => this.toDto(g)));
        return { data, total, page, pageSize };
    }
    async summary(filter) {
        if (filter.createdDateFrom && filter.createdDateTo && filter.createdDateFrom > filter.createdDateTo) {
            throw new ValidationError('开始日期不能晚于结束日期');
        }
        const summary = await this.orderGroupRepo.summarize({
            ...filter,
            ...buildCreatedAtRangeFilter(filter),
        });
        return {
            ...summary,
            createdDateFrom: filter.createdDateFrom ?? null,
            createdDateTo: filter.createdDateTo ?? null,
        };
    }
    async getById(id) {
        const group = await this.orderGroupRepo.findByIdWithItems(id);
        if (!group)
            throw new NotFoundError('OrderGroup', id);
        return this.toDto(group);
    }
    async listOpenRuntimeGroups() {
        const groups = await this.orderGroupRepo.findAllWithItems({ isFullyClosed: false });
        const data = await Promise.all(groups.map((group) => this.toDto(group)));
        return data.filter((group) => shouldKeepInRuntime(group));
    }
    async create(input) {
        return this.createGroupDto(input, true);
    }
    async update(id, input) {
        const existing = await this.orderGroupRepo.findById(id);
        if (!existing)
            throw new NotFoundError('OrderGroup', id);
        if (input.accountGroupId !== undefined && input.accountGroupId !== null) {
            const ag = await this.accountGroupRepo.findById(input.accountGroupId);
            if (!ag)
                throw new ValidationError(`账号组 (id=${input.accountGroupId}) 不存在`);
        }
        const data = {};
        if (input.name !== undefined)
            data.name = input.name;
        if (input.accountGroupId !== undefined)
            data.account_group_id = input.accountGroupId;
        if (input.remark !== undefined)
            data.remark = input.remark;
        if (Object.keys(data).length > 0) {
            await this.orderGroupRepo.update(id, data);
        }
        const full = await this.orderGroupRepo.findByIdWithItems(id);
        const dto = await this.toDto(full);
        this.publishGroupState(dto);
        return dto;
    }
    async delete(id, force = false) {
        const existing = await this.orderGroupRepo.findById(id);
        if (!existing)
            throw new NotFoundError('OrderGroup', id);
        const accountGroupId = existing.account_group_id;
        if (!force) {
            const hasOpen = await this.orderGroupRepo.hasOpenItems(id);
            if (hasOpen) {
                throw new ConflictError('订单组内仍有未平仓订单，需先平仓或使用 ?force=true 强制删除');
            }
        }
        await this.orderGroupRepo.deleteById(id);
        this.emit('orderGroupRemove', {
            groupId: id,
            accountGroupId,
        });
    }
    async batchOpen(groupId, orders) {
        const group = await this.orderGroupRepo.findById(groupId);
        if (!group)
            throw new NotFoundError('OrderGroup', groupId);
        if (orders.length === 0) {
            throw new ValidationError('orders 不能为空');
        }
        const results = await Promise.allSettled(orders.map((order) => this.executeSingleOrder(groupId, order)));
        for (const result of results) {
            if (result.status === 'rejected') {
                // already handled inside executeSingleOrder via error item
            }
        }
        await this.orderGroupRepo.refreshFullyClosedStatus(groupId);
        const full = await this.orderGroupRepo.findByIdWithItems(groupId);
        const openSpread = await this.computePersistedSpread(full, 'open');
        await this.orderGroupRepo.update(groupId, { open_spread: openSpread });
        const refreshed = await this.orderGroupRepo.findByIdWithItems(groupId);
        const dto = await this.toDto(refreshed);
        if (dto.openCount > 0) {
            void Promise.resolve(this.pushService.broadcast({
                title: '订单组开仓通知',
                body: [
                    `订单组: ${dto.name} (#${dto.id})`,
                    `账号组: ${dto.accountGroupName ?? '未绑定'}`,
                    `开仓数量: ${dto.openCount}`,
                    `开仓差价: ${formatOrderGroupSpread(openSpread)}`,
                ].join('\n\n'),
                level: 'info',
                metadata: {
                    kind: 'order-group-open',
                    groupId: dto.id,
                    name: dto.name,
                    accountGroupId: dto.accountGroupId,
                    openCount: dto.openCount,
                    openSpread,
                },
            })).catch(() => {
                // keep open result fast even if outbound notification is slow
            });
        }
        this.publishGroupState(dto);
        return dto;
    }
    async batchCreate(input) {
        const groupDto = await this.createGroupDto({
            name: input.name,
            accountGroupId: input.accountGroupId,
            remark: input.remark,
        }, false);
        if (input.orders.length > 0) {
            return this.batchOpen(groupDto.id, input.orders);
        }
        this.publishGroupState(groupDto);
        return groupDto;
    }
    async batchClose(groupId, tickets, options) {
        const group = await this.orderGroupRepo.findById(groupId);
        if (!group)
            throw new NotFoundError('OrderGroup', groupId);
        let openItems = await this.orderGroupRepo.findOpenItemsByGroupId(groupId);
        if (tickets && tickets.length > 0) {
            const ticketSet = new Set(tickets);
            openItems = openItems.filter((item) => item.ticket !== null && ticketSet.has(item.ticket));
        }
        if (openItems.length === 0) {
            const full = await this.orderGroupRepo.findByIdWithItems(groupId);
            const dto = await this.toDto(full);
            this.publishGroupState(dto);
            return dto;
        }
        let reversePayload = null;
        if (options?.reverseOpen) {
            if (tickets && tickets.length > 0) {
                throw new ValidationError('仅整组平仓时支持后端立即反向开仓');
            }
            reversePayload = await this.buildReverseSpreadOrderPayload(groupId, group.account_group_id, group.remark, openItems);
        }
        const closePromise = Promise.allSettled(openItems.map((item) => this.executeSingleClose(item)));
        const reversePromise = reversePayload
            ? this.spreadService.placeOrder(reversePayload.accountGroupId, reversePayload.input)
            : Promise.resolve(null);
        const [, reverseResult] = await Promise.allSettled([closePromise, reversePromise]);
        await this.orderGroupRepo.refreshFullyClosedStatus(groupId);
        const full = await this.orderGroupRepo.findByIdWithItems(groupId);
        const closeSpread = await this.computePersistedSpread(full, 'close');
        await this.orderGroupRepo.update(groupId, { close_spread: closeSpread });
        const refreshed = await this.orderGroupRepo.findByIdWithItems(groupId);
        const dto = await this.toDto(refreshed);
        this.publishGroupState(dto);
        void Promise.resolve(this.pushService.broadcast({
            title: '订单组平仓通知',
            body: [
                `订单组: ${dto.name} (#${dto.id})`,
                `账号组: ${dto.accountGroupName ?? '未绑定'}`,
                `是否完全平仓: ${dto.isFullyClosed ? '是' : '否'}`,
                `已平仓数量: ${dto.closedCount}`,
                `未平仓数量: ${dto.openCount}`,
                `平仓差价: ${formatOrderGroupSpread(dto.closeSpread)}`,
                `总盈亏: ${dto.totalProfit}`,
            ].join('\n\n'),
            level: 'info',
            metadata: {
                kind: 'order-group-close',
                groupId: dto.id,
                name: dto.name,
                accountGroupId: dto.accountGroupId,
                openCount: dto.openCount,
                closedCount: dto.closedCount,
                isFullyClosed: dto.isFullyClosed,
                closeSpread: dto.closeSpread,
            },
        })).catch(() => {
            // keep close result fast even if outbound notification is slow
        });
        if (reverseResult.status === 'rejected') {
            throw new Error(`反向开仓失败：${reverseResult.reason instanceof Error ? reverseResult.reason.message : String(reverseResult.reason)}`);
        }
        return dto;
    }
    async batchCloseMany(groupIds, options) {
        if (groupIds.length === 0) {
            throw new ValidationError('groupIds 不能为空');
        }
        const results = await Promise.all(groupIds.map(async (id) => {
            // 复用单组批量平仓逻辑，等价于调用 batchClose(id)
            return this.batchClose(id, undefined, options);
        }));
        return results;
    }
    async createGroupDto(input, publishState) {
        if (input.accountGroupId) {
            const ag = await this.accountGroupRepo.findById(input.accountGroupId);
            if (!ag)
                throw new ValidationError(`账号组 (id=${input.accountGroupId}) 不存在`);
        }
        const row = await this.orderGroupRepo.create({
            name: input.name,
            account_group_id: input.accountGroupId ?? null,
            remark: input.remark ?? null,
        });
        const full = await this.orderGroupRepo.findByIdWithItems(row.id);
        const dto = await this.toDto(full);
        if (publishState) {
            this.publishGroupState(dto);
        }
        return dto;
    }
    async executeSingleOrder(groupId, order) {
        const account = await this.accountRepo.findById(order.accountId);
        if (!account) {
            await this.orderGroupRepo.addItem({
                order_group_id: groupId,
                account_id: order.accountId,
                symbol: order.symbol,
                order_type: ORDER_TYPE_MAP[order.type] ?? String(order.type),
                lots: order.lots,
                status: 'failed',
                error_message: `账号 (id=${order.accountId}) 不存在`,
            });
            return;
        }
        if (!account.session_id) {
            await this.orderGroupRepo.addItem({
                order_group_id: groupId,
                account_id: order.accountId,
                symbol: order.symbol,
                order_type: ORDER_TYPE_MAP[order.type] ?? String(order.type),
                lots: order.lots,
                status: 'failed',
                error_message: `账号 #${order.accountId} 未连接`,
            });
            return;
        }
        try {
            const sdkType = ORDER_TYPE_MAP[order.type] ?? 'Buy';
            const result = await this.mt5Sdk.trading.orderSend({
                symbol: order.symbol,
                lots: order.lots,
                price: order.price ?? 0,
                type: sdkType,
                sl: order.sl ?? 0,
                tp: order.tp ?? 0,
                comment: order.comment,
            }, account.session_id);
            await this.orderGroupRepo.addItem({
                order_group_id: groupId,
                account_id: order.accountId,
                ticket: result.ticket ?? null,
                symbol: order.symbol,
                order_type: ORDER_TYPE_MAP[order.type] ?? String(order.type),
                lots: order.lots,
                open_price: result.openPrice ?? null,
                sl: order.sl ?? null,
                tp: order.tp ?? null,
                status: 'open',
                opened_at: new Date().toISOString(),
            });
        }
        catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            await this.orderGroupRepo.addItem({
                order_group_id: groupId,
                account_id: order.accountId,
                symbol: order.symbol,
                order_type: ORDER_TYPE_MAP[order.type] ?? String(order.type),
                lots: order.lots,
                status: 'failed',
                error_message: errorMsg,
            });
        }
    }
    async buildReverseSpreadOrderPayload(groupId, accountGroupId, remark, openItems) {
        if (!this.spreadService) {
            throw new ValidationError('SpreadService 未初始化，无法执行后端反向开仓');
        }
        if (!accountGroupId) {
            throw new ValidationError(`订单组 #${groupId} 未绑定账号组，无法执行后端反向开仓`);
        }
        const metadata = parseSpreadRemark(remark);
        if (!metadata.subscriptionId || !metadata.direction) {
            throw new ValidationError(`订单组 #${groupId} 缺少价差订阅元数据，无法执行后端反向开仓`);
        }
        const accountGroup = await this.accountGroupRepo.findById(accountGroupId);
        if (!accountGroup) {
            throw new ValidationError(`账号组 (id=${accountGroupId}) 不存在`);
        }
        const itemA = openItems.find((item) => item.account_id === accountGroup.account_a_id);
        const itemB = openItems.find((item) => item.account_id === accountGroup.account_b_id);
        if (!itemA || !itemB) {
            throw new ValidationError(`订单组 #${groupId} 缺少完整双腿持仓，无法执行后端反向开仓`);
        }
        const reverseDirection = metadata.direction === 'sellA_buyB'
            ? 'sellB_buyA'
            : 'sellA_buyB';
        return {
            accountGroupId,
            input: {
                subscriptionId: metadata.subscriptionId,
                direction: reverseDirection,
                lotsA: itemA.lots,
                lotsB: itemB.lots,
            },
        };
    }
    async executeSingleClose(item) {
        try {
            const account = await this.accountRepo.findById(item.account_id);
            if (!account?.session_id) {
                await this.orderGroupRepo.updateItem(item.id, {
                    status: 'failed',
                    error_message: `账号 #${item.account_id} 未连接`,
                });
                return;
            }
            const sdkType = (Object.values(ORDER_TYPE_MAP).includes(item.order_type)
                ? item.order_type
                : 'Buy');
            const result = await this.mt5Sdk.trading.orderClose({
                ticket: item.ticket,
                symbol: item.symbol,
                price: 0,
                lots: item.lots,
                type: sdkType,
            }, account.session_id);
            await this.orderGroupRepo.updateItem(item.id, {
                status: 'closed',
                close_price: result.closePrice ?? result.openPrice ?? null,
                profit: result.profit ?? null,
                closed_at: new Date().toISOString(),
            });
        }
        catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            if (errorMsg.includes('already been closed')) {
                await this.orderGroupRepo.updateItem(item.id, {
                    status: 'closed',
                    closed_at: new Date().toISOString(),
                    error_message: null,
                });
            }
            else {
                await this.orderGroupRepo.updateItem(item.id, {
                    error_message: errorMsg,
                });
            }
        }
    }
    async toDto(group) {
        let accountGroupName = null;
        if (group.account_group_id) {
            const ag = await this.accountGroupRepo.findById(group.account_group_id);
            accountGroupName = ag?.name ?? null;
        }
        const items = group.items.map(toItemDto);
        const totalProfit = items.reduce((sum, i) => sum + (i.profit ?? 0), 0);
        const openCount = items.filter((i) => i.status === 'open').length;
        const closedCount = items.filter((i) => i.status === 'closed').length;
        return {
            id: group.id,
            name: group.name,
            accountGroupId: group.account_group_id,
            accountGroupName,
            isFullyClosed: group.is_fully_closed === 1,
            remark: group.remark,
            openSpread: group.open_spread == null ? null : roundTo5(group.open_spread),
            closeSpread: group.close_spread == null ? null : roundTo5(group.close_spread),
            totalProfit: Math.round(totalProfit * 100) / 100,
            openCount,
            closedCount,
            itemCount: items.length,
            createdAt: normalizeStoredUtcTime(group.created_at) ?? group.created_at,
            updatedAt: normalizeStoredUtcTime(group.updated_at) ?? group.updated_at,
            items,
        };
    }
    publishGroupState(dto) {
        if (shouldKeepInRuntime(dto)) {
            this.emit('orderGroupUpdate', dto);
            return;
        }
        this.emit('orderGroupRemove', {
            groupId: dto.id,
            accountGroupId: dto.accountGroupId,
        });
    }
    async computePersistedSpread(group, priceField) {
        const priceKey = priceField === 'open' ? 'open_price' : 'close_price';
        const pricedItems = group.items.filter((item) => typeof item[priceKey] === 'number');
        if (pricedItems.length < 2)
            return null;
        const spreadHint = await this.resolveSpreadHint(group.account_group_id, group.remark);
        const accountGroup = spreadHint?.accountGroup ?? undefined;
        const subscription = spreadHint?.subscription ?? undefined;
        if (accountGroup && subscription) {
            const itemA = pricedItems.find((item) => item.account_id === accountGroup.account_a_id && item.symbol === subscription.symbol_a);
            const itemB = pricedItems.find((item) => item.id !== itemA?.id
                && item.account_id === accountGroup.account_b_id
                && item.symbol === subscription.symbol_b);
            const spread = computeLegSpread(itemA, itemB, priceKey);
            if (spread !== null)
                return spread;
        }
        if (accountGroup) {
            const itemA = pricedItems.find((item) => item.account_id === accountGroup.account_a_id);
            const itemB = pricedItems.find((item) => item.id !== itemA?.id && item.account_id === accountGroup.account_b_id);
            const spread = computeLegSpread(itemA, itemB, priceKey);
            if (spread !== null)
                return spread;
        }
        return computeLegSpread(pricedItems[0], pricedItems[1], priceKey);
    }
    async resolveSpreadHint(accountGroupId, remark) {
        if (!accountGroupId)
            return null;
        const accountGroup = await this.accountGroupRepo.findById(accountGroupId);
        if (!accountGroup)
            return null;
        const metadata = parseSpreadRemark(remark);
        if (!metadata.subscriptionId || !this.spreadSubscriptionRepo) {
            return { accountGroup, subscription: null };
        }
        const subscription = await this.spreadSubscriptionRepo.findById(metadata.subscriptionId);
        if (!subscription || subscription.account_group_id !== accountGroupId) {
            return { accountGroup, subscription: null };
        }
        return { accountGroup, subscription };
    }
}
function toItemDto(item) {
    return {
        id: item.id,
        accountId: item.account_id,
        accountLogin: item.account_login,
        accountLabel: item.account_label,
        ticket: item.ticket,
        symbol: item.symbol,
        orderType: item.order_type,
        lots: item.lots,
        openPrice: item.open_price,
        closePrice: item.close_price,
        profit: item.profit,
        sl: item.sl,
        tp: item.tp,
        status: item.status,
        errorMessage: item.error_message,
        openedAt: normalizeStoredUtcTime(item.opened_at),
        closedAt: normalizeStoredUtcTime(item.closed_at),
    };
}
function buildCreatedAtRangeFilter(filter) {
    const createdAtFrom = filter.createdDateFrom ? localDateStartToUtcIso(filter.createdDateFrom) : undefined;
    const createdAtToExclusive = filter.createdDateTo
        ? localDateEndExclusiveToUtcIso(filter.createdDateTo)
        : undefined;
    return {
        createdAtFrom,
        createdAtToExclusive,
    };
}
function localDateStartToUtcIso(date) {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0).toISOString();
}
function localDateEndExclusiveToUtcIso(date) {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day + 1, 0, 0, 0, 0).toISOString();
}
function normalizeStoredUtcTime(value) {
    if (!value)
        return null;
    const trimmed = value.trim();
    if (/([zZ]|[+\-]\d{2}:\d{2})$/.test(trimmed)) {
        return trimmed;
    }
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
        return `${trimmed.replace(' ', 'T')}Z`;
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
        return `${trimmed}Z`;
    }
    return trimmed;
}
function formatOrderGroupSpread(value) {
    if (value === null)
        return '—';
    return String(roundTo5(value));
}
function computeLegSpread(itemA, itemB, priceKey) {
    if (!itemA || !itemB || itemA.id === itemB.id || itemA.lots <= 0) {
        return null;
    }
    const priceA = itemA[priceKey];
    const priceB = itemB[priceKey];
    if (typeof priceA !== 'number' || typeof priceB !== 'number') {
        return null;
    }
    return roundTo5(priceA - (itemB.lots / itemA.lots) * priceB);
}
function roundTo5(value) {
    return Math.round(value * 100000) / 100000;
}
function parseSpreadRemark(remark) {
    if (!remark) {
        return { subscriptionId: null, direction: null };
    }
    const parts = remark
        .split(';')
        .map((item) => item.trim())
        .filter(Boolean);
    const map = new Map();
    for (const part of parts) {
        const eq = part.indexOf('=');
        if (eq <= 0)
            continue;
        map.set(part.slice(0, eq).trim(), part.slice(eq + 1).trim());
    }
    const subscriptionIdRaw = Number(map.get('spreadSubscriptionId'));
    const directionRaw = map.get('direction');
    return {
        subscriptionId: Number.isInteger(subscriptionIdRaw) && subscriptionIdRaw > 0 ? subscriptionIdRaw : null,
        direction: directionRaw === 'sellA_buyB' || directionRaw === 'sellB_buyA' ? directionRaw : null,
    };
}
function shouldKeepInRuntime(group) {
    return !group.isFullyClosed && group.itemCount > 0;
}
//# sourceMappingURL=order-group.service.js.map