import { countries } from "country-flag-icons";

const names = new Intl.DisplayNames(["en"], { type: "region" });

export function resolveCountry(value: unknown): { code: string; name: string } | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const input = value.trim();
  const upper = input.toUpperCase();
  const alias = upper === "UK" ? "GB" : upper;
  const code = countries.includes(alias)
    ? alias
    : countries.find((candidate) => names.of(candidate)?.toLowerCase() === input.toLowerCase());
  if (!code) return null;
  return { code, name: names.of(code) ?? code };
}