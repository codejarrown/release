import { Migrator } from 'kysely';
import * as m001 from './migrations/001_initial.js';
import * as m002 from './migrations/002_accounts_redesign.js';
import * as m003 from './migrations/003_push_channels.js';
import * as m004 from './migrations/004_account_groups.js';
import * as m005 from './migrations/005_order_groups.js';
import * as m006 from './migrations/006_account_groups_fk.js';
import * as m007 from './migrations/007_default_subscriptions.js';
import * as m008 from './migrations/008_spread_subscriptions.js';
import * as m009 from './migrations/009_spread_subscription_thresholds.js';
import * as m010 from './migrations/010_spread_subscription_lots.js';
import * as m011 from './migrations/011_account_reconnect_fields.js';
import * as m012 from './migrations/012_order_group_spreads.js';
import * as m013 from './migrations/013_auto_trade.js';
import * as m014 from './migrations/014_auto_trade_single_leg.js';
import * as m015 from './migrations/015_auto_close_stability.js';
const migrations = {
    '001_initial': m001,
    '002_accounts_redesign': m002,
    '003_push_channels': m003,
    '004_account_groups': m004,
    '005_order_groups': m005,
    '006_account_groups_fk': m006,
    '007_default_subscriptions': m007,
    '008_spread_subscriptions': m008,
    '009_spread_subscription_thresholds': m009,
    '010_spread_subscription_lots': m010,
    '011_account_reconnect_fields': m011,
    '012_order_group_spreads': m012,
    '013_auto_trade': m013,
    '014_auto_trade_single_leg': m014,
    '015_auto_close_stability': m015,
};
class StaticMigrationProvider {
    async getMigrations() {
        return migrations;
    }
}
export async function runMigrations(db) {
    const migrator = new Migrator({
        db,
        provider: new StaticMigrationProvider(),
    });
    const { error, results } = await migrator.migrateToLatest();
    results?.forEach((it) => {
        if (it.status === 'Success') {
            console.log(`Migration "${it.migrationName}" applied successfully.`);
        }
        else if (it.status === 'Error') {
            console.error(`Migration "${it.migrationName}" failed.`);
        }
    });
    if (error) {
        console.error('Migration failed:', error);
        throw error;
    }
}
//# sourceMappingURL=migrator.js.map