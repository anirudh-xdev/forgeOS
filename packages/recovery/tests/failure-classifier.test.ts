import { describe, it, expect } from "vitest";
import { FailureClassifier } from "../src/failure-classifier.js";

describe("FailureClassifier", () => {
  const classifier = new FailureClassifier();

  it("should classify network timeouts and 429 rate limits as TRANSIENT", () => {
    const timeoutRes = classifier.classify({
      taskId: "t1",
      projectId: "p1",
      agentId: "agent-1",
      attemptCount: 1,
      error: new Error("Request failed with status code 429 Too Many Requests"),
    });

    expect(timeoutRes.category).toBe("TRANSIENT");
    expect(timeoutRes.retryable).toBe(true);
    expect(timeoutRes.suggestedStrategy).toBe("EXPONENTIAL_BACKOFF");
    expect(timeoutRes.errorSignature).toBeDefined();
  });

  it("should classify Zod validation issues as VALIDATION_ERROR", () => {
    const zodRes = classifier.classify({
      taskId: "t1",
      projectId: "p1",
      agentId: "agent-1",
      attemptCount: 1,
      error: new Error("Zod schema validation failed"),
      validationIssues: [
        { path: ["features", 0, "priority"], message: "Required" },
      ],
    });

    expect(zodRes.category).toBe("VALIDATION_ERROR");
    expect(zodRes.retryable).toBe(true);
    expect(zodRes.suggestedStrategy).toBe("PROMPT_AUGMENTATION");
    expect(zodRes.message).toContain("features.0.priority");
  });

  it("should classify test output failure as TEST_FAILURE", () => {
    const testRes = classifier.classify({
      taskId: "t1",
      projectId: "p1",
      agentId: "agent-1",
      attemptCount: 1,
      error: new Error("Docker test runner exited with code 1"),
      testOutput: "FAIL tests/user.test.ts > should create user > AssertionError: expected 201 to be 200",
    });

    expect(testRes.category).toBe("TEST_FAILURE");
    expect(testRes.retryable).toBe(true);
    expect(testRes.suggestedStrategy).toBe("PROMPT_AUGMENTATION");
  });

  it("should classify security gate failures as SECURITY_VIOLATION", () => {
    const secRes = classifier.classify({
      taskId: "t1",
      projectId: "p1",
      agentId: "agent-1",
      attemptCount: 1,
      error: "Gate evaluation failed",
      gateReasons: [
        "Security gate failed: found critical or high severity security findings.",
      ],
    });

    expect(secRes.category).toBe("SECURITY_VIOLATION");
    expect(secRes.retryable).toBe(true);
    expect(secRes.suggestedStrategy).toBe("PROMPT_AUGMENTATION");
  });

  it("should generate identical deterministic signature for identical error types regardless of timestamps", () => {
    const sig1 = classifier.classify({
      taskId: "t1",
      projectId: "p1",
      agentId: "a1",
      attemptCount: 1,
      error: "Error at 2026-09-12T22:15:00.000Z in 11111111-2222-3333-4444-555555555555: missing parameter",
    }).errorSignature;

    const sig2 = classifier.classify({
      taskId: "t1",
      projectId: "p1",
      agentId: "a1",
      attemptCount: 2,
      error: "Error at 2026-09-12T22:16:30.000Z in 99999999-8888-7777-6666-555555555555: missing parameter",
    }).errorSignature;

    expect(sig1).toBe(sig2);
  });
});
