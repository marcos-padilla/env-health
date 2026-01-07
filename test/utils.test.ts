import { describe, expect, test } from "vitest";
import {
  requireEnv,
  getEnv,
  envExists,
  envPrefix,
  mergeEnv,
  envToObject,
  loadEnvFile,
} from "../src";

describe("requireEnv", () => {
  test("returns value when env var exists", () => {
    const value = requireEnv("TEST_KEY", { TEST_KEY: "test-value" });
    expect(value).toBe("test-value");
  });

  test("throws when env var is missing", () => {
    expect(() => requireEnv("MISSING_KEY", {})).toThrow(
      "Missing required environment variable: MISSING_KEY",
    );
  });

  test("throws when env var is empty string", () => {
    expect(() => requireEnv("EMPTY_KEY", { EMPTY_KEY: "" })).toThrow(
      "Missing required environment variable: EMPTY_KEY",
    );
  });
});

describe("getEnv", () => {
  test("returns string value by default", () => {
    const value = getEnv("STRING_KEY", {
      env: { STRING_KEY: "hello" },
    });
    expect(value).toBe("hello");
  });

  test("returns default when env var is missing", () => {
    const value = getEnv("MISSING_KEY", { default: "default-value" });
    expect(value).toBe("default-value");
  });

  test("throws when env var is missing and no default", () => {
    expect(() => getEnv("MISSING_KEY", { env: {} })).toThrow(
      "Missing environment variable: MISSING_KEY",
    );
  });

  test("parses integer values", () => {
    const value = getEnv("PORT", {
      type: "int",
      env: { PORT: "3000" },
    });
    expect(value).toBe(3000);
    expect(typeof value).toBe("number");
  });

  test("parses float values", () => {
    const value = getEnv("RATIO", {
      type: "float",
      env: { RATIO: "0.5" },
    });
    expect(value).toBe(0.5);
    expect(typeof value).toBe("number");
  });

  test("parses boolean values", () => {
    expect(getEnv("DEBUG", { type: "bool", env: { DEBUG: "true" } })).toBe(
      true,
    );
    expect(getEnv("DEBUG", { type: "bool", env: { DEBUG: "false" } })).toBe(
      false,
    );
    expect(getEnv("DEBUG", { type: "bool", env: { DEBUG: "1" } })).toBe(true);
    expect(getEnv("DEBUG", { type: "bool", env: { DEBUG: "0" } })).toBe(false);
  });

  test("throws on invalid integer", () => {
    expect(() =>
      getEnv("PORT", { type: "int", env: { PORT: "not-a-number" } }),
    ).toThrow("Invalid integer value for PORT");
  });

  test("throws on invalid boolean", () => {
    expect(() =>
      getEnv("DEBUG", { type: "bool", env: { DEBUG: "maybe" } }),
    ).toThrow("Invalid boolean value for DEBUG");
  });

  test("uses default for typed values", () => {
    const port = getEnv("PORT", { type: "int", default: 8080, env: {} });
    expect(port).toBe(8080);

    const debug = getEnv("DEBUG", { type: "bool", default: true, env: {} });
    expect(debug).toBe(true);
  });
});

describe("envExists", () => {
  test("returns true when single key exists", () => {
    expect(envExists("KEY", { KEY: "value" })).toBe(true);
  });

  test("returns false when single key is missing", () => {
    expect(envExists("MISSING", {})).toBe(false);
  });

  test("returns false when single key is empty", () => {
    expect(envExists("EMPTY", { EMPTY: "" })).toBe(false);
  });

  test("returns true when all keys exist", () => {
    expect(
      envExists(["KEY1", "KEY2", "KEY3"], {
        KEY1: "value1",
        KEY2: "value2",
        KEY3: "value3",
      }),
    ).toBe(true);
  });

  test("returns false when any key is missing", () => {
    expect(
      envExists(["KEY1", "KEY2", "KEY3"], {
        KEY1: "value1",
        KEY2: "value2",
      }),
    ).toBe(false);
  });

  test("returns false when any key is empty", () => {
    expect(
      envExists(["KEY1", "KEY2"], {
        KEY1: "value1",
        KEY2: "",
      }),
    ).toBe(false);
  });
});

describe("envPrefix", () => {
  test("filters env vars by prefix", () => {
    const result = envPrefix("DB_", {
      env: {
        DB_HOST: "localhost",
        DB_PORT: "5432",
        DB_NAME: "mydb",
        API_KEY: "secret",
      },
    });
    expect(result).toEqual({
      DB_HOST: "localhost",
      DB_PORT: "5432",
      DB_NAME: "mydb",
    });
    expect(result.API_KEY).toBeUndefined();
  });

  test("strips prefix when stripPrefix is true", () => {
    const result = envPrefix("DB_", {
      stripPrefix: true,
      env: {
        DB_HOST: "localhost",
        DB_PORT: "5432",
        API_KEY: "secret",
      },
    });
    expect(result).toEqual({
      HOST: "localhost",
      PORT: "5432",
    });
  });

  test("returns empty object when no matching vars", () => {
    const result = envPrefix("PREFIX_", {
      env: { OTHER_KEY: "value" },
    });
    expect(result).toEqual({});
  });

  test("ignores empty values", () => {
    const result = envPrefix("DB_", {
      env: {
        DB_HOST: "localhost",
        DB_PORT: "",
        DB_NAME: "mydb",
      },
    });
    expect(result).toEqual({
      DB_HOST: "localhost",
      DB_NAME: "mydb",
    });
  });
});

