export type EnvIssue =
  | { kind: "missing"; key: string; expected: string }
  | { kind: "invalid"; key: string; expected: string; received: string };

export class EnvHealthError extends Error {
  public readonly issues: EnvIssue[];
  public readonly exampleEnv: string;

  constructor(message: string, issues: EnvIssue[], exampleEnv: string) {
    super(message);
    this.name = "EnvHealthError";
    this.issues = issues;
    this.exampleEnv = exampleEnv;
  }
}
