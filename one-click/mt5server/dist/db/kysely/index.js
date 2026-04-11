import SQLite from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
export function createDatabase(config) {
    if (config.DB_DIALECT !== 'sqlite') {
        throw new Error(`Unsupported DB_DIALECT: ${config.DB_DIALECT}. Only 'sqlite' is currently implemented.`);
    }
    if (config.DB_SQLITE_PATH !== ':memory:') {
        mkdirSync(dirname(config.DB_SQLITE_PATH), { recursive: true });
    }
    const dialect = new SqliteDialect({
        database: new SQLite(config.DB_SQLITE_PATH),
    });
    return new Kysely({ dialect });
}
//# sourceMappingURL=index.js.map