import { EventEmitter } from 'node:events';
import type { AccountRealtimeState, OrderGroupRealtimeState, OrderGroupRemovePayload, OrderRealtimeState, QuoteRealtimeState, SpreadRealtimeState, SpreadRuntimeStatePayload, WsHeartBeatRealtimeState } from './store.js';
import type { DownstreamOrderUpdate, DownstreamOrderUpdateSnapshot } from './mt5-source.js';
export declare class RealtimeBus extends EventEmitter {
    emitAccountStatusUpdate(payload: AccountRealtimeState): void;
    emitWsHeartBeat(payload: WsHeartBeatRealtimeState): void;
    emitQuoteUpdate(payload: QuoteRealtimeState): void;
    emitOrderUpdate(payload: DownstreamOrderUpdate): void;
    emitOrderUpdateSnapshot(payload: DownstreamOrderUpdateSnapshot): void;
    emitOrderStateUpdate(payload: OrderRealtimeState): void;
    emitOrderGroupUpdate(payload: OrderGroupRealtimeState): void;
    emitOrderGroupRemove(payload: OrderGroupRemovePayload): void;
    emitSpreadUpdate(payload: SpreadRealtimeState): void;
    emitSpreadHeartbeat(payload: SpreadRealtimeState): void;
    emitSpreadRuntimeState(payload: SpreadRuntimeStatePayload): void;
}
//# sourceMappingURL=bus.d.ts.map