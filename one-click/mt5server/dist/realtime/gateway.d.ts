import type { AccountService } from '../services/account.service.js';
import type { WsConnectionManager } from './mt5-source.js';
import type { SpreadService } from '../services/spread.service.js';
import type { OrderGroupService } from '../services/order-group.service.js';
import type { RealtimeApp } from './app.js';
import type { FastifyInstance } from 'fastify';
export declare function registerRealtimeGateway(app: FastifyInstance, wsManager: WsConnectionManager, accountService: AccountService, spreadService: SpreadService, orderGroupService: OrderGroupService, realtimeApp?: RealtimeApp): void;
//# sourceMappingURL=gateway.d.ts.map