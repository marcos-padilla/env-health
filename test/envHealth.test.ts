import { describe, expect, test } from "vitest";
import { envHealth, EnvHealthError } from "../src";

describe("envHealth", () => {
  test("parses primitives and enums", () => {
    const env = envHealth(
      {
        PORT: "int",
        DEBUG: "bool",
        NODE_ENV: ["dev", "prod"] as const,
      },
      { env: { PORT: "3000", DEBUG: "true", NODE_ENV: "dev" } },
    );

    expect(env.PORT).toBe(3000);
    expect(env.DEBUG).toBe(true);
    expect(env.NODE_ENV).toBe("dev");
  });

  test("supports defaults + optional", () => {
    const env = envHealth(
      {
        TIMEOUT_MS: { type: "int", default: 5000 },
        FEATURE_X: { type: "bool", optional: true },
      },
      { env: {} },
    );

    expect(env.TIMEOUT_MS).toBe(5000);
    expect(env.FEATURE_X).toBeUndefined();
  });

  test("throws with nice errors + example env", () => {
    try {
      envHealth(
        {
          DATABASE_URL: "url",
          PORT: "int",
          NODE_ENV: ["dev", "prod"] as const,
        },
        { env: { PORT: "abc", NODE_ENV: "staging" } },
      );
      throw new Error("expected to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(EnvHealthError);
      const e = err as EnvHealthError;
      expect(e.message).toContain("Missing required variables:");
      expect(e.message).toContain("Invalid variables:");
      expect(e.message).toContain("Example .env:");
      expect(e.exampleEnv).toContain("DATABASE_URL=");
      expect(e.exampleEnv).toContain("PORT=");
      expect(e.exampleEnv).toContain("NODE_ENV=");
    }
  });
});
