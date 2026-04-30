import { EventEmitter } from 'node:events';
import { NotFoundError, ValidationError } from '../lib/errors.js';
const AUTO_TRADE_EXECUTION_ENABLED = true;
const HEARTBEAT_INTERVAL_MS = 100;
const SPREAD_SECOND_POINT_RETENTION_SECONDS = 360;
const AUTO_TRADE_DECISION_LOG_COOLDOWN_MS = 5_000;
export class SpreadService extends EventEmitter {
    repo;
    autoTradeLogRepo;
    accountGroupRepo;
    wsManager;
    mt5Sdk;
    pushService;
    orderGroupService;
    runtimeById = new Map();
    quoteStore = new Map();
    subscriptionIndex = new Map();
    runtimeStateById = new Map();
    autoTradeRuntimeById = new Map();
    singleLegRuntimeByGroupId = new Map();
    secondPointStore = new Map();
    lastNotificationAt = new Map();
    lastAutoTradeDecisionAt = new Map();
    heartbeatTimer = null;
    constructor(repo, autoTradeLogRepo, accountGroupRepo, wsManager, mt5Sdk, pushService, orderGroupService) {
        super();
        this.repo = repo;
        this.autoTradeLogRepo = autoTradeLogRepo;
        this.accountGroupRepo = accountGroupRepo;
        this.wsManager = wsManager;
        this.mt5Sdk = mt5Sdk;
        this.pushService = pushService;
        this.orderGroupService = orderGroupService;
    }
    async initialize() {
        await this.repo.disableAllAutoTradeEnabled();
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
            auto_trade_enabled: payload.autoTradeEnabled ? 1 : 0,
            auto_open_expand_enabled: payload.autoOpenExpandEnabled ? 1 : 0,
            auto_open_shrink_enabled: payload.autoOpenShrinkEnabled ? 1 : 0,
            target_expand_groups: payload.targetExpandGroups,
            target_shrink_groups: payload.targetShrinkGroups,
            auto_open_expand_threshold: payload.autoOpenExpandThreshold,
            auto_open_shrink_threshold: payload.autoOpenShrinkThreshold,
            auto_open_stability_seconds: payload.autoOpenStabilitySeconds,
            auto_open_cooldown_seconds: payload.autoOpenCooldownSeconds,
            auto_close_enabled: payload.autoCloseEnabled ? 1 : 0,
            auto_close_expand_enabled: payload.autoCloseExpandEnabled ? 1 : 0,
            auto_close_shrink_enabled: payload.autoCloseShrinkEnabled ? 1 : 0,
            auto_close_expand_protection: payload.autoCloseExpandProtection,
            auto_close_shrink_protection: payload.autoCloseShrinkProtection,
            auto_close_stability_seconds: payload.autoCloseStabilitySeconds,
            auto_close_batch_count: payload.autoCloseBatchCount,
            auto_close_cooldown_seconds: payload.autoCloseCooldownSeconds,
            single_leg_detect_enabled: payload.singleLegDetectEnabled ? 1 : 0,
            single_leg_timeout_seconds: payload.singleLegTimeoutSeconds,
            single_leg_price_drift_threshold: payload.singleLegPriceDriftThreshold,
            auto_close_single_leg_enabled: payload.autoCloseSingleLegEnabled ? 1 : 0,
            auto_close_single_leg_cooldown_seconds: payload.autoCloseSingleLegCooldownSeconds,
            auto_close_single_leg_max_retries: payload.autoCloseSingleLegMaxRetries,
            single_leg_notify_enabled: payload.singleLegNotifyEnabled ? 1 : 0,
            single_leg_notify_channel_ids: JSON.stringify(payload.singleLegNotifyChannelIds),
            single_leg_notify_levels: JSON.stringify(payload.singleLegNotifyLevels),
        });
        await this.syncRuntime(row, group);
        this.resetAutoTradePause(row.id);
        this.emitConfigSnapshot(row, group);
        await this.writeAutoTradeLog({
            accountGroupId: accountGroupId,
            subscriptionId: row.id,
            phase: 'runtime',
            action: 'config.created',
            level: 'info',
            reason: '自动交易配置已创建',
            metadata: { autoTrade: this.toSpreadSubscriptionDto(row).autoTrade },
        });
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
            auto_trade_enabled: payload.autoTradeEnabled ? 1 : 0,
            auto_open_expand_enabled: payload.autoOpenExpandEnabled ? 1 : 0,
            auto_open_shrink_enabled: payload.autoOpenShrinkEnabled ? 1 : 0,
            target_expand_groups: payload.targetExpandGroups,
            target_shrink_groups: payload.targetShrinkGroups,
            auto_open_expand_threshold: payload.autoOpenExpandThreshold,
            auto_open_shrink_threshold: payload.autoOpenShrinkThreshold,
            auto_open_stability_seconds: payload.autoOpenStabilitySeconds,
            auto_open_cooldown_seconds: payload.autoOpenCooldownSeconds,
            auto_close_enabled: payload.autoCloseEnabled ? 1 : 0,
            auto_close_expand_enabled: payload.autoCloseExpandEnabled ? 1 : 0,
            auto_close_shrink_enabled: payload.autoCloseShrinkEnabled ? 1 : 0,
            auto_close_expand_protection: payload.autoCloseExpandProtection,
            auto_close_shrink_protection: payload.autoCloseShrinkProtection,
            auto_close_stability_seconds: payload.autoCloseStabilitySeconds,
            auto_close_batch_count: payload.autoCloseBatchCount,
            auto_close_cooldown_seconds: payload.autoCloseCooldownSeconds,
            single_leg_detect_enabled: payload.singleLegDetectEnabled ? 1 : 0,
            single_leg_timeout_seconds: payload.singleLegTimeoutSeconds,
            single_leg_price_drift_threshold: payload.singleLegPriceDriftThreshold,
            auto_close_single_leg_enabled: payload.autoCloseSingleLegEnabled ? 1 : 0,
            auto_close_single_leg_cooldown_seconds: payload.autoCloseSingleLegCooldownSeconds,
            auto_close_single_leg_max_retries: payload.autoCloseSingleLegMaxRetries,
            single_leg_notify_enabled: payload.singleLegNotifyEnabled ? 1 : 0,
            single_leg_notify_channel_ids: JSON.stringify(payload.singleLegNotifyChannelIds),
            single_leg_notify_levels: JSON.stringify(payload.singleLegNotifyLevels),
        });
        if (!row)
            throw new NotFoundError('SpreadSubscription', subscriptionId);
        await this.syncRuntime(row, group);
        this.resetAutoTradePause(row.id);
        this.emitConfigSnapshot(row, group);
        await this.writeAutoTradeLog({
            accountGroupId: accountGroupId,
            subscriptionId: row.id,
            phase: 'runtime',
            action: 'config.updated',
            level: 'info',
            reason: '自动交易配置已更新',
            metadata: { autoTrade: this.toSpreadSubscriptionDto(row).autoTrade },
        });
        return this.toSpreadSubscriptionDto(row);
    }
    async listAutoTradeLogs(input) {
        const page = input.page ?? 1;
        const pageSize = input.pageSize ?? 50;
        if (!Number.isInteger(page) || page < 1) {
            throw new ValidationError('page 必须是大于等于 1 的整数');
        }
        if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 200) {
            throw new ValidationError('pageSize 必须是 1 到 200 之间的整数');
        }
        const filter = {
            accountGroupId: input.accountGroupId,
            subscriptionId: input.subscriptionId,
            phase: input.phase,
            level: input.level,
            direction: input.direction,
            action: input.action,
            page,
            pageSize,
        };
        const [rows, total] = await Promise.all([
            this.autoTradeLogRepo.findAll(filter),
            this.autoTradeLogRepo.countAll(filter),
        ]);
        return {
            items: rows.map(toAutoTradeLogDto),
            total,
            page,
            pageSize,
        };
    }
    async writeAutoTradeLog(input) {
        const row = await this.autoTradeLogRepo.create({
            account_group_id: input.accountGroupId,
            subscription_id: input.subscriptionId,
            phase: input.phase,
            action: input.action,
            direction: input.direction ?? null,
            level: input.level ?? 'info',
            reason: input.reason ?? null,
            runtime_state: input.runtimeState ?? null,
            long_spread: input.longSpread ?? null,
            short_spread: input.shortSpread ?? null,
            long_stable_seconds: input.longStableSeconds ?? null,
            short_stable_seconds: input.shortStableSeconds ?? null,
            request_id: input.requestId ?? null,
            metadata: input.metadata ? JSON.stringify(input.metadata) : null,
            created_at: new Date().toISOString(),
        });
        return toAutoTradeLogDto(row);
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
    async getAutoTradeRuntime(subscriptionId) {
        const row = await this.repo.findById(subscriptionId);
        if (!row)
            throw new NotFoundError('SpreadSubscription', subscriptionId);
        return this.buildAutoTradeRuntimeDto(row);
    }
    async listAutoTradeRuntime(accountGroupId, subscriptionId) {
        if (subscriptionId !== undefined) {
            const row = await this.repo.findById(subscriptionId);
            if (!row)
                return [];
            if (accountGroupId !== undefined && row.account_group_id !== accountGroupId) {
                return [];
            }
            return [await this.buildAutoTradeRuntimeDto(row)];
        }
        const rows = accountGroupId !== undefined
            ? await this.repo.findAllByAccountGroupId(accountGroupId)
            : await this.repo.findEnabled();
        return Promise.all(rows.map((row) => this.buildAutoTradeRuntimeDto(row)));
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
                candles: buildSpreadChartCandles(barsA, barsB, getSpreadLotRatio(row)).slice(-limit),
            },
        };
    }
    async getSecondLineSeed(accountGroupId, subscriptionId, seconds = 120) {
        validateSecondLineSeedQuery(seconds);
        await this.ensureAccountGroup(accountGroupId);
        const row = await this.repo.findById(subscriptionId);
        if (!row || row.account_group_id !== accountGroupId) {
            throw new NotFoundError('SpreadSubscription', subscriptionId);
        }
        const points = this.secondPointStore.get(subscriptionId) ?? [];
        const cutoff = Date.now() - seconds * 1000;
        const filtered = points.filter((point) => point.timestamp >= cutoff).slice(-seconds);
        return {
            subscriptionId,
            accountGroupId,
            seconds,
            accountA: filtered.map((point) => ({ time: point.time, value: point.accountAMid })),
            accountB: filtered.map((point) => ({ time: point.time, value: point.accountBMid })),
            expandSpread: filtered.map((point) => ({ time: point.time, value: point.expandSpread })),
            shrinkSpread: filtered.map((point) => ({ time: point.time, value: point.shrinkSpread })),
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
            this.recordSecondLinePoint(subscriptionId, snapshot);
            this.updateRuntimeFingerprint(subscriptionId, snapshot);
            this.emit('spreadUpdate', {
                subscriptionId,
                accountGroupId: runtime.group.id,
                snapshot,
            });
            await this.maybeNotify(runtime, snapshot);
            if (AUTO_TRADE_EXECUTION_ENABLED && runtime.row.auto_trade_enabled === 1) {
                void this.maybeRunAutoTrade(runtime, snapshot).catch((error) => {
                    console.error('[AutoTrade] evaluation failed', {
                        subscriptionId,
                        accountGroupId: runtime.group.id,
                        error: error instanceof Error ? error.message : String(error),
                    });
                });
            }
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
        const lotRatio = getSpreadLotRatio(row);
        const longSpread = accountAQuote && accountBQuote
            ? roundNumber(accountAQuote.ask - lotRatio * accountBQuote.bid)
            : null;
        const shortSpread = accountAQuote && accountBQuote
            ? roundNumber(accountAQuote.bid - lotRatio * accountBQuote.ask)
            : null;
        updateThresholdTracker(state.longTracker, longSpread, row.notify_expand_threshold, '<=');
        updateThresholdTracker(state.shortTracker, shortSpread, row.notify_contract_threshold, '>=');
        updateThresholdTracker(state.autoOpenExpandTracker, longSpread, row.auto_open_expand_threshold, '<=');
        updateThresholdTracker(state.autoOpenShrinkTracker, shortSpread, row.auto_open_shrink_threshold, '>=');
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
            void this.sendNotification(runtime, snapshot, 'long').catch(() => {
                // keep spread update path responsive even if outbound notification is slow
            });
        }
        if (row.notify_contract_threshold !== null
            && snapshot.shortSpread !== null
            && snapshot.shortSpread >= row.notify_contract_threshold
            && stability.shortStableMs >= neededMs) {
            void this.sendNotification(runtime, snapshot, 'short').catch(() => {
                // keep spread update path responsive even if outbound notification is slow
            });
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
            title: `${runtime.row.name} · ${directionInfo.label}`,
            body: [
                `${runtime.group.name} · ${directionInfo.spreadField}`,
                `当前 ${directionInfo.spreadField}=${spreadValue}，阈值 ${directionInfo.operatorLabel} ${threshold}`,
                `稳定 ${stableSeconds}s`,
                `A ${runtime.row.symbol_a} / B ${runtime.row.symbol_b}`,
            ].join('\n\n'),
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
            autoOpenExpandTracker: { activeSince: null },
            autoOpenShrinkTracker: { activeSince: null },
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
        this.secondPointStore.delete(subscriptionId);
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
                autoOpenExpandTracker: { activeSince: null },
                autoOpenShrinkTracker: { activeSince: null },
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
    recordSecondLinePoint(subscriptionId, snapshot) {
        if (!snapshot.accountAQuote
            || !snapshot.accountBQuote
            || snapshot.longSpread === null
            || snapshot.shortSpread === null)
            return;
        const accountATimestamp = Date.parse(snapshot.accountAQuote.time);
        const accountBTimestamp = Date.parse(snapshot.accountBQuote.time);
        const timestamp = Math.max(accountATimestamp, accountBTimestamp);
        if (Number.isNaN(timestamp))
            return;
        const secondTimestamp = Math.floor(timestamp / 1000) * 1000;
        const point = {
            time: new Date(secondTimestamp).toISOString(),
            timestamp: secondTimestamp,
            accountAMid: roundNumber((snapshot.accountAQuote.bid + snapshot.accountAQuote.ask) / 2),
            accountBMid: roundNumber((snapshot.accountBQuote.bid + snapshot.accountBQuote.ask) / 2),
            expandSpread: snapshot.longSpread,
            shrinkSpread: snapshot.shortSpread,
        };
        const existing = this.secondPointStore.get(subscriptionId) ?? [];
        const last = existing[existing.length - 1];
        if (last && last.timestamp === secondTimestamp) {
            existing[existing.length - 1] = point;
        }
        else {
            existing.push(point);
        }
        const cutoff = secondTimestamp - SPREAD_SECOND_POINT_RETENTION_SECONDS * 1000;
        while (existing.length > 0 && existing[0] && existing[0].timestamp < cutoff) {
            existing.shift();
        }
        if (existing.length > SPREAD_SECOND_POINT_RETENTION_SECONDS) {
            existing.splice(0, existing.length - SPREAD_SECOND_POINT_RETENTION_SECONDS);
        }
        this.secondPointStore.set(subscriptionId, existing);
    }
    getAutoTradeRuntimeState(row) {
        const existing = this.autoTradeRuntimeById.get(row.id);
        if (existing) {
            existing.enabled = row.auto_trade_enabled === 1;
            return existing;
        }
        const state = {
            subscriptionId: row.id,
            accountGroupId: row.account_group_id,
            enabled: row.auto_trade_enabled === 1,
            locked: false,
            paused: false,
            pauseReason: null,
            expand: createAutoTradeSideRuntimeState(),
            shrink: createAutoTradeSideRuntimeState(),
        };
        this.autoTradeRuntimeById.set(row.id, state);
        return state;
    }
    async buildAutoTradeRuntimeDto(row) {
        const runtime = this.getAutoTradeRuntimeState(row);
        const group = await this.getLatestRuntimeGroup(row);
        const openGroups = await this.orderGroupService.listOpenRuntimeGroups();
        if (!AUTO_TRADE_EXECUTION_ENABLED) {
            applyAutoTradeFeatureDisabledReason(runtime);
        }
        const availabilityReason = getAutoTradeAvailabilityReason(row, group);
        if (row.auto_trade_enabled === 1 && AUTO_TRADE_EXECUTION_ENABLED && availabilityReason) {
            applyAutoTradeAvailabilityReason(runtime, availabilityReason);
        }
        else if (row.auto_trade_enabled === 1 && AUTO_TRADE_EXECUTION_ENABLED && runtime.paused && runtime.pauseReason) {
            applyAutoTradePauseReason(runtime, runtime.pauseReason);
        }
        else if (row.auto_trade_enabled === 1 && AUTO_TRADE_EXECUTION_ENABLED) {
            const singleLegSnapshot = this.getSnapshotFromRow(row, group);
            const singleLegCandidate = row.single_leg_detect_enabled === 1
                ? await this.findSingleLegCandidateForSubscription(row.id, singleLegSnapshot, openGroups)
                : null;
            if (singleLegCandidate) {
                runtime.locked = true;
                const singleLegRuntime = this.getSingleLegRuntimeState(singleLegCandidate.group.id);
                const sideState = singleLegCandidate.side === 'expand' ? runtime.expand : runtime.shrink;
                if (singleLegRuntime.autoClosing) {
                    sideState.status = 'closing';
                    sideState.lastReason ??= '检测到单腿风险，正在执行自动平单腿';
                }
                else if (sideState.status === 'close_cooldown') {
                    sideState.lastReason ??= `单腿保护冷却中，剩余 ${getSingleLegCooldownRemainingSeconds(singleLegRuntime)} 秒`;
                }
                else if (isSingleLegCooldownActive(singleLegRuntime)) {
                    sideState.status = 'close_cooldown';
                    sideState.lastReason = `单腿保护冷却中，剩余 ${getSingleLegCooldownRemainingSeconds(singleLegRuntime)} 秒`;
                }
                else {
                    sideState.lastReason = buildSingleLegDetectedReason(singleLegCandidate, row.single_leg_timeout_seconds);
                }
            }
            else if (!runtime.expand.opening && !runtime.expand.closing && !runtime.shrink.opening && !runtime.shrink.closing) {
                runtime.locked = false;
            }
        }
        else if (!runtime.expand.opening && !runtime.expand.closing && !runtime.shrink.opening && !runtime.shrink.closing) {
            runtime.locked = false;
        }
        const expandGroups = this.filterOpenGroupsForSubscription(openGroups, row.id, 'expand');
        const shrinkGroups = this.filterOpenGroupsForSubscription(openGroups, row.id, 'shrink');
        return {
            subscriptionId: row.id,
            accountGroupId: row.account_group_id,
            enabled: runtime.enabled,
            locked: runtime.locked,
            expand: toAutoTradeSideRuntimeDto(runtime.expand, expandGroups.length, row.target_expand_groups),
            shrink: toAutoTradeSideRuntimeDto(runtime.shrink, shrinkGroups.length, row.target_shrink_groups),
        };
    }
    async maybeRunAutoTrade(runtime, snapshot) {
        const row = runtime.row;
        const state = this.getAutoTradeRuntimeState(row);
        state.enabled = row.auto_trade_enabled === 1;
        state.accountGroupId = row.account_group_id;
        if (!AUTO_TRADE_EXECUTION_ENABLED) {
            applyAutoTradeFeatureDisabledReason(state);
            return;
        }
        if (row.auto_trade_enabled !== 1) {
            state.locked = false;
            return;
        }
        const group = await this.getLatestRuntimeGroup(row, runtime);
        const effectiveSnapshot = this.getSnapshotFromRow(row, group);
        const spreadState = this.getRuntimeState(row.id);
        const openGroups = await this.orderGroupService.listOpenRuntimeGroups();
        const availabilityReason = getAutoTradeAvailabilityReason(row, group, effectiveSnapshot.status);
        if (availabilityReason) {
            applyAutoTradeAvailabilityReason(state, availabilityReason);
            await this.maybeLogAutoTradeDecision(row, effectiveSnapshot, spreadState, 'expand', 'auto.trade.blocked', availabilityReason);
            await this.maybeLogAutoTradeDecision(row, effectiveSnapshot, spreadState, 'shrink', 'auto.trade.blocked', availabilityReason);
            return;
        }
        if (state.paused && state.pauseReason) {
            applyAutoTradePauseReason(state, state.pauseReason);
            await this.maybeLogAutoTradeDecision(row, effectiveSnapshot, spreadState, 'expand', 'auto.trade.paused', state.pauseReason);
            await this.maybeLogAutoTradeDecision(row, effectiveSnapshot, spreadState, 'shrink', 'auto.trade.paused', state.pauseReason);
            return;
        }
        state.locked = false;
        if (await this.handleSingleLegRisk(row, effectiveSnapshot, state, openGroups))
            return;
        if (await this.tryAutoClose(row, effectiveSnapshot, state, openGroups, 'expand'))
            return;
        if (await this.tryAutoClose(row, effectiveSnapshot, state, openGroups, 'shrink'))
            return;
        if (await this.tryAutoOpen(row, effectiveSnapshot, state, openGroups, 'expand'))
            return;
        if (await this.tryAutoOpen(row, effectiveSnapshot, state, openGroups, 'shrink'))
            return;
    }
    async handleSingleLegRisk(row, snapshot, state, openGroups) {
        if (row.single_leg_detect_enabled !== 1)
            return false;
        const candidate = await this.findSingleLegCandidateForSubscription(row.id, snapshot, openGroups);
        if (!candidate)
            return false;
        const sideState = candidate.side === 'expand' ? state.expand : state.shrink;
        const runtime = this.getSingleLegRuntimeState(candidate.group.id);
        const now = Date.now();
        const timeoutMs = row.single_leg_timeout_seconds * 1000;
        const elapsedMs = Math.max(0, now - candidate.referenceTime);
        const remainingSeconds = Math.max(0, Math.ceil((timeoutMs - elapsedMs) / 1000));
        const driftText = candidate.spreadDrift === null ? null : roundNumber(candidate.spreadDrift);
        state.locked = true;
        if (runtime.autoClosing) {
            sideState.status = 'closing';
            sideState.closing = true;
            sideState.lastReason = '检测到单腿风险，正在执行自动平单腿';
            return true;
        }
        if (elapsedMs < timeoutMs) {
            sideState.status = 'idle';
            sideState.lastReason = `检测到疑似单腿风险，等待 ${remainingSeconds} 秒后确认`;
            await this.maybeLogAutoTradeDecision(row, snapshot, this.getRuntimeState(row.id), candidate.side, 'single-leg.pending', sideState.lastReason);
            return true;
        }
        if (row.single_leg_price_drift_threshold !== null
            && candidate.spreadDrift !== null
            && candidate.spreadDrift < row.single_leg_price_drift_threshold) {
            sideState.status = 'idle';
            sideState.lastReason = `单腿已超时，当前偏移 ${driftText}，未达到处理阈值 ${roundNumber(row.single_leg_price_drift_threshold)}`;
            await this.maybeLogAutoTradeDecision(row, snapshot, this.getRuntimeState(row.id), candidate.side, 'single-leg.drift.pending', sideState.lastReason);
            return true;
        }
        const detectedReason = buildSingleLegDetectedReason(candidate, row.single_leg_timeout_seconds);
        const pauseReason = buildSingleLegPauseReason();
        sideState.status = 'idle';
        sideState.lastReason = `${detectedReason}；${pauseReason}`;
        pauseAutoTradeBySingleLeg(state, candidate.side, pauseReason);
        await this.maybeLogAutoTradeDecision(row, snapshot, this.getRuntimeState(row.id), candidate.side, 'single-leg.detected', detectedReason);
        if (row.single_leg_notify_enabled === 1) {
            await this.maybeNotifySingleLeg(row, candidate, 'warn', 'single-leg.detected', detectedReason);
        }
        if (row.auto_close_single_leg_enabled !== 1) {
            return true;
        }
        if (isSingleLegCooldownActive(runtime)) {
            sideState.status = 'close_cooldown';
            sideState.lastReason = `单腿保护冷却中，剩余 ${getSingleLegCooldownRemainingSeconds(runtime)} 秒`;
            return true;
        }
        if (runtime.retryCount >= row.auto_close_single_leg_max_retries) {
            sideState.status = 'idle';
            sideState.lastReason = `自动平单腿已达最大重试次数（${row.auto_close_single_leg_max_retries}）`;
            await this.maybeLogAutoTradeDecision(row, snapshot, this.getRuntimeState(row.id), candidate.side, 'single-leg.auto-close.max-retries', sideState.lastReason);
            if (row.single_leg_notify_enabled === 1) {
                await this.maybeNotifySingleLeg(row, candidate, 'error', 'single-leg.auto-close.max-retries', sideState.lastReason);
            }
            return true;
        }
        runtime.autoClosing = true;
        sideState.closing = true;
        sideState.status = 'closing';
        sideState.lastReason = '检测到单腿风险，正在自动平单腿';
        const requestId = buildAutoTradeRequestId(row.id, candidate.side, 'single-leg-close');
        try {
            const result = await this.orderGroupService.batchClose(candidate.group.id);
            const actionAt = Date.now();
            runtime.autoClosing = false;
            runtime.lastActionAt = actionAt;
            runtime.retryCount += 1;
            runtime.cooldownUntil = actionAt + row.auto_close_single_leg_cooldown_seconds * 1000;
            runtime.lastReason = '自动平单腿已执行';
            sideState.closing = false;
            sideState.status = 'close_cooldown';
            sideState.lastActionAt = actionAt;
            sideState.lastCloseAt = actionAt;
            sideState.cooldownUntil = runtime.cooldownUntil;
            sideState.lastError = null;
            sideState.lastReason = `自动平单腿已执行，冷却 ${row.auto_close_single_leg_cooldown_seconds} 秒后可再次尝试`;
            state.locked = false;
            await this.writeAutoTradeLog({
                accountGroupId: row.account_group_id,
                subscriptionId: row.id,
                phase: 'execution',
                action: 'single-leg.auto-close.executed',
                direction: candidate.side,
                level: 'warn',
                reason: sideState.lastReason,
                runtimeState: sideState.status,
                longSpread: snapshot.longSpread,
                shortSpread: snapshot.shortSpread,
                longStableSeconds: getAutoTradeLongStableSeconds(this.getRuntimeState(row.id)),
                shortStableSeconds: getAutoTradeShrinkStableSeconds(this.getRuntimeState(row.id)),
                requestId,
                metadata: {
                    groupId: candidate.group.id,
                    pauseReason,
                    resultGroupId: result.id,
                    spreadDrift: candidate.spreadDrift,
                },
            });
            if (row.single_leg_notify_enabled === 1) {
                await this.maybeNotifySingleLeg(row, candidate, 'warn', 'single-leg.auto-close.executed', sideState.lastReason);
            }
            return true;
        }
        catch (error) {
            const actionAt = Date.now();
            runtime.autoClosing = false;
            runtime.lastActionAt = actionAt;
            runtime.retryCount += 1;
            runtime.cooldownUntil = actionAt + row.auto_close_single_leg_cooldown_seconds * 1000;
            runtime.lastReason = error instanceof Error ? error.message : String(error);
            sideState.closing = false;
            sideState.status = 'close_cooldown';
            sideState.lastActionAt = actionAt;
            sideState.cooldownUntil = runtime.cooldownUntil;
            sideState.lastError = runtime.lastReason;
            sideState.lastReason = `自动平单腿失败，${row.auto_close_single_leg_cooldown_seconds} 秒后可重试`;
            state.locked = true;
            await this.writeAutoTradeLog({
                accountGroupId: row.account_group_id,
                subscriptionId: row.id,
                phase: 'execution',
                action: 'single-leg.auto-close.failed',
                direction: candidate.side,
                level: 'error',
                reason: runtime.lastReason,
                runtimeState: sideState.status,
                longSpread: snapshot.longSpread,
                shortSpread: snapshot.shortSpread,
                longStableSeconds: getAutoTradeLongStableSeconds(this.getRuntimeState(row.id)),
                shortStableSeconds: getAutoTradeShrinkStableSeconds(this.getRuntimeState(row.id)),
                requestId,
                metadata: {
                    groupId: candidate.group.id,
                    spreadDrift: candidate.spreadDrift,
                    retryCount: runtime.retryCount,
                    pauseReason,
                },
            });
            if (row.single_leg_notify_enabled === 1) {
                await this.maybeNotifySingleLeg(row, candidate, 'error', 'single-leg.auto-close.failed', runtime.lastReason ?? sideState.lastReason ?? '自动平单腿失败');
            }
            return true;
        }
    }
    async getLatestRuntimeGroup(row, runtime) {
        const latest = await this.accountGroupRepo.findByIdWithAccounts(row.account_group_id);
        if (latest) {
            if (runtime) {
                runtime.group = latest;
            }
            else {
                const existing = this.runtimeById.get(row.id);
                if (existing)
                    existing.group = latest;
            }
            return latest;
        }
        if (runtime)
            return runtime.group;
        const existing = this.runtimeById.get(row.id);
        if (existing)
            return existing.group;
        throw new NotFoundError('AccountGroup', row.account_group_id);
    }
    async tryAutoOpen(row, snapshot, state, openGroups, side) {
        const sideState = side === 'expand' ? state.expand : state.shrink;
        const spreadState = this.getRuntimeState(row.id);
        const enabled = side === 'expand' ? row.auto_open_expand_enabled === 1 : row.auto_open_shrink_enabled === 1;
        const targetGroups = side === 'expand' ? row.target_expand_groups : row.target_shrink_groups;
        if (!enabled) {
            sideState.lastReason = 'auto open disabled';
            return false;
        }
        if (targetGroups <= 0) {
            sideState.lastReason = '未设置目标开仓组数';
            return false;
        }
        if (sideState.opening || sideState.closing) {
            sideState.lastReason = '当前方向正在执行开仓或平仓';
            return false;
        }
        if (isCooldownActive(sideState)) {
            sideState.status = 'open_cooldown';
            sideState.lastReason = `开仓冷却中，剩余 ${getCooldownRemainingSeconds(sideState)} 秒`;
            return false;
        }
        const currentGroups = this.filterOpenGroupsForSubscription(openGroups, row.id, side);
        if (currentGroups.length >= targetGroups) {
            sideState.lastReason = `已达到目标开仓组数（${currentGroups.length}/${targetGroups}）`;
            return false;
        }
        const triggered = side === 'expand'
            ? isAutoOpenExpandTriggered(row, snapshot, spreadState)
            : isAutoOpenShrinkTriggered(row, snapshot, spreadState);
        if (!triggered) {
            sideState.lastReason = getAutoOpenPendingReason(row, snapshot, spreadState, side);
            return false;
        }
        sideState.opening = true;
        sideState.status = 'opening';
        sideState.lastReason = null;
        state.locked = true;
        const requestId = buildAutoTradeRequestId(row.id, side, 'open');
        try {
            const result = await this.placeOrder(row.account_group_id, {
                subscriptionId: row.id,
                direction: side === 'expand' ? 'sellB_buyA' : 'sellA_buyB',
                lotsA: row.lots_a,
                lotsB: row.lots_b ?? row.lots_a,
                comment: `[auto-trade] ${side} open`,
                remark: [
                    `spreadSubscriptionId=${row.id}`,
                    `direction=${side === 'expand' ? 'sellB_buyA' : 'sellA_buyB'}`,
                    'autoTrade=1',
                ].join('; '),
            });
            const now = Date.now();
            sideState.opening = false;
            sideState.status = 'open_cooldown';
            sideState.lastActionAt = now;
            sideState.lastOpenAt = now;
            sideState.cooldownUntil = now + row.auto_open_cooldown_seconds * 1000;
            sideState.lastError = null;
            sideState.lastReason = `自动开仓已执行，冷却 ${row.auto_open_cooldown_seconds} 秒后可继续补仓`;
            state.locked = false;
            await this.writeAutoTradeLog({
                accountGroupId: row.account_group_id,
                subscriptionId: row.id,
                phase: 'execution',
                action: 'auto.open.executed',
                direction: side,
                level: 'info',
                runtimeState: sideState.status,
                longSpread: snapshot.longSpread,
                shortSpread: snapshot.shortSpread,
                longStableSeconds: getAutoTradeLongStableSeconds(spreadState),
                shortStableSeconds: getAutoTradeShrinkStableSeconds(spreadState),
                requestId,
                metadata: {
                    orderGroupId: result.id,
                    targetGroups,
                    currentGroups: currentGroups.length + 1,
                },
            });
            await this.maybeNotifyAutoTradeExecution({
                row,
                level: 'info',
                action: 'auto.open.executed',
                side,
                reason: sideState.lastReason,
                snapshot,
                metadata: {
                    orderGroupId: result.id,
                    targetGroups,
                    currentGroups: currentGroups.length + 1,
                },
            });
            return true;
        }
        catch (error) {
            const now = Date.now();
            sideState.opening = false;
            sideState.status = 'idle';
            sideState.lastActionAt = now;
            sideState.lastError = error instanceof Error ? error.message : String(error);
            sideState.lastReason = '自动开仓执行失败';
            state.locked = false;
            await this.writeAutoTradeLog({
                accountGroupId: row.account_group_id,
                subscriptionId: row.id,
                phase: 'execution',
                action: 'auto.open.failed',
                direction: side,
                level: 'error',
                reason: sideState.lastError,
                runtimeState: sideState.status,
                longSpread: snapshot.longSpread,
                shortSpread: snapshot.shortSpread,
                longStableSeconds: getAutoTradeLongStableSeconds(spreadState),
                shortStableSeconds: getAutoTradeShrinkStableSeconds(spreadState),
                requestId,
            });
            await this.maybeNotifyAutoTradeExecution({
                row,
                level: 'error',
                action: 'auto.open.failed',
                side,
                reason: sideState.lastError ?? sideState.lastReason ?? '自动开仓执行失败',
                snapshot,
                metadata: { requestId },
            });
            return false;
        }
    }
    async tryAutoClose(row, snapshot, state, openGroups, side) {
        const sideState = side === 'expand' ? state.expand : state.shrink;
        const spreadState = this.getRuntimeState(row.id);
        const enabled = row.auto_close_enabled === 1
            && (side === 'expand' ? row.auto_close_expand_enabled === 1 : row.auto_close_shrink_enabled === 1);
        if (!enabled) {
            sideState.lastReason = '未开启自动平仓';
            return false;
        }
        if (sideState.opening || sideState.closing) {
            sideState.lastReason = '当前方向正在执行开仓或平仓';
            return false;
        }
        if (isCooldownActive(sideState)) {
            sideState.status = 'close_cooldown';
            sideState.lastReason = `平仓冷却中，剩余 ${getCooldownRemainingSeconds(sideState)} 秒`;
            return false;
        }
        const groups = this.filterOpenGroupsForSubscription(openGroups, row.id, side);
        if (groups.length === 0) {
            sideState.lastReason = '当前无可自动平仓订单组';
            return false;
        }
        const protectionError = getAutoCloseProtectionError(row, snapshot, side);
        if (protectionError) {
            sideState.lastReason = protectionError;
            await this.maybeLogAutoTradeDecision(row, snapshot, spreadState, side, 'auto.close.skipped', protectionError);
            return false;
        }
        const stableTriggered = side === 'expand'
            ? isAutoCloseExpandTriggered(row, snapshot, spreadState)
            : isAutoCloseShrinkTriggered(row, snapshot, spreadState);
        if (!stableTriggered) {
            sideState.lastReason = getAutoClosePendingReason(row, snapshot, spreadState, side);
            return false;
        }
        sideState.closing = true;
        sideState.status = 'closing';
        sideState.lastReason = null;
        state.locked = true;
        const requestId = buildAutoTradeRequestId(row.id, side, 'close');
        const groupIds = groups
            .sort((a, b) => b.id - a.id)
            .slice(0, row.auto_close_batch_count)
            .map((group) => group.id);
        try {
            const result = await this.orderGroupService.batchCloseMany(groupIds);
            const now = Date.now();
            sideState.closing = false;
            sideState.status = 'close_cooldown';
            sideState.lastActionAt = now;
            sideState.lastCloseAt = now;
            sideState.cooldownUntil = now + row.auto_close_cooldown_seconds * 1000;
            sideState.lastError = null;
            sideState.lastReason = `自动平仓已执行，冷却 ${row.auto_close_cooldown_seconds} 秒后可再次触发`;
            state.locked = false;
            await this.writeAutoTradeLog({
                accountGroupId: row.account_group_id,
                subscriptionId: row.id,
                phase: 'execution',
                action: 'auto.close.executed',
                direction: side,
                level: 'info',
                runtimeState: sideState.status,
                longSpread: snapshot.longSpread,
                shortSpread: snapshot.shortSpread,
                longStableSeconds: getAutoTradeLongStableSeconds(spreadState),
                shortStableSeconds: getAutoTradeShrinkStableSeconds(spreadState),
                requestId,
                metadata: {
                    groupIds,
                    closedGroupIds: result.map((item) => item.id),
                },
            });
            await this.maybeNotifyAutoTradeExecution({
                row,
                level: 'info',
                action: 'auto.close.executed',
                side,
                reason: sideState.lastReason,
                snapshot,
                metadata: {
                    groupIds,
                    closedGroupIds: result.map((item) => item.id),
                },
            });
            return true;
        }
        catch (error) {
            const now = Date.now();
            sideState.closing = false;
            sideState.status = 'idle';
            sideState.lastActionAt = now;
            sideState.lastError = error instanceof Error ? error.message : String(error);
            sideState.lastReason = '自动平仓执行失败';
            state.locked = false;
            await this.writeAutoTradeLog({
                accountGroupId: row.account_group_id,
                subscriptionId: row.id,
                phase: 'execution',
                action: 'auto.close.failed',
                direction: side,
                level: 'error',
                reason: sideState.lastError,
                runtimeState: sideState.status,
                longSpread: snapshot.longSpread,
                shortSpread: snapshot.shortSpread,
                longStableSeconds: getAutoTradeLongStableSeconds(spreadState),
                shortStableSeconds: getAutoTradeShrinkStableSeconds(spreadState),
                requestId,
                metadata: { groupIds },
            });
            await this.maybeNotifyAutoTradeExecution({
                row,
                level: 'error',
                action: 'auto.close.failed',
                side,
                reason: sideState.lastError ?? sideState.lastReason ?? '自动平仓执行失败',
                snapshot,
                metadata: { groupIds, requestId },
            });
            return false;
        }
    }
    async maybeLogAutoTradeDecision(row, snapshot, spreadState, side, action, reason) {
        const key = `${row.id}:${side}:${action}:${reason}`;
        const now = Date.now();
        const last = this.lastAutoTradeDecisionAt.get(key) ?? 0;
        if (now - last < AUTO_TRADE_DECISION_LOG_COOLDOWN_MS)
            return;
        this.lastAutoTradeDecisionAt.set(key, now);
        await this.writeAutoTradeLog({
            accountGroupId: row.account_group_id,
            subscriptionId: row.id,
            phase: 'decision',
            action,
            direction: side,
            level: 'info',
            reason,
            longSpread: snapshot.longSpread,
            shortSpread: snapshot.shortSpread,
            longStableSeconds: getAutoTradeLongStableSeconds(spreadState),
            shortStableSeconds: getAutoTradeShrinkStableSeconds(spreadState),
        });
    }
    async findOpenGroupsForSubscription(subscriptionId, side, openGroups) {
        const groups = openGroups ?? await this.orderGroupService.listOpenRuntimeGroups();
        return this.filterOpenGroupsForSubscription(groups, subscriptionId, side);
    }
    async findSingleLegCandidateForSubscription(subscriptionId, snapshot, openGroups) {
        const groups = openGroups ?? await this.orderGroupService.listOpenRuntimeGroups();
        const candidates = groups
            .flatMap((group) => {
            const metadata = parseSpreadRemark(group.remark);
            if (metadata.subscriptionId !== subscriptionId || !metadata.direction)
                return [];
            const openItems = (group.items ?? []).filter((item) => item.status === 'open');
            if (openItems.length === 0)
                return [];
            if (openItems.length >= (group.itemCount || (group.items ?? []).length))
                return [];
            const side = metadata.direction === 'sellB_buyA' ? 'expand' : 'shrink';
            const currentSpread = side === 'expand' ? snapshot.longSpread : snapshot.shortSpread;
            const spreadDrift = typeof currentSpread === 'number' && typeof group.openSpread === 'number'
                ? roundNumber(Math.abs(currentSpread - group.openSpread))
                : null;
            return [{
                    group,
                    side,
                    currentSpread,
                    spreadDrift,
                    referenceTime: resolveSingleLegReferenceTime(group),
                }];
        })
            .sort((a, b) => b.referenceTime - a.referenceTime || b.group.id - a.group.id);
        return candidates[0] ?? null;
    }
    filterOpenGroupsForSubscription(groups, subscriptionId, side) {
        return groups.filter((group) => {
            if (group.isFullyClosed)
                return false;
            if ((group.items ?? []).some((item) => item.status === 'closing'))
                return false;
            const metadata = parseSpreadRemark(group.remark);
            if (metadata.subscriptionId !== subscriptionId)
                return false;
            if (side === 'expand')
                return metadata.direction === 'sellB_buyA';
            return metadata.direction === 'sellA_buyB';
        });
    }
    getSingleLegRuntimeState(groupId) {
        const existing = this.singleLegRuntimeByGroupId.get(groupId);
        if (existing)
            return existing;
        const created = {
            autoClosing: false,
            cooldownUntil: null,
            lastActionAt: null,
            retryCount: 0,
            lastReason: null,
            lastNotifiedAtByLevel: {},
        };
        this.singleLegRuntimeByGroupId.set(groupId, created);
        return created;
    }
    resetAutoTradePause(subscriptionId) {
        const runtime = this.autoTradeRuntimeById.get(subscriptionId);
        if (!runtime)
            return;
        runtime.paused = false;
        runtime.pauseReason = null;
        runtime.locked = false;
        for (const side of [runtime.expand, runtime.shrink]) {
            if (!side.opening && !side.closing && !isCooldownActive(side)) {
                side.status = 'idle';
            }
            if (!side.opening && !side.closing) {
                side.lastReason = null;
            }
            side.lastError = null;
        }
    }
    async maybeNotifySingleLeg(row, candidate, level, action, reason) {
        if (row.single_leg_notify_enabled !== 1)
            return;
        const levels = parseAutoTradeNotifyLevels(row.single_leg_notify_levels);
        if (!levels.includes(level))
            return;
        const channelIds = parseChannelIds(row.single_leg_notify_channel_ids);
        if (channelIds.length === 0)
            return;
        const runtime = this.getSingleLegRuntimeState(candidate.group.id);
        const now = Date.now();
        const lastNotifiedAt = runtime.lastNotifiedAtByLevel[level] ?? 0;
        if (now - lastNotifiedAt < AUTO_TRADE_DECISION_LOG_COOLDOWN_MS)
            return;
        const directionLabel = candidate.side === 'expand' ? '扩方向' : '缩方向';
        const driftText = candidate.spreadDrift === null ? '—' : String(candidate.spreadDrift);
        const currentSpreadText = candidate.currentSpread === null ? '—' : String(roundNumber(candidate.currentSpread));
        const result = await this.pushService.sendToChannels(channelIds, {
            title: `${row.name} · 单腿风险`,
            body: [
                `订单组 #${candidate.group.id} · ${directionLabel}`,
                reason,
                `当前价差 ${currentSpreadText}，偏移 ${driftText}`,
                `动作 ${action}`,
            ].join('\n\n'),
            level,
            metadata: {
                kind: 'auto-trade-single-leg',
                action,
                spreadSubscriptionId: row.id,
                accountGroupId: row.account_group_id,
                orderGroupId: candidate.group.id,
                direction: candidate.side,
                currentSpread: candidate.currentSpread,
                spreadDrift: candidate.spreadDrift,
            },
        });
        if (result.deliveredChannelIds.length > 0) {
            runtime.lastNotifiedAtByLevel[level] = now;
        }
    }
    async maybeNotifyAutoTradeExecution(input) {
        const { row, level, action, side, reason, snapshot, metadata } = input;
        if (row.single_leg_notify_enabled !== 1)
            return;
        const levels = parseAutoTradeNotifyLevels(row.single_leg_notify_levels);
        if (!levels.includes(level))
            return;
        const channelIds = parseChannelIds(row.single_leg_notify_channel_ids);
        if (channelIds.length === 0)
            return;
        const sideLabel = side === 'expand' ? '扩方向' : '缩方向';
        const spreadValue = side === 'expand' ? snapshot.longSpread : snapshot.shortSpread;
        const spreadText = spreadValue === null ? '—' : String(roundNumber(spreadValue));
        const actionLabel = toAutoTradeNotifyActionLabel(action);
        await this.pushService.sendToChannels(channelIds, {
            title: `${row.name} · ${actionLabel}`,
            body: [
                `${sideLabel} · 订阅 #${row.id}`,
                reason,
                `当前价差 ${spreadText}`,
                `动作 ${action}`,
            ].join('\n\n'),
            level,
            metadata: {
                kind: 'auto-trade',
                action,
                spreadSubscriptionId: row.id,
                accountGroupId: row.account_group_id,
                direction: side,
                currentSpread: spreadValue,
                ...metadata,
            },
        });
    }
}
function createAutoTradeSideRuntimeState() {
    return {
        status: 'idle',
        opening: false,
        closing: false,
        lastActionAt: null,
        lastOpenAt: null,
        lastCloseAt: null,
        cooldownUntil: null,
        lastReason: null,
        lastError: null,
    };
}
function getAutoTradeAvailabilityReason(row, group, snapshotStatus) {
    if (row.is_enabled !== 1)
        return '订阅已禁用';
    if (!group)
        return '账号组不存在';
    if (group.is_enabled !== 1)
        return '账号组已禁用';
    if (group.accountA.is_enabled !== 1)
        return 'A 账号已禁用';
    if (group.accountB.is_enabled !== 1)
        return 'B 账号已禁用';
    if (!group.accountA.session_id || !group.accountB.session_id)
        return 'A/B 账号未全部连接';
    if (snapshotStatus && snapshotStatus !== 'ready')
        return '实时价差未就绪';
    return null;
}
function applyAutoTradeAvailabilityReason(state, reason) {
    state.locked = true;
    for (const side of [state.expand, state.shrink]) {
        side.lastReason = reason;
        if (!side.opening && !side.closing && !isCooldownActive(side)) {
            side.status = 'idle';
        }
    }
}
function applyAutoTradePauseReason(state, reason) {
    state.locked = true;
    state.paused = true;
    state.pauseReason = reason;
    for (const side of [state.expand, state.shrink]) {
        if (!side.lastReason) {
            side.lastReason = reason;
        }
        if (!side.opening && !side.closing && !isCooldownActive(side)) {
            side.status = 'idle';
        }
    }
}
function applyAutoTradeFeatureDisabledReason(state) {
    state.locked = true;
    state.paused = false;
    state.pauseReason = null;
    for (const side of [state.expand, state.shrink]) {
        side.lastReason = '自动交易功能已临时关闭';
        if (!side.opening && !side.closing) {
            side.status = 'idle';
        }
    }
}
function pauseAutoTradeBySingleLeg(state, side, reason) {
    applyAutoTradePauseReason(state, reason);
    const otherSide = side === 'expand' ? state.shrink : state.expand;
    otherSide.lastReason = reason;
}
function buildSingleLegPauseReason() {
    return '检测到单腿风险，已暂停自动交易，请人工确认并保存配置后恢复';
}
function resolveSingleLegReferenceTime(group) {
    const timestamps = [
        Date.parse(group.updatedAt),
        Date.parse(group.createdAt),
        ...(group.items ?? []).flatMap((item) => [
            item.openedAt ? Date.parse(item.openedAt) : Number.NaN,
            item.closedAt ? Date.parse(item.closedAt) : Number.NaN,
        ]),
    ].filter((value) => Number.isFinite(value));
    return timestamps.length > 0 ? Math.max(...timestamps) : Date.now();
}
function buildSingleLegDetectedReason(candidate, timeoutSeconds) {
    const directionLabel = candidate.side === 'expand' ? '扩方向' : '缩方向';
    const driftText = candidate.spreadDrift === null ? '' : `，偏移 ${candidate.spreadDrift}`;
    return `检测到${directionLabel}单腿风险，已持续超过 ${timeoutSeconds} 秒${driftText}`;
}
function isSingleLegCooldownActive(state) {
    return (state.cooldownUntil ?? 0) > Date.now();
}
function getSingleLegCooldownRemainingSeconds(state) {
    if (!state.cooldownUntil)
        return 0;
    return Math.max(0, Math.ceil((state.cooldownUntil - Date.now()) / 1000));
}
function updateThresholdTracker(tracker, value, threshold, operator) {
    const matched = threshold !== null
        && value !== null
        && (operator === '<=' ? value <= threshold : value >= threshold);
    if (!matched) {
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
function parseAutoTradeNotifyLevels(raw) {
    if (!raw)
        return ['warn', 'error'];
    try {
        const parsed = JSON.parse(raw);
        const levels = Array.isArray(parsed)
            ? parsed.filter((item) => item === 'info' || item === 'warn' || item === 'error')
            : [];
        return levels.length > 0 ? [...new Set(levels)] : ['warn', 'error'];
    }
    catch {
        return ['warn', 'error'];
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
        autoTradeEnabled: input.autoTradeEnabled ?? false,
        autoOpenExpandEnabled: input.autoOpenExpandEnabled ?? false,
        autoOpenShrinkEnabled: input.autoOpenShrinkEnabled ?? false,
        targetExpandGroups: input.targetExpandGroups ?? 0,
        targetShrinkGroups: input.targetShrinkGroups ?? 0,
        autoOpenExpandThreshold: input.autoOpenExpandThreshold ?? input.notifyLongThreshold ?? null,
        autoOpenShrinkThreshold: input.autoOpenShrinkThreshold ?? input.notifyShortThreshold ?? null,
        autoOpenStabilitySeconds: input.autoOpenStabilitySeconds ?? input.notifyStabilitySeconds ?? 3,
        autoOpenCooldownSeconds: input.autoOpenCooldownSeconds ?? 15,
        autoCloseEnabled: input.autoCloseEnabled ?? false,
        autoCloseExpandEnabled: input.autoCloseExpandEnabled ?? false,
        autoCloseShrinkEnabled: input.autoCloseShrinkEnabled ?? false,
        autoCloseExpandProtection: input.autoCloseExpandProtection ?? null,
        autoCloseShrinkProtection: input.autoCloseShrinkProtection ?? null,
        autoCloseStabilitySeconds: input.autoCloseStabilitySeconds ?? 0,
        autoCloseBatchCount: input.autoCloseBatchCount ?? 1,
        autoCloseCooldownSeconds: input.autoCloseCooldownSeconds ?? 5,
        singleLegDetectEnabled: input.singleLegDetectEnabled ?? false,
        singleLegTimeoutSeconds: input.singleLegTimeoutSeconds ?? 5,
        singleLegPriceDriftThreshold: input.singleLegPriceDriftThreshold ?? null,
        autoCloseSingleLegEnabled: input.autoCloseSingleLegEnabled ?? false,
        autoCloseSingleLegCooldownSeconds: input.autoCloseSingleLegCooldownSeconds ?? 5,
        autoCloseSingleLegMaxRetries: input.autoCloseSingleLegMaxRetries ?? 1,
        singleLegNotifyEnabled: input.singleLegNotifyEnabled ?? false,
        singleLegNotifyChannelIds: dedupeChannelIds(input.singleLegNotifyChannelIds ?? []),
        singleLegNotifyLevels: dedupeAutoTradeNotifyLevels(input.singleLegNotifyLevels ?? ['warn', 'error']),
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
        autoTradeEnabled: input.autoTradeEnabled ?? existing.auto_trade_enabled === 1,
        autoOpenExpandEnabled: input.autoOpenExpandEnabled ?? existing.auto_open_expand_enabled === 1,
        autoOpenShrinkEnabled: input.autoOpenShrinkEnabled ?? existing.auto_open_shrink_enabled === 1,
        targetExpandGroups: input.targetExpandGroups ?? existing.target_expand_groups,
        targetShrinkGroups: input.targetShrinkGroups ?? existing.target_shrink_groups,
        autoOpenExpandThreshold: input.autoOpenExpandThreshold ?? existing.auto_open_expand_threshold,
        autoOpenShrinkThreshold: input.autoOpenShrinkThreshold ?? existing.auto_open_shrink_threshold,
        autoOpenStabilitySeconds: input.autoOpenStabilitySeconds ?? existing.auto_open_stability_seconds,
        autoOpenCooldownSeconds: input.autoOpenCooldownSeconds ?? existing.auto_open_cooldown_seconds,
        autoCloseEnabled: input.autoCloseEnabled ?? existing.auto_close_enabled === 1,
        autoCloseExpandEnabled: input.autoCloseExpandEnabled ?? existing.auto_close_expand_enabled === 1,
        autoCloseShrinkEnabled: input.autoCloseShrinkEnabled ?? existing.auto_close_shrink_enabled === 1,
        autoCloseExpandProtection: input.autoCloseExpandProtection ?? existing.auto_close_expand_protection,
        autoCloseShrinkProtection: input.autoCloseShrinkProtection ?? existing.auto_close_shrink_protection,
        autoCloseStabilitySeconds: input.autoCloseStabilitySeconds ?? existing.auto_close_stability_seconds ?? 0,
        autoCloseBatchCount: input.autoCloseBatchCount ?? existing.auto_close_batch_count,
        autoCloseCooldownSeconds: input.autoCloseCooldownSeconds ?? existing.auto_close_cooldown_seconds,
        singleLegDetectEnabled: input.singleLegDetectEnabled ?? existing.single_leg_detect_enabled === 1,
        singleLegTimeoutSeconds: input.singleLegTimeoutSeconds ?? existing.single_leg_timeout_seconds,
        singleLegPriceDriftThreshold: input.singleLegPriceDriftThreshold ?? existing.single_leg_price_drift_threshold,
        autoCloseSingleLegEnabled: input.autoCloseSingleLegEnabled ?? existing.auto_close_single_leg_enabled === 1,
        autoCloseSingleLegCooldownSeconds: input.autoCloseSingleLegCooldownSeconds ?? existing.auto_close_single_leg_cooldown_seconds,
        autoCloseSingleLegMaxRetries: input.autoCloseSingleLegMaxRetries ?? existing.auto_close_single_leg_max_retries,
        singleLegNotifyEnabled: input.singleLegNotifyEnabled ?? existing.single_leg_notify_enabled === 1,
        singleLegNotifyChannelIds: dedupeChannelIds(input.singleLegNotifyChannelIds ?? parseChannelIds(existing.single_leg_notify_channel_ids)),
        singleLegNotifyLevels: dedupeAutoTradeNotifyLevels(input.singleLegNotifyLevels ?? parseAutoTradeNotifyLevels(existing.single_leg_notify_levels)),
    };
}
function dedupeChannelIds(channelIds) {
    return [...new Set(channelIds.filter((id) => Number.isInteger(id) && id > 0))];
}
function dedupeAutoTradeNotifyLevels(levels) {
    const next = [...new Set(levels.filter((level) => level === 'info' || level === 'warn' || level === 'error'))];
    return next.length > 0 ? next : ['warn', 'error'];
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
    if (input.targetExpandGroups !== undefined && input.targetExpandGroups !== null && (!Number.isInteger(input.targetExpandGroups) || input.targetExpandGroups < 0)) {
        throw new ValidationError('targetExpandGroups 必须是大于等于 0 的整数');
    }
    if (input.targetShrinkGroups !== undefined && input.targetShrinkGroups !== null && (!Number.isInteger(input.targetShrinkGroups) || input.targetShrinkGroups < 0)) {
        throw new ValidationError('targetShrinkGroups 必须是大于等于 0 的整数');
    }
    if (input.autoOpenExpandThreshold !== undefined && input.autoOpenExpandThreshold !== null && input.autoOpenExpandThreshold < 0) {
        throw new ValidationError('autoOpenExpandThreshold 不能小于 0');
    }
    if (input.autoOpenShrinkThreshold !== undefined && input.autoOpenShrinkThreshold !== null && input.autoOpenShrinkThreshold < 0) {
        throw new ValidationError('autoOpenShrinkThreshold 不能小于 0');
    }
    if (!Number.isInteger(input.autoOpenStabilitySeconds) || input.autoOpenStabilitySeconds < 0) {
        throw new ValidationError('autoOpenStabilitySeconds 必须是大于等于 0 的整数');
    }
    if (!Number.isInteger(input.autoOpenCooldownSeconds) || input.autoOpenCooldownSeconds < 0) {
        throw new ValidationError('autoOpenCooldownSeconds 必须是大于等于 0 的整数');
    }
    if (input.autoCloseExpandProtection !== undefined && input.autoCloseExpandProtection !== null && input.autoCloseExpandProtection < 0) {
        throw new ValidationError('autoCloseExpandProtection 不能小于 0');
    }
    if (input.autoCloseShrinkProtection !== undefined && input.autoCloseShrinkProtection !== null && input.autoCloseShrinkProtection < 0) {
        throw new ValidationError('autoCloseShrinkProtection 不能小于 0');
    }
    if (!Number.isInteger(input.autoCloseStabilitySeconds) || input.autoCloseStabilitySeconds < 0) {
        throw new ValidationError('autoCloseStabilitySeconds 必须是大于等于 0 的整数');
    }
    if (!Number.isInteger(input.autoCloseBatchCount) || input.autoCloseBatchCount < 1) {
        throw new ValidationError('autoCloseBatchCount 必须是大于等于 1 的整数');
    }
    if (!Number.isInteger(input.autoCloseCooldownSeconds) || input.autoCloseCooldownSeconds < 0) {
        throw new ValidationError('autoCloseCooldownSeconds 必须是大于等于 0 的整数');
    }
    if (!Number.isInteger(input.singleLegTimeoutSeconds) || input.singleLegTimeoutSeconds < 0) {
        throw new ValidationError('singleLegTimeoutSeconds 必须是大于等于 0 的整数');
    }
    if (input.singleLegPriceDriftThreshold !== undefined && input.singleLegPriceDriftThreshold !== null && input.singleLegPriceDriftThreshold < 0) {
        throw new ValidationError('singleLegPriceDriftThreshold 不能小于 0');
    }
    if (!Number.isInteger(input.autoCloseSingleLegCooldownSeconds) || input.autoCloseSingleLegCooldownSeconds < 0) {
        throw new ValidationError('autoCloseSingleLegCooldownSeconds 必须是大于等于 0 的整数');
    }
    if (!Number.isInteger(input.autoCloseSingleLegMaxRetries) || input.autoCloseSingleLegMaxRetries < 0) {
        throw new ValidationError('autoCloseSingleLegMaxRetries 必须是大于等于 0 的整数');
    }
    if (input.singleLegNotifyLevels && input.singleLegNotifyLevels.length === 0) {
        throw new ValidationError('singleLegNotifyLevels 至少要保留一个通知级别');
    }
}
function roundNumber(value) {
    return Math.round(value * 100000) / 100000;
}
function toSpreadDirectionLabel(direction) {
    return direction === 'sellA_buyB' ? 'A卖B买' : 'A买B卖';
}
function toAutoTradeNotifyActionLabel(action) {
    switch (action) {
        case 'auto.open.executed':
            return '自动开仓已执行';
        case 'auto.open.failed':
            return '自动开仓失败';
        case 'auto.close.executed':
            return '自动平仓已执行';
        case 'auto.close.failed':
            return '自动平仓失败';
        case 'single-leg.detected':
            return '单腿风险已确认';
        case 'single-leg.auto-close.executed':
            return '自动平单腿已执行';
        case 'single-leg.auto-close.failed':
            return '自动平单腿失败';
        default:
            return action;
    }
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
function buildSpreadChartCandles(barsA, barsB, lotRatio) {
    const byTimeB = new Map(barsB.map((bar) => [normalizeBarTime(bar.time), bar]));
    return [...barsA]
        .sort((a, b) => Date.parse(a.time) - Date.parse(b.time))
        .flatMap((barA) => {
        const time = normalizeBarTime(barA.time);
        const barB = byTimeB.get(time);
        if (!barB)
            return [];
        const open = roundNumber(barA.openPrice - lotRatio * barB.openPrice);
        const close = roundNumber(barA.closePrice - lotRatio * barB.closePrice);
        const high = roundNumber(Math.max(open, close, barA.highPrice - lotRatio * barB.lowPrice));
        const low = roundNumber(Math.min(open, close, barA.lowPrice - lotRatio * barB.highPrice));
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
function getSpreadLotRatio(row) {
    const lotsA = row.lots_a > 0 ? row.lots_a : 1;
    const lotsB = row.lots_b ?? lotsA;
    return lotsB / lotsA;
}
function buildSpreadFormula(row, direction) {
    const lotRatio = getSpreadLotRatio(row);
    const ratioText = lotRatio === 1 ? '' : `${roundNumber(lotRatio)} * `;
    return direction === 'long'
        ? `a.ask - ${ratioText}b.bid`
        : `a.bid - ${ratioText}b.ask`;
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
function validateSecondLineSeedQuery(seconds) {
    if (!Number.isInteger(seconds) || seconds < 10 || seconds > SPREAD_SECOND_POINT_RETENTION_SECONDS) {
        throw new ValidationError(`seconds 必须是 10 到 ${SPREAD_SECOND_POINT_RETENTION_SECONDS} 之间的整数`);
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
        autoTrade: {
            enabled: row.auto_trade_enabled === 1,
            autoOpenExpandEnabled: row.auto_open_expand_enabled === 1,
            autoOpenShrinkEnabled: row.auto_open_shrink_enabled === 1,
            targetExpandGroups: row.target_expand_groups,
            targetShrinkGroups: row.target_shrink_groups,
            autoOpenExpandThreshold: row.auto_open_expand_threshold,
            autoOpenShrinkThreshold: row.auto_open_shrink_threshold,
            autoOpenStabilitySeconds: row.auto_open_stability_seconds,
            autoOpenCooldownSeconds: row.auto_open_cooldown_seconds,
            autoCloseEnabled: row.auto_close_enabled === 1,
            autoCloseExpandEnabled: row.auto_close_expand_enabled === 1,
            autoCloseShrinkEnabled: row.auto_close_shrink_enabled === 1,
            autoCloseExpandProtection: row.auto_close_expand_protection,
            autoCloseShrinkProtection: row.auto_close_shrink_protection,
            autoCloseStabilitySeconds: row.auto_close_stability_seconds,
            autoCloseBatchCount: row.auto_close_batch_count,
            autoCloseCooldownSeconds: row.auto_close_cooldown_seconds,
            singleLegDetectEnabled: row.single_leg_detect_enabled === 1,
            singleLegTimeoutSeconds: row.single_leg_timeout_seconds,
            singleLegPriceDriftThreshold: row.single_leg_price_drift_threshold,
            autoCloseSingleLegEnabled: row.auto_close_single_leg_enabled === 1,
            autoCloseSingleLegCooldownSeconds: row.auto_close_single_leg_cooldown_seconds,
            autoCloseSingleLegMaxRetries: row.auto_close_single_leg_max_retries,
            singleLegNotifyEnabled: row.single_leg_notify_enabled === 1,
            singleLegNotifyChannelIds: parseChannelIds(row.single_leg_notify_channel_ids),
            singleLegNotifyLevels: parseAutoTradeNotifyLevels(row.single_leg_notify_levels),
        },
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
function toAutoTradeLogDto(row) {
    return {
        id: row.id,
        accountGroupId: row.account_group_id,
        subscriptionId: row.subscription_id,
        phase: row.phase,
        action: row.action,
        direction: row.direction,
        level: row.level,
        reason: row.reason,
        runtimeState: row.runtime_state,
        longSpread: row.long_spread,
        shortSpread: row.short_spread,
        longStableSeconds: row.long_stable_seconds,
        shortStableSeconds: row.short_stable_seconds,
        requestId: row.request_id,
        metadata: parseLogMetadata(row.metadata),
        createdAt: row.created_at,
    };
}
function parseLogMetadata(raw) {
    if (!raw)
        return null;
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed
            : null;
    }
    catch {
        return null;
    }
}
function getTrackerStableSeconds(tracker) {
    if (tracker.activeSince === null)
        return 0;
    return roundNumber((Date.now() - tracker.activeSince) / 1000);
}
function getCooldownRemainingSeconds(side) {
    if (!side.cooldownUntil)
        return 0;
    return Math.max(0, roundNumber((side.cooldownUntil - Date.now()) / 1000));
}
function getAutoTradeLongStableSeconds(state) {
    return getTrackerStableSeconds(state.autoOpenExpandTracker);
}
function getAutoTradeShrinkStableSeconds(state) {
    return getTrackerStableSeconds(state.autoOpenShrinkTracker);
}
function getAutoOpenPendingReason(row, snapshot, state, side) {
    if (side === 'expand') {
        if (row.auto_open_expand_threshold === null)
            return '未配置自动开扩阈值';
        if (snapshot.longSpread === null)
            return '当前扩价缺失，无法判断自动开扩';
        if (snapshot.longSpread > row.auto_open_expand_threshold) {
            return `当前扩价 ${roundNumber(snapshot.longSpread)} 未低于自动开扩阈值 ${roundNumber(row.auto_open_expand_threshold)}`;
        }
        const stable = getAutoTradeLongStableSeconds(state);
        return `当前已满足开扩阈值，稳定 ${stable} 秒 / 需 ${row.auto_open_stability_seconds} 秒`;
    }
    if (row.auto_open_shrink_threshold === null)
        return '未配置自动开缩阈值';
    if (snapshot.shortSpread === null)
        return '当前缩价缺失，无法判断自动开缩';
    if (snapshot.shortSpread < row.auto_open_shrink_threshold) {
        return `当前缩价 ${roundNumber(snapshot.shortSpread)} 未高于自动开缩阈值 ${roundNumber(row.auto_open_shrink_threshold)}`;
    }
    const stable = getAutoTradeShrinkStableSeconds(state);
    return `当前已满足开缩阈值，稳定 ${stable} 秒 / 需 ${row.auto_open_stability_seconds} 秒`;
}
function getAutoClosePendingReason(row, snapshot, state, side) {
    const requiredSeconds = row.auto_close_stability_seconds ?? 0;
    if (side === 'expand') {
        const stable = getAutoTradeLongStableSeconds(state);
        return `当前已满足平扩保护条件，稳定 ${stable} 秒 / 需 ${requiredSeconds} 秒`;
    }
    const stable = getAutoTradeShrinkStableSeconds(state);
    return `当前已满足平缩保护条件，稳定 ${stable} 秒 / 需 ${requiredSeconds} 秒`;
}
function isAutoOpenExpandTriggered(row, snapshot, state) {
    return row.auto_open_expand_threshold !== null
        && snapshot.longSpread !== null
        && snapshot.longSpread <= row.auto_open_expand_threshold
        && getAutoTradeLongStableSeconds(state) >= row.auto_open_stability_seconds;
}
function isAutoOpenShrinkTriggered(row, snapshot, state) {
    return row.auto_open_shrink_threshold !== null
        && snapshot.shortSpread !== null
        && snapshot.shortSpread >= row.auto_open_shrink_threshold
        && getAutoTradeShrinkStableSeconds(state) >= row.auto_open_stability_seconds;
}
function isAutoCloseExpandTriggered(row, snapshot, state) {
    const requiredSeconds = row.auto_close_stability_seconds ?? 0;
    return row.auto_close_expand_protection !== null
        && snapshot.longSpread !== null
        && getAutoTradeLongStableSeconds(state) >= requiredSeconds;
}
function isAutoCloseShrinkTriggered(row, snapshot, state) {
    const requiredSeconds = row.auto_close_stability_seconds ?? 0;
    return row.auto_close_shrink_protection !== null
        && snapshot.shortSpread !== null
        && getAutoTradeShrinkStableSeconds(state) >= requiredSeconds;
}
function getAutoCloseProtectionError(row, snapshot, side) {
    const spreadAdj = (snapshot.longSpread ?? 0) - (snapshot.shortSpread ?? 0);
    if (side === 'expand') {
        const protection = row.auto_close_expand_protection;
        if (protection === null)
            return '未配置自动平扩保护价';
        const limitPrice = protection + spreadAdj;
        if (snapshot.shortSpread !== null && limitPrice <= snapshot.shortSpread) {
            return `平扩限制价 ${roundNumber(limitPrice)} 需高于当前缩价 ${roundNumber(snapshot.shortSpread)}`;
        }
        if (snapshot.longSpread === null || snapshot.longSpread <= limitPrice) {
            return `当前扩价 ${snapshot.longSpread === null ? '—' : roundNumber(snapshot.longSpread)} 未高于平扩限制价 ${roundNumber(limitPrice)}`;
        }
        return '';
    }
    const protection = row.auto_close_shrink_protection;
    if (protection === null)
        return '未配置自动平缩保护价';
    const shrinkClosePrice = protection - spreadAdj;
    if (snapshot.longSpread !== null && shrinkClosePrice >= snapshot.longSpread) {
        return `平缩限制价 ${roundNumber(shrinkClosePrice)} 需低于当前扩价 ${roundNumber(snapshot.longSpread)}`;
    }
    if (snapshot.shortSpread === null || snapshot.shortSpread >= shrinkClosePrice) {
        return `当前缩价 ${snapshot.shortSpread === null ? '—' : roundNumber(snapshot.shortSpread)} 未低于平缩限制价 ${roundNumber(shrinkClosePrice)}`;
    }
    return '';
}
function buildAutoTradeRequestId(subscriptionId, side, action) {
    return `auto-${action}-${side}-${subscriptionId}-${Date.now()}`;
}
function isCooldownActive(side) {
    if (!side.cooldownUntil)
        return false;
    const active = side.cooldownUntil > Date.now();
    if (!active) {
        side.cooldownUntil = null;
    }
    return active;
}
function toAutoTradeSideRuntimeDto(side, currentGroupCount, targetGroupCount) {
    const now = Date.now();
    return {
        status: isCooldownActive(side)
            ? side.status
            : side.opening
                ? 'opening'
                : side.closing
                    ? 'closing'
                    : 'idle',
        opening: side.opening,
        closing: side.closing,
        cooldownRemainingSeconds: side.cooldownUntil ? Math.max(0, roundNumber((side.cooldownUntil - now) / 1000)) : 0,
        lastActionAt: side.lastActionAt ? new Date(side.lastActionAt).toISOString() : null,
        lastOpenAt: side.lastOpenAt ? new Date(side.lastOpenAt).toISOString() : null,
        lastCloseAt: side.lastCloseAt ? new Date(side.lastCloseAt).toISOString() : null,
        lastReason: side.lastReason,
        lastError: side.lastError,
        currentGroupCount,
        targetGroupCount,
    };
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
function toPanelAccount(account) {
    return {
        id: account.id,
        login: account.login,
        label: account.label,
        sessionId: account.session_id,
    };
}
//# sourceMappingURL=spread.service.js.map