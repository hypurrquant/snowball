import { describe, it, expect } from "vitest";
import {
  validateAddress,
  validateRequired,
  validateBranchIndex,
  validatePositiveBigInt,
  ValidationError,
} from "@snowball/shared";

describe("validateAddress", () => {
  it("accepts valid checksummed address", () => {
    expect(validateAddress("0x" + "a".repeat(40))).toBe("0x" + "a".repeat(40));
  });

  it("accepts valid uppercase address", () => {
    expect(validateAddress("0x" + "A".repeat(40))).toBe("0x" + "A".repeat(40));
  });

  it("rejects address without 0x prefix", () => {
    expect(() => validateAddress("a".repeat(40))).toThrow(ValidationError);
  });

  it("rejects short address", () => {
    expect(() => validateAddress("0x1234")).toThrow(ValidationError);
  });

  it("rejects non-hex characters", () => {
    expect(() => validateAddress("0x" + "g".repeat(40))).toThrow(ValidationError);
  });

  it("rejects undefined", () => {
    expect(() => validateAddress(undefined)).toThrow(ValidationError);
  });

  it("rejects number", () => {
    expect(() => validateAddress(123)).toThrow(ValidationError);
  });
});

describe("validateRequired", () => {
  it("returns string for valid value", () => {
    expect(validateRequired("hello", "field")).toBe("hello");
  });

  it("returns string for number", () => {
    expect(validateRequired(42, "field")).toBe("42");
  });

  it("rejects undefined", () => {
    expect(() => validateRequired(undefined, "field")).toThrow(ValidationError);
  });

  it("rejects null", () => {
    expect(() => validateRequired(null, "field")).toThrow(ValidationError);
  });

  it("rejects empty string", () => {
    expect(() => validateRequired("", "field")).toThrow(ValidationError);
  });
});

describe("validateBranchIndex", () => {
  it("accepts 0", () => {
    expect(validateBranchIndex(0)).toBe(0);
  });

  it("accepts 1", () => {
    expect(validateBranchIndex(1)).toBe(1);
  });

  it("accepts string '0'", () => {
    expect(validateBranchIndex("0")).toBe(0);
  });

  it("rejects 2", () => {
    expect(() => validateBranchIndex(2)).toThrow(ValidationError);
  });

  it("rejects -1", () => {
    expect(() => validateBranchIndex(-1)).toThrow(ValidationError);
  });

  it("rejects NaN", () => {
    expect(() => validateBranchIndex("abc")).toThrow(ValidationError);
  });
});

describe("validatePositiveBigInt", () => {
  it("accepts positive string", () => {
    expect(validatePositiveBigInt("1000000000000000000", "amount")).toBe("1000000000000000000");
  });

  it("accepts positive number", () => {
    expect(validatePositiveBigInt(100, "amount")).toBe("100");
  });

  it("rejects zero", () => {
    expect(() => validatePositiveBigInt("0", "amount")).toThrow(ValidationError);
  });

  it("rejects negative", () => {
    expect(() => validatePositiveBigInt("-1", "amount")).toThrow(ValidationError);
  });

  it("rejects non-numeric string", () => {
    expect(() => validatePositiveBigInt("abc", "amount")).toThrow(ValidationError);
  });

  it("rejects boolean", () => {
    expect(() => validatePositiveBigInt(true as any, "amount")).toThrow(ValidationError);
  });
});
