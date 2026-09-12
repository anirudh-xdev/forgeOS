import React from "react";
import { AlertOctagon, RefreshCw, ShieldAlert, Cpu, CheckCircle } from "lucide-react";

interface FailureExplorerProps {
  events: any[];
  projectDetail: any;
}

export const FailureExplorer: React.FC<FailureExplorerProps> = ({ events, projectDetail }) => {
  const retryEvents = events.filter((e) => e.type === "RETRY_REQUESTED");
  const loopEvents = events.filter((e) => e.type === "LOOP_DETECTED");
  const failureEvents = events.filter((e) => e.type === "TASK_FAILED" || e.type === "REVIEW_FAILED");

  const totalIncidents = retryEvents.length + loopEvents.length + failureEvents.length;

  return (
    <div className="glass-panel" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 16, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertOctagon size={18} color={loopEvents.length > 0 ? "var(--accent-crimson)" : "var(--accent-amber)"} />
            <span>Failure Recovery & Circuit Breaker Diagnostics (Phase 9)</span>
          </h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0 0" }}>
            Automated failure classification, exponential backoff diagnostics, and circuit breaker trip logs.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <span className="badge badge-retrying">
            <RefreshCw size={12} />
            {retryEvents.length} Retries
          </span>
          {loopEvents.length > 0 && (
            <span className="badge badge-failed">
              <ShieldAlert size={12} />
              {loopEvents.length} Loop Breakers Tripped
            </span>
          )}
        </div>
      </div>

      {totalIncidents === 0 ? (
        <div
          style={{
            padding: "32px 20px",
            textAlign: "center",
            color: "var(--accent-emerald)",
            background: "rgba(16, 185, 129, 0.05)",
            borderRadius: "var(--radius-md)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <CheckCircle size={20} />
          <span>Zero runtime failures or circuit breaker incidents recorded for this project. Pipeline executing smoothly.</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Circuit Breaker Alerts (High Priority) */}
          {loopEvents.map((e, idx) => (
            <div
              key={e.id ?? idx}
              style={{
                background: "var(--accent-crimson-glow)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                borderRadius: "var(--radius-md)",
                padding: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <ShieldAlert size={16} color="var(--accent-crimson)" />
                <strong style={{ color: "var(--accent-crimson)", fontSize: 13 }}>
                  CIRCUIT BREAKER TRIPPED: {e.payload?.loopType}
                </strong>
                <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>
                  Task: {e.taskId?.slice(0, 8)}...
                </span>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-primary)", margin: "4px 0" }}>
                {e.payload?.message}
              </p>
              {e.payload?.errorSignature && (
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  Deterministic Signature: {e.payload?.errorSignature}
                </div>
              )}
            </div>
          ))}

          {/* Self-Healing Retry Logs */}
          {retryEvents.map((e, idx) => (
            <div
              key={e.id ?? idx}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: 12,
                fontSize: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <strong style={{ color: "var(--accent-amber)" }}>
                  Self-Healing Retry #{e.payload?.attempt} — Category: {e.payload?.category}
                </strong>
                <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  Backoff Delay: {e.payload?.delayMs ?? 0}ms
                </span>
              </div>

              <div style={{ color: "var(--text-secondary)", fontSize: 11, marginBottom: 4 }}>
                Strategy: <strong>{e.payload?.strategy}</strong> • Agent: <strong>{e.payload?.agentId}</strong>
              </div>

              {e.payload?.remediationAdvice && (
                <pre
                  style={{
                    background: "var(--bg-surface)",
                    padding: 8,
                    borderRadius: 4,
                    fontSize: 10,
                    color: "var(--text-primary)",
                    whiteSpace: "pre-wrap",
                    marginTop: 6,
                  }}
                >
                  {e.payload?.remediationAdvice}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
