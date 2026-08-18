import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

const deriveKey = () => {
  const secret = process.env.DATA_ENCRYPTION_KEY || process.env.JWT_SECRET || "";
  return crypto.createHash("sha256").update(secret).digest();
};

export const encryptText = (plainText) => {
  if (!plainText) {
    return "";
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, deriveKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(String(plainText), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString(
    "hex"
  )}`;
};

export const decryptText = (cipherText) => {
  if (!cipherText) {
    return "";
  }
  const [ivHex, tagHex, encryptedHex] = String(cipherText).split(":");
  if (!ivHex || !tagHex || !encryptedHex) {
    return "";
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    deriveKey(),
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
};

