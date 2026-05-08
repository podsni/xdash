/**
 * Client-side encryption library using Web Crypto API
 * Zero-knowledge encryption - server never sees plaintext
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

/**
 * Generate a random encryption key
 * @returns Base64 encoded key
 */
export async function generateEncryptionKey(): Promise<string> {
    const key = await crypto.subtle.generateKey(
        {
            name: ALGORITHM,
            length: KEY_LENGTH,
        },
        true,
        ['encrypt', 'decrypt']
    );

    const exported = await crypto.subtle.exportKey('raw', key);
    return arrayBufferToBase64(exported);
}

/**
 * Encrypt data with a key
 * @param data - Data to encrypt
 * @param keyBase64 - Base64 encoded key
 * @returns Base64 encoded encrypted data with IV prepended
 */
export async function encryptData(data: string, keyBase64: string): Promise<string> {
    const key = await importKey(keyBase64);
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    const encrypted = await crypto.subtle.encrypt(
        {
            name: ALGORITHM,
            iv: iv,
        },
        key,
        dataBuffer
    );

    // Prepend IV to encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    return arrayBufferToBase64(combined.buffer);
}

/**
 * Decrypt data with a key
 * @param encryptedBase64 - Base64 encoded encrypted data with IV
 * @param keyBase64 - Base64 encoded key
 * @returns Decrypted plaintext
 */
export async function decryptData(encryptedBase64: string, keyBase64: string): Promise<string> {
    const key = await importKey(keyBase64);
    const combined = base64ToArrayBuffer(encryptedBase64);

    // Extract IV and encrypted data
    const iv = combined.slice(0, IV_LENGTH);
    const encrypted = combined.slice(IV_LENGTH);

    const decrypted = await crypto.subtle.decrypt(
        {
            name: ALGORITHM,
            iv: iv,
        },
        key,
        encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
}

/**
 * Import a key from base64
 */
async function importKey(keyBase64: string): Promise<CryptoKey> {
    const keyBuffer = base64ToArrayBuffer(keyBase64);
    return await crypto.subtle.importKey(
        'raw',
        keyBuffer,
        {
            name: ALGORITHM,
            length: KEY_LENGTH,
        },
        true,
        ['encrypt', 'decrypt']
    );
}

/**
 * Convert ArrayBuffer to Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Convert Base64 to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Generate a random share ID
 */
export function generateShareId(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash password for share protection
 */
export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return arrayBufferToBase64(hash);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    const computed = await hashPassword(password);
    return computed === hash;
}
