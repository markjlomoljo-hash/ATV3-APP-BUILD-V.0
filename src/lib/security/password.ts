import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function verifyPassword(
  plainPassword: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(plainPassword, passwordHash);
}

export function isPasswordStrongEnough(password: string): boolean {
  // Minimum viable policy: 8+ chars, at least one letter and one number.
  return password.length >= 8 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
}
