import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

/** Gera um hash seguro do PIN, com salt único — para guardar em user_settings.pin_hash */
export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(pin, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

/** Confirma se o PIN introduzido corresponde ao hash guardado */
export function verifyPin(pin: string, stored: string): boolean {
  const [salt, derivedHex] = stored.split(":");
  if (!salt || !derivedHex) return false;
  const derived = scryptSync(pin, salt, 64);
  const storedBuf = Buffer.from(derivedHex, "hex");
  if (derived.length !== storedBuf.length) return false;
  return timingSafeEqual(derived, storedBuf);
}
