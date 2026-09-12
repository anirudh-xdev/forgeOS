import type { ProjectRepository } from "@forgeos/database";
import {
  defaultCostEstimator,
  defaultMetricsRegistry,
  CostEstimator,
  MetricsRegistry,
} from "@forgeos/logger";

export interface BudgetCheckResult {
  allowed: boolean;
  reason?: string;
  budget?: {
    maxTokens: number;
    usedTokens: number;
    maxCostUSD: number;
    usedCostUSD: number;
    maxRuntimeMinutes: number;
    isExceeded: boolean;
  };
}

export class BudgetManager {
  private projectRepo: ProjectRepository;
  private metricsRegistry: MetricsRegistry;
  private costEstimator: CostEstimator;

  constructor(
    projectRepo: ProjectRepository,
    metricsRegistry: MetricsRegistry = defaultMetricsRegistry,
    costEstimator: CostEstimator = defaultCostEstimator
  ) {
    this.projectRepo = projectRepo;
    this.metricsRegistry = metricsRegistry;
    this.costEstimator = costEstimator;
  }

  public async checkBudget(projectId: string): Promise<BudgetCheckResult> {
    const budget = await this.projectRepo.getProjectBudget(projectId);
    if (!budget) {
      return { allowed: true };
    }

    const maxTokens = budget.maxTokens;
    const usedTokens = budget.usedTokens;
    const maxCostUSD = Number(budget.maxCost);
    const usedCostUSD = Number(budget.usedCost);

    const tokenRatio = maxTokens > 0 ? usedTokens / maxTokens : 0;
    const costRatio = maxCostUSD > 0 ? usedCostUSD / maxCostUSD : 0;
    this.metricsRegistry.setBudgetUtilization(projectId, tokenRatio, costRatio);

    if (usedTokens >= maxTokens) {
      return {
        allowed: false,
        reason: `Token quota exceeded: ${usedTokens.toLocaleString()} used >= ${maxTokens.toLocaleString()} limit`,
        budget: {
          maxTokens,
          usedTokens,
          maxCostUSD,
          usedCostUSD,
          maxRuntimeMinutes: budget.maxRuntimeMinutes,
          isExceeded: true,
        },
      };
    }

    if (usedCostUSD >= maxCostUSD) {
      return {
        allowed: false,
        reason: `Cost quota exceeded: $${usedCostUSD.toFixed(2)} used >= $${maxCostUSD.toFixed(2)} limit`,
        budget: {
          maxTokens,
          usedTokens,
          maxCostUSD,
          usedCostUSD,
          maxRuntimeMinutes: budget.maxRuntimeMinutes,
          isExceeded: true,
        },
      };
    }

    return {
      allowed: true,
      budget: {
        maxTokens,
        usedTokens,
        maxCostUSD,
        usedCostUSD,
        maxRuntimeMinutes: budget.maxRuntimeMinutes,
        isExceeded: false,
      },
    };
  }

  public async recordUsage(
    projectId: string,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): Promise<{ costUSD: number; isExceeded: boolean }> {
    const costUSD = this.costEstimator.estimateCostUSD(model, inputTokens, outputTokens);
    const totalTokens = inputTokens + outputTokens;

    const updated = await this.projectRepo.incrementBudgetUsage(projectId, totalTokens, costUSD);
    if (!updated) {
      return { costUSD, isExceeded: false };
    }

    const maxTokens = updated.maxTokens;
    const usedTokens = updated.usedTokens;
    const maxCostUSD = Number(updated.maxCost);
    const usedCostUSD = Number(updated.usedCost);

    const tokenRatio = maxTokens > 0 ? usedTokens / maxTokens : 0;
    const costRatio = maxCostUSD > 0 ? usedCostUSD / maxCostUSD : 0;
    this.metricsRegistry.setBudgetUtilization(projectId, tokenRatio, costRatio);

    const isExceeded = usedTokens >= maxTokens || usedCostUSD >= maxCostUSD;

    return {
      costUSD,
      isExceeded,
    };
  }
}
