import { describe, it, expect } from 'vitest';
import { buildConfig } from './index.js';
const VALID_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const VALID_API_SECRET = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
describe('buildConfig', () => {
    it('returns defaults when only required fields are provided', () => {
        const config = buildConfig({ ACCOUNT_ENCRYPTION_KEY: VALID_KEY, API_SECRET: VALID_API_SECRET });
        expect(config.NODE_ENV).toBe('development');
        expect(config.PORT).toBe(3000);
        expect(config.LOG_LEVEL).toBe('debug');
        expect(config.ACCOUNT_ENCRYPTION_KEY).toBe(VALID_KEY);
        expect(config.API_SECRET).toBe(VALID_API_SECRET);
    });
    it('parses valid env values', () => {
        const config = buildConfig({
            NODE_ENV: 'production',
            PORT: '8080',
            LOG_LEVEL: 'warn',
            ACCOUNT_ENCRYPTION_KEY: VALID_KEY,
            API_SECRET: VALID_API_SECRET,
        });
        expect(config.NODE_ENV).toBe('production');
        expect(config.PORT).toBe(8080);
        expect(config.LOG_LEVEL).toBe('warn');
    });
    it('throws on invalid NODE_ENV', () => {
        expect(() => buildConfig({ NODE_ENV: 'invalid', ACCOUNT_ENCRYPTION_KEY: VALID_KEY, API_SECRET: VALID_API_SECRET })).toThrow('Invalid configuration');
    });
    it('throws on non-numeric PORT', () => {
        expect(() => buildConfig({ PORT: 'abc', ACCOUNT_ENCRYPTION_KEY: VALID_KEY, API_SECRET: VALID_API_SECRET })).toThrow('Invalid configuration');
    });
    it('throws when ACCOUNT_ENCRYPTION_KEY is missing', () => {
        expect(() => buildConfig({ API_SECRET: VALID_API_SECRET })).toThrow('Invalid configuration');
    });
    it('throws when API_SECRET is missing', () => {
        expect(() => buildConfig({ ACCOUNT_ENCRYPTION_KEY: VALID_KEY })).toThrow('Invalid configuration');
    });
    it('throws when ACCOUNT_ENCRYPTION_KEY is wrong length', () => {
        expect(() => buildConfig({ ACCOUNT_ENCRYPTION_KEY: 'tooshort', API_SECRET: VALID_API_SECRET })).toThrow('Invalid configuration');
    });
    it('accepts MACHINE_LICENSE_SECRET when provided', () => {
        const config = buildConfig({
            ACCOUNT_ENCRYPTION_KEY: VALID_KEY,
            API_SECRET: VALID_API_SECRET,
            MACHINE_LICENSE_SECRET: 'machine-license-secret',
        });
        expect(config.MACHINE_LICENSE_SECRET).toBe('machine-license-secret');
    });
});
//# sourceMappingURL=index.test.js.map