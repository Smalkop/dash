async function pbkdf2(
  password: string,
  salt: Uint8Array,
  iterations: number,
  keyLength: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-512" },
    key,
    keyLength * 8
  );
  return new Uint8Array(hash);
}

function toHex(arr: Uint8Array): string {
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return arr;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const hash = await pbkdf2(password, salt, 100000, 64);
  return `100000:${toHex(salt)}:${toHex(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split(":");
    if (parts.length !== 3) return false;
    const iterations = parseInt(parts[0]!, 10);
    const salt = fromHex(parts[1]!);
    const storedHash = fromHex(parts[2]!);

    const hash = await pbkdf2(password, salt, iterations, storedHash.length);
    if (hash.length !== storedHash.length) return false;
    return hash.every((b, i) => b === storedHash[i]);
  } catch {
    return false;
  }
}
