import type { FastifyInstance } from 'fastify';
/** 使用 timingSafeEqual 对 UTF-8 字节做全等比较（长度不同则拒绝）。 */
export declare function secretsEqual(provided: string, expected: string): boolean;
export declare function registerAuthHook(app: FastifyInstance, secret: string, machineLicenseSecret?: string): void;
//# sourceMappingURL=auth.d.ts.map