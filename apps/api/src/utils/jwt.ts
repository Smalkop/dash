import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { JwtPayload } from "../types";

const getSecret = (secret: string): Uint8Array =>
  new TextEncoder().encode(secret);

export async function signToken(
  payload: Omit<JwtPayload, "iat" | "exp">,
  secret: string
): Promise<string> {
  return new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getSecret(secret));
}

export async function verifyToken(
  token: string,
  secret: string
): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(secret));
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}
