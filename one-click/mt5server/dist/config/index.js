import { z } from 'zod';
const configSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    LOG_LEVEL: z
        .enum(['debug', 'info', 'warn', 'error'])
        .default(process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    MT5_API_BASE_URL: z.string().url().default('http://localhost:5050'),
    MT5_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
    DB_DIALECT: z.enum(['sqlite', 'mysql', 'postgres']).default('sqlite'),
    DB_SQLITE_PATH: z.string().default('./var/dev.sqlite'),
    WEB_DIST_DIR: z.string().optional(),
    ACCOUNT_ENCRYPTION_KEY: z
        .string()
        .length(64, 'ACCOUNT_ENCRYPTION_KEY must be 64 hex chars (32 bytes)')
        .regex(/^[0-9a-fA-F]+$/, 'ACCOUNT_ENCRYPTION_KEY must be hex'),
    /** HTTP / WS 接口密钥，与 Bearer、X-Api-Key 或查询参数 api_key 做全量比对 */
    API_SECRET: z
        .string()
        .length(64, 'API_SECRET must be 64 hex chars (32 bytes)')
        .regex(/^[0-9a-fA-F]+$/, 'API_SECRET must be hex'),
    MACHINE_LICENSE_SECRET: z.string().min(1).optional(),
    MT5_WS_BASE_URL: z.string().default('ws://localhost:5050'),
});
export function buildConfig(env = process.env) {
    const parsed = configSchema.safeParse(env);
    if (!parsed.success) {
        console.error('Config validation error:', parsed.error.flatten());
        throw new Error('Invalid configuration');
    }
    return parsed.data;
}
//# sourceMappingURL=index.js.map