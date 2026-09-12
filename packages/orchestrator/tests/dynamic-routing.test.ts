import { describe, it, expect } from "vitest";
import {
  CapabilityMatcher,
  AgentScorer,
  DynamicAgentRouter,
  defaultCapabilityMatcher,
  defaultAgentScorer,
  defaultDynamicRouter,
} from "../src/index.js";

describe("Phase 12: Dynamic Agent Selection & Routing", () => {
  describe("CapabilityMatcher", () => {
    it("should infer relevant capabilities from directive text", () => {
      const matcher = new CapabilityMatcher();
      const caps = matcher.inferCapabilitiesFromText(
        "Create normalized database schema with Prisma models and SQL migrations"
      );

      expect(caps).toContain("schema_design");
      expect(caps).toContain("prisma_schema");
      expect(caps).toContain("sql_generation");
      expect(caps).toContain("migration_planning");
    });

    it("should fallback to requirements_analysis for unrecognized text", () => {
      const matcher = new CapabilityMatcher();
      const caps = matcher.inferCapabilitiesFromText("xyz unknown 12345");
      expect(caps).toEqual(["requirements_analysis"]);
    });

    it("should compute coverage and Jaccard match score accurately", () => {
      const matcher = new CapabilityMatcher();
      const required = ["schema_design", "sql_generation"];
      const candidateCaps = [
        "schema_design",
        "migration_planning",
        "sql_generation",
        "indexing_strategy",
      ];

      const score = matcher.calculateMatchScore(required, candidateCaps);
      expect(score).toBeGreaterThan(0.8);
      expect(score).toBeLessThanOrEqual(1.0);
    });
  });

  describe("AgentScorer", () => {
    it("should apply Laplace smoothing to calculate success score", () => {
      const scorer = new AgentScorer();
      // Total runs = 0 -> prior 0.85
      expect(scorer.computeSuccessScore(0, 0)).toBe(0.85);

      // 5 runs, 5 successes -> (5 + 1) / (5 + 2) = 6/7 = 0.8571
      expect(scorer.computeSuccessScore(5, 5)).toBe(0.8571);

      // 10 runs, 5 successes -> (5 + 1) / (10 + 2) = 6/12 = 0.5
      expect(scorer.computeSuccessScore(5, 10)).toBe(0.5);
    });

    it("should compute logarithmic latency decay and linear cost efficiency", () => {
      const scorer = new AgentScorer();
      expect(scorer.computeLatencyScore(0)).toBe(1.0);
      expect(scorer.computeLatencyScore(120)).toBeGreaterThan(0.5);
      expect(scorer.computeCostScore(0)).toBe(1.0); // local / free model
      expect(scorer.computeCostScore(0.01)).toBeGreaterThan(0.5);
    });

    it("should assign correct model tiers based on role and strategy", () => {
      const scorer = new AgentScorer();
      expect(scorer.resolveTier("Product Manager", "COST_OPTIMIZED")).toBe("tier_fast");
      expect(scorer.resolveTier("Product Manager", "BEST_QUALITY")).toBe("tier_reasoning");
      expect(scorer.resolveTier("Architect", "BALANCED")).toBe("tier_reasoning");
      expect(scorer.resolveTier("Security Auditor", "BALANCED")).toBe("tier_reasoning");
      expect(scorer.resolveTier("Backend Engineer", "BALANCED")).toBe("tier_balanced");
    });
  });

  describe("DynamicAgentRouter", () => {
    it("should route database directive to forgeos-database-agent", () => {
      const router = new DynamicAgentRouter();
      const decision = router.selectOptimalAgent({
        id: "task-db-1",
        input: { directive: "Design PostgreSQL schema and Prisma migrations" },
      });

      expect(decision.selectedAgentId).toBe("forgeos-database-agent");
      expect(decision.requiredCapabilities).toContain("schema_design");
      expect(decision.confidenceScore).toBeGreaterThan(0.5);
      expect(decision.strategy).toBe("BALANCED");
    });

    it("should route frontend directive to forgeos-frontend-agent", () => {
      const router = new DynamicAgentRouter();
      const decision = router.selectOptimalAgent({
        id: "task-ui-1",
        input: { directive: "Implement React component UI and responsive CSS styling" },
      });

      expect(decision.selectedAgentId).toBe("forgeos-frontend-agent");
      expect(decision.requiredCapabilities).toContain("ui_design");
    });

    it("should degrade strategy to COST_OPTIMIZED when budget utilization is >= 80%", () => {
      const router = new DynamicAgentRouter();
      const decision = router.selectOptimalAgent(
        {
          id: "task-budget-1",
          input: { directive: "Implement Fastify service endpoints" },
        },
        {
          strategy: "BEST_QUALITY",
          budgetUtilization: 85,
        }
      );

      expect(decision.strategy).toBe("COST_OPTIMIZED");
      expect(decision.reasoning).toContain("Shifted to COST_OPTIMIZED due to 85% budget consumption");
      expect(decision.selectedTier).toBe("tier_fast");
    });

    it("should escalate model tier to tier_reasoning on retry attempts (> 1)", () => {
      const router = new DynamicAgentRouter();
      const decision = router.selectOptimalAgent(
        {
          id: "task-retry-1",
          input: { directive: "Implement Fastify service endpoints" },
        },
        {
          strategy: "BALANCED",
          attemptCount: 2,
        }
      );

      expect(decision.selectedTier).toBe("tier_reasoning");
      expect(decision.selectedModel).toBe("mock-model-reasoning");
      expect(decision.reasoning).toContain("Escalated to tier_reasoning on retry attempt 2");
    });

    it("should update agent statistics via recordOutcome", () => {
      const router = new DynamicAgentRouter();
      router.recordOutcome({
        agentId: "forgeos-database-agent",
        model: "mock-model-fast",
        latencyMs: 80,
        costUSD: 0.0005,
        success: true,
      });

      const scoreboard = router.getScoreboard("BALANCED");
      return scoreboard.then((board) => {
        expect(board.scores.length).toBe(8);
        const dbAgent = board.scores.find((s) => s.agentId === "forgeos-database-agent");
        expect(dbAgent).toBeDefined();
        expect(dbAgent!.totalRuns).toBe(6);
      });
    });

    it("should generate a ranked scoreboard across all 8 agents", async () => {
      const router = new DynamicAgentRouter();
      const scoreboard = await router.getScoreboard("BEST_QUALITY");

      expect(scoreboard.strategy).toBe("BEST_QUALITY");
      expect(scoreboard.totalAgents).toBe(8);
      expect(scoreboard.scores[0].rank).toBe(1);
      expect(scoreboard.scores[7].rank).toBe(8);

      // Verify rank order is monotonically non-increasing in compositeScore
      for (let i = 0; i < scoreboard.scores.length - 1; i++) {
        expect(scoreboard.scores[i].compositeScore).toBeGreaterThanOrEqual(
          scoreboard.scores[i + 1].compositeScore
        );
      }
    });
  });
});
