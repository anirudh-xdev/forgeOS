import React, { useState, useEffect, useCallback } from "react";
import {
  RoutingStrategy,
  ModelTier,
  AgentScoreRecord,
  AgentScoreboard,
  DynamicRoutingDecision,
} from "../types.js";
import { fetchRouterScoreboard, requestAgentRecommendation } from "../services/api.js";
import {
  Cpu,
  Zap,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Shield,
  Layers,
  Sparkles,
  RefreshCw,
  Sliders,
  Send,
} from "lucide-react";

const STRATEGY_INFO: Record<
  RoutingStrategy,
  { label: string; desc: string; weights: { success: number; cap: number; latency: number; cost: number } }
> = {
  BALANCED: {
    label: "Balanced Dispatch",
    desc: "Harmonizes quality, capability fit, sub-second latency, and token cost for general tasks.",
    weights: { success: 35, cap: 25, latency: 20, cost: 20 },
  },
  BEST_QUALITY: {
    label: "Best Quality",
    desc: "Maximizes Laplace success rate and deep reasoning tier capability for critical specifications.",
    weights: { success: 50, cap: 30, latency: 10, cost: 10 },
  },
  COST_OPTIMIZED: {
    label: "Cost Optimized",
    desc: "Prioritizes budget efficiency (50% weight) and fast local tier models. Auto-engaged at 80% budget limit.",
    weights: { success: 25, cap: 15, latency: 10, cost: 50 },
  },
  LATENCY_OPTIMIZED: {
    label: "Latency Optimized",
    desc: "Optimizes for real-time throughput (50% weight) and rapid execution cycles.",
    weights: { success: 25, cap: 15, latency: 50, cost: 10 },
  },
};

const PRESET_DIRECTIVES = [
  {
    label: "Database Schema",
    directive: "Design normalized PostgreSQL relational schema with Prisma models, foreign keys, and indexes.",
  },
  {
    label: "Backend Service",
    directive: "Implement Fastify REST service endpoints, business validation logic, and unit tests.",
  },
  {
    label: "Frontend UI",
    directive: "Construct responsive Next.js dashboard components with state management and cyber-industrial CSS.",
  },
  {
    label: "Security Audit",
    directive: "Perform threat modeling, input sanitation audits, and authorization boundary vulnerability scan.",
  },
  {
    label: "Product Spec",
    directive: "Draft functional specifications, user story acceptance criteria, and feature breakdown.",
  },
];

