import React, { useState, useEffect } from "react";
import {
  Activity,
  DollarSign,
  Cpu,
  Clock,
  ExternalLink,
  RefreshCw,
  Zap,
  CheckCircle2,
  XCircle,
  BarChart3,
  Server,
  Layers,
} from "lucide-react";
import type { ProjectMetrics, TraceSpanRecord } from "../types.js";
import { fetchProjectMetrics, fetchProjectTraces } from "../services/api.js";

interface MetricsDashboardProps {
  projectId: string | null;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ projectId }) => {
  const [metrics, setMetrics] = useState<ProjectMetrics | null>(null);
  const [spans, setSpans] = useState<TraceSpanRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSpan, setSelectedSpan] = useState<TraceSpanRecord | null>(null);

  const loadTelemetry = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [m, t] = await Promise.all([
        fetchProjectMetrics(projectId).catch(() => null),
        fetchProjectTraces(projectId).catch(() => ({ spans: [] })),
      ]);
      setMetrics(m);
      setSpans(t.spans ?? []);
    } catch (err) {
      console.error("Failed to load telemetry:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTelemetry();
    const timer = setInterval(loadTelemetry, 5000);
    return () => clearInterval(timer);
  }, [projectId]);

  if (!projectId) {
    return (
      <div className="card" style={{ padding: 40, textAlign: "center" }}>
        <Activity size={36} color="var(--accent-cyan)" style={{ marginBottom: 12, opacity: 0.6 }} />
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>No Project Selected</h3>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
          Select or launch a project above to inspect OpenTelemetry traces, Prometheus metrics, and cost data.
        </p>
      </div>
    );
  }

  // Calculate timeline min/max for waterfall
  const minTime = spans.length > 0
    ? Math.min(...spans.map((s) => new Date(s.startTime).getTime()))
    : 0;
  const maxTime = spans.length > 0
    ? Math.max(...spans.map((s) => new Date(s.endTime ?? s.startTime).getTime() + (s.durationMs || 100)))
    : 1;
  const totalDuration = Math.max(maxTime - minTime, 1);

  const budget = metrics?.budget;
  const tokenPct = Math.min(budget?.tokenUtilization ?? 0, 100);
  const costPct = Math.min(budget?.costUtilization ?? 0, 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Top Header Bar */}
      <div
        className="card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Activity size={20} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Telemetry & Observability Center</h2>
            <span className="badge badge-draft" style={{ fontSize: 11, padding: "2px 8px" }}>
              OpenTelemetry + Prometheus
            </span>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>
            Continuous performance telemetry, distributed execution traces, and token budget quotas.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <a
            href="http://localhost:3001/metrics"
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
            style={{ fontSize: 12, textDecoration: "none" }}
          >
            <Server size={14} color="var(--accent-amber)" />
            <span>Prometheus /metrics</span>
            <ExternalLink size={12} />
          </a>

          <button onClick={loadTelemetry} className="btn btn-secondary" disabled={loading}>
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {/* Card 1: Token Usage */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Total Tokens</span>
            <Cpu size={18} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--accent-cyan)" }}>
            {(metrics?.totalTokens ?? 0).toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            In: {(metrics?.totalInputTokens ?? 0).toLocaleString()} | Out: {(metrics?.totalOutputTokens ?? 0).toLocaleString()}
          </div>
          {/* Progress bar */}
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
              <span>Quota Used</span>
              <span style={{ fontFamily: "var(--font-mono)" }}>{tokenPct.toFixed(1)}%</span>
            </div>
            <div style={{ height: 5, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${tokenPct}%`,
                  background: tokenPct > 90 ? "var(--accent-crimson)" : "var(--accent-cyan)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Cost USD */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Estimated Cost</span>
            <DollarSign size={18} color="var(--accent-emerald)" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--accent-emerald)" }}>
            ${(metrics?.totalCostUSD ?? 0).toFixed(4)}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            Limit: ${(budget?.maxCostUSD ?? 10.0).toFixed(2)} USD
          </div>
          {/* Progress bar */}
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
              <span>Budget Used</span>
              <span style={{ fontFamily: "var(--font-mono)" }}>{costPct.toFixed(1)}%</span>
            </div>
            <div style={{ height: 5, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${costPct}%`,
                  background: costPct > 90 ? "var(--accent-crimson)" : "var(--accent-emerald)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Execution Latency */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Avg Agent Latency</span>
            <Clock size={18} color="var(--accent-amber)" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--accent-amber)" }}>
            {metrics?.avgLatencyMs ?? 0} ms
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            Cumulative: {((metrics?.totalLatencyMs ?? 0) / 1000).toFixed(2)}s total run time
          </div>
          <div style={{ marginTop: 14, fontSize: 11, color: "var(--text-secondary)" }}>
            ⚡ Fast inference tracking enabled
          </div>
        </div>

        {/* Card 4: Success Rate */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Run Reliability</span>
            <Zap size={18} color="var(--accent-purple)" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--accent-purple)" }}>
            {metrics?.successRate ?? 100}%
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            {metrics?.successfulRuns ?? 0} passed / {metrics?.failedRuns ?? 0} failed
          </div>
          <div style={{ marginTop: 14, fontSize: 11, color: "var(--text-secondary)" }}>
            Total Executions: {metrics?.totalRuns ?? 0}
          </div>
        </div>
      </div>

      {/* Per-Agent Performance Breakdown Table */}
      <div className="card" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <BarChart3 size={16} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>Per-Agent Telemetry Breakdown</h3>
        </div>

        {(!metrics?.agentBreakdown || metrics.agentBreakdown.length === 0) ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)", fontSize: 13 }}>
            No agent run records accumulated for this project yet.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)", textAlign: "left", color: "var(--text-muted)" }}>
                  <th style={{ padding: "8px 12px" }}>Agent Identifier</th>
                  <th style={{ padding: "8px 12px" }}>Executions</th>
                  <th style={{ padding: "8px 12px" }}>Success Rate</th>
                  <th style={{ padding: "8px 12px" }}>Avg Latency</th>
                  <th style={{ padding: "8px 12px" }}>Tokens In</th>
                  <th style={{ padding: "8px 12px" }}>Tokens Out</th>
                  <th style={{ padding: "8px 12px" }}>Est. Cost (USD)</th>
                </tr>
              </thead>
              <tbody>
                {metrics.agentBreakdown.map((a) => {
                  const rate = a.runs > 0 ? ((a.successfulRuns / a.runs) * 100).toFixed(0) : "100";
                  return (
                    <tr key={a.agentId} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                        <span className="badge badge-running" style={{ fontSize: 11, padding: "2px 8px" }}>
                          {a.agentId}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)" }}>{a.runs}</td>
                      <td style={{ padding: "10px 12px", color: Number(rate) >= 80 ? "var(--accent-emerald)" : "var(--accent-crimson)" }}>
                        {rate}%
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)" }}>{a.avgLatencyMs} ms</td>
                      <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                        {a.totalInputTokens.toLocaleString()}
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                        {a.totalOutputTokens.toLocaleString()}
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", color: "var(--accent-emerald)" }}>
                        ${a.costUSD.toFixed(6)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* OpenTelemetry Distributed Trace Waterfall */}
      <div className="card" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Layers size={16} color="var(--accent-purple)" />
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>OpenTelemetry Distributed Trace Waterfall</h3>
            <span className="badge badge-draft" style={{ fontSize: 11, padding: "2px 8px" }}>
              {spans.length} Spans Captured
            </span>
          </div>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Total Trace Duration: {totalDuration} ms
          </span>
        </div>

        {spans.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)", fontSize: 13 }}>
            No trace spans recorded yet. Launch an agent workflow to generate trace spans.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {spans.map((span) => {
              const spanStart = new Date(span.startTime).getTime();
              const offsetMs = Math.max(spanStart - minTime, 0);
              const offsetPct = Math.min((offsetMs / totalDuration) * 100, 95);
              const durationPct = Math.max(Math.min((span.durationMs / totalDuration) * 100, 100 - offsetPct), 2);
              const isSelected = selectedSpan?.id === span.id;

              return (
                <div
                  key={span.id}
                  onClick={() => setSelectedSpan(isSelected ? null : span)}
                  style={{
                    padding: "8px 12px",
                    background: isSelected ? "rgba(0, 210, 255, 0.08)" : "rgba(255, 255, 255, 0.02)",
                    border: `1px solid ${isSelected ? "var(--accent-cyan)" : "rgba(255, 255, 255, 0.05)"}`,
                    borderRadius: 6,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {span.status.code === "ERROR" ? (
                        <XCircle size={14} color="var(--accent-crimson)" />
                      ) : (
                        <CheckCircle2 size={14} color="var(--accent-emerald)" />
                      )}
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>
                        {span.name}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11 }}>
                      <span style={{ color: "var(--text-muted)" }}>{span.durationMs} ms</span>
                      <span className={`badge ${span.status.code === "ERROR" ? "badge-failed" : "badge-approved"}`} style={{ fontSize: 10, padding: "1px 6px" }}>
                        {span.status.code}
                      </span>
                    </div>
                  </div>

                  {/* Waterfall Bar */}
                  <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, position: "relative" }}>
                    <div
                      style={{
                        position: "absolute",
                        left: `${offsetPct}%`,
                        width: `${durationPct}%`,
                        height: "100%",
                        background: span.status.code === "ERROR" ? "var(--accent-crimson)" : "linear-gradient(90deg, #00d2ff, #9d4edd)",
                        borderRadius: 3,
                        boxShadow: "0 0 6px rgba(0, 210, 255, 0.4)",
                      }}
                    />
                  </div>

                  {/* Expanded Detail Drawer */}
                  {isSelected && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: 10,
                        background: "#080b12",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 4,
                        fontSize: 11,
                        fontFamily: "var(--font-mono)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                        <div><strong>Span ID:</strong> {span.spanId}</div>
                        <div><strong>Trace ID:</strong> {span.traceId}</div>
                        <div><strong>Start:</strong> {span.startTime}</div>
                        <div><strong>Duration:</strong> {span.durationMs} ms</div>
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <strong>Attributes:</strong>
                        <pre style={{ margin: "4px 0 0", color: "#a5b4fc", overflowX: "auto" }}>
                          {JSON.stringify(span.attributes, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
