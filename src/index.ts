import { EnvHealthError, type EnvIssue } from "./error";
import type {
  EnvHealthOptions,
  OutputFromSchema,
  Schema,
  Spec,
  DetailedSpec,
  PrimitiveTypeName,
} from "./types";
import {
  parseBoolStrict,
  parseFloatStrict,
  parseIntStrict,
  parseJsonStrict,
  parseUrlStrict,
} from "./parse";

type NormalizedSpec = {
  kind: "primitive" | "enum";
  type?: PrimitiveTypeName;
  values?: readonly string[];
  optional: boolean;
  defaultValue?: unknown;
  example?: string | undefined;
};

// Type guards for better type narrowing
function isArraySpec(spec: Spec): spec is readonly string[] {
  return Array.isArray(spec);
}

function isStringSpec(spec: Spec): spec is PrimitiveTypeName {
  return typeof spec === "string";
}

function isEnumDetailedSpec(
  spec: DetailedSpec,
): spec is Extract<DetailedSpec, { type: "enum" }> {
  return spec.type === "enum";
}

function isPrimitiveDetailedSpec(
  spec: DetailedSpec,
): spec is Extract<DetailedSpec, { type: PrimitiveTypeName }> {
  return spec.type !== "enum";
}

function expectedLabel(spec: Spec): string {
  if (isArraySpec(spec)) {
    return `one of (${spec.join(", ")})`;
  }
  if (isStringSpec(spec)) {
    return spec;
  }
  if (isEnumDetailedSpec(spec)) {
    return `one of (${spec.values.join(", ")})`;
  }
  if (isPrimitiveDetailedSpec(spec)) {
    return spec.type;
  }
  return "unknown";
}

function normalizeSpec(spec: Spec): NormalizedSpec {
  if (isArraySpec(spec)) {
    return { kind: "enum", values: spec, optional: false };
  }
  if (isStringSpec(spec)) {
    return { kind: "primitive", type: spec, optional: false };
  }
  if (isEnumDetailedSpec(spec)) {
    return {
      kind: "enum",
      values: spec.values,
      optional: spec.optional === true,
      defaultValue: spec.default,
      example: spec.example ?? undefined,
    };
  }
  if (isPrimitiveDetailedSpec(spec)) {
    return {
      kind: "primitive",
      type: spec.type,
      optional: spec.optional === true,
      defaultValue: spec.default,
      example: spec.example ?? undefined,
    };
  }
  // Fallback (should never happen with proper types)
  return { kind: "primitive", type: "string", optional: false };
}

// Cache for example suggestions to avoid repeated computations
const EXAMPLE_CACHE = new Map<string, string>();

function suggestExample(key: string, spec: Spec): string {
  const cacheKey = `${key}:${JSON.stringify(spec)}`;
  const cached = EXAMPLE_CACHE.get(cacheKey);
  if (cached) return cached;

  const n = normalizeSpec(spec);
  let example: string;

  if (n.example) {
    example = n.example;
  } else if (n.kind === "enum" && n.values && n.values.length > 0) {
    example = String(n.values[0]);
  } else {
    const upperKey = key.toUpperCase();
    switch (n.type) {
      case "int":
        example = "3000";
        break;
      case "float":
        example = "0.5";
        break;
      case "bool":
        example = "true";
        break;
      case "url":
        // DATABASE_URL is super common; give nicer placeholder
        example =
          upperKey.includes("DATABASE") && upperKey.includes("URL")
            ? "postgres://user:pass@localhost:5432/db"
            : "https://example.com";
        break;
      case "json":
        example = '{"key":"value"}';
        break;
      default:
        example = "your_value_here";
    }
  }

  EXAMPLE_CACHE.set(cacheKey, example);
  return example;
}

