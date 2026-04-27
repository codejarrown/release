import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, generateKey } from './crypto.js';
const TEST_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
describe('crypto', () => {
    it('encrypts and decrypts back to original', () => {
        const plaintext = 'my-secret-password';
        const ciphertext = encrypt(plaintext, TEST_KEY);
        expect(ciphertext).not.toBe(plaintext);
        expect(decrypt(ciphertext, TEST_KEY)).toBe(plaintext);
    });
    it('produces different ciphertexts for the same plaintext (random IV)', () => {
        const plaintext = 'test';
        const a = encrypt(plaintext, TEST_KEY);
        const b = encrypt(plaintext, TEST_KEY);
        expect(a).not.toBe(b);
        expect(decrypt(a, TEST_KEY)).toBe(plaintext);
        expect(decrypt(b, TEST_KEY)).toBe(plaintext);
    });
    it('fails to decrypt with wrong key', () => {
        const ciphertext = encrypt('secret', TEST_KEY);
        const wrongKey = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
        expect(() => decrypt(ciphertext, wrongKey)).toThrow();
    });
    it('throws on invalid key length', () => {
        expect(() => encrypt('x', 'tooshort')).toThrow('32 bytes');
        expect(() => decrypt('x', 'tooshort')).toThrow('32 bytes');
    });
    it('generateKey returns 64 hex chars', () => {
        const key = generateKey();
        expect(key).toHaveLength(64);
        expect(/^[0-9a-f]+$/.test(key)).toBe(true);
    });
    it('handles empty string', () => {
        const ciphertext = encrypt('', TEST_KEY);
        expect(decrypt(ciphertext, TEST_KEY)).toBe('');
    });
    it('handles unicode', () => {
        const plaintext = '密码测试 🔑';
        const ciphertext = encrypt(plaintext, TEST_KEY);
        expect(decrypt(ciphertext, TEST_KEY)).toBe(plaintext);
    });
});
//# sourceMappingURL=crypto.test.js.map