export function AgentMatrix() {
  const [strategy, setStrategy] = useState<RoutingStrategy>("BALANCED");
  const [scoreboard, setScoreboard] = useState<AgentScoreboard | null>(null);
  const [loading, setLoading] = useState(false);

  // Playground State
  const [directive, setDirective] = useState(PRESET_DIRECTIVES[0].directive);
  const [testStrategy, setTestStrategy] = useState<RoutingStrategy>("BALANCED");
  const [budgetUtilization, setBudgetUtilization] = useState<number>(15);
  const [attemptCount, setAttemptCount] = useState<number>(1);
  const [evaluating, setEvaluating] = useState(false);
  const [decision, setDecision] = useState<DynamicRoutingDecision | null>(null);

  const loadScoreboard = useCallback(async (strat: RoutingStrategy) => {
    try {
      setLoading(true);
      const data = await fetchRouterScoreboard(strat);
      setScoreboard(data);
    } catch (err) {
      console.error("Failed to load scoreboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadScoreboard(strategy);
  }, [strategy, loadScoreboard]);

  const handleTestRecommendation = async () => {
    try {
      setEvaluating(true);
      const result = await requestAgentRecommendation({
        directive,
        strategy: testStrategy,
        budgetUtilization,
        attemptCount,
      });
      setDecision(result);
    } catch (err) {
      console.error("Failed to evaluate recommendation:", err);
    } finally {
      setEvaluating(false);
    }
  };

  const getTierColor = (tier: ModelTier) => {
    switch (tier) {
      case "tier_reasoning":
        return { bg: "var(--accent-purple-glow)", text: "var(--accent-purple)", border: "rgba(168, 85, 247, 0.4)" };
      case "tier_fast":
        return { bg: "var(--accent-emerald-glow)", text: "var(--accent-emerald)", border: "rgba(16, 185, 129, 0.4)" };
      case "tier_balanced":
      default:
        return { bg: "var(--accent-cyan-glow)", text: "var(--accent-cyan)", border: "rgba(0, 242, 254, 0.4)" };
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { bg: "rgba(234, 179, 8, 0.2)", text: "#eab308", border: "#eab308" };
    if (rank === 2) return { bg: "rgba(148, 163, 184, 0.2)", text: "#cbd5e1", border: "#94a3b8" };
    if (rank === 3) return { bg: "rgba(180, 83, 9, 0.2)", text: "#d97706", border: "#b45309" };
    return { bg: "rgba(255, 255, 255, 0.05)", text: "var(--text-muted)", border: "transparent" };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 1. Header & Strategy Controls */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "var(--radius-md)",
                  background: "var(--accent-cyan-glow)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent-cyan)",
                }}
              >
                <Cpu size={20} />
              </div>
              <h2 style={{ fontSize: 20, margin: 0 }}>Agent Matrix & Self-Optimizing Router</h2>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: 0, maxWidth: 700 }}>
              Multi-objective optimization engine scoring agents via Laplace smoothed success, Jaccard capability match,
              logarithmic latency, and cost efficiency. Includes automatic budget degradation and retry tier escalation.
            </p>
          </div>

          <button
            onClick={() => loadScoreboard(strategy)}
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            <span>Refresh Board</span>
          </button>
        </div>

        {/* Strategy Selector Pills */}
        <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {(Object.keys(STRATEGY_INFO) as RoutingStrategy[]).map((strat) => {
            const isSelected = strategy === strat;
            const info = STRATEGY_INFO[strat];
            return (
              <button
                key={strat}
                onClick={() => setStrategy(strat)}
                style={{
                  flex: "1 1 200px",
                  padding: "12px 16px",
                  borderRadius: "var(--radius-md)",
                  background: isSelected ? "var(--bg-panel)" : "var(--bg-surface)",
                  border: isSelected ? "1px solid var(--accent-cyan)" : "1px solid var(--border-card)",
                  boxShadow: isSelected ? "var(--shadow-glow)" : "none",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all var(--transition-fast)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: isSelected ? "var(--accent-cyan)" : "var(--text-primary)", fontSize: 13 }}>
                    {info.label}
                  </span>
                  {isSelected && <Zap size={14} color="var(--accent-cyan)" />}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4, marginBottom: 8 }}>
                  {info.desc}
                </div>
                {/* Mini weight breakdown */}
                <div style={{ display: "flex", gap: 6, fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                  <span>Q:{info.weights.success}%</span>
                  <span>C:{info.weights.cap}%</span>
                  <span>L:{info.weights.latency}%</span>
                  <span>$:{info.weights.cost}%</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Ranked Agent Leaderboard */}
      <div className="card" style={{ padding: 24, overflowX: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <TrendingUp size={16} color="var(--accent-cyan)" />
            <span>Agent Performance Leaderboard</span>
            <span className="badge badge-default" style={{ fontSize: 11 }}>
              Strategy: {strategy}
            </span>
          </h3>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Total Candidates: {scoreboard?.scores?.length ?? 0}
          </span>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", textAlign: "left" }}>
              <th style={{ padding: "10px 12px", width: 60 }}>Rank</th>
              <th style={{ padding: "10px 12px" }}>Agent & Role</th>
              <th style={{ padding: "10px 12px" }}>Model & Tier</th>
              <th style={{ padding: "10px 12px", textAlign: "right" }}>Success Rate</th>
              <th style={{ padding: "10px 12px", textAlign: "right" }}>Avg Latency</th>
              <th style={{ padding: "10px 12px", textAlign: "right" }}>Avg Cost</th>
              <th style={{ padding: "10px 12px", textAlign: "right" }}>Capability Match</th>
              <th style={{ padding: "10px 12px", textAlign: "right", width: 140 }}>Composite Score</th>
            </tr>
          </thead>
          <tbody>
            {scoreboard?.scores?.map((record: AgentScoreRecord) => {
              const rankBadge = getRankBadge(record.rank);
              const tierBadge = getTierColor(record.tier);

              return (
                <tr
                  key={record.agentId}
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    transition: "background var(--transition-fast)",
                  }}
                  className="hover-row"
                >
                  {/* Rank */}
                  <td style={{ padding: "12px" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 28,
                        height: 28,
                        borderRadius: "var(--radius-full)",
                        background: rankBadge.bg,
                        color: rankBadge.text,
                        border: `1px solid ${rankBadge.border}`,
                        fontWeight: 700,
                        fontSize: 12,
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      #{record.rank}
                    </span>
                  </td>

                  {/* Agent & Role */}
                  <td style={{ padding: "12px" }}>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{record.role}</div>
                    <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                      {record.agentId}
                    </div>
                  </td>

                  {/* Model & Tier */}
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "var(--radius-sm)",
                          background: tierBadge.bg,
                          color: tierBadge.text,
                          border: `1px solid ${tierBadge.border}`,
                          fontSize: 10,
                          fontWeight: 600,
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {record.tier}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                        {record.model}
                      </span>
                    </div>
                  </td>

                  {/* Success Rate */}
                  <td style={{ padding: "12px", textAlign: "right" }}>
                    <div style={{ fontWeight: 600, color: record.successRate >= 0.9 ? "var(--accent-emerald)" : "var(--accent-amber)" }}>
                      {(record.successRate * 100).toFixed(0)}%
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                      {record.totalRuns} runs (Laplace)
                    </div>
                  </td>

                  {/* Avg Latency */}
                  <td style={{ padding: "12px", textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                    {record.avgLatencyMs.toLocaleString()} ms
                  </td>

                  {/* Avg Cost */}
                  <td style={{ padding: "12px", textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                    ${record.avgCostUSD.toFixed(4)}
                  </td>

                  {/* Capability Match */}
                  <td style={{ padding: "12px", textAlign: "right" }}>
                    <span style={{ fontWeight: 600, color: "var(--accent-cyan)" }}>
                      {(record.capabilityScore * 100).toFixed(0)}%
                    </span>
                  </td>

                  {/* Composite Score */}
                  <td style={{ padding: "12px", textAlign: "right" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 14,
                          fontFamily: "var(--font-mono)",
                          color: record.rank === 1 ? "var(--accent-cyan)" : "var(--text-primary)",
                        }}
                      >
                        {record.compositeScore.toFixed(1)} / 100
                      </span>
                      <div
                        style={{
                          width: "100%",
                          height: 4,
                          background: "var(--bg-surface)",
                          borderRadius: 2,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${record.compositeScore}%`,
                            height: "100%",
                            background: record.rank === 1 ? "var(--accent-cyan)" : "var(--accent-indigo)",
                            borderRadius: 2,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 3. Interactive Recommendation Playground / Simulation Console */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Sliders size={18} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: 16, margin: 0 }}>Smart Router Playground & Dispatch Simulator</h3>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Left Column: Input Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Presets */}
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
                Quick Directive Presets:
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {PRESET_DIRECTIVES.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setDirective(p.directive)}
                    className="btn btn-secondary"
                    style={{ fontSize: 11, padding: "4px 10px" }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Directive Input */}
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6, fontWeight: 600 }}>
                Task Directive / Prompt:
              </label>
              <textarea
                value={directive}
                onChange={(e) => setDirective(e.target.value)}
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-card)",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  resize: "vertical",
                  outline: "none",
                }}
              />
            </div>

            {/* Strategy Select */}
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6, fontWeight: 600 }}>
                Dispatch Strategy:
              </label>
              <select
                value={testStrategy}
                onChange={(e) => setTestStrategy(e.target.value as RoutingStrategy)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-card)",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  outline: "none",
                }}
              >
                <option value="BALANCED">BALANCED - General Multi-Objective</option>
                <option value="BEST_QUALITY">BEST_QUALITY - Max Reasoning & Coverage</option>
                <option value="COST_OPTIMIZED">COST_OPTIMIZED - Token Budget Guard</option>
                <option value="LATENCY_OPTIMIZED">LATENCY_OPTIMIZED - Fast Turnaround</option>
              </select>
            </div>

            {/* Sliders: Budget & Retries */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Budget Slider */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>
                    Budget Utilization:
                  </label>
                  <span
                    style={{
                      fontSize: 12,
                      fontFamily: "var(--font-mono)",
                      color: budgetUtilization >= 80 ? "var(--accent-crimson)" : "var(--accent-emerald)",
                      fontWeight: 700,
                    }}
                  >
                    {budgetUtilization}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={budgetUtilization}
                  onChange={(e) => setBudgetUtilization(Number(e.target.value))}
                  style={{ width: "100%", accentColor: budgetUtilization >= 80 ? "var(--accent-crimson)" : "var(--accent-cyan)" }}
                />
                {budgetUtilization >= 80 && (
                  <div style={{ fontSize: 10, color: "var(--accent-crimson)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                    <AlertTriangle size={11} />
                    <span>Triggering Auto-Degradation to COST_OPTIMIZED (&gt;=80%)</span>
                  </div>
                )}
              </div>

              {/* Retry Attempt Count */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>
                    Attempt Count:
                  </label>
                  <span
                    style={{
                      fontSize: 12,
                      fontFamily: "var(--font-mono)",
                      color: attemptCount > 1 ? "var(--accent-purple)" : "var(--text-secondary)",
                      fontWeight: 700,
                    }}
                  >
                    Attempt #{attemptCount}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={attemptCount}
                  onChange={(e) => setAttemptCount(Number(e.target.value))}
                  style={{ width: "100%", accentColor: attemptCount > 1 ? "var(--accent-purple)" : "var(--accent-cyan)" }}
                />
                {attemptCount > 1 && (
                  <div style={{ fontSize: 10, color: "var(--accent-purple)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                    <Flame size={11} />
                    <span>Triggering Model Escalation to tier_reasoning (&gt;1)</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleTestRecommendation}
              className="btn btn-primary"
              disabled={evaluating || !directive.trim()}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 }}
            >
              <Send size={15} />
              <span>{evaluating ? "Evaluating Candidates..." : "Simulate Dynamic Route"}</span>
            </button>
          </div>

          {/* Right Column: Routing Output Card */}
          <div
            style={{
              borderRadius: "var(--radius-md)",
              background: "var(--bg-surface)",
              border: decision ? "1px solid var(--accent-cyan)" : "1px dashed var(--border-card)",
              boxShadow: decision ? "var(--shadow-glow)" : "none",
              padding: 20,
              display: "flex",
              flexDirection: "column",
              justifyContent: decision ? "space-between" : "center",
              alignItems: decision ? "stretch" : "center",
            }}
          >
            {!decision ? (
              <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
                <Sparkles size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
                <div style={{ fontWeight: 600, fontSize: 14 }}>Awaiting Simulation Input</div>
                <div style={{ fontSize: 12, marginTop: 4, maxWidth: 280 }}>
                  Adjust the directive or sliders and hit "Simulate Dynamic Route" to see real-time agent selection.
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                      Selected Agent
                    </span>
                    <h4 style={{ fontSize: 18, margin: "4px 0 0 0", color: "var(--text-primary)" }}>
                      {decision.selectedAgentId}
                    </h4>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "var(--radius-sm)",
                        background: getTierColor(decision.selectedTier).bg,
                        color: getTierColor(decision.selectedTier).text,
                        border: `1px solid ${getTierColor(decision.selectedTier).border}`,
                        fontWeight: 700,
                        fontSize: 11,
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {decision.selectedTier}
                    </span>
                    <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginTop: 4 }}>
                      Model: {decision.selectedModel}
                    </div>
                  </div>
                </div>

                {/* Confidence & Strategy */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ padding: "10px 12px", background: "var(--bg-panel)", borderRadius: "var(--radius-sm)" }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Confidence Score</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--accent-cyan)", fontFamily: "var(--font-mono)" }}>
                      {(decision.confidenceScore * 100).toFixed(1)}%
                    </div>
                  </div>

                  <div style={{ padding: "10px 12px", background: "var(--bg-panel)", borderRadius: "var(--radius-sm)" }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Effective Strategy</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                      {decision.strategy}
                    </div>
                  </div>
                </div>

                {/* Required Capabilities Deduced */}
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, fontWeight: 600 }}>
                    Inferred Capabilities ({decision.requiredCapabilities.length}):
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {decision.requiredCapabilities.map((cap) => (
                      <span
                        key={cap}
                        style={{
                          padding: "2px 8px",
                          borderRadius: "var(--radius-sm)",
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid var(--border-subtle)",
                          fontSize: 11,
                          color: "var(--text-secondary)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Router Reasoning */}
                <div
                  style={{
                    padding: "12px",
                    borderRadius: "var(--radius-sm)",
                    background: "rgba(0, 242, 254, 0.05)",
                    border: "1px solid rgba(0, 242, 254, 0.2)",
                    fontSize: 12,
                    color: "var(--text-primary)",
                    lineHeight: 1.5,
                  }}
                >
                  <div style={{ fontWeight: 600, color: "var(--accent-cyan)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                    <CheckCircle2 size={13} />
                    <span>Dispatch Rationale:</span>
                  </div>
                  {decision.reasoning}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
