import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
/**
 * AES-256-GCM encrypt. Returns base64 string: iv + ciphertext + authTag.
 * Key must be 32 bytes (hex-encoded 64 chars or raw 32-byte buffer).
 */
export function encrypt(plaintext, keyHex) {
    const key = Buffer.from(keyHex, 'hex');
    if (key.length !== 32) {
        throw new Error('Encryption key must be 32 bytes (64 hex chars)');
    }
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, encrypted, tag]).toString('base64');
}
/**
 * AES-256-GCM decrypt. Input is base64 string produced by encrypt().
 */
export function decrypt(ciphertext, keyHex) {
    const key = Buffer.from(keyHex, 'hex');
    if (key.length !== 32) {
        throw new Error('Encryption key must be 32 bytes (64 hex chars)');
    }
    const buf = Buffer.from(ciphertext, 'base64');
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(buf.length - TAG_LENGTH);
    const encrypted = buf.subarray(IV_LENGTH, buf.length - TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final('utf8');
}
/**
 * Generate a random 256-bit key as hex string (for .env setup).
 */
export function generateKey() {
    return randomBytes(32).toString('hex');
}
//# sourceMappingURL=crypto.js.map