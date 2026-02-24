import { ValidationError } from "./errors";

export function validateAddress(value: unknown, field = "address"): string {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(value)) {
    throw new ValidationError(`Invalid ${field}: must be a 0x-prefixed 40-hex-char address`);
  }
  return value;
}

export function validateRequired(value: unknown, field: string): string {
  if (value === undefined || value === null || value === "") {
    throw new ValidationError(`Missing required field: ${field}`);
  }
  return String(value);
}

export function validateBranchIndex(value: unknown): number {
  const n = Number(value);
  if (isNaN(n) || (n !== 0 && n !== 1)) {
    throw new ValidationError("branchIndex must be 0 (wCTC) or 1 (lstCTC)");
  }
  return n;
}

export function validatePositiveBigInt(value: unknown, field: string): string {
  if (typeof value !== "string" && typeof value !== "number") {
    throw new ValidationError(`${field} must be a numeric string or number`);
  }
  try {
    const bi = BigInt(value);
    if (bi <= 0n) {
      throw new ValidationError(`${field} must be positive`);
    }
    return bi.toString();
  } catch (e) {
    if (e instanceof ValidationError) throw e;
    throw new ValidationError(`${field} is not a valid integer`);
  }
}
