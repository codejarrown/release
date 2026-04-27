import { z } from 'zod';
declare const configSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "test", "production"]>>;
    PORT: z.ZodDefault<z.ZodNumber>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
    MT5_API_BASE_URL: z.ZodDefault<z.ZodString>;
    MT5_TIMEOUT_MS: z.ZodDefault<z.ZodNumber>;
    DB_DIALECT: z.ZodDefault<z.ZodEnum<["sqlite", "mysql", "postgres"]>>;
    DB_SQLITE_PATH: z.ZodDefault<z.ZodString>;
    WEB_DIST_DIR: z.ZodOptional<z.ZodString>;
    ACCOUNT_ENCRYPTION_KEY: z.ZodString;
    /** HTTP / WS 接口密钥，与 Bearer、X-Api-Key 或查询参数 api_key 做全量比对 */
    API_SECRET: z.ZodString;
    MACHINE_LICENSE_SECRET: z.ZodOptional<z.ZodString>;
    MT5_WS_BASE_URL: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "development" | "test" | "production";
    PORT: number;
    LOG_LEVEL: "debug" | "info" | "warn" | "error";
    MT5_API_BASE_URL: string;
    MT5_TIMEOUT_MS: number;
    DB_DIALECT: "sqlite" | "mysql" | "postgres";
    DB_SQLITE_PATH: string;
    ACCOUNT_ENCRYPTION_KEY: string;
    API_SECRET: string;
    MT5_WS_BASE_URL: string;
    WEB_DIST_DIR?: string | undefined;
    MACHINE_LICENSE_SECRET?: string | undefined;
}, {
    ACCOUNT_ENCRYPTION_KEY: string;
    API_SECRET: string;
    NODE_ENV?: "development" | "test" | "production" | undefined;
    PORT?: number | undefined;
    LOG_LEVEL?: "debug" | "info" | "warn" | "error" | undefined;
    MT5_API_BASE_URL?: string | undefined;
    MT5_TIMEOUT_MS?: number | undefined;
    DB_DIALECT?: "sqlite" | "mysql" | "postgres" | undefined;
    DB_SQLITE_PATH?: string | undefined;
    WEB_DIST_DIR?: string | undefined;
    MACHINE_LICENSE_SECRET?: string | undefined;
    MT5_WS_BASE_URL?: string | undefined;
}>;
export type AppConfig = z.infer<typeof configSchema>;
export declare function buildConfig(env?: NodeJS.ProcessEnv): AppConfig;
export {};
//# sourceMappingURL=index.d.ts.map