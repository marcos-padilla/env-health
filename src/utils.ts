import { parseBoolStrict, parseFloatStrict, parseIntStrict } from "./parse";
import type { PrimitiveTypeName } from "./types";

/**
 * Require an environment variable. Throws if missing.
 *
 * @param key - Environment variable name
 * @param env - Optional environment object (defaults to process.env)
 * @returns The environment variable value
 * @throws Error if the variable is missing
 *
 * @example
 * ```ts
 * const apiKey = requireEnv("API_KEY");
 * ```
 */
export function requireEnv(
  key: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const value = env[key];
  if (value == null || value === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Get an environment variable with optional default value and type conversion.
 *
 * @param key - Environment variable name
 * @param options - Options object
 * @param options.default - Default value if variable is missing
 * @param options.type - Type to convert to ("string" | "int" | "float" | "bool")
 * @param options.env - Optional environment object (defaults to process.env)
 * @returns The environment variable value (converted if type specified) or default
 *
 * @example
 * ```ts
 * const port = getEnv("PORT", { type: "int", default: 3000 });
 * const debug = getEnv("DEBUG", { type: "bool", default: false });
 * ```
 */
export function getEnv<T extends PrimitiveTypeName = "string">(
  key: string,
  options?: {
    default?: T extends "string"
      ? string
      : T extends "int" | "float"
        ? number
        : T extends "bool"
          ? boolean
          : string;
    type?: T;
    env?: NodeJS.ProcessEnv;
  },
): T extends "string"
  ? string
  : T extends "int" | "float"
    ? number
    : T extends "bool"
      ? boolean
      : string {
  const env = options?.env ?? process.env;
  const raw = env[key];
  const defaultValue = options?.default;

  if (raw == null || raw === "") {
    if (defaultValue !== undefined) {
      return defaultValue as any;
    }
    throw new Error(`Missing environment variable: ${key}`);
  }

  const type = options?.type ?? "string";
  if (type === "string") {
    return raw as any;
  }

  if (type === "int") {
    const parsed = parseIntStrict(raw);
    if (parsed === null) {
      throw new Error(
        `Invalid integer value for ${key}: "${raw}". Use a valid integer.`,
      );
    }
    return parsed as any;
  }

  if (type === "float") {
    const parsed = parseFloatStrict(raw);
    if (parsed === null) {
      throw new Error(
        `Invalid float value for ${key}: "${raw}". Use a valid number.`,
      );
    }
    return parsed as any;
  }

  if (type === "bool") {
    const parsed = parseBoolStrict(raw);
    if (parsed === null) {
      throw new Error(
        `Invalid boolean value for ${key}: "${raw}". Use true/false, 1/0, yes/no, y/n, or on/off.`,
      );
    }
    return parsed as any;
  }

  return raw as any;
}

/**
 * Check if one or more environment variables exist.
 *
 * @param keys - Single key or array of keys to check
 * @param env - Optional environment object (defaults to process.env)
 * @returns true if all keys exist and are non-empty, false otherwise
 *
 * @example
 * ```ts
 * if (envExists("API_KEY")) {
 *   // API_KEY exists
 * }
 *
 * if (envExists(["DB_HOST", "DB_PORT", "DB_NAME"])) {
 *   // All database vars exist
 * }
 * ```
 */
export function envExists(
  keys: string | string[],
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const keysArray = Array.isArray(keys) ? keys : [keys];
  return keysArray.every((key) => {
    const value = env[key];
    return value != null && value !== "";
  });
}

/**
 * Get all environment variables with a specific prefix.
 *
 * @param prefix - Prefix to filter by (e.g., "DB_")
 * @param options - Options object
 * @param options.stripPrefix - If true, remove prefix from keys in result
 * @param options.env - Optional environment object (defaults to process.env)
 * @returns Object with filtered environment variables
 *
 * @example
 * ```ts
 * // Get all DB_* vars with prefix stripped
 * const dbConfig = envPrefix("DB_", { stripPrefix: true });
 * // { HOST: "localhost", PORT: "5432", NAME: "mydb" }
 * ```
 */
export function envPrefix(
  prefix: string,
  options?: {
    stripPrefix?: boolean;
    env?: NodeJS.ProcessEnv;
  },
): Record<string, string> {
  const env = options?.env ?? process.env;
  const result: Record<string, string> = {};
  const stripPrefix = options?.stripPrefix ?? false;

  for (const [key, value] of Object.entries(env)) {
    if (value != null && typeof value === "string" && key.startsWith(prefix) && value !== "") {
      const newKey = stripPrefix ? key.slice(prefix.length) : key;
      result[newKey] = value;
    }
  }

  return result;
}

/**
 * Merge multiple environment sources. Later sources override earlier ones.
 *
 * @param sources - Array of environment objects to merge
 * @returns Merged environment object
 *
 * @example
 * ```ts
 * const merged = mergeEnv(
 *   { PORT: "3000" },
 *   process.env,
 *   { DEBUG: "true" }
 * );
 * ```
 */
export function mergeEnv(
  ...sources: (NodeJS.ProcessEnv | Record<string, string | undefined>)[]
): NodeJS.ProcessEnv {
  const result: NodeJS.ProcessEnv = {};
  for (const source of sources) {
    if (source) {
      Object.assign(result, source);
    }
  }
  return result;
}

/**
 * Convert environment variables to a typed object, optionally stripping a prefix.
 *
 * @param keys - Array of environment variable keys
 * @param options - Options object
 * @param options.prefix - Optional prefix to add to keys when looking up
 * @param options.stripPrefix - If true, remove prefix from result keys
 * @param options.required - Array of keys that are required (will throw if missing)
 * @param options.env - Optional environment object (defaults to process.env)
 * @returns Object with environment variable values
 *
 * @example
 * ```ts
 * const config = envToObject(
 *   ["HOST", "PORT", "NAME"],
 *   { prefix: "DB_", stripPrefix: true }
 * );
 * // Looks up DB_HOST, DB_PORT, DB_NAME
 * // Returns { HOST: "...", PORT: "...", NAME: "..." }
 * ```
 */
export function envToObject(
  keys: string[],
  options?: {
    prefix?: string;
    stripPrefix?: boolean;
    required?: string[];
    env?: NodeJS.ProcessEnv;
  },
): Record<string, string> {
  const env = options?.env ?? process.env;
  const prefix = options?.prefix ?? "";
  // If prefix is provided, stripPrefix defaults to true; otherwise false
  const stripPrefix =
    options?.stripPrefix !== undefined
      ? options.stripPrefix
      : prefix !== "";
  const required = new Set(options?.required ?? []);
  const result: Record<string, string> = {};

  for (const key of keys) {
    const envKey = prefix + key;
    const value = env[envKey];

    if (value == null || value === "") {
      if (required.has(key)) {
        throw new Error(`Missing required environment variable: ${envKey}`);
      }
      continue;
    }

    const resultKey = stripPrefix ? key : envKey;
    result[resultKey] = value;
  }

  return result;
}

/**
 * Load and parse a .env file content string.
 * Supports basic .env format: KEY=value, comments (#), and quoted values.
 *
 * @param content - Content of .env file as string
 * @returns Parsed environment variables object
 *
 * @example
 * ```ts
 * import { readFileSync } from "fs";
 * const content = readFileSync(".env", "utf-8");
 * const env = loadEnvFile(content);
 * ```
 */
export function loadEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    // Remove leading/trailing whitespace
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    // Find the first = that's not inside quotes
    const equalIndex = trimmed.indexOf("=");
    if (equalIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalIndex).trim();
    let value = trimmed.slice(equalIndex + 1).trim();

    // Remove quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Skip if key is empty
    if (!key) {
      continue;
    }

    result[key] = value;
  }

  return result;
}

