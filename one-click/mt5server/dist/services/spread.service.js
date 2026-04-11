import { EventEmitter } from 'node:events';
import { NotFoundError, ValidationError } from '../lib/errors.js';
const HEARTBEAT_INTERVAL_MS = 100;
export class SpreadService extends EventEmitter {
    repo;
    accountGroupRepo;
    wsManager;
    mt5Sdk;
    pushService;
    orderGroupService;
    runtimeById = new Map();
    quoteStore = new Map();
    subscriptionIndex = new Map();
    runtimeStateById = new Map();
    lastNotificationAt = new Map();
    heartbeatTimer = null;
    constructor(repo, accountGroupRepo, wsManager, mt5Sdk, pushService, orderGroupService) {
        super();
        this.repo = repo;
        this.accountGroupRepo = accountGroupRepo;
        this.wsManager = wsManager;
        this.mt5Sdk = mt5Sdk;
        this.pushService = pushService;
        this.orderGroupService = orderGroupService;
    }
    async initialize() {
        const rows = await this.repo.findEnabled();
        for (const row of rows) {
            await this.syncRuntime(row);
        }
        this.ensureHeartbeatLoop();
    }
    async listByAccountGroup(accountGroupId) {
        await this.ensureAccountGroupExists(accountGroupId);
        const rows = await this.repo.findAllByAccountGroupId(accountGroupId);
        return rows.map((row) => this.toSpreadSubscriptionDto(row));
    }
    async create(accountGroupId, input) {
        const group = await this.ensureAccountGroup(accountGroupId);
        const payload = normalizeInput(input);
        validateThresholds(payload);
        const row = await this.repo.create({
            account_group_id: accountGroupId,
            name: payload.name,
            symbol_a: payload.symbolA,
            symbol_b: payload.symbolB,
            lots_a: payload.lotsA,
            lots_b: payload.lotsB,
            is_enabled: payload.isEnabled ? 1 : 0,
            notify_enabled: payload.notifyEnabled ? 1 : 0,
            notify_channel_ids: JSON.stringify(payload.notifyChannelIds),
            notify_expand_threshold: payload.notifyLongThreshold ?? null,
            notify_contract_threshold: payload.notifyShortThreshold ?? null,
            notify_stability_seconds: payload.notifyStabilitySeconds,
            cooldown_seconds: payload.cooldownSeconds,
        });
        await this.syncRuntime(row, group);
        this.emitConfigSnapshot(row, group);
        return this.toSpreadSubscriptionDto(row);
    }
    async update(accountGroupId, subscriptionId, input) {
        const existing = await this.repo.findById(subscriptionId);
        if (!existing || existing.account_group_id !== accountGroupId) {
            throw new NotFoundError('SpreadSubscription', subscriptionId);
        }
        const group = await this.ensureAccountGroup(accountGroupId);
        const payload = normalizeUpdateInput(input, existing);
        validateThresholds(payload);
        const row = await this.repo.update(subscriptionId, {
            name: payload.name,
            symbol_a: payload.symbolA,
            symbol_b: payload.symbolB,
            lots_a: payload.lotsA,
            lots_b: payload.lotsB,
            is_enabled: payload.isEnabled ? 1 : 0,
            notify_enabled: payload.notifyEnabled ? 1 : 0,
            notify_channel_ids: JSON.stringify(payload.notifyChannelIds),
            notify_expand_threshold: payload.notifyLongThreshold,
            notify_contract_threshold: payload.notifyShortThreshold,
            notify_stability_seconds: payload.notifyStabilitySeconds,
            cooldown_seconds: payload.cooldownSeconds,
        });
        if (!row)
            throw new NotFoundError('SpreadSubscription', subscriptionId);
        await this.syncRuntime(row, group);
        this.emitConfigSnapshot(row, group);
        return this.toSpreadSubscriptionDto(row);
    }
    async delete(accountGroupId, subscriptionId) {
        const existing = await this.repo.findById(subscriptionId);
        if (!existing || existing.account_group_id !== accountGroupId) {
            throw new NotFoundError('SpreadSubscription', subscriptionId);
        }
        const group = await this.accountGroupRepo.findByIdWithAccounts(accountGroupId);
        await this.repo.deleteById(subscriptionId);
        this.removeRuntime(subscriptionId);
        if (group) {
            this.emit('spreadRuntimeState', {
                subscriptionId,
                accountGroupId,
                runtimeStarted: false,
            });
        }
    }
    async getPanel(accountGroupId) {
        const group = await this.ensureAccountGroup(accountGroupId);
        const rows = await this.repo.findAllByAccountGroupId(accountGroupId);
        const subscriptions = rows.map((row) => this.getSnapshotFromRow(row, group));
        return {
            accountGroupId: group.id,
            accountGroupName: group.name,
            accountA: toPanelAccount(group.accountA),
            accountB: toPanelAccount(group.accountB),
            subscriptions,
        };
    }
    getSnapshot(subscriptionId) {
        const runtime = this.runtimeById.get(subscriptionId);
        if (!runtime)
            return null;
        return this.getSnapshotFromRow(runtime.row, runtime.group);
    }
    getRuntimeSubscriptionIds() {
        return [...this.runtimeById.keys()];
    }
    async getChart(accountGroupId, subscriptionId, timeframeMinutes, limit = 120) {
        validateChartQuery(timeframeMinutes, limit);
        const group = await this.ensureAccountGroup(accountGroupId);
        const row = await this.repo.findById(subscriptionId);
        if (!row || row.account_group_id !== accountGroupId) {
            throw new NotFoundError('SpreadSubscription', subscriptionId);
        }
        if (!group.accountA.session_id || !group.accountB.session_id) {
            throw new ValidationError('A/B 账号均需处于已连接状态，才能获取价差历史图表');
        }
        const to = new Date();
        const from = new Date(to.getTime() - timeframeMinutes * limit * 60_000);
        const [barsA, barsB] = await Promise.all([
            this.mt5Sdk.history.downloadQuoteHistory({
                symbol: row.symbol_a,
                from: from.toISOString(),
                to: to.toISOString(),
                timeFrame: timeframeMinutes,
            }, group.accountA.session_id),
            this.mt5Sdk.history.downloadQuoteHistory({
                symbol: row.symbol_b,
                from: from.toISOString(),
                to: to.toISOString(),
                timeFrame: timeframeMinutes,
            }, group.accountB.session_id),
        ]);
        return {
            subscriptionId,
            accountGroupId,
            timeframeMinutes,
            accountA: {
                title: 'A标的价格图',
                symbol: row.symbol_a,
                candles: buildPriceChartCandles(barsA).slice(-limit),
            },
            accountB: {
                title: 'B标的价格图',
                symbol: row.symbol_b,
                candles: buildPriceChartCandles(barsB).slice(-limit),
            },
            spread: {
                title: '差价图',
                symbol: `${row.symbol_a}/${row.symbol_b}`,
                candles: buildSpreadChartCandles(barsA, barsB).slice(-limit),
            },
        };
    }
    async placeOrder(accountGroupId, input) {
        if (input.lotsA <= 0)
            throw new ValidationError('lotsA 必须大于 0');
        if (input.lotsB !== undefined && input.lotsB <= 0)
            throw new ValidationError('lotsB 必须大于 0');
        const group = await this.ensureAccountGroup(accountGroupId);
        const row = await this.repo.findById(input.subscriptionId);
        if (!row || row.account_group_id !== accountGroupId) {
            throw new NotFoundError('SpreadSubscription', input.subscriptionId);
        }
        if (row.is_enabled !== 1) {
            throw new ValidationError('价差订阅已禁用，不能通过交易面板下单');
        }
        const snapshot = this.getSnapshotFromRow(row, group);
        if (!snapshot.accountAQuote || !snapshot.accountBQuote) {
            throw new ValidationError('当前缺少最新报价，无法完成价差下单');
        }
        const lotsB = input.lotsB ?? input.lotsA;
        const directionLabel = toSpreadDirectionLabel(input.direction);
        const orderGroupName = buildSpreadOrderGroupName(input.orderGroupName?.trim() || row.name, directionLabel);
        const remark = input.remark?.trim() || [
            `spreadSubscriptionId=${row.id}`,
            `direction=${input.direction}`,
            `longSpread=${snapshot.longSpread ?? 'N/A'}`,
            `shortSpread=${snapshot.shortSpread ?? 'N/A'}`,
        ].join('; ');
        const orders = input.direction === 'sellA_buyB'
            ? [
                {
                    accountId: group.account_a_id,
                    symbol: row.symbol_a,
                    type: 1,
                    lots: input.lotsA,
                    price: snapshot.accountAQuote.bid,
                    sl: input.slA,
                    tp: input.tpA,
                    comment: input.comment,
                },
                {
                    accountId: group.account_b_id,
                    symbol: row.symbol_b,
                    type: 0,
                    lots: lotsB,
                    price: snapshot.accountBQuote.ask,
                    sl: input.slB,
                    tp: input.tpB,
                    comment: input.comment,
                },
            ]
            : [
                {
                    accountId: group.account_a_id,
                    symbol: row.symbol_a,
                    type: 0,
                    lots: input.lotsA,
                    price: snapshot.accountAQuote.ask,
                    sl: input.slA,
                    tp: input.tpA,
                    comment: input.comment,
                },
                {
                    accountId: group.account_b_id,
                    symbol: row.symbol_b,
                    type: 1,
                    lots: lotsB,
                    price: snapshot.accountBQuote.bid,
                    sl: input.slB,
                    tp: input.tpB,
                    comment: input.comment,
                },
            ];
        return this.orderGroupService.batchCreate({
            name: orderGroupName,
            accountGroupId,
            remark,
            orders,
        });
    }
    async handleAccountConnected(accountId, sessionId) {
        for (const runtime of this.runtimeById.values()) {
            if (runtime.group.account_a_id === accountId) {
                await this.wsManager.subscribeSymbols(accountId, [runtime.row.symbol_a], sessionId);
            }
            if (runtime.group.account_b_id === accountId) {
                await this.wsManager.subscribeSymbols(accountId, [runtime.row.symbol_b], sessionId);
            }
        }
    }
    handleAccountDisconnected(accountId) {
        for (const key of this.quoteStore.keys()) {
            if (key.startsWith(`${accountId}:`)) {
                this.quoteStore.delete(key);
            }
        }
    }
    async handleQuote(quote) {
        this.quoteStore.set(quoteKey(quote.accountId, quote.symbol), quote);
        const impacted = this.subscriptionIndex.get(quoteKey(quote.accountId, quote.symbol));
        if (!impacted || impacted.size === 0)
            return;
        for (const subscriptionId of impacted) {
            const runtime = this.runtimeById.get(subscriptionId);
            if (!runtime)
                continue;
            const snapshot = this.attachQuoteHeartbeats(subscriptionId, this.getSnapshotFromRow(runtime.row, runtime.group), 'quote');
            this.updateRuntimeFingerprint(subscriptionId, snapshot);
            this.emit('spreadUpdate', {
                subscriptionId,
                accountGroupId: runtime.group.id,
                snapshot,
            });
            await this.maybeNotify(runtime, snapshot);
        }
    }
    close() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }
    ensureHeartbeatLoop() {
        if (this.heartbeatTimer)
            return;
        this.heartbeatTimer = setInterval(() => {
            for (const [subscriptionId, runtime] of this.runtimeById) {
                const snapshot = this.attachQuoteHeartbeats(subscriptionId, this.getSnapshotFromRow(runtime.row, runtime.group), 'heartbeat');
                this.updateRuntimeFingerprint(subscriptionId, snapshot);
                const state = this.getRuntimeState(subscriptionId);
                this.emit('spreadHeartbeat', {
                    subscriptionId,
                    accountGroupId: runtime.group.id,
                    accountAHeartbeat: state.accountAHeartbeat,
                    accountBHeartbeat: state.accountBHeartbeat,
                });
            }
        }, HEARTBEAT_INTERVAL_MS);
    }
    getSnapshotFromRow(row, group) {
        const state = this.getRuntimeState(row.id);
        const accountAQuote = this.toSpreadQuote(group.accountA, row.symbol_a);
        const accountBQuote = this.toSpreadQuote(group.accountB, row.symbol_b);
        const status = row.is_enabled !== 1 ? 'disabled' : accountAQuote && accountBQuote ? 'ready' : 'waiting_quote';
        const longSpread = accountAQuote && accountBQuote
            ? roundNumber(accountAQuote.ask - accountBQuote.bid)
            : null;
        const shortSpread = accountAQuote && accountBQuote
            ? roundNumber(accountAQuote.bid - accountBQuote.ask)
            : null;
        updateThresholdTracker(state.longTracker, longSpread, row.notify_expand_threshold);
        updateThresholdTracker(state.shortTracker, shortSpread, row.notify_contract_threshold);
        return {
            subscription: this.toSpreadSubscriptionDto(row),
            status,
            accountAQuote,
            accountBQuote,
            longSpread,
            shortSpread,
            stability: buildStability(state),
        };
    }
    toSpreadQuote(account, symbol) {
        const quote = this.quoteStore.get(quoteKey(account.id, symbol));
        if (!quote)
            return null;
        return {
            accountId: account.id,
            login: account.login,
            label: account.label,
            symbol,
            bid: quote.bid,
            ask: quote.ask,
            time: quote.time,
            heartbeat: 0,
        };
    }
    async maybeNotify(runtime, snapshot) {
        const row = runtime.row;
        if (row.notify_enabled !== 1 || snapshot.status !== 'ready')
            return;
        const channelIds = parseChannelIds(row.notify_channel_ids);
        if (channelIds.length === 0)
            return;
        const stability = snapshot.stability;
        const neededMs = row.notify_stability_seconds * 1000;
        if (row.notify_expand_threshold !== null
            && snapshot.longSpread !== null
            && snapshot.longSpread <= row.notify_expand_threshold
            && stability.longStableMs >= neededMs) {
            await this.sendNotification(runtime, snapshot, 'long');
        }
        if (row.notify_contract_threshold !== null
            && snapshot.shortSpread !== null
            && snapshot.shortSpread >= row.notify_contract_threshold
            && stability.shortStableMs >= neededMs) {
            await this.sendNotification(runtime, snapshot, 'short');
        }
    }
    async sendNotification(runtime, snapshot, direction) {
        const directionInfo = getSpreadDirectionInfo(direction);
        const dedupeKey = `${runtime.row.id}:${direction}`;
        const now = Date.now();
        const cooldownMs = Math.max(runtime.row.cooldown_seconds, 0) * 1000;
        const lastAt = this.lastNotificationAt.get(dedupeKey) ?? 0;
        if (cooldownMs > 0 && now - lastAt < cooldownMs)
            return;
        const channelIds = parseChannelIds(runtime.row.notify_channel_ids);
        const spreadValue = direction === 'long' ? snapshot.longSpread : snapshot.shortSpread;
        const threshold = direction === 'long'
            ? runtime.row.notify_expand_threshold
            : runtime.row.notify_contract_threshold;
        const stableSeconds = direction === 'long'
            ? snapshot.stability.longStableSeconds
            : snapshot.stability.shortStableSeconds;
        const result = await this.pushService.sendToChannels(channelIds, {
            title: `账号组价差阈值通知 - ${directionInfo.label}`,
            body: [
                `账号组: ${runtime.group.name} (#${runtime.group.id})`,
                `价差配置: ${runtime.row.name} (#${runtime.row.id})`,
                `方向: ${directionInfo.label} (${direction})`,
                `触发条件: ${directionInfo.spreadField} ${directionInfo.operatorLabel} ${threshold}`,
                `A(${runtime.group.accountA.login}) ${runtime.row.symbol_a}: bid=${snapshot.accountAQuote?.bid} ask=${snapshot.accountAQuote?.ask}`,
                `B(${runtime.group.accountB.login}) ${runtime.row.symbol_b}: bid=${snapshot.accountBQuote?.bid} ask=${snapshot.accountBQuote?.ask}`,
                `longSpread(a.ask-b.bid): ${snapshot.longSpread}`,
                `shortSpread(a.bid-b.ask): ${snapshot.shortSpread}`,
                `当前命中值: ${spreadValue}`,
                `触发阈值: ${threshold}`,
                `稳定时长(秒): ${stableSeconds}`,
            ].join('\n'),
            level: 'info',
            metadata: {
                kind: 'spread-stable-threshold',
                spreadSubscriptionId: runtime.row.id,
                accountGroupId: runtime.group.id,
                direction,
                directionLabel: directionInfo.label,
                spreadField: directionInfo.spreadField,
                spreadValue,
                threshold,
                stableSeconds,
            },
        });
        if (result.deliveredChannelIds.length > 0) {
            this.lastNotificationAt.set(dedupeKey, now);
        }
    }
    installRuntime(row, group) {
        this.runtimeById.set(row.id, { row, group });
        this.runtimeStateById.set(row.id, {
            lastFingerprint: null,
            lastChangedAt: Date.now(),
            heartbeatSeq: 0,
            longTracker: { activeSince: null },
            shortTracker: { activeSince: null },
            accountAQuoteFingerprint: null,
            accountBQuoteFingerprint: null,
            accountAHeartbeat: 0,
            accountBHeartbeat: 0,
        });
        this.addIndex(quoteKey(group.account_a_id, row.symbol_a), row.id);
        this.addIndex(quoteKey(group.account_b_id, row.symbol_b), row.id);
        this.ensureHeartbeatLoop();
    }
    removeRuntime(subscriptionId) {
        const runtime = this.runtimeById.get(subscriptionId);
        if (!runtime)
            return;
        this.runtimeById.delete(subscriptionId);
        this.runtimeStateById.delete(subscriptionId);
        this.removeIndex(quoteKey(runtime.group.account_a_id, runtime.row.symbol_a), subscriptionId);
        this.removeIndex(quoteKey(runtime.group.account_b_id, runtime.row.symbol_b), subscriptionId);
    }
    async syncRuntime(row, group) {
        this.removeRuntime(row.id);
        if (row.is_enabled !== 1)
            return;
        const resolvedGroup = group ?? await this.accountGroupRepo.findByIdWithAccounts(row.account_group_id);
        if (!resolvedGroup)
            return;
        this.installRuntime(row, resolvedGroup);
        await this.ensureUnderlyingSubscriptions(resolvedGroup, row);
    }
    updateRuntimeFingerprint(subscriptionId, snapshot) {
        const state = this.getRuntimeState(subscriptionId);
        const fingerprint = JSON.stringify({
            accountAQuote: snapshot.accountAQuote,
            accountBQuote: snapshot.accountBQuote,
            longSpread: snapshot.longSpread,
            shortSpread: snapshot.shortSpread,
            status: snapshot.status,
        });
        const changed = state.lastFingerprint !== fingerprint;
        state.lastFingerprint = fingerprint;
        if (changed)
            state.lastChangedAt = Date.now();
        state.heartbeatSeq += 1;
        return changed;
    }
    getRuntimeState(subscriptionId) {
        const state = this.runtimeStateById.get(subscriptionId);
        if (!state) {
            const created = {
                lastFingerprint: null,
                lastChangedAt: Date.now(),
                heartbeatSeq: 0,
                longTracker: { activeSince: null },
                shortTracker: { activeSince: null },
                accountAQuoteFingerprint: null,
                accountBQuoteFingerprint: null,
                accountAHeartbeat: 0,
                accountBHeartbeat: 0,
            };
            this.runtimeStateById.set(subscriptionId, created);
            return created;
        }
        return state;
    }
    attachQuoteHeartbeats(subscriptionId, snapshot, mode) {
        const state = this.getRuntimeState(subscriptionId);
        const accountAFingerprint = quoteFingerprint(snapshot.accountAQuote);
        const accountBFingerprint = quoteFingerprint(snapshot.accountBQuote);
        if (mode === 'quote') {
            if (accountAFingerprint === null) {
                state.accountAHeartbeat = 0;
                state.accountAQuoteFingerprint = null;
            }
            else if (state.accountAQuoteFingerprint !== accountAFingerprint) {
                state.accountAQuoteFingerprint = accountAFingerprint;
                state.accountAHeartbeat = 0;
            }
            if (accountBFingerprint === null) {
                state.accountBHeartbeat = 0;
                state.accountBQuoteFingerprint = null;
            }
            else if (state.accountBQuoteFingerprint !== accountBFingerprint) {
                state.accountBQuoteFingerprint = accountBFingerprint;
                state.accountBHeartbeat = 0;
            }
        }
        else {
            if (accountAFingerprint === null) {
                state.accountAHeartbeat = 0;
                state.accountAQuoteFingerprint = null;
            }
            else if (state.accountAQuoteFingerprint === accountAFingerprint) {
                state.accountAHeartbeat += 1;
            }
            else {
                state.accountAQuoteFingerprint = accountAFingerprint;
                state.accountAHeartbeat = 0;
            }
            if (accountBFingerprint === null) {
                state.accountBHeartbeat = 0;
                state.accountBQuoteFingerprint = null;
            }
            else if (state.accountBQuoteFingerprint === accountBFingerprint) {
                state.accountBHeartbeat += 1;
            }
            else {
                state.accountBQuoteFingerprint = accountBFingerprint;
                state.accountBHeartbeat = 0;
            }
        }
        return {
            ...snapshot,
            accountAQuote: snapshot.accountAQuote
                ? { ...snapshot.accountAQuote, heartbeat: state.accountAHeartbeat }
                : null,
            accountBQuote: snapshot.accountBQuote
                ? { ...snapshot.accountBQuote, heartbeat: state.accountBHeartbeat }
                : null,
        };
    }
    addIndex(key, subscriptionId) {
        const existing = this.subscriptionIndex.get(key) ?? new Set();
        existing.add(subscriptionId);
        this.subscriptionIndex.set(key, existing);
    }
    removeIndex(key, subscriptionId) {
        const existing = this.subscriptionIndex.get(key);
        if (!existing)
            return;
        existing.delete(subscriptionId);
        if (existing.size === 0)
            this.subscriptionIndex.delete(key);
    }
    async ensureUnderlyingSubscriptions(group, row) {
        if (group.accountA.session_id) {
            await this.wsManager.subscribeSymbols(group.accountA.id, [row.symbol_a], group.accountA.session_id);
        }
        if (group.accountB.session_id) {
            await this.wsManager.subscribeSymbols(group.accountB.id, [row.symbol_b], group.accountB.session_id);
        }
    }
    async ensureAccountGroup(accountGroupId) {
        const group = await this.accountGroupRepo.findByIdWithAccounts(accountGroupId);
        if (!group)
            throw new NotFoundError('AccountGroup', accountGroupId);
        return group;
    }
    async ensureAccountGroupExists(accountGroupId) {
        const group = await this.accountGroupRepo.findById(accountGroupId);
        if (!group)
            throw new NotFoundError('AccountGroup', accountGroupId);
    }
    toSpreadSubscriptionDto(row) {
        return toSpreadSubscriptionDto(row, this.runtimeById.has(row.id));
    }
    emitConfigSnapshot(row, group) {
        const runtimeStarted = this.runtimeById.has(row.id);
        this.emit('spreadRuntimeState', {
            subscriptionId: row.id,
            accountGroupId: group.id,
            runtimeStarted,
        });
        if (!runtimeStarted)
            return;
        this.emit('spreadUpdate', {
            subscriptionId: row.id,
            accountGroupId: group.id,
            snapshot: this.getSnapshotFromRow(row, group),
            broadcast: true,
        });
    }
}
function updateThresholdTracker(tracker, value, threshold) {
    if (threshold === null || value === null || value < threshold) {
        tracker.activeSince = null;
        return;
    }
    if (tracker.activeSince === null) {
        tracker.activeSince = Date.now();
    }
}
function getSpreadDirectionInfo(direction) {
    if (direction === 'long') {
        return {
            label: 'A买B卖',
            spreadField: 'longSpread',
            operatorLabel: '<',
        };
    }
    return {
        label: 'A卖B买',
        spreadField: 'shortSpread',
        operatorLabel: '>',
    };
}
function buildStability(state) {
    const now = Date.now();
    const longStableMs = state.longTracker.activeSince === null ? 0 : now - state.longTracker.activeSince;
    const shortStableMs = state.shortTracker.activeSince === null ? 0 : now - state.shortTracker.activeSince;
    return {
        isLongStable: longStableMs > 0,
        isShortStable: shortStableMs > 0,
        longStableMs,
        shortStableMs,
        longStableSeconds: roundNumber(longStableMs / 1000),
        shortStableSeconds: roundNumber(shortStableMs / 1000),
    };
}
function quoteKey(accountId, symbol) {
    return `${accountId}:${symbol.trim()}`;
}
function quoteFingerprint(quote) {
    if (!quote)
        return null;
    return JSON.stringify({
        bid: quote.bid,
        ask: quote.ask,
        time: quote.time,
        symbol: quote.symbol,
    });
}
function parseChannelIds(raw) {
    if (!raw)
        return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed)
            ? parsed.filter((item) => Number.isInteger(item) && item > 0)
            : [];
    }
    catch {
        return [];
    }
}
function normalizeInput(input) {
    const symbolA = input.symbolA.trim();
    const symbolB = input.symbolB.trim();
    if (!input.name.trim())
        throw new ValidationError('name 不能为空');
    if (!symbolA || !symbolB)
        throw new ValidationError('symbolA / symbolB 不能为空');
    return {
        name: input.name.trim(),
        symbolA,
        symbolB,
        lotsA: input.lotsA ?? 1,
        lotsB: input.lotsB ?? null,
        isEnabled: input.isEnabled ?? true,
        notifyEnabled: input.notifyEnabled ?? false,
        notifyChannelIds: dedupeChannelIds(input.notifyChannelIds ?? []),
        notifyLongThreshold: input.notifyLongThreshold ?? undefined,
        notifyShortThreshold: input.notifyShortThreshold ?? undefined,
        notifyStabilitySeconds: input.notifyStabilitySeconds ?? 3,
        cooldownSeconds: input.cooldownSeconds ?? 60,
    };
}
function normalizeUpdateInput(input, existing) {
    const name = input.name?.trim() ?? existing.name;
    const symbolA = input.symbolA?.trim() ?? existing.symbol_a;
    const symbolB = input.symbolB?.trim() ?? existing.symbol_b;
    if (!name)
        throw new ValidationError('name 不能为空');
    if (!symbolA || !symbolB)
        throw new ValidationError('symbolA / symbolB 不能为空');
    return {
        name,
        symbolA,
        symbolB,
        lotsA: input.lotsA ?? existing.lots_a,
        lotsB: input.lotsB === undefined ? existing.lots_b : input.lotsB,
        isEnabled: input.isEnabled ?? existing.is_enabled === 1,
        notifyEnabled: input.notifyEnabled ?? existing.notify_enabled === 1,
        notifyChannelIds: dedupeChannelIds(input.notifyChannelIds ?? parseChannelIds(existing.notify_channel_ids)),
        notifyLongThreshold: input.notifyLongThreshold ?? existing.notify_expand_threshold,
        notifyShortThreshold: input.notifyShortThreshold ?? existing.notify_contract_threshold,
        notifyStabilitySeconds: input.notifyStabilitySeconds ?? existing.notify_stability_seconds,
        cooldownSeconds: input.cooldownSeconds ?? existing.cooldown_seconds,
    };
}
function dedupeChannelIds(channelIds) {
    return [...new Set(channelIds.filter((id) => Number.isInteger(id) && id > 0))];
}
function validateThresholds(input) {
    if (input.lotsA !== undefined && input.lotsA !== null && input.lotsA <= 0) {
        throw new ValidationError('lotsA 必须大于 0');
    }
    if (input.lotsB !== undefined && input.lotsB !== null && input.lotsB <= 0) {
        throw new ValidationError('lotsB 必须大于 0');
    }
    if (input.notifyLongThreshold !== undefined && input.notifyLongThreshold !== null && input.notifyLongThreshold < 0) {
        throw new ValidationError('notifyLongThreshold 不能小于 0');
    }
    if (input.notifyShortThreshold !== undefined && input.notifyShortThreshold !== null && input.notifyShortThreshold < 0) {
        throw new ValidationError('notifyShortThreshold 不能小于 0');
    }
    if (!Number.isInteger(input.notifyStabilitySeconds) || input.notifyStabilitySeconds < 0) {
        throw new ValidationError('notifyStabilitySeconds 必须是大于等于 0 的整数');
    }
    if (!Number.isInteger(input.cooldownSeconds) || input.cooldownSeconds < 0) {
        throw new ValidationError('cooldownSeconds 必须是大于等于 0 的整数');
    }
}
function roundNumber(value) {
    return Math.round(value * 100000) / 100000;
}
function toSpreadDirectionLabel(direction) {
    return direction === 'sellA_buyB' ? 'A卖B买' : 'A买B卖';
}
function buildSpreadOrderGroupName(baseName, directionLabel) {
    return `${baseName}-${directionLabel}`;
}
function buildPriceChartCandles(bars) {
    return [...bars]
        .sort((a, b) => Date.parse(a.time) - Date.parse(b.time))
        .map((bar) => ({
        time: normalizeBarTime(bar.time),
        open: roundNumber(bar.openPrice),
        high: roundNumber(bar.highPrice),
        low: roundNumber(bar.lowPrice),
        close: roundNumber(bar.closePrice),
    }));
}
function buildSpreadChartCandles(barsA, barsB) {
    const byTimeB = new Map(barsB.map((bar) => [normalizeBarTime(bar.time), bar]));
    return [...barsA]
        .sort((a, b) => Date.parse(a.time) - Date.parse(b.time))
        .flatMap((barA) => {
        const time = normalizeBarTime(barA.time);
        const barB = byTimeB.get(time);
        if (!barB)
            return [];
        const open = roundNumber(barA.openPrice - barB.openPrice);
        const close = roundNumber(barA.closePrice - barB.closePrice);
        const high = roundNumber(Math.max(open, close, barA.highPrice - barB.lowPrice));
        const low = roundNumber(Math.min(open, close, barA.lowPrice - barB.highPrice));
        return [{
                time,
                open,
                high,
                low,
                close,
            }];
    });
}
function normalizeBarTime(value) {
    const timestamp = Date.parse(normalizeMtApiUtcTime(value));
    return Number.isNaN(timestamp) ? value : new Date(timestamp).toISOString();
}
function normalizeMtApiUtcTime(value) {
    if (/(?:Z|[+-]\d{2}:\d{2})$/i.test(value))
        return value;
    return `${value}Z`;
}
function validateChartQuery(timeframeMinutes, limit) {
    if (![1, 5, 15].includes(timeframeMinutes)) {
        throw new ValidationError('timeframe 仅支持 1 / 5 / 15 分钟');
    }
    if (!Number.isInteger(limit) || limit < 10 || limit > 500) {
        throw new ValidationError('limit 必须是 10 到 500 之间的整数');
    }
}
function toSpreadSubscriptionDto(row, runtimeStarted) {
    return {
        id: row.id,
        accountGroupId: row.account_group_id,
        name: row.name,
        symbolA: row.symbol_a,
        symbolB: row.symbol_b,
        lotsA: row.lots_a,
        lotsB: row.lots_b,
        isEnabled: row.is_enabled === 1,
        runtimeStarted,
        notifyEnabled: row.notify_enabled === 1,
        notifyChannelIds: parseChannelIds(row.notify_channel_ids),
        notifyLongThreshold: row.notify_expand_threshold,
        notifyShortThreshold: row.notify_contract_threshold,
        notifyStabilitySeconds: row.notify_stability_seconds,
        cooldownSeconds: row.cooldown_seconds,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
function toPanelAccount(account) {
    return {
        id: account.id,
        login: account.login,
        label: account.label,
        sessionId: account.session_id,
    };
}
//# sourceMappingURL=spread.service.js.map