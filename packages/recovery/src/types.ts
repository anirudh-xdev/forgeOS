import {
  FailureClassification,
  LoopDetectionResult,
  RecoveryStrategyType,
} from "@forgeos/contracts";

export interface FailureContext {
  taskId: string;
  projectId: string;
  agentId: string;
  attemptCount: number;
  error: unknown;
  rawOutput?: string;
  validationIssues?: unknown[];
  testOutput?: string;
  gateReasons?: string[];
}

export interface RetryPolicyConfig {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  jitter?: boolean;
}

export interface LoopDetectorOptions {
  maxConsecutiveIdenticalErrors?: number;
  maxConsecutiveIdenticalOutputs?: number;
  maxRetries?: number;
}

export interface TaskExecutionSnapshot {
  taskId: string;
  attempt: number;
  errorSignature?: string;
  outputHash?: string;
  timestamp: string;
}

export interface AugmentedTaskInput {
  originalInput: Record<string, unknown>;
  augmentedInput: Record<string, unknown>;
  attemptCount: number;
  classification: FailureClassification;
  remediationAdvice: string;
}

export interface RecoveryPlan {
  strategy: RecoveryStrategyType;
  shouldRetry: boolean;
  backoffDelayMs: number;
  classification: FailureClassification;
  loopCheck: LoopDetectionResult;
  augmentedInput?: AugmentedTaskInput;
}
