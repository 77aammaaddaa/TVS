const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function getKeyMaterial(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
}

async function deriveKey(secret: string): Promise<CryptoKey> {
  const baseKey = await getKeyMaterial(secret);
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: textEncoder.encode('ecofine-browser-salt'),
      iterations: 200000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptText(value: string, secret: string): Promise<string> {
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, textEncoder.encode(value));
  return `enc:${btoa(String.fromCharCode(...new Uint8Array(encrypted), ...iv))}`;
}

export async function decryptText(value: string, secret: string): Promise<string> {
  if (!value.startsWith('enc:')) {
    return value;
  }

  const key = await deriveKey(secret);
  const binary = atob(value.slice(4));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const ivLength = 12;
  const iv = bytes.slice(-ivLength);
  const ciphertext = bytes.slice(0, bytes.length - ivLength);

  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return textDecoder.decode(decrypted);
}