function parseByType(
  type: PrimitiveTypeName,
  raw: string,
): { ok: true; value: unknown } | { ok: false } {
  switch (type) {
    case "string":
      return { ok: true, value: raw };
    case "int": {
      const n = parseIntStrict(raw);
      return n === null ? { ok: false } : { ok: true, value: n };
    }
    case "float": {
      const n = parseFloatStrict(raw);
      return n === null ? { ok: false } : { ok: true, value: n };
    }
    case "bool": {
      const b = parseBoolStrict(raw);
      return b === null ? { ok: false } : { ok: true, value: b };
    }
    case "url": {
      const u = parseUrlStrict(raw);
      return u === null ? { ok: false } : { ok: true, value: u };
    }
    case "json": {
      const j = parseJsonStrict(raw);
      return j === null ? { ok: false } : { ok: true, value: j };
    }
  }
}

function buildExampleEnv(schema: Schema, opts: EnvHealthOptions): string {
  const lines: string[] = [];

  for (const [key, spec] of Object.entries(schema)) {
    const n = normalizeSpec(spec);
    const example = opts.blankExampleValues ? "" : suggestExample(key, spec);
    const optionalSuffix = n.optional ? "  # optional" : "";
    lines.push(`${key}=${example}${optionalSuffix}`.trimEnd());
  }

  return lines.join("\n");
}

export function envHealth<const TSchema extends Schema>(
  schema: TSchema,
  options: EnvHealthOptions = {},
): OutputFromSchema<TSchema> {
  const env = options.env ?? process.env;
  const issues: EnvIssue[] = [];
  const out: Record<string, unknown> = {};

  // Single pass through schema entries
  for (const [key, spec] of Object.entries(schema)) {
    const n = normalizeSpec(spec);
    const expected = expectedLabel(spec);
    const raw = env[key];

    // Handle missing or empty values
    if (raw == null || raw === "") {
      if (n.defaultValue !== undefined) {
        out[key] = n.defaultValue;
        continue;
      }
      if (n.optional) {
        out[key] = undefined;
        continue;
      }
      issues.push({ kind: "missing", key, expected });
      continue;
    }

    // Handle enum validation
    if (n.kind === "enum") {
      const values = n.values;
      if (values && values.includes(raw)) {
        out[key] = raw;
      } else {
        issues.push({ kind: "invalid", key, expected, received: raw });
      }
      continue;
    }

    // Handle primitive type parsing
    const type = n.type ?? "string";
    const parsed = parseByType(type, raw);
    if (parsed.ok) {
      out[key] = parsed.value;
    } else {
      issues.push({ kind: "invalid", key, expected, received: raw });
    }
  }

  // Build error message only if there are issues
  if (issues.length > 0) {
    const exampleEnv = buildExampleEnv(schema, options);
    const header = options.header ? `${options.header}\n` : "";
    const lines: string[] = [
      header
        ? `${header}Environment validation failed:\n`
        : "Environment validation failed:\n",
    ];

    // Separate missing and invalid issues in a single pass
    const missing: Extract<EnvIssue, { kind: "missing" }>[] = [];
    const invalid: Extract<EnvIssue, { kind: "invalid" }>[] = [];

    for (let i = 0; i < issues.length; i++) {
      const issue = issues[i];
      if (!issue) continue;
      if (issue.kind === "missing") {
        missing.push(issue);
      } else {
        invalid.push(issue);
      }
    }

    if (missing.length > 0) {
      lines.push("Missing required variables:");
      for (let i = 0; i < missing.length; i++) {
        const m = missing[i];
        if (m) {
          lines.push(`  - ${m.key} (expected: ${m.expected})`);
        }
      }
      lines.push("");
    }

    if (invalid.length > 0) {
      lines.push("Invalid variables:");
      for (let i = 0; i < invalid.length; i++) {
        const v = invalid[i];
        if (v) {
          lines.push(`  - ${v.key}="${v.received}" (expected: ${v.expected})`);
        }
      }
      lines.push("");
    }

    lines.push("Example .env:");
    lines.push("------------");
    lines.push(exampleEnv);

    throw new EnvHealthError(lines.join("\n"), issues, exampleEnv);
  }

  return out as OutputFromSchema<TSchema>;
}

export { EnvHealthError } from "./error";
export type { EnvHealthOptions, Schema, Spec, OutputFromSchema } from "./types";
export {
  requireEnv,
  getEnv,
  envExists,
  envPrefix,
  mergeEnv,
  envToObject,
  loadEnvFile,
} from "./utils";
