import type { Kysely } from 'kysely';
import type { AppConfig } from '../config/index.js';
import { HttpClient } from '../lib/http-client.js';
import { Mt5ApiSdk } from '../integrations/mt5/sdk/index.js';
import type { Database } from '../db/kysely/database.js';
import { Mt5AccountRepository } from '../db/repositories/mt5-account.repository.js';
import { SyncJobRepository } from '../db/repositories/sync-job.repository.js';
import { PushChannelRepository } from '../db/repositories/push-channel.repository.js';
import { AccountGroupRepository } from '../db/repositories/account-group.repository.js';
import { OrderGroupRepository } from '../db/repositories/order-group.repository.js';
import { SpreadSubscriptionRepository } from '../db/repositories/spread-subscription.repository.js';
import { AutoTradeLogRepository } from '../db/repositories/auto-trade-log.repository.js';
import { AccountService } from '../services/account.service.js';
import { AccountGroupService } from '../services/account-group.service.js';
import { OrderGroupService } from '../services/order-group.service.js';
import { WsConnectionManager } from '../services/ws-manager.js';
import { PushService } from '../services/push/index.js';
import { SpreadService } from '../services/spread.service.js';
import { AccountHeartbeatService } from '../services/account-heartbeat.service.js';
import { RealtimeApp } from '../realtime/app.js';
export interface AppContext {
    config: AppConfig;
    db: Kysely<Database>;
    mt5Client: HttpClient;
    mt5Sdk: Mt5ApiSdk;
    repos: {
        mt5Account: Mt5AccountRepository;
        syncJob: SyncJobRepository;
        pushChannel: PushChannelRepository;
        accountGroup: AccountGroupRepository;
        spreadSubscription: SpreadSubscriptionRepository;
        autoTradeLog: AutoTradeLogRepository;
        orderGroup: OrderGroupRepository;
    };
    services: {
        account: AccountService;
        accountGroup: AccountGroupService;
        orderGroup: OrderGroupService;
        push: PushService;
        spread: SpreadService;
        accountHeartbeat: AccountHeartbeatService;
    };
    wsManager: WsConnectionManager;
    realtime: {
        app: RealtimeApp;
    };
}
export declare function buildAppContext(config: AppConfig): Promise<AppContext>;
//# sourceMappingURL=index.d.ts.map