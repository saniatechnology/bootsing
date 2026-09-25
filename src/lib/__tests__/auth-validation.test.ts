import { describe, expect, it } from "vitest";
import { accountDeleteSchema, accountUpdateSchema, loginSchema } from "../validation";

describe("loginSchema", () => {
  it("normalises the username to trimmed lower case", () => {
    const parsed = loginSchema.parse({ username: "  Alice  ", password: "secret" });
    expect(parsed.username).toBe("alice");
    expect(parsed.password).toBe("secret");
  });

  it("rejects an empty username or password", () => {
    expect(loginSchema.safeParse({ username: "", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ username: "a", password: "" }).success).toBe(false);
  });
});

describe("accountUpdateSchema", () => {
  it("normalises a new username", () => {
    const parsed = accountUpdateSchema.parse({
      field: "username",
      username: "  BOBBY ",
      currentPassword: "pw",
    });
    expect(parsed).toEqual({ field: "username", username: "bobby", currentPassword: "pw" });
  });

  it("accepts an empty email to clear it and lower-cases a real one", () => {
    expect(
      accountUpdateSchema.parse({ field: "email", email: "", currentPassword: "pw" })
    ).toMatchObject({ email: "" });
    expect(
      accountUpdateSchema.parse({ field: "email", email: "ME@X.COM", currentPassword: "pw" })
    ).toMatchObject({ email: "me@x.com" });
  });

  it("rejects an invalid email", () => {
    const result = accountUpdateSchema.safeParse({
      field: "email",
      email: "nope",
      currentPassword: "pw",
    });
    expect(result.success).toBe(false);
  });

  it("requires a new password of at least 8 characters", () => {
    expect(
      accountUpdateSchema.safeParse({
        field: "password",
        newPassword: "short",
        currentPassword: "pw",
      }).success
    ).toBe(false);
    expect(
      accountUpdateSchema.parse({
        field: "password",
        newPassword: "longenough",
        currentPassword: "pw",
      })
    ).toMatchObject({ field: "password" });
  });

  it("always requires the current password", () => {
    expect(
      accountUpdateSchema.safeParse({ field: "username", username: "bob", currentPassword: "" })
        .success
    ).toBe(false);
  });
});

describe("accountDeleteSchema", () => {
  it("requires the current password", () => {
    expect(accountDeleteSchema.safeParse({ currentPassword: "" }).success).toBe(false);
    expect(accountDeleteSchema.parse({ currentPassword: "pw" })).toEqual({ currentPassword: "pw" });
  });
});
