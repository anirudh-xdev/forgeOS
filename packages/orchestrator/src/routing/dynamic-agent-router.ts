import {
  RoutingStrategy,
  ModelTier,
  DynamicRoutingDecision,
  AgentScoreboard,
  AgentScoreRecord,
} from "@forgeos/contracts";
import {
  CapabilityMatcher,
  defaultCapabilityMatcher,
  DEFAULT_AGENT_PROFILES,
} from "./capability-matcher.js";
import {
  AgentScorer,
  defaultAgentScorer,
  AgentPerformanceStats,
} from "./agent-scorer.js";

export interface RouteTaskInput {
  id: string;
  agentId?: string;
  input?: unknown;
}

export interface RouteOptions {
  strategy?: RoutingStrategy;
  budgetUtilization?: number; // 0 to 100 percentage
  attemptCount?: number;
}

export class DynamicAgentRouter {
  private capabilityMatcher: CapabilityMatcher;
  private agentScorer: AgentScorer;
  private agentStats: Map<string, AgentPerformanceStats>;

  constructor(
    capabilityMatcher: CapabilityMatcher = defaultCapabilityMatcher,
    agentScorer: AgentScorer = defaultAgentScorer
  ) {
    this.capabilityMatcher = capabilityMatcher;
    this.agentScorer = agentScorer;
    this.agentStats = new Map();

    this.initializeDefaultStats();
  }

  private initializeDefaultStats(): void {
    for (const profile of DEFAULT_AGENT_PROFILES) {
      this.agentStats.set(profile.agentId, {
        agentId: profile.agentId,
        role: profile.role,
        model: "mock-model",
        totalRuns: 5,
        successfulRuns: 5,
        failedRuns: 0,
        avgLatencyMs: 120,
        avgCostUSD: 0.001,
        capabilities: profile.capabilities,
      });
    }
  }

  public recordOutcome(run: {
    agentId: string;
    model: string;
    latencyMs: number;
    costUSD: number;
    success: boolean;
  }): void {
    const existing = this.agentStats.get(run.agentId);
    if (!existing) return;

    existing.totalRuns++;
    if (run.success) {
      existing.successfulRuns++;
    } else {
      existing.failedRuns++;
    }

    // Rolling exponential average (alpha = 0.2)
    existing.avgLatencyMs = Math.round(existing.avgLatencyMs * 0.8 + run.latencyMs * 0.2);
    existing.avgCostUSD = Number((existing.avgCostUSD * 0.8 + run.costUSD * 0.2).toFixed(6));
    existing.model = run.model;
  }

  public resolveModelByTier(tier: ModelTier): string {
    switch (tier) {
      case "tier_fast":
        return "mock-model-fast";
      case "tier_reasoning":
        return "mock-model-reasoning";
      case "tier_balanced":
      default:
        return "mock-model-balanced";
    }
  }

  public selectOptimalAgent(
    task: RouteTaskInput,
    options: RouteOptions = {}
  ): DynamicRoutingDecision {
    let effectiveStrategy: RoutingStrategy = options.strategy ?? "BALANCED";

    // 1. Budget degradation check: if budget > 80% used, force COST_OPTIMIZED
    if (options.budgetUtilization && options.budgetUtilization >= 80) {
      effectiveStrategy = "COST_OPTIMIZED";
    }

    // 2. Infer required capabilities from task input (strip recovery feedback to avoid false reviewer matches)
    const inputObj =
      typeof task.input === "object" && task.input !== null
        ? (task.input as Record<string, unknown>)
        : {};

    let taskText = "";
    if (typeof inputObj["requirement"] === "string" && inputObj["requirement"].trim()) {
      taskText = inputObj["requirement"];
    } else if (typeof inputObj["directive"] === "string") {
      taskText = inputObj["directive"]
        .replace(/ATTENTION:[\s\S]*?(contracts\.|remediation advice|\n\n)/gi, "")
        .replace(/\[RECOVERY FEEDBACK[\s\S]*?\]/gi, "")
        .trim();
    }
    if (!taskText) {
      taskText = typeof task.input === "string" ? task.input : JSON.stringify(task.input ?? {});
    }

    const requiredCapabilities = this.capabilityMatcher.inferCapabilitiesFromText(taskText);

    // 3. Candidate pool & scoring
    let candidates = Array.from(this.agentStats.values());

    // If task has a specific target agentId, ensure we do not jump to an incompatible role
    if (task.agentId) {
      const targetCandidate = candidates.find((c) => c.agentId === task.agentId);
      if (targetCandidate) {
        const domainMatches = candidates.filter(
          (c) => c.role === targetCandidate.role || c.agentId === task.agentId
        );
        if (domainMatches.length > 0) {
          candidates = domainMatches;
        }
      }
    }

    const scoredCandidates: AgentScoreRecord[] = [];

    for (const candidate of candidates) {
      // If task specifically targeted an agent, boost capability
      const isTargeted = task.agentId && task.agentId === candidate.agentId;
      const scoreRecord = this.agentScorer.scoreAgent(
        candidate,
        requiredCapabilities,
        effectiveStrategy
      );

      if (isTargeted) {
        scoreRecord.compositeScore = Math.min(100, Number((scoreRecord.compositeScore * 1.25 + 10).toFixed(2)));
      }

      scoredCandidates.push(scoreRecord);
    }

    scoredCandidates.sort((a, b) => b.compositeScore - a.compositeScore);

    const winner = scoredCandidates[0] ?? {
      agentId: task.agentId ?? "forgeos-pm-agent",
      role: "Product Manager",
      model: "mock-model",
      tier: "tier_balanced" as ModelTier,
      compositeScore: 85,
    };

    // 4. Model tier escalation: if task has retried (> 1 attempt), escalate to tier_reasoning
    let finalTier: ModelTier = winner.tier;
    let escalationNote = "";

    if (options.attemptCount && options.attemptCount > 1) {
      finalTier = "tier_reasoning";
      escalationNote = ` Escalated to tier_reasoning on retry attempt ${options.attemptCount} to resolve failure.`;
    }

    const resolvedModel = this.resolveModelByTier(finalTier);

    const budgetNote =
      options.budgetUtilization && options.budgetUtilization >= 80
        ? ` (Shifted to COST_OPTIMIZED due to ${options.budgetUtilization.toFixed(0)}% budget consumption)`
        : "";

    const reasoning = `Selected ${winner.role} (${winner.agentId}) with ${winner.compositeScore} composite score under ${effectiveStrategy} strategy.${budgetNote}${escalationNote}`;

    return {
      taskId: task.id,
      requiredCapabilities,
      selectedAgentId: winner.agentId,
      selectedModel: resolvedModel,
      selectedTier: finalTier,
      strategy: effectiveStrategy,
      confidenceScore: Number((winner.compositeScore / 100).toFixed(4)),
      reasoning,
    };
  }

  public async getScoreboard(
    strategy: RoutingStrategy = "BALANCED"
  ): Promise<AgentScoreboard> {
    const candidates = Array.from(this.agentStats.values());
    const dummyCaps = ["system_design", "requirements_analysis", "api_implementation"];

    const scores = candidates.map((c) =>
      this.agentScorer.scoreAgent(c, dummyCaps, strategy)
    );

    scores.sort((a, b) => b.compositeScore - a.compositeScore);
    scores.forEach((s, idx) => {
      s.rank = idx + 1;
    });

    return {
      strategy,
      totalAgents: scores.length,
      scores,
      timestamp: new Date().toISOString(),
    };
  }
}

export const defaultDynamicRouter = new DynamicAgentRouter();
