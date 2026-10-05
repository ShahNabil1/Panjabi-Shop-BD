import { z } from "zod";

export const authEmailSchema = z
  .string()
  .trim()
  .max(254, "Email address is too long.")
  .email("Enter a valid email address.");
export const authPasswordSchema = z.string().min(6, "Password must contain at least 6 characters.");
export const authNameSchema = z
  .string()
  .trim()
  .min(1, "Enter your full name.")
  .max(100, "Name must be 100 characters or fewer.");

export function validateAuthFields(
  values: { email: string; password: string; fullName: string },
  signup: boolean,
) {
  const errors: Partial<Record<"email" | "password" | "fullName", string>> = {};
  const email = authEmailSchema.safeParse(values.email);
  const password = authPasswordSchema.safeParse(values.password);
  if (!email.success) errors.email = email.error.issues[0]?.message ?? "Enter a valid email address.";
  if (!password.success) errors.password = password.error.issues[0]?.message ?? "Enter your password.";
  if (signup) {
    const name = authNameSchema.safeParse(values.fullName);
    if (!name.success) errors.fullName = name.error.issues[0]?.message ?? "Enter your full name.";
  }
  return errors;
}
