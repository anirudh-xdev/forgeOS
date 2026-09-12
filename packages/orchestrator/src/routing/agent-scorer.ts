import {
  RoutingStrategy,
  ModelTier,
  AgentScoreRecord,
} from "@forgeos/contracts";
import { CapabilityMatcher, defaultCapabilityMatcher } from "./capability-matcher.js";

export interface AgentPerformanceStats {
  agentId: string;
  role: string;
  model: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  avgLatencyMs: number;
  avgCostUSD: number;
  capabilities: string[];
}

export interface StrategyWeights {
  success: number;
  capability: number;
  latency: number;
  cost: number;
}

export const STRATEGY_WEIGHTS: Record<RoutingStrategy, StrategyWeights> = {
  BALANCED: {
    success: 0.35,
    capability: 0.25,
    latency: 0.20,
    cost: 0.20,
  },
  BEST_QUALITY: {
    success: 0.50,
    capability: 0.30,
    latency: 0.10,
    cost: 0.10,
  },
  COST_OPTIMIZED: {
    success: 0.25,
    capability: 0.15,
    latency: 0.10,
    cost: 0.50,
  },
  LATENCY_OPTIMIZED: {
    success: 0.25,
    capability: 0.15,
    latency: 0.50,
    cost: 0.10,
  },
};

export class AgentScorer {
  private capabilityMatcher: CapabilityMatcher;

  constructor(capabilityMatcher: CapabilityMatcher = defaultCapabilityMatcher) {
    this.capabilityMatcher = capabilityMatcher;
  }

  public computeSuccessScore(successfulRuns: number, totalRuns: number): number {
    if (totalRuns === 0) return 0.85; // Baseline prior for untested agents
    // Laplace smoothing
    const smoothed = (successfulRuns + 1) / (totalRuns + 2);
    return Number(Math.max(0, Math.min(1.0, smoothed)).toFixed(4));
  }

  public computeLatencyScore(avgLatencyMs: number): number {
    if (avgLatencyMs <= 0) return 1.0;
    const maxRefMs = 30000; // 30s benchmark ceiling
    const score = 1 - Math.log(1 + avgLatencyMs) / Math.log(1 + maxRefMs);
    return Number(Math.max(0.05, Math.min(1.0, score)).toFixed(4));
  }

  public computeCostScore(avgCostUSD: number): number {
    if (avgCostUSD <= 0) return 1.0; // Free / local models get perfect 1.0
    const ceilingUSD = 0.05; // 5 cents ceiling
    const score = 1 - avgCostUSD / ceilingUSD;
    return Number(Math.max(0.05, Math.min(1.0, score)).toFixed(4));
  }

  public resolveTier(role: string, strategy: RoutingStrategy): ModelTier {
    if (strategy === "COST_OPTIMIZED") {
      return "tier_fast";
    }
    if (strategy === "BEST_QUALITY" || role === "Architect" || role === "Security Auditor") {
      return "tier_reasoning";
    }
    return "tier_balanced";
  }

  public scoreAgent(
    stats: AgentPerformanceStats,
    requiredCapabilities: string[],
    strategy: RoutingStrategy = "BALANCED",
    rank: number = 1
  ): AgentScoreRecord {
    const weights = STRATEGY_WEIGHTS[strategy] ?? STRATEGY_WEIGHTS.BALANCED;

    const successScore = this.computeSuccessScore(stats.successfulRuns, stats.totalRuns);
    const latencyScore = this.computeLatencyScore(stats.avgLatencyMs);
    const costScore = this.computeCostScore(stats.avgCostUSD);
    const capabilityScore = this.capabilityMatcher.calculateMatchScore(
      requiredCapabilities,
      stats.capabilities
    );

    const compositeScoreRaw =
      weights.success * successScore +
      weights.capability * capabilityScore +
      weights.latency * latencyScore +
      weights.cost * costScore;

    const compositeScore = Number((compositeScoreRaw * 100).toFixed(2));
    const tier = this.resolveTier(stats.role, strategy);

    const actualSuccessRate = stats.totalRuns > 0
      ? Number((stats.successfulRuns / stats.totalRuns).toFixed(2))
      : 1.0;

    return {
      agentId: stats.agentId,
      role: stats.role,
      model: stats.model,
      tier,
      totalRuns: stats.totalRuns,
      successRate: actualSuccessRate,
      avgLatencyMs: stats.avgLatencyMs,
      avgCostUSD: stats.avgCostUSD,
      capabilityScore,
      compositeScore,
      rank,
    };
  }
}

export const defaultAgentScorer = new AgentScorer();
