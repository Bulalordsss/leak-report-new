/**
 * Customer Data Encryption Interceptor
 * 
 * Encrypts sensitive customer fields (name) when saving to SQLite
 * and decrypts them when reading. Uses fast XOR cipher with hex encoding
 * for safe storage of encrypted data.
 */

const ENCRYPTION_KEY = 'dcwd-gis-fast-key-v1';

// --- Hex encoding helpers (safe for SQLite TEXT columns) ---

/** Convert a raw string to hex representation */
function stringToHex(str: string): string {
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16).padStart(4, '0');
  }
  return hex;
}

/** Convert hex representation back to a raw string */
function hexToString(hex: string): string {
  let str = '';
  for (let i = 0; i < hex.length; i += 4) {
    str += String.fromCharCode(parseInt(hex.substr(i, 4), 16));
  }
  return str;
}

// --- XOR cipher ---

/** Fast XOR encrypt/decrypt (symmetric – same function for both directions) */
function xorProcess(input: string): string {
  const key = ENCRYPTION_KEY;
  const kLen = key.length;
  const len = input.length;
  const result = new Array(len);

  for (let i = 0; i < len; i++) {
    result[i] = String.fromCharCode(input.charCodeAt(i) ^ key.charCodeAt(i % kLen));
  }
  return result.join('');
}

// --- Public API ---

/**
 * Encrypt a plaintext customer name for storage.
 * Returns a hex-encoded string that is safe for SQLite TEXT columns.
 * 
 * @example
 * const encrypted = encryptName('Juan Dela Cruz');
 * // Store `encrypted` in the database
 */
export function encryptName(plainName: string): string {
  if (!plainName) return '';
  const encrypted = stringToHex(xorProcess(plainName));
  return encrypted;
}

/**
 * Decrypt a previously encrypted customer name.
 * Expects the hex-encoded string produced by `encryptName`.
 * 
 * @example
 * const name = decryptName(row.name);
 * // name === 'Juan Dela Cruz'
 */
export function decryptName(encryptedHex: string): string {
  if (!encryptedHex) return '';
  try {
    const decrypted = xorProcess(hexToString(encryptedHex));
    return decrypted;
  } catch {
    // If decryption fails (e.g. data was never encrypted), return as-is
    return encryptedHex;
  }
}

/**
 * Check whether a string looks like it was encrypted by this module
 * (i.e. it is a valid hex string with length divisible by 4).
 */
export function isEncrypted(value: string): boolean {
  if (!value || value.length === 0 || value.length % 4 !== 0) return false;
  return /^[0-9a-f]+$/i.test(value);
}
