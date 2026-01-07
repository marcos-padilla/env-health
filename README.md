# env-health

Tiny runtime validator for `process.env` with great error messages and comprehensive utilities.

## Features

- ✅ **Type-safe** - Full TypeScript support with inference
- ✅ **Great error messages** - Clear, actionable error messages with example `.env` files
- ✅ **Multiple type parsers** - Supports `string`, `int`, `float`, `bool`, `url`, `json`, and `enum`
- ✅ **Comprehensive utilities** - Helper functions for common env var operations
- ✅ **Zero dependencies** - Lightweight and fast
- ✅ **Flexible** - Works with any environment object, not just `process.env`

## Install

```bash
npm i env-health
```

## Quick Start

```ts
import { envHealth } from "env-health";

const env = envHealth({
  PORT: "int",
  DEBUG: "bool",
  NODE_ENV: ["dev", "prod", "test"] as const,
  DATABASE_URL: "url",
});

console.log(env.PORT); // number: 3000
console.log(env.DEBUG); // boolean: true
console.log(env.NODE_ENV); // "dev" | "prod" | "test"
```

## API Reference

### `envHealth(schema, options?)`

The main validation function. Validates and parses environment variables according to a schema.

#### Schema Types

**Primitive Types:**

- `"string"` - String value (default)
- `"int"` - Integer number
- `"float"` - Floating point number
- `"bool"` - Boolean (accepts: `true/false`, `1/0`, `yes/no`, `y/n`, `on/off`)
- `"url"` - Valid URL string
- `"json"` - Valid JSON (parsed to `unknown`)

**Enum Types:**

- Array of strings: `["dev", "prod"] as const`
- Object with `type: "enum"` and `values` array

**Detailed Spec:**

```ts
{
  type: "int" | "float" | "bool" | "string" | "url" | "json",
  optional?: true,
  default?: string | number | boolean,
  example?: string
}
```

#### Examples

```ts
import { envHealth } from "env-health";

// Simple types
const env = envHealth({
  PORT: "int",
  DEBUG: "bool",
  API_URL: "url",
});

// With defaults
const env = envHealth({
  PORT: { type: "int", default: 3000 },
  TIMEOUT: { type: "int", default: 5000 },
});

// Optional variables
const env = envHealth({
  REQUIRED: "string",
  OPTIONAL: { type: "string", optional: true },
});

// Enums
const env = envHealth({
  NODE_ENV: ["dev", "prod", "test"] as const,
  LOG_LEVEL: {
    type: "enum",
    values: ["debug", "info", "warn", "error"],
    default: "info",
  },
});

// Custom environment object
const env = envHealth(
  {
    PORT: "int",
    DEBUG: "bool",
  },
  { env: { PORT: "3000", DEBUG: "true" } },
);
```

#### Error Messages

When validation fails, `envHealth` throws an `EnvHealthError` with:

- List of missing required variables
- List of invalid variables with expected vs received values
- Example `.env` file showing the correct format

```ts
import { envHealth, EnvHealthError } from "env-health";

try {
  const env = envHealth({
    DATABASE_URL: "url",
    PORT: "int",
  });
} catch (err) {
  if (err instanceof EnvHealthError) {
    console.error(err.message);
    // Environment validation failed:
    //
    // Missing required variables:
    //   - DATABASE_URL (expected: url)
    //
    // Example .env:
    // ------------
    // DATABASE_URL=postgres://user:pass@localhost:5432/db
    // PORT=3000
  }
}
```

### `requireEnv(key, env?)`

Require an environment variable. Throws if missing.

```ts
import { requireEnv } from "env-health";

const apiKey = requireEnv("API_KEY");
// Throws if API_KEY is missing or empty
```

### `getEnv(key, options?)`

Get an environment variable with optional default and type conversion.

```ts
import { getEnv } from "env-health";

// String (default)
const apiKey = getEnv("API_KEY", { default: "default-key" });

// Integer
const port = getEnv("PORT", { type: "int", default: 3000 });

// Float
const ratio = getEnv("RATIO", { type: "float", default: 0.5 });

// Boolean
const debug = getEnv("DEBUG", { type: "bool", default: false });

// Custom environment
const value = getEnv("KEY", { env: customEnv, default: "fallback" });
```

### `envExists(keys, env?)`

Check if one or more environment variables exist.

```ts
import { envExists } from "env-health";

// Single key
if (envExists("API_KEY")) {
  // API_KEY exists
}

// Multiple keys (all must exist)
if (envExists(["DB_HOST", "DB_PORT", "DB_NAME"])) {
  // All database vars exist
}

// Custom environment
if (envExists("KEY", customEnv)) {
  // ...
}
```

### `envPrefix(prefix, options?)`

Get all environment variables with a specific prefix.

```ts
import { envPrefix } from "env-health";

// Get all DB_* vars
const dbVars = envPrefix("DB_");
// { DB_HOST: "localhost", DB_PORT: "5432", DB_NAME: "mydb" }

// Strip prefix from keys
const dbConfig = envPrefix("DB_", { stripPrefix: true });
// { HOST: "localhost", PORT: "5432", NAME: "mydb" }

// Custom environment
const vars = envPrefix("PREFIX_", { env: customEnv });
```

### `mergeEnv(...sources)`

Merge multiple environment sources. Later sources override earlier ones.

```ts
import { mergeEnv } from "env-health";

const merged = mergeEnv(
  { PORT: "3000" }, // defaults
  process.env, // system env
  { DEBUG: "true" }, // overrides
);
```

### `envToObject(keys, options?)`

Convert environment variables to a typed object, optionally with prefix handling.

```ts
import { envToObject } from "env-health";

// Basic usage
const config = envToObject(["HOST", "PORT", "NAME"], {
  env: {
    HOST: "localhost",
    PORT: "5432",
    NAME: "mydb",
  },
});
// { HOST: "localhost", PORT: "5432", NAME: "mydb" }

// With prefix
const dbConfig = envToObject(["HOST", "PORT"], {
  prefix: "DB_",
  env: {
    DB_HOST: "localhost",
    DB_PORT: "5432",
  },
});
// { HOST: "localhost", PORT: "5432" }

// With required keys
const config = envToObject(["HOST", "PORT"], {
  prefix: "DB_",
  required: ["HOST", "PORT"],
  env: { DB_HOST: "localhost" },
});
// Throws: Missing required environment variable: DB_PORT
```

### `loadEnvFile(content)`

Load and parse a `.env` file content string.

```ts
import { loadEnvFile } from "env-health";
import { readFileSync } from "fs";

const content = readFileSync(".env", "utf-8");
const env = loadEnvFile(content);

// Supports:
// - KEY=value
// - Comments (#)
// - Quoted values ("value" or 'value')
// - Empty lines
```

## TypeScript

Full TypeScript support with type inference:

```ts
import { envHealth } from "env-health";

const env = envHealth({
  PORT: "int",
  DEBUG: "bool",
  NODE_ENV: ["dev", "prod"] as const,
});

// Type: { PORT: number; DEBUG: boolean; NODE_ENV: "dev" | "prod" }
type EnvType = typeof env;
```

## License

MIT
