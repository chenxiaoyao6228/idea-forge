import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

/**
 * Encryption service for securely storing sensitive data like API keys
 * Uses AES-256-GCM encryption algorithm
 */
@Injectable()
export class EncryptionService {
  private readonly algorithm = "aes-256-gcm";
  private readonly saltLength = 16;
  private readonly ivLength = 16;
  private readonly tagLength = 16;
  private readonly keyLength = 32; // 256 bits

  constructor(private readonly configService: ConfigService) {}

  /**
   * Encrypts a plaintext string (e.g., API key)
   * Format: salt:iv:tag:encrypted
   *
   * @param plaintext - The text to encrypt
   * @returns Base64-encoded encrypted string
   */
  async encrypt(plaintext: string): Promise<string> {
    if (!plaintext) {
      throw new Error("Cannot encrypt empty string");
    }

    const encryptionKey = this.getEncryptionKey();

    // Generate random salt and IV
    const salt = randomBytes(this.saltLength);
    const iv = randomBytes(this.ivLength);

    // Derive key from password + salt
    const key = (await scryptAsync(encryptionKey, salt, this.keyLength)) as Buffer;

    // Create cipher
    const cipher = createCipheriv(this.algorithm, key, iv);

    // Encrypt
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);

    // Get authentication tag
    const tag = cipher.getAuthTag();

    // Combine: salt:iv:tag:encrypted
    const combined = Buffer.concat([salt, iv, tag, encrypted]);

    return combined.toString("base64");
  }

  /**
   * Decrypts an encrypted string
   *
   * @param encryptedText - Base64-encoded encrypted string
   * @returns Decrypted plaintext
   */
  async decrypt(encryptedText: string): Promise<string> {
    if (!encryptedText) {
      throw new Error("Cannot decrypt empty string");
    }

    try {
      const encryptionKey = this.getEncryptionKey();

      // Decode from base64
      const combined = Buffer.from(encryptedText, "base64");

      // Extract components
      const salt = combined.subarray(0, this.saltLength);
      const iv = combined.subarray(this.saltLength, this.saltLength + this.ivLength);
      const tag = combined.subarray(this.saltLength + this.ivLength, this.saltLength + this.ivLength + this.tagLength);
      const encrypted = combined.subarray(this.saltLength + this.ivLength + this.tagLength);

      // Derive key from password + salt
      const key = (await scryptAsync(encryptionKey, salt, this.keyLength)) as Buffer;

      // Create decipher
      const decipher = createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);

      // Decrypt
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

      return decrypted.toString("utf8");
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Masks an API key for display purposes
   * Shows first 3 and last 4 characters
   *
   * @param apiKey - The API key to mask
   * @returns Masked string (e.g., "sk-...xyz123")
   */
  maskApiKey(apiKey: string): string {
    if (!apiKey || apiKey.length < 8) {
      return "***";
    }

    const prefix = apiKey.substring(0, 3);
    const suffix = apiKey.substring(apiKey.length - 4);

    return `${prefix}...${suffix}`;
  }

  /**
   * Gets the encryption key from environment variable
   * Throws error if not configured
   */
  private getEncryptionKey(): string {
    const key = this.configService.get<string>("AI_ENCRYPTION_KEY");

    if (!key) {
      throw new Error("AI_ENCRYPTION_KEY environment variable is not set. Please configure it in .env file.");
    }

    if (key.length < 32) {
      throw new Error(
        "AI_ENCRYPTION_KEY must be at least 32 characters long for security. " +
          "Generate a secure key using: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
      );
    }

    return key;
  }
}
