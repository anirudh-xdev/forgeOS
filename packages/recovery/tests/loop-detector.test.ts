import { describe, it, expect } from "vitest";
import { LoopDetector } from "../src/loop-detector.js";

describe("LoopDetector (Circuit Breaker)", () => {
  it("should trip circuit breaker when identical error signature repeats consecutively", () => {
    const detector = new LoopDetector({ maxConsecutiveIdenticalErrors: 2 });
    const taskId = "task-loop-01";

    // Attempt 1: First occurrence
    const res1 = detector.recordExecution(taskId, 1, "sig-duplicate-123", "output-a");
    expect(res1.isLoop).toBe(false);
    expect(res1.loopType).toBe("NONE");

    // Attempt 2: Duplicate signature -> Circuit breaker trips!
    const res2 = detector.recordExecution(taskId, 2, "sig-duplicate-123", "output-b");
    expect(res2.isLoop).toBe(true);
    expect(res2.loopType).toBe("DUPLICATE_ERROR");
    expect(res2.signature).toBe("sig-duplicate-123");
    expect(res2.message).toContain("Identical error signature repeated 2 consecutive times");
  });

  it("should trip circuit breaker when output hash is identical across attempts (zero progress)", () => {
    const detector = new LoopDetector({ maxConsecutiveIdenticalOutputs: 2 });
    const taskId = "task-loop-02";

    const unchangedOutput = JSON.stringify({ code: "const x = 1;" });

    // Attempt 1
    const res1 = detector.recordExecution(taskId, 1, "sig-err-1", unchangedOutput);
    expect(res1.isLoop).toBe(false);

    // Attempt 2: Identical output with different error signature
    const res2 = detector.recordExecution(taskId, 2, "sig-err-2", unchangedOutput);
    expect(res2.isLoop).toBe(true);
    expect(res2.loopType).toBe("IDENTICAL_OUTPUT");
    expect(res2.message).toContain("identical unchanged output");
  });

  it("should trip circuit breaker on oscillating failure states (A -> B -> A)", () => {
    const detector = new LoopDetector();
    const taskId = "task-loop-03";

    detector.recordExecution(taskId, 1, "sig-state-A", "out-A");
    detector.recordExecution(taskId, 2, "sig-state-B", "out-B");
    const res3 = detector.recordExecution(taskId, 3, "sig-state-A", "out-A");

    expect(res3.isLoop).toBe(true);
    expect(res3.loopType).toBe("OSCILLATING_OUTPUT");
  });

  it("should trip circuit breaker when max retries ceiling is reached", () => {
    const detector = new LoopDetector({ maxRetries: 3 });
    const taskId = "task-loop-04";

    detector.recordExecution(taskId, 1, "sig-1");
    detector.recordExecution(taskId, 2, "sig-2");
    const res3 = detector.recordExecution(taskId, 3, "sig-3");

    expect(res3.isLoop).toBe(true);
    expect(res3.loopType).toBe("MAX_RETRIES_EXCEEDED");
  });

  it("should reset state upon task completion", () => {
    const detector = new LoopDetector({ maxConsecutiveIdenticalErrors: 2 });
    const taskId = "task-loop-05";

    detector.recordExecution(taskId, 1, "sig-1");
    detector.reset(taskId);

    const freshRes = detector.recordExecution(taskId, 1, "sig-1");
    expect(freshRes.isLoop).toBe(false);
  });
});
