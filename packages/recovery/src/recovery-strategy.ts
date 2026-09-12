import { FailureClassification, RecoveryStrategyType } from "@forgeos/contracts";
import {
  AugmentedTaskInput,
  FailureContext,
  LoopDetectorOptions,
  RecoveryPlan,
  RetryPolicyConfig,
} from "./types.js";
import { FailureClassifier } from "./failure-classifier.js";
import { RetryPolicy } from "./retry-policy.js";
import { LoopDetector } from "./loop-detector.js";

export class RecoveryStrategy {
  private classifier: FailureClassifier;
  private retryPolicy: RetryPolicy;
  private loopDetector: LoopDetector;

  constructor(
    classifier?: FailureClassifier,
    retryPolicy?: RetryPolicy,
    loopDetector?: LoopDetector,
    retryConfig?: RetryPolicyConfig,
    loopOptions?: LoopDetectorOptions
  ) {
    this.classifier = classifier ?? new FailureClassifier();
    this.retryPolicy = retryPolicy ?? new RetryPolicy(retryConfig);
    this.loopDetector = loopDetector ?? new LoopDetector(loopOptions);
  }

  public getClassifier(): FailureClassifier {
    return this.classifier;
  }

  public getRetryPolicy(): RetryPolicy {
    return this.retryPolicy;
  }

  public getLoopDetector(): LoopDetector {
    return this.loopDetector;
  }

  /**
   * Plans recovery action from failure context, determining strategy, backoff, and input augmentation
   */
  public planRecovery(
    context: FailureContext,
    taskInput: Record<string, unknown>
  ): RecoveryPlan {
    const classification = this.classifier.classify(context);

    // Record execution and check circuit breaker
    const loopCheck = this.loopDetector.recordExecution(
      context.taskId,
      context.attemptCount,
      classification.errorSignature,
      context.rawOutput
    );

    // If circuit breaker tripped, halt immediately
    if (loopCheck.isLoop) {
      return {
        strategy: "CIRCUIT_BREAKER_HALT",
        shouldRetry: false,
        backoffDelayMs: 0,
        classification,
        loopCheck,
      };
    }

    // Check if retry is allowed
    const canRetry = this.retryPolicy.shouldRetry(
      classification,
      context.attemptCount
    );

    if (!canRetry) {
      return {
        strategy: "CIRCUIT_BREAKER_HALT",
        shouldRetry: false,
        backoffDelayMs: 0,
        classification,
        loopCheck: {
          isLoop: true,
          loopType: "MAX_RETRIES_EXCEEDED",
          consecutiveFailures: context.attemptCount,
          message: `Task retries exhausted (${context.attemptCount}/${this.retryPolicy.getMaxRetries()}).`,
        },
      };
    }

    const backoffDelayMs = this.retryPolicy.calculateBackoff(context.attemptCount);
    let strategy: RecoveryStrategyType = "PROMPT_AUGMENTATION";

    if (classification.category === "TRANSIENT") {
      strategy = "EXPONENTIAL_BACKOFF";
    }

    const augmentedInput = this.augmentTaskInput(taskInput, context, classification);

    return {
      strategy,
      shouldRetry: true,
      backoffDelayMs,
      classification,
      loopCheck,
      augmentedInput,
    };
  }

  /**
   * Augments the task's input payload with structured diagnostic failure guidance
   */
  public augmentTaskInput(
    originalInput: Record<string, unknown>,
    context: FailureContext,
    classification: FailureClassification
  ): AugmentedTaskInput {
    let remediationAdvice = "";

    switch (classification.category) {
      case "VALIDATION_ERROR":
        remediationAdvice = `ATTENTION: Your previous output failed schema validation.\nError: ${classification.message}\nYou must correct the structure, provide all required fields, and output strictly valid JSON matching the schema.`;
        break;

      case "TEST_FAILURE":
        remediationAdvice = `ATTENTION: Your previous implementation failed automated tests in the Docker sandbox.\nTest Diagnostics: ${context.testOutput || classification.message}\nFix the logic errors causing test failures without breaking existing functionality.`;
        break;

      case "SECURITY_VIOLATION":
        remediationAdvice = `ATTENTION: Your previous artifact was rejected by the Security Gate.\nSecurity Violations: ${context.gateReasons?.join("; ") || classification.message}\nRemove all hardcoded credentials, use parameterized queries, and avoid dangerous system calls like eval().`;
        break;

      case "CONTRACT_MISMATCH":
        remediationAdvice = `ATTENTION: Your previous artifact was rejected by the Adversarial Reviewer.\nReview Feedback: ${context.gateReasons?.join("; ") || classification.message}\nAddress all reviewer issues and ensure strict compliance with monorepo and API contracts.`;
        break;

      default:
        remediationAdvice = `ATTENTION: Your previous attempt failed with error: ${classification.message}\nPlease analyze this failure and resolve the underlying issue.`;
        break;
    }

    const augmentedInput: Record<string, unknown> = {
      ...originalInput,
      recoveryFeedback: {
        previousAttemptFailed: true,
        attemptNumber: context.attemptCount,
        category: classification.category,
        errorSummary: classification.message,
        remediationAdvice,
      },
      // Append remediation advice directly to directive or requirement if string
      directive: originalInput["directive"]
        ? `${originalInput["directive"]}\n\n[RECOVERY FEEDBACK - ATTEMPT ${context.attemptCount}]:\n${remediationAdvice}`
        : remediationAdvice,
    };

    return {
      originalInput,
      augmentedInput,
      attemptCount: context.attemptCount,
      classification,
      remediationAdvice,
    };
  }
}
