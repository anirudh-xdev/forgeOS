import { describe, it, expect } from "vitest";
import { RetryPolicy } from "../src/retry-policy.js";

describe("RetryPolicy", () => {
  it("should calculate exponential backoff without jitter deterministically", () => {
    const policy = new RetryPolicy({
      initialDelayMs: 200,
      backoffFactor: 2.0,
      maxDelayMs: 5000,
      jitter: false,
    });

    expect(policy.calculateBackoff(1)).toBe(200);
    expect(policy.calculateBackoff(2)).toBe(400);
    expect(policy.calculateBackoff(3)).toBe(800);
    expect(policy.calculateBackoff(4)).toBe(1600);
  });

  it("should cap backoff delay at maxDelayMs", () => {
    const policy = new RetryPolicy({
      initialDelayMs: 1000,
      backoffFactor: 3.0,
      maxDelayMs: 2500,
      jitter: false,
    });

    expect(policy.calculateBackoff(3)).toBe(2500);
  });

  it("should correctly evaluate shouldRetry based on maxRetries and classification", () => {
    const policy = new RetryPolicy({ maxRetries: 3 });

    const retryableClass = {
      category: "VALIDATION_ERROR" as const,
      retryable: true,
      errorSignature: "sig-1",
      message: "Validation failed",
      suggestedStrategy: "PROMPT_AUGMENTATION",
    };

    const fatalClass = {
      category: "TERMINAL" as const,
      retryable: false,
      errorSignature: "sig-2",
      message: "Fatal error",
      suggestedStrategy: "CIRCUIT_BREAKER_HALT",
    };

    expect(policy.shouldRetry(retryableClass, 1)).toBe(true);
    expect(policy.shouldRetry(retryableClass, 2)).toBe(true);
    expect(policy.shouldRetry(retryableClass, 3)).toBe(false); // attempt >= maxRetries
    expect(policy.shouldRetry(fatalClass, 1)).toBe(false); // non-retryable
  });
});
