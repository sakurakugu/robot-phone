type CryptoLike = {
  getRandomValues?: (array: Uint8Array) => Uint8Array;
};

function fillRandomBytes(bytes: Uint8Array): Uint8Array {
  const cryptoObject = (globalThis as typeof globalThis & { crypto?: CryptoLike }).crypto;
  if (cryptoObject && typeof cryptoObject.getRandomValues === 'function') {
    return cryptoObject.getRandomValues(bytes);
  }

  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256);
  }

  return bytes;
}

function writeTimestamp(bytes: Uint8Array, timestamp: number): void {
  let value = timestamp;

  for (let i = 5; i >= 0; i -= 1) {
    bytes[i] = value % 256;
    value = Math.floor(value / 256);
  }
}

function formatUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/** 生成可在 React Native 中稳定工作的 UUID v7。 */
export function uuidv7(): string {
  const bytes = fillRandomBytes(new Uint8Array(16));

  writeTimestamp(bytes, Date.now());
  bytes[6] = 0x70 + (bytes[6] % 16);
  bytes[8] = 0x80 + (bytes[8] % 64);

  return formatUuid(bytes);
}
