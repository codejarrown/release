import type { FastifyInstance } from 'fastify';
import type { AccountService } from '../services/account.service.js';
import type { Mt5ApiSdk } from '../integrations/mt5/sdk/index.js';
export declare function registerTradingRoutes(app: FastifyInstance, accountService: AccountService, mt5Sdk: Mt5ApiSdk): void;
//# sourceMappingURL=trading.d.ts.map