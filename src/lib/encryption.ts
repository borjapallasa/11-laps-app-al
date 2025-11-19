import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

/**
 * Get encryption key from environment variable
 * Key must be 32 bytes (256 bits) for AES-256
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  // Ensure key is exactly 32 bytes
  const keyBuffer = Buffer.from(key, 'utf8');
  if (keyBuffer.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 characters (256 bits)');
  }

  return keyBuffer;
}

/**
 * Encrypt a plain text string
 * Returns a Buffer that includes: [salt][iv][authTag][encryptedData]
 */
export function encrypt(plainText: string): Buffer {
  const key = getEncryptionKey();

  // Generate random IV (initialization vector)
  const iv = crypto.randomBytes(IV_LENGTH);

  // Generate random salt for additional security
  const salt = crypto.randomBytes(SALT_LENGTH);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encrypt the data
  let encrypted = cipher.update(plainText, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  // Get authentication tag
  const authTag = cipher.getAuthTag();

  // Combine: salt + iv + authTag + encrypted data
  return Buffer.concat([salt, iv, authTag, encrypted]);
}

/**
 * Decrypt an encrypted buffer
 * Expects buffer format: [salt][iv][authTag][encryptedData]
 */
export function decrypt(encryptedBuffer: Buffer): string {
  const key = getEncryptionKey();

  // Extract components
  const salt = encryptedBuffer.subarray(0, SALT_LENGTH);
  const iv = encryptedBuffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = encryptedBuffer.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
  );
  const encryptedData = encryptedBuffer.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  // Decrypt the data
  let decrypted = decipher.update(encryptedData);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}

/**
 * Generate a random encryption key (for setup)
 * Use this to generate ENCRYPTION_KEY for .env file
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64').slice(0, 32);
}

