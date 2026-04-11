export function registerRealtimeGateway(app, wsManager, spreadService, orderGroupService, realtimeApp) {
    const clients = new Set();
    let messageSeq = 0;
    function createOutboundMessage(type, payload) {
        messageSeq += 1;
        return JSON.stringify({
            id: messageSeq,
            serverTime: new Date().toISOString(),
            type,
            data: payload,
        });
    }
    function sendSpreadSubscribed(client) {
        if (client.ws.readyState !== client.ws.OPEN)
            return;
        client.ws.send(createOutboundMessage('spreadSubscribed', {
            subscriptionIds: [...client.subscribedSpreadIds].sort((a, b) => a - b),
        }));
    }
    function sendSpreadSnapshotMessage(client, payload) {
        if (client.ws.readyState !== client.ws.OPEN)
            return;
        client.ws.send(createOutboundMessage('spreadSnapshot', payload));
    }
    function buildOrderGroupSnapshotPayload(accountGroupId) {
        const groups = (realtimeApp?.listOrderGroups() ?? [])
            .map((state) => state.group)
            .filter((group) => accountGroupId == null || group.accountGroupId === accountGroupId);
        return { groups };
    }
    function sendOrderGroupSnapshot(client, accountGroupId) {
        if (!realtimeApp || client.ws.readyState !== client.ws.OPEN)
            return;
        client.ws.send(createOutboundMessage('orderGroupSnapshot', buildOrderGroupSnapshotPayload(accountGroupId)));
    }
    function handleSpreadUpdate(payload) {
        const message = createOutboundMessage('spreadUpdate', {
            subscriptionId: payload.subscriptionId,
            accountGroupId: payload.accountGroupId,
            snapshot: payload.snapshot,
        });
        for (const client of clients) {
            if (!client.subscribedSpreadIds.has(payload.subscriptionId))
                continue;
            if (client.ws.readyState === client.ws.OPEN) {
                client.ws.send(message);
            }
        }
    }
    function handleSpreadHeartbeat(payload) {
        const message = createOutboundMessage('spreadHeartbeat', {
            subscriptionId: payload.subscriptionId,
            accountGroupId: payload.accountGroupId,
            accountAHeartbeat: payload.accountAHeartbeat,
            accountBHeartbeat: payload.accountBHeartbeat,
        });
        for (const client of clients) {
            if (!client.subscribedSpreadIds.has(payload.subscriptionId))
                continue;
            if (client.ws.readyState === client.ws.OPEN) {
                client.ws.send(message);
            }
        }
    }
    ;
    [
        'disconnected',
        'error',
        'connectProgress',
        'quoteHistory',
        'tickHistory',
        'orderBook',
        'orderProgress',
        'orderHistory',
        'symbolUpdate',
        'symbolsUpdate',
    ].forEach(event => {
        wsManager.on(event, (data) => {
            const payload = createOutboundMessage(event, data);
            for (const client of clients) {
                if (client.ws.readyState === client.ws.OPEN) {
                    client.ws.send(payload);
                }
            }
        });
    });
    if (realtimeApp) {
        realtimeApp.on('orderUpdate', (payload) => {
            const message = createOutboundMessage('orderUpdate', payload);
            for (const client of clients) {
                if (client.ws.readyState === client.ws.OPEN) {
                    client.ws.send(message);
                }
            }
        });
        realtimeApp.on('orderUpdateSnapshot', (payload) => {
            const message = createOutboundMessage('orderUpdateSnapshot', payload);
            for (const client of clients) {
                if (client.ws.readyState === client.ws.OPEN) {
                    client.ws.send(message);
                }
            }
        });
        realtimeApp.on('orderGroupUpdate', (payload) => {
            const message = createOutboundMessage('orderGroupUpdate', {
                group: payload.group,
            });
            for (const client of clients) {
                if (client.ws.readyState === client.ws.OPEN) {
                    client.ws.send(message);
                }
            }
        });
        realtimeApp.on('orderGroupRemove', (payload) => {
            const message = createOutboundMessage('orderGroupRemove', payload);
            for (const client of clients) {
                if (client.ws.readyState === client.ws.OPEN) {
                    client.ws.send(message);
                }
            }
        });
        realtimeApp.on('spreadUpdate', handleSpreadUpdate);
        realtimeApp.on('spreadHeartbeat', handleSpreadHeartbeat);
        realtimeApp.on('spreadRuntimeState', (payload) => {
            for (const client of clients) {
                if (payload.runtimeStarted) {
                    client.subscribedSpreadIds.add(payload.subscriptionId);
                }
                else {
                    client.subscribedSpreadIds.delete(payload.subscriptionId);
                }
                sendSpreadSubscribed(client);
            }
        });
    }
    else {
        spreadService.on('spreadUpdate', (payload) => {
            const message = createOutboundMessage('spreadUpdate', payload);
            for (const client of clients) {
                if (!client.subscribedSpreadIds.has(payload.subscriptionId))
                    continue;
                if (client.ws.readyState === client.ws.OPEN) {
                    client.ws.send(message);
                }
            }
        });
        spreadService.on('spreadHeartbeat', (payload) => {
            const message = createOutboundMessage('spreadHeartbeat', payload);
            for (const client of clients) {
                if (!client.subscribedSpreadIds.has(payload.subscriptionId))
                    continue;
                if (client.ws.readyState === client.ws.OPEN) {
                    client.ws.send(message);
                }
            }
        });
        spreadService.on('spreadRuntimeState', (payload) => {
            for (const client of clients) {
                if (payload.runtimeStarted) {
                    client.subscribedSpreadIds.add(payload.subscriptionId);
                }
                else {
                    client.subscribedSpreadIds.delete(payload.subscriptionId);
                }
                sendSpreadSubscribed(client);
            }
        });
        wsManager.on('orderUpdate', (payload) => {
            const message = createOutboundMessage('orderUpdate', payload);
            for (const client of clients) {
                if (client.ws.readyState === client.ws.OPEN) {
                    client.ws.send(message);
                }
            }
        });
        wsManager.on('orderUpdateSnapshot', (payload) => {
            const message = createOutboundMessage('orderUpdateSnapshot', payload);
            for (const client of clients) {
                if (client.ws.readyState === client.ws.OPEN) {
                    client.ws.send(message);
                }
            }
        });
    }
    realtimeApp?.on('accountStatusUpdate', (payload) => {
        const message = createOutboundMessage('accountStatusUpdate', payload);
        for (const client of clients) {
            if (client.ws.readyState === client.ws.OPEN) {
                client.ws.send(message);
            }
        }
    });
    app.get('/api/v1/stream/ws', {
        websocket: true,
        schema: {
            tags: ['Stream'],
            summary: '下游实时报价与价差订阅 WebSocket',
            description: [
                '统一的下游 WebSocket 端点，前端连接后可同时接收普通报价、订单更新和账号组价差订阅推送。',
                '',
                '连接地址：',
                '`ws://<host>/api/v1/stream/ws?api_key=<API_SECRET>`（浏览器 WebSocket 无法自定义请求头，须用查询参数；亦可使用带 `Authorization: Bearer` 的客户端）',
                '若站点启用 HTTPS，则使用：`wss://<host>/api/v1/stream/ws?api_key=...`',
                '',
                '客户端可发送消息：',
                '```json',
                '{ "action": "subscribe", "data": { "symbols": ["EURUSD", "XAUUSD"] } }',
                '```',
                '```json',
                '{ "action": "unsubscribe", "data": { "symbols": ["EURUSD"] } }',
                '```',
                '```json',
                '{ "action": "subscribeSpread", "data": { "subscriptionIds": [12, 13] } }',
                '```',
                '```json',
                '{ "action": "unsubscribeSpread", "data": { "subscriptionIds": [12] } }',
                '```',
                '```json',
                '{ "action": "requestOrderGroups", "data": { "accountGroupId": 1 } }',
                '```',
                '```json',
                '{ "action": "wsHeartbeat", "data": { "clientSentAt": 1710000000000 } }',
                '```',
                '```json',
                '{ "action": "placeSpreadOrder", "data": { "requestId": "req-1", "accountGroupId": 1, "subscriptionId": 12, "direction": "sellA_buyB", "lotsA": 0.1, "lotsB": 0.1 } }',
                '```',
                '```json',
                '{ "action": "closeOrderGroup", "data": { "requestId": "req-2", "groupId": 101 } }',
                '```',
                '```json',
                '{ "action": "closeOrderGroups", "data": { "requestId": "req-3", "groupIds": [101, 102] } }',
                '```',
                '',
                '服务端确认消息：',
                '```json',
                '{ "type": "subscribed", "data": { "symbols": ["EURUSD", "XAUUSD"] } }',
                '```',
                '```json',
                '{ "type": "spreadSubscribed", "data": { "subscriptionIds": [12, 13] } }',
                '```',
                '```json',
                '{ "type": "orderGroupSnapshot", "data": { "groups": [] } }',
                '```',
                '```json',
                '{ "type": "spreadOrderResult", "data": { "requestId": "req-1", "status": "ok", "orderGroup": {} } }',
                '```',
                '```json',
                '{ "type": "orderGroupCloseResult", "data": { "requestId": "req-2", "status": "ok", "group": {} } }',
                '```',
                '```json',
                '{ "type": "orderGroupCloseManyResult", "data": { "requestId": "req-3", "status": "ok", "groups": [] } }',
                '```',
                '',
                'WS 系统消息：',
                '- `wsHeartbeat`：客户端发起的心跳回包，含 `clientSentAt / serverReceivedAt / serverSentAt`（用于估算 WS 延迟），并在有实时模块时附带 `wsHeartbeats`（当前各账号 MT5 会话心跳快照，与原先独立 `wsHeartBeat` 推送内容一致）',
                '',
                '订单组推送消息：',
                '- `orderGroupSnapshot`：连接建立后或显式 `requestOrderGroups` 时返回当前内存中的未完全平仓订单组',
                '- `orderGroupUpdate`：订单组创建、开仓、平仓后推送最新未完全平仓状态',
                '- `orderGroupRemove`：订单组已完全平仓或被删除时推送移除消息',
                '',
                '价差订阅推送消息：',
                '- `spreadSnapshot`：订阅成功后立即返回一次当前快照',
                '- `spreadUpdate`：A / B 任一价格变化时立即推送',
                '- `spreadHeartbeat`：每 100ms 推送一次轻量心跳，只返回 A / B 两腿的 heartbeat 计数',
                '- `spreadOrderResult`：通过 WS 下发扩/缩交易命令后的同步结果回包',
                '- `orderGroupCloseResult`：通过 WS 下发单个订单组平仓命令后的同步结果回包',
                '- `orderGroupCloseManyResult`：通过 WS 下发批量订单组平仓命令后的同步结果回包',
            ].join('\n'),
            response: {
                101: {
                    type: 'null',
                    description: 'Switching Protocols，WebSocket 连接建立成功',
                },
            },
        },
    }, (socket) => {
        const state = { ws: socket, subscribedSymbols: new Set(), subscribedSpreadIds: new Set() };
        clients.add(state);
        if (realtimeApp && socket.readyState === socket.OPEN) {
            socket.send(createOutboundMessage('accountStatusSnapshot', realtimeApp.getAccountSnapshot()));
            for (const orderState of realtimeApp.listOrderStates()) {
                socket.send(createOutboundMessage('orderUpdateSnapshot', {
                    accountId: orderState.accountId,
                    sessionId: orderState.sessionId,
                    data: orderState.orders,
                }));
            }
            sendOrderGroupSnapshot(state);
        }
        const runtimeSubscriptionIds = realtimeApp?.getRuntimeSubscriptionIds()
            ?? spreadService.getRuntimeSubscriptionIds();
        for (const subscriptionId of runtimeSubscriptionIds) {
            state.subscribedSpreadIds.add(subscriptionId);
            const snapshot = realtimeApp?.getSpreadSnapshot(subscriptionId)
                ?? spreadService.getSnapshot(subscriptionId);
            if (snapshot && socket.readyState === socket.OPEN) {
                sendSpreadSnapshotMessage(state, {
                    subscriptionId,
                    accountGroupId: snapshot.subscription.accountGroupId,
                    snapshot,
                });
            }
        }
        sendSpreadSubscribed(state);
        socket.on('message', (raw) => {
            try {
                const msg = JSON.parse(String(raw));
                if (msg.action === 'subscribe' || msg.action === 'unsubscribe') {
                    const symbols = Array.isArray(msg.data?.symbols)
                        ? msg.data.symbols
                        : Array.isArray(msg.symbols)
                            ? msg.symbols
                            : null;
                    if (!symbols)
                        return;
                    if (msg.action === 'subscribe') {
                        for (const s of symbols)
                            state.subscribedSymbols.add(s);
                        socket.send(createOutboundMessage('subscribed', {
                            symbols: [...state.subscribedSymbols],
                        }));
                    }
                    else {
                        for (const s of symbols)
                            state.subscribedSymbols.delete(s);
                        socket.send(createOutboundMessage('unsubscribed', {
                            symbols,
                        }));
                    }
                    return;
                }
                if (msg.action === 'subscribeSpread' || msg.action === 'unsubscribeSpread') {
                    const subscriptionIds = Array.isArray(msg.data?.subscriptionIds)
                        ? msg.data.subscriptionIds
                        : Array.isArray(msg.subscriptionIds)
                            ? msg.subscriptionIds
                            : null;
                    if (!subscriptionIds)
                        return;
                    if (msg.action === 'subscribeSpread') {
                        const rejectedIds = [];
                        for (const id of subscriptionIds) {
                            if (!Number.isInteger(id) || id <= 0)
                                continue;
                            const snapshot = realtimeApp?.getSpreadSnapshot(id) ?? spreadService.getSnapshot(id);
                            if (!snapshot) {
                                rejectedIds.push(id);
                                continue;
                            }
                            state.subscribedSpreadIds.add(id);
                            sendSpreadSnapshotMessage(state, {
                                subscriptionId: id,
                                accountGroupId: snapshot.subscription.accountGroupId,
                                snapshot,
                            });
                        }
                        sendSpreadSubscribed(state);
                        if (rejectedIds.length > 0) {
                            socket.send(createOutboundMessage('spreadSubscribeRejected', {
                                subscriptionIds: rejectedIds,
                                reason: 'subscription_not_running',
                            }));
                        }
                    }
                    else {
                        for (const id of subscriptionIds)
                            state.subscribedSpreadIds.delete(id);
                        socket.send(createOutboundMessage('spreadUnsubscribed', { subscriptionIds }));
                        sendSpreadSubscribed(state);
                    }
                    return;
                }
                if (msg.action === 'requestOrderGroups') {
                    sendOrderGroupSnapshot(state, msg.data?.accountGroupId ?? null);
                    return;
                }
                if (msg.action === 'wsHeartbeat') {
                    const clientSentAt = typeof msg.data?.clientSentAt === 'number' ? msg.data.clientSentAt : Number.NaN;
                    if (!Number.isFinite(clientSentAt))
                        return;
                    const serverReceivedAt = Date.now();
                    const serverSentAt = Date.now();
                    const payload = {
                        clientSentAt,
                        serverReceivedAt,
                        serverSentAt,
                    };
                    if (realtimeApp) {
                        payload.wsHeartbeats = realtimeApp.listWsHeartBeats();
                    }
                    socket.send(createOutboundMessage('wsHeartbeat', payload));
                    return;
                }
                if (msg.action === 'closeOrderGroup') {
                    const data = msg.data;
                    const requestId = typeof data?.requestId === 'string' ? data.requestId : null;
                    const groupId = typeof data?.groupId === 'number' ? data.groupId : Number.NaN;
                    const tickets = Array.isArray(data?.tickets)
                        ? data.tickets.filter((ticket) => Number.isInteger(ticket) && ticket > 0)
                        : undefined;
                    const reverseOpen = data?.reverseOpen === true;
                    if (!Number.isInteger(groupId) || groupId <= 0) {
                        socket.send(createOutboundMessage('orderGroupCloseResult', {
                            requestId,
                            status: 'error',
                            message: 'Invalid close order group payload',
                        }));
                        return;
                    }
                    void (async () => {
                        try {
                            const group = await orderGroupService.batchClose(groupId, tickets, { reverseOpen });
                            if (socket.readyState === socket.OPEN) {
                                socket.send(createOutboundMessage('orderGroupCloseResult', {
                                    requestId,
                                    status: 'ok',
                                    group,
                                }));
                            }
                        }
                        catch (error) {
                            if (socket.readyState === socket.OPEN) {
                                socket.send(createOutboundMessage('orderGroupCloseResult', {
                                    requestId,
                                    status: 'error',
                                    message: error instanceof Error ? error.message : String(error),
                                }));
                            }
                        }
                    })();
                    return;
                }
                if (msg.action === 'closeOrderGroups') {
                    const data = msg.data;
                    const requestId = typeof data?.requestId === 'string' ? data.requestId : null;
                    const groupIds = Array.isArray(data?.groupIds)
                        ? data.groupIds.filter((groupId) => Number.isInteger(groupId) && groupId > 0)
                        : [];
                    const reverseOpen = data?.reverseOpen === true;
                    if (groupIds.length === 0) {
                        socket.send(createOutboundMessage('orderGroupCloseManyResult', {
                            requestId,
                            status: 'error',
                            message: 'Invalid close order groups payload',
                        }));
                        return;
                    }
                    void (async () => {
                        try {
                            const groups = await orderGroupService.batchCloseMany(groupIds, { reverseOpen });
                            if (socket.readyState === socket.OPEN) {
                                socket.send(createOutboundMessage('orderGroupCloseManyResult', {
                                    requestId,
                                    status: 'ok',
                                    groups,
                                }));
                            }
                        }
                        catch (error) {
                            if (socket.readyState === socket.OPEN) {
                                socket.send(createOutboundMessage('orderGroupCloseManyResult', {
                                    requestId,
                                    status: 'error',
                                    message: error instanceof Error ? error.message : String(error),
                                }));
                            }
                        }
                    })();
                    return;
                }
                if (msg.action === 'placeSpreadOrder') {
                    const data = msg.data;
                    const requestId = typeof data?.requestId === 'string' ? data.requestId : null;
                    const accountGroupId = typeof data?.accountGroupId === 'number' ? data.accountGroupId : Number.NaN;
                    const subscriptionId = typeof data?.subscriptionId === 'number' ? data.subscriptionId : Number.NaN;
                    const lotsA = typeof data?.lotsA === 'number' ? data.lotsA : Number.NaN;
                    const direction = data?.direction;
                    if (!Number.isInteger(accountGroupId)
                        || accountGroupId <= 0
                        || !Number.isInteger(subscriptionId)
                        || subscriptionId <= 0
                        || !(direction === 'sellA_buyB' || direction === 'sellB_buyA')
                        || !Number.isFinite(lotsA)
                        || lotsA <= 0) {
                        socket.send(createOutboundMessage('spreadOrderResult', {
                            requestId,
                            status: 'error',
                            message: 'Invalid spread order payload',
                        }));
                        return;
                    }
                    void (async () => {
                        try {
                            const orderGroup = await spreadService.placeOrder(accountGroupId, {
                                subscriptionId,
                                direction,
                                lotsA,
                                ...(typeof data?.lotsB === 'number' ? { lotsB: data.lotsB } : {}),
                                ...(typeof data?.comment === 'string' ? { comment: data.comment } : {}),
                                ...(typeof data?.orderGroupName === 'string' ? { orderGroupName: data.orderGroupName } : {}),
                                ...(typeof data?.remark === 'string' ? { remark: data.remark } : {}),
                                ...(typeof data?.slA === 'number' ? { slA: data.slA } : {}),
                                ...(typeof data?.tpA === 'number' ? { tpA: data.tpA } : {}),
                                ...(typeof data?.slB === 'number' ? { slB: data.slB } : {}),
                                ...(typeof data?.tpB === 'number' ? { tpB: data.tpB } : {}),
                            });
                            if (socket.readyState === socket.OPEN) {
                                socket.send(createOutboundMessage('spreadOrderResult', {
                                    requestId,
                                    status: 'ok',
                                    orderGroup,
                                }));
                            }
                        }
                        catch (error) {
                            if (socket.readyState === socket.OPEN) {
                                socket.send(createOutboundMessage('spreadOrderResult', {
                                    requestId,
                                    status: 'error',
                                    message: error instanceof Error ? error.message : String(error),
                                }));
                            }
                        }
                    })();
                    return;
                }
            }
            catch {
                // ignore malformed messages
            }
        });
        socket.on('close', () => {
            clients.delete(state);
        });
    });
}
//# sourceMappingURL=gateway.js.map