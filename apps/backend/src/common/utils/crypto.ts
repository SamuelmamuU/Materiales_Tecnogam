import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

/**
 * Hashea una contraseña utilizando el algoritmo scrypt y una sal aleatoria de 16 bytes.
 * Retorna el resultado en formato "sal:hash".
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Compara una contraseña en texto plano contra un hash almacenado en formato "sal:hash".
 */
export function comparePassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const verifyHash = scryptSync(password, salt, 64).toString('hex');
  return timingSafeEqual(
    Buffer.from(hash, 'hex'),
    Buffer.from(verifyHash, 'hex'),
  );
}
