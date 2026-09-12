// ==========================================
// 1. ForgeOS Error Hierarchy
// ==========================================

export class ForgeOSError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, code = "INTERNAL_ERROR", statusCode = 500, details?: unknown) {
    super(message);
    this.name = "ForgeOSError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends ForgeOSError {
  constructor(message: string, details?: unknown) {
    super(message, "VALIDATION_ERROR", 400, details);
    this.name = "ValidationError";
  }
}

export class ProviderError extends ForgeOSError {
  public readonly provider: string;

  constructor(provider: string, message: string, details?: unknown) {
    super(`[${provider}] ${message}`, "PROVIDER_ERROR", 502, details);
    this.name = "ProviderError";
    this.provider = provider;
  }
}

export class BudgetExceededError extends ForgeOSError {
  constructor(message: string, details?: unknown) {
    super(message, "BUDGET_EXCEEDED", 402, details);
    this.name = "BudgetExceededError";
  }
}

export class LoopDetectedError extends ForgeOSError {
  constructor(message: string, details?: unknown) {
    super(message, "LOOP_DETECTED", 422, details);
    this.name = "LoopDetectedError";
  }
}

export class SandboxExecutionError extends ForgeOSError {
  public readonly exitCode: number;
  public readonly stdout?: string;
  public readonly stderr?: string;

  constructor(message: string, exitCode: number, stdout?: string, stderr?: string) {
    super(message, "SANDBOX_ERROR", 500, { exitCode, stdout, stderr });
    this.name = "SandboxExecutionError";
    this.exitCode = exitCode;
    this.stdout = stdout;
    this.stderr = stderr;
  }
}

// ==========================================
// 2. Utility Functions
// ==========================================

export function assertNever(x: never): never {
  throw new Error(`Unexpected exhaustive match failure: ${JSON.stringify(x)}`);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
