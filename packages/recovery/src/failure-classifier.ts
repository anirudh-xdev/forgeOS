import { createHash } from "node:crypto";
import { FailureCategory, FailureClassification } from "@forgeos/contracts";
import { FailureContext } from "./types.js";

export class FailureClassifier {
  /**
   * Classify any execution or gate failure into a structured diagnostic classification
   */
  public classify(context: FailureContext): FailureClassification {
    const errorStr = this.extractErrorMessage(context.error);
    const lower = errorStr.toLowerCase();

    // 1. Transient / Network / Rate Limits
    if (
      lower.includes("timeout") ||
      lower.includes("timed out") ||
      lower.includes("etimedout") ||
      lower.includes("econnreset") ||
      lower.includes("econnrefused") ||
      lower.includes("rate limit") ||
      lower.includes("429") ||
      lower.includes("503") ||
      lower.includes("502") ||
      lower.includes("fetch failed")
    ) {
      return {
        category: "TRANSIENT",
        retryable: true,
        errorSignature: this.hashSignature("TRANSIENT", this.normalizeError(errorStr)),
        message: "Transient network timeout or service rate limit encountered.",
        suggestedStrategy: "EXPONENTIAL_BACKOFF",
        details: { rawError: errorStr },
      };
    }

    // 2. Schema / Validation Errors (Zod / JSON)
    if (
      context.validationIssues &&
      context.validationIssues.length > 0
    ) {
      const issueSummary = (context.validationIssues as Array<{ path?: unknown; message?: string }>)
        .map((i) => `${Array.isArray(i.path) ? i.path.join(".") : ""}: ${i.message ?? ""}`)
        .join("; ");

      return {
        category: "VALIDATION_ERROR",
        retryable: true,
        errorSignature: this.hashSignature("VALIDATION_ERROR", issueSummary),
        message: `Schema validation failed: ${issueSummary}`,
        suggestedStrategy: "PROMPT_AUGMENTATION",
        details: { issues: context.validationIssues },
      };
    }

    if (
      lower.includes("validation") ||
      lower.includes("invalid arguments") ||
      lower.includes("failed to parse json") ||
      lower.includes("unexpected token") ||
      lower.includes("syntaxerror: unexpected")
    ) {
      return {
        category: "VALIDATION_ERROR",
        retryable: true,
        errorSignature: this.hashSignature("VALIDATION_ERROR", this.normalizeError(errorStr)),
        message: `Output format or JSON syntax error: ${errorStr}`,
        suggestedStrategy: "PROMPT_AUGMENTATION",
        details: { rawError: errorStr },
      };
    }

    // 3. Automated Test Failures (Sandbox / Vitest / Node)
    if (
      (context.gateReasons && context.gateReasons.some((r) => r.toLowerCase().includes("qa gate") || r.toLowerCase().includes("test"))) ||
      context.testOutput?.includes("FAIL") ||
      context.testOutput?.includes("AssertionError") ||
      lower.includes("test failed") ||
      lower.includes("assertionerror")
    ) {
      const signaturePayload = context.testOutput
        ? this.extractTestFailureSignature(context.testOutput)
        : errorStr;

      return {
        category: "TEST_FAILURE",
        retryable: true,
        errorSignature: this.hashSignature("TEST_FAILURE", signaturePayload),
        message: "Automated test suite execution or acceptance criteria check failed.",
        suggestedStrategy: "PROMPT_AUGMENTATION",
        details: { testOutput: context.testOutput, gateReasons: context.gateReasons },
      };
    }

    // 4. Security Gate Rejections
    if (
      context.gateReasons &&
      context.gateReasons.some((r) => r.toLowerCase().includes("security gate"))
    ) {
      const secReasons = context.gateReasons.filter((r) =>
        r.toLowerCase().includes("security")
      );
      return {
        category: "SECURITY_VIOLATION",
        retryable: true,
        errorSignature: this.hashSignature("SECURITY_VIOLATION", secReasons.join("|")),
        message: `Security audit failed: ${secReasons.join("; ")}`,
        suggestedStrategy: "PROMPT_AUGMENTATION",
        details: { gateReasons: context.gateReasons },
      };
    }

    // 5. Contract / Architectural Mismatch
    if (
      context.gateReasons &&
      context.gateReasons.some((r) => r.toLowerCase().includes("reviewer gate"))
    ) {
      const revReasons = context.gateReasons.filter((r) =>
        r.toLowerCase().includes("reviewer")
      );
      return {
        category: "CONTRACT_MISMATCH",
        retryable: true,
        errorSignature: this.hashSignature("CONTRACT_MISMATCH", revReasons.join("|")),
        message: `Reviewer rejected artifact: ${revReasons.join("; ")}`,
        suggestedStrategy: "PROMPT_AUGMENTATION",
        details: { gateReasons: context.gateReasons },
      };
    }

    // 6. Environment / System Fatal
    if (
      lower.includes("enoent") ||
      lower.includes("cannot find module") ||
      lower.includes("docker daemon") ||
      lower.includes("deadlock")
    ) {
      return {
        category: "ENVIRONMENT_ERROR",
        retryable: false,
        errorSignature: this.hashSignature("ENVIRONMENT_ERROR", this.normalizeError(errorStr)),
        message: `Fatal environment or filesystem error: ${errorStr}`,
        suggestedStrategy: "CIRCUIT_BREAKER_HALT",
        details: { rawError: errorStr },
      };
    }

    // 7. Unknown Fallback
    return {
      category: "UNKNOWN",
      retryable: true,
      errorSignature: this.hashSignature("UNKNOWN", this.normalizeError(errorStr)),
      message: errorStr || "Unknown execution failure occurred.",
      suggestedStrategy: "PROMPT_AUGMENTATION",
      details: { rawError: errorStr },
    };
  }

  private extractErrorMessage(err: unknown): string {
    if (err instanceof Error) {
      return err.message;
    }
    if (typeof err === "string") {
      return err;
    }
    if (typeof err === "object" && err !== null && "message" in err) {
      return String((err as { message: unknown }).message);
    }
    return JSON.stringify(err);
  }

  private normalizeError(str: string): string {
    // Strip timestamps, random uuids, and memory addresses to ensure deterministic signatures
    return str
      .replace(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, "<UUID>")
      .replace(/0x[0-9a-fA-F]+/g, "<HEX>")
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z/g, "<TIMESTAMP>")
      .replace(/\s+/g, " ")
      .trim();
  }

  private extractTestFailureSignature(output: string): string {
    // Extract first failing assertion line or test name
    const lines = output.split("\n");
    const failingLines = lines.filter(
      (l) => l.includes("FAIL") || l.includes("AssertionError") || l.includes("Error:")
    );
    return failingLines.slice(0, 3).join(" ").trim() || output.slice(0, 150);
  }

  private hashSignature(category: FailureCategory, payload: string): string {
    return createHash("sha256")
      .update(`${category}:${payload}`)
      .digest("hex")
      .slice(0, 16);
  }
}
