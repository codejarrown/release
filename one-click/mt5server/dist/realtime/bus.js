import { EventEmitter } from 'node:events';
export class RealtimeBus extends EventEmitter {
    emitAccountStatusUpdate(payload) {
        this.emit('accountStatusUpdate', payload);
    }
    emitWsHeartBeat(payload) {
        this.emit('wsHeartBeat', payload);
    }
    emitQuoteUpdate(payload) {
        this.emit('quoteUpdate', payload);
    }
    emitOrderUpdate(payload) {
        this.emit('orderUpdate', payload);
    }
    emitOrderUpdateSnapshot(payload) {
        this.emit('orderUpdateSnapshot', payload);
    }
    emitOrderStateUpdate(payload) {
        this.emit('orderStateUpdate', payload);
    }
    emitOrderGroupUpdate(payload) {
        this.emit('orderGroupUpdate', payload);
    }
    emitOrderGroupRemove(payload) {
        this.emit('orderGroupRemove', payload);
    }
    emitSpreadUpdate(payload) {
        this.emit('spreadUpdate', payload);
    }
    emitSpreadHeartbeat(payload) {
        // Merge heartbeat into spreadUpdate to reduce message types.
        this.emit('spreadUpdate', payload);
    }
    emitSpreadRuntimeState(payload) {
        this.emit('spreadRuntimeState', payload);
    }
}
//# sourceMappingURL=bus.js.map