describe("mergeEnv", () => {
  test("merges multiple env sources", () => {
    const result = mergeEnv(
      { KEY1: "value1" },
      { KEY2: "value2" },
      { KEY3: "value3" },
    );
    expect(result).toEqual({
      KEY1: "value1",
      KEY2: "value2",
      KEY3: "value3",
    });
  });

  test("later sources override earlier ones", () => {
    const result = mergeEnv(
      { KEY: "value1" },
      { KEY: "value2" },
      { KEY: "value3" },
    );
    expect(result.KEY).toBe("value3");
  });

  test("handles empty sources", () => {
    const result = mergeEnv({ KEY: "value" }, {}, { OTHER: "other" });
    expect(result).toEqual({ KEY: "value", OTHER: "other" });
  });

  test("handles undefined values", () => {
    const result = mergeEnv(
      { KEY1: "value1" },
      { KEY2: undefined },
      { KEY3: "value3" },
    );
    expect(result.KEY1).toBe("value1");
    expect(result.KEY2).toBeUndefined();
    expect(result.KEY3).toBe("value3");
  });
});

describe("envToObject", () => {
  test("converts env vars to object", () => {
    const result = envToObject(["HOST", "PORT", "NAME"], {
      env: {
        HOST: "localhost",
        PORT: "5432",
        NAME: "mydb",
      },
    });
    expect(result).toEqual({
      HOST: "localhost",
      PORT: "5432",
      NAME: "mydb",
    });
  });

  test("adds prefix when looking up", () => {
    const result = envToObject(["HOST", "PORT"], {
      prefix: "DB_",
      env: {
        DB_HOST: "localhost",
        DB_PORT: "5432",
      },
    });
    expect(result).toEqual({
      HOST: "localhost",
      PORT: "5432",
    });
  });

  test("strips prefix from result keys when stripPrefix is false", () => {
    const result = envToObject(["HOST", "PORT"], {
      prefix: "DB_",
      stripPrefix: false,
      env: {
        DB_HOST: "localhost",
        DB_PORT: "5432",
      },
    });
    expect(result).toEqual({
      DB_HOST: "localhost",
      DB_PORT: "5432",
    });
  });

  test("skips missing optional keys", () => {
    const result = envToObject(["HOST", "PORT", "NAME"], {
      env: {
        HOST: "localhost",
        PORT: "5432",
      },
    });
    expect(result).toEqual({
      HOST: "localhost",
      PORT: "5432",
    });
    expect(result.NAME).toBeUndefined();
  });

  test("throws when required key is missing", () => {
    expect(() =>
      envToObject(["HOST", "PORT"], {
        required: ["HOST", "PORT"],
        env: { HOST: "localhost" },
      }),
    ).toThrow("Missing required environment variable: PORT");
  });

  test("throws with correct key name when prefix is used", () => {
    expect(() =>
      envToObject(["HOST"], {
        prefix: "DB_",
        required: ["HOST"],
        env: {},
      }),
    ).toThrow("Missing required environment variable: DB_HOST");
  });
});

describe("loadEnvFile", () => {
  test("parses basic key-value pairs", () => {
    const content = "KEY1=value1\nKEY2=value2\nKEY3=value3";
    const result = loadEnvFile(content);
    expect(result).toEqual({
      KEY1: "value1",
      KEY2: "value2",
      KEY3: "value3",
    });
  });

  test("ignores comments", () => {
    const content = "KEY1=value1\n# This is a comment\nKEY2=value2";
    const result = loadEnvFile(content);
    expect(result).toEqual({
      KEY1: "value1",
      KEY2: "value2",
    });
  });

  test("ignores empty lines", () => {
    const content = "KEY1=value1\n\nKEY2=value2\n  \nKEY3=value3";
    const result = loadEnvFile(content);
    expect(result).toEqual({
      KEY1: "value1",
      KEY2: "value2",
      KEY3: "value3",
    });
  });

  test("strips quotes from values", () => {
    const content = 'KEY1="value1"\nKEY2=\'value2\'\nKEY3=value3';
    const result = loadEnvFile(content);
    expect(result).toEqual({
      KEY1: "value1",
      KEY2: "value2",
      KEY3: "value3",
    });
  });

  test("handles values with spaces", () => {
    const content = 'KEY1="value with spaces"\nKEY2=value without spaces';
    const result = loadEnvFile(content);
    expect(result).toEqual({
      KEY1: "value with spaces",
      KEY2: "value without spaces",
    });
  });

  test("trims whitespace", () => {
    const content = "  KEY1  =  value1  \n  KEY2=value2  ";
    const result = loadEnvFile(content);
    expect(result).toEqual({
      KEY1: "value1",
      KEY2: "value2",
    });
  });

  test("handles Windows line endings", () => {
    const content = "KEY1=value1\r\nKEY2=value2";
    const result = loadEnvFile(content);
    expect(result).toEqual({
      KEY1: "value1",
      KEY2: "value2",
    });
  });

  test("skips lines without equals sign", () => {
    const content = "KEY1=value1\nINVALID_LINE\nKEY2=value2";
    const result = loadEnvFile(content);
    expect(result).toEqual({
      KEY1: "value1",
      KEY2: "value2",
    });
  });
});

