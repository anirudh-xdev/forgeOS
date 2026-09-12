import { describe, it, expect } from "vitest";
import { RecoveryStrategy } from "../src/recovery-strategy.js";

describe("RecoveryStrategy", () => {
  it("should create augmented task input with structured remediation feedback", () => {
    const strategy = new RecoveryStrategy();

    const plan = strategy.planRecovery(
      {
        taskId: "task-rec-01",
        projectId: "proj-01",
        agentId: "forgeos-backend-agent",
        attemptCount: 1,
        error: new Error("Zod schema validation failed"),
        validationIssues: [{ path: ["framework"], message: "Expected 'fastify'" }],
      },
      {
        directive: "Implement backend routes",
      }
    );

    expect(plan.shouldRetry).toBe(true);
    expect(plan.strategy).toBe("PROMPT_AUGMENTATION");
    expect(plan.classification.category).toBe("VALIDATION_ERROR");
    expect(plan.augmentedInput).toBeDefined();

    const augmentedDirective = plan.augmentedInput?.augmentedInput["directive"] as string;
    expect(augmentedDirective).toContain("Implement backend routes");
    expect(augmentedDirective).toContain("[RECOVERY FEEDBACK - ATTEMPT 1]:");
    expect(augmentedDirective).toContain("ATTENTION: Your previous output failed schema validation");
  });

  it("should trip circuit breaker halt when loop detector identifies recurring failure", () => {
    const strategy = new RecoveryStrategy();
    const taskId = "task-rec-loop";

    // Attempt 1: Fail with identical error
    const plan1 = strategy.planRecovery(
      {
        taskId,
        projectId: "p1",
        agentId: "agent-1",
        attemptCount: 1,
        error: new Error("Specific unique error A"),
      },
      { directive: "Do work" }
    );
    expect(plan1.shouldRetry).toBe(true);

    // Attempt 2: Repeat exact same error -> Halts via circuit breaker
    const plan2 = strategy.planRecovery(
      {
        taskId,
        projectId: "p1",
        agentId: "agent-1",
        attemptCount: 2,
        error: new Error("Specific unique error A"),
      },
      { directive: "Do work" }
    );

    expect(plan2.shouldRetry).toBe(false);
    expect(plan2.strategy).toBe("CIRCUIT_BREAKER_HALT");
    expect(plan2.loopCheck.isLoop).toBe(true);
    expect(plan2.loopCheck.loopType).toBe("DUPLICATE_ERROR");
  });
});
