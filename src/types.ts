export type PrimitiveTypeName =
  | "string"
  | "int"
  | "float"
  | "bool"
  | "url"
  | "json";

export type EnumSpec<T extends readonly string[]> = T;

export type DetailedSpec =
  | {
      type: PrimitiveTypeName;
      optional?: true;
      default?: string | number | boolean;
      example?: string;
    }
  | {
      type: "enum";
      values: readonly string[];
      optional?: true;
      default?: string;
      example?: string;
    };

export type Spec<TEnum extends readonly string[] = readonly string[]> =
  | PrimitiveTypeName
  | EnumSpec<TEnum>
  | DetailedSpec;

export type Schema = Record<string, Spec>;

export type TypeFromSpec<S> = S extends "string"
  ? string
  : S extends "int"
    ? number
    : S extends "float"
      ? number
      : S extends "bool"
        ? boolean
        : S extends "url"
          ? string
          : S extends "json"
            ? unknown
            : S extends readonly (infer U)[]
              ? U extends string
                ? U
                : never
              : S extends { type: "enum"; values: readonly (infer U)[] }
                ? U extends string
                  ? U
                  : never
                : S extends { type: infer T }
                  ? T extends "string"
                    ? string
                    : T extends "int"
                      ? number
                      : T extends "float"
                        ? number
                        : T extends "bool"
                          ? boolean
                          : T extends "url"
                            ? string
                            : T extends "json"
                              ? unknown
                              : unknown
                  : unknown;

export type OutputFromSchema<TSchema extends Schema> = {
  [K in keyof TSchema]: TSchema[K] extends { optional: true }
    ? TypeFromSpec<TSchema[K]> | undefined
    : TypeFromSpec<TSchema[K]>;
};

export type EnvHealthOptions = {
  env?: NodeJS.ProcessEnv;
  header?: string;
  /** If true, example block uses "KEY=" for missing values instead of a suggested placeholder */
  blankExampleValues?: boolean;
};
