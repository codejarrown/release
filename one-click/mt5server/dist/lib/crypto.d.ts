/**
 * AES-256-GCM encrypt. Returns base64 string: iv + ciphertext + authTag.
 * Key must be 32 bytes (hex-encoded 64 chars or raw 32-byte buffer).
 */
export declare function encrypt(plaintext: string, keyHex: string): string;
/**
 * AES-256-GCM decrypt. Input is base64 string produced by encrypt().
 */
export declare function decrypt(ciphertext: string, keyHex: string): string;
/**
 * Generate a random 256-bit key as hex string (for .env setup).
 */
export declare function generateKey(): string;
//# sourceMappingURL=crypto.d.ts.map