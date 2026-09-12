import { createHash } from "node:crypto";
import { LoopDetectionResult } from "@forgeos/contracts";
import { LoopDetectorOptions, TaskExecutionSnapshot } from "./types.js";

export const DEFAULT_LOOP_OPTIONS: Required<LoopDetectorOptions> = {
  maxConsecutiveIdenticalErrors: 2,
  maxConsecutiveIdenticalOutputs: 2,
  maxRetries: 3,
};

export class LoopDetector {
  private options: Required<LoopDetectorOptions>;
  private history = new Map<string, TaskExecutionSnapshot[]>();

  constructor(options: LoopDetectorOptions = {}) {
    this.options = { ...DEFAULT_LOOP_OPTIONS, ...options };
  }

  /**
   * Records a task execution failure or attempt
   */
  public recordExecution(
    taskId: string,
    attempt: number,
    errorSignature?: string,
    rawOutput?: string
  ): LoopDetectionResult {
    const outputHash = rawOutput
      ? createHash("sha256").update(rawOutput).digest("hex").slice(0, 16)
      : undefined;

    const snapshot: TaskExecutionSnapshot = {
      taskId,
      attempt,
      errorSignature,
      outputHash,
      timestamp: new Date().toISOString(),
    };

    const taskHistory = this.history.get(taskId) ?? [];
    taskHistory.push(snapshot);
    this.history.set(taskId, taskHistory);

    return this.detectLoop(taskId);
  }

  /**
   * Evaluates task history to detect repetitive loops or circuit-breaking conditions
   */
  public detectLoop(taskId: string): LoopDetectionResult {
    const snapshots = this.history.get(taskId) ?? [];
    const count = snapshots.length;

    if (count === 0) {
      return {
        isLoop: false,
        loopType: "NONE",
        consecutiveFailures: 0,
        message: "No failures recorded.",
      };
    }

    // 1. Check Consecutive Identical Error Signatures
    if (count >= this.options.maxConsecutiveIdenticalErrors) {
      const recent = snapshots.slice(-this.options.maxConsecutiveIdenticalErrors);
      const firstSig = recent[0]?.errorSignature;

      if (firstSig && recent.every((s) => s.errorSignature === firstSig)) {
        return {
          isLoop: true,
          loopType: "DUPLICATE_ERROR",
          consecutiveFailures: this.options.maxConsecutiveIdenticalErrors,
          signature: firstSig,
          message: `Circuit breaker tripped: Identical error signature repeated ${this.options.maxConsecutiveIdenticalErrors} consecutive times (${firstSig}).`,
        };
      }
    }

    // 2. Check Consecutive Identical Output Hashes (Zero Progress)
    if (count >= this.options.maxConsecutiveIdenticalOutputs) {
      const recent = snapshots.slice(-this.options.maxConsecutiveIdenticalOutputs);
      const firstHash = recent[0]?.outputHash;

      if (firstHash && recent.every((s) => s.outputHash === firstHash)) {
        return {
          isLoop: true,
          loopType: "IDENTICAL_OUTPUT",
          consecutiveFailures: this.options.maxConsecutiveIdenticalOutputs,
          signature: firstHash,
          message: `Circuit breaker tripped: Agent produced identical unchanged output across ${this.options.maxConsecutiveIdenticalOutputs} consecutive attempts without forward progress.`,
        };
      }
    }

    // 3. Check Oscillating States (A -> B -> A)
    if (count >= 3) {
      const a = snapshots[count - 3]?.outputHash ?? snapshots[count - 3]?.errorSignature;
      const b = snapshots[count - 2]?.outputHash ?? snapshots[count - 2]?.errorSignature;
      const c = snapshots[count - 1]?.outputHash ?? snapshots[count - 1]?.errorSignature;

      if (a && b && c && a === c && a !== b) {
        return {
          isLoop: true,
          loopType: "OSCILLATING_OUTPUT",
          consecutiveFailures: 3,
          signature: `${a}<->${b}`,
          message: `Circuit breaker tripped: Agent is trapped in an oscillating failure loop alternating between states ${a} and ${b}.`,
        };
      }
    }

    // 4. Check Max Retries Exceeded
    if (count >= this.options.maxRetries) {
      return {
        isLoop: true,
        loopType: "MAX_RETRIES_EXCEEDED",
        consecutiveFailures: count,
        message: `Task reached maximum allowed retry threshold (${count}/${this.options.maxRetries}).`,
      };
    }

    return {
      isLoop: false,
      loopType: "NONE",
      consecutiveFailures: count,
      message: "No loop detected; forward progress possible.",
    };
  }

  /**
   * Resets loop tracking for a task upon successful completion
   */
  public reset(taskId: string): void {
    this.history.delete(taskId);
  }
}
