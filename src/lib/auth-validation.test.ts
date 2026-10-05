import { describe, expect, it } from "vitest";
import { authEmailSchema, authPasswordSchema, validateAuthFields } from "./auth-validation";

describe("auth form validation", () => {
  it("reports invalid and missing credentials", () => {
    expect(validateAuthFields({ email: "invalid", password: "", fullName: "" }, false)).toEqual({
      email: "Enter a valid email address.",
      password: "Password must contain at least 6 characters.",
    });
  });
  it("validates names only for the existing signup mode", () => {
    const values = { email: "staff@example.com", password: "123456", fullName: " " };
    expect(validateAuthFields(values, false)).toEqual({});
    expect(validateAuthFields(values, true).fullName).toBe("Enter your full name.");
  });
  it("never strips or trims password characters", () => {
    expect(authPasswordSchema.parse(" পাসওয়ার্ড ")).toBe(" পাসওয়ার্ড ");
  });
  it("trims email whitespace and limits email length", () => {
    expect(authEmailSchema.parse(" staff@example.com ")).toBe("staff@example.com");
    expect(authEmailSchema.safeParse(`${"a".repeat(255)}@example.com`).success).toBe(false);
  });
});
