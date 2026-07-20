import { it, expect, describe, afterEach } from "vitest";
import { isAdminEmail, adminEmailSet } from "./adminEmails";

const orig = process.env.ADMIN_EMAILS;
afterEach(() => {
  if (orig === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = orig;
});

describe("isAdminEmail", () => {
  it("empty/unset allowlist → nobody is admin", () => {
    delete process.env.ADMIN_EMAILS;
    expect(isAdminEmail("a@b.com")).toBe(false);
    process.env.ADMIN_EMAILS = "";
    expect(isAdminEmail("a@b.com")).toBe(false);
    expect(adminEmailSet().size).toBe(0);
  });

  it("null/undefined email is never admin", () => {
    process.env.ADMIN_EMAILS = "a@b.com";
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail("")).toBe(false);
  });

  it("matches case- and whitespace-insensitively across a comma list", () => {
    process.env.ADMIN_EMAILS = "  Boss@Example.com , second@x.pt ,, ";
    expect(adminEmailSet().size).toBe(2); // blanks dropped
    expect(isAdminEmail("boss@example.com")).toBe(true);
    expect(isAdminEmail("BOSS@EXAMPLE.COM")).toBe(true);
    expect(isAdminEmail("  second@x.pt  ")).toBe(true);
    expect(isAdminEmail("nope@x.pt")).toBe(false);
  });
});
