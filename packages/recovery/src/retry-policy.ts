import { FailureClassification } from "@forgeos/contracts";
import { RetryPolicyConfig } from "./types.js";

export const DEFAULT_RETRY_CONFIG: Required<RetryPolicyConfig> = {
  maxRetries: 3,
  initialDelayMs: 500,
  maxDelayMs: 10000,
  backoffFactor: 2.0,
  jitter: true,
};

export class RetryPolicy {
  private config: Required<RetryPolicyConfig>;

  constructor(config: RetryPolicyConfig = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  public getMaxRetries(): number {
    return this.config.maxRetries;
  }

  /**
   * Evaluates if a given failure should be retried based on classification and attempt count
   */
  public shouldRetry(
    classification: FailureClassification,
    attemptCount: number
  ): boolean {
    if (!classification.retryable) {
      return false;
    }
    return attemptCount < this.config.maxRetries;
  }

  /**
   * Calculates exponential backoff delay with optional random jitter
   */
  public calculateBackoff(attemptCount: number): number {
    const rawDelay =
      this.config.initialDelayMs *
      Math.pow(this.config.backoffFactor, Math.max(0, attemptCount - 1));

    const cappedDelay = Math.min(this.config.maxDelayMs, rawDelay);

    if (!this.config.jitter) {
      return Math.round(cappedDelay);
    }

    // Apply +/- 20% random jitter to avoid thundering herd
    const jitterFactor = 0.8 + Math.random() * 0.4;
    return Math.round(cappedDelay * jitterFactor);
  }

  /**
   * Sleep helper applying the calculated backoff
   */
  public async waitBackoff(attemptCount: number): Promise<number> {
    const delay = this.calculateBackoff(attemptCount);
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    return delay;
  }
}
