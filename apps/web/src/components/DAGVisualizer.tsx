import React, { useState } from "react";
import { TaskGraphSnapshot, TaskNode } from "../types.js";
import { CheckCircle2, Clock, AlertTriangle, XCircle, ArrowRight, RefreshCw, Eye, X, Terminal, Cpu } from "lucide-react";

interface DAGVisualizerProps {
  dag: TaskGraphSnapshot | null;
  projectDetail: any;
}

export const DAGVisualizer: React.FC<DAGVisualizerProps> = ({ dag, projectDetail }) => {
  const [selectedNode, setSelectedNode] = useState<TaskNode | null>(null);

  if (!dag || dag.nodes.length === 0) {
    return (
      <div
        className="glass-panel"
        style={{
          padding: 40,
          textAlign: "center",
          color: "var(--text-muted)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Clock size={36} color="var(--border-card)" />
        <p>No active task graph available for this project.</p>
      </div>
    );
  }

  // Find task detail from project
  const getTaskDetail = (nodeId: string) => {
    return projectDetail?.tasks?.find((t: any) => t.id === nodeId);
  };

  const getStatusBadge = (status: string, retryCount: number) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="badge badge-completed">
            <CheckCircle2 size={12} />
            COMPLETED
          </span>
        );
      case "RUNNING":
        return (
          <span className="badge badge-running">
            <RefreshCw size={12} className="animate-spin" />
            RUNNING
          </span>
        );
      case "RETRYING":
        return (
          <span className="badge badge-retrying">
            <AlertTriangle size={12} />
            RETRYING #{retryCount}
          </span>
        );
      case "FAILED":
        return (
          <span className="badge badge-failed">
            <XCircle size={12} />
            FAILED
          </span>
        );
      default:
        return (
          <span className="badge badge-pending">
            <Clock size={12} />
            PENDING
          </span>
        );
    }
  };

  const selectedTaskDetail = selectedNode ? getTaskDetail(selectedNode.id) : null;

  return (
    <div style={{ position: "relative" }}>
      {/* Visualizer Canvas Card */}
      <div className="glass-panel" style={{ padding: 24, position: "relative", overflowX: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 16, margin: 0 }}>Orchestration Pipeline & Task Graph (DAG)</h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0 0" }}>
              Dynamic directed acyclic graph evaluating dependencies, parallel branches, and automated retry loops.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: "var(--text-muted)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-emerald)" }} /> Done
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-cyan)" }} /> Active
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-amber)" }} /> Retrying
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-crimson)" }} /> Failed
            </span>
          </div>
        </div>

        {/* Nodes Layout Flow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            minHeight: 260,
            padding: "20px 10px",
          }}
        >
          {dag.nodes.map((node, index) => {
            const isSelected = selectedNode?.id === node.id;
            const taskRuns = getTaskDetail(node.id)?.runs ?? [];
            const lastRun = taskRuns[taskRuns.length - 1];

            return (
              <React.Fragment key={node.id}>
                {/* Node Box */}
                <div
                  onClick={() => setSelectedNode(node)}
                  className={`glass-panel ${isSelected ? "glass-panel-glow" : ""}`}
                  style={{
                    minWidth: 200,
                    maxWidth: 220,
                    padding: 16,
                    cursor: "pointer",
                    position: "relative",
                    background: isSelected ? "var(--bg-panel)" : "rgba(17, 23, 38, 0.9)",
                    border: isSelected
                      ? "1px solid var(--accent-cyan)"
                      : node.status === "RUNNING"
                      ? "1px solid var(--border-glow)"
                      : undefined,
                    boxShadow: node.status === "RUNNING" ? "var(--shadow-glow)" : undefined,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        color: "var(--text-muted)",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Stage {index + 1}
                    </span>
                    {getStatusBadge(node.status, node.retryCount)}
                  </div>

                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                    {node.role.toUpperCase()} AGENT
                  </h3>

                  <div style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-mono)", marginBottom: 12 }}>
                    {node.agentId}
                  </div>

                  <div
                    style={{
                      borderTop: "1px solid var(--border-subtle)",
                      paddingTop: 8,
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 11,
                      color: "var(--text-muted)",
                    }}
                  >
                    <span>{taskRuns.length} run{taskRuns.length !== 1 ? "s" : ""}</span>
                    {lastRun && (
                      <span style={{ color: "var(--text-secondary)" }}>
                        {lastRun.latencyMs ? `${(lastRun.latencyMs / 1000).toFixed(1)}s` : "0s"}
                      </span>
                    )}
                  </div>

                  {/* Inspector hint on hover */}
                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      color: isSelected ? "var(--accent-cyan)" : "var(--text-dim)",
                    }}
                  >
                    <Eye size={12} />
                    <span>Click to inspect</span>
                  </div>
                </div>

                {/* Arrow Connector between stages */}
                {index < dag.nodes.length - 1 && (
                  <div style={{ display: "flex", alignItems: "center", color: "var(--text-muted)" }}>
                    <ArrowRight size={18} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Slide-over Agent Node Inspector Drawer */}
      {selectedNode && (
        <div
          className="glass-panel"
          style={{
            position: "fixed",
            top: 70,
            right: 20,
            width: 460,
            height: "calc(100vh - 90px)",
            zIndex: 200,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            boxShadow: "var(--shadow-lg), 0 0 30px rgba(0,0,0,0.8)",
            border: "1px solid var(--border-card)",
            background: "rgba(11, 15, 25, 0.95)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Drawer Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Cpu size={18} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: 16, margin: 0 }}>{selectedNode.role.toUpperCase()} AGENT INSPECTOR</h3>
              </div>
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                Task ID: {selectedNode.id}
              </span>
            </div>

            <button
              className="btn btn-secondary"
              onClick={() => setSelectedNode(null)}
              style={{ padding: 6, borderRadius: "50%" }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Drawer Body */}
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Status & Retries Card */}
            <div style={{ padding: 12, background: "var(--bg-card)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Current Node Status:</span>
                {getStatusBadge(selectedNode.status, selectedNode.retryCount)}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, fontSize: 12 }}>
                <span style={{ color: "var(--text-muted)" }}>Retries Used:</span>
                <strong>{selectedNode.retryCount} attempts</strong>
              </div>
            </div>

            {/* Task Input Payload */}
            <div>
              <h4 style={{ fontSize: 13, marginBottom: 6, color: "var(--text-secondary)" }}>Task Directives & Input:</h4>
              <pre
                style={{
                  background: "var(--bg-surface)",
                  padding: 12,
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                  fontSize: 11,
                  maxHeight: 140,
                  overflowY: "auto",
                  whiteSpace: "pre-wrap",
                  color: "var(--text-primary)",
                }}
              >
                {JSON.stringify(selectedNode.input, null, 2)}
              </pre>
            </div>

            {/* Execution Runs History */}
            <div>
              <h4 style={{ fontSize: 13, marginBottom: 6, color: "var(--text-secondary)" }}>
                Execution Runs ({selectedTaskDetail?.runs?.length ?? 0}):
              </h4>
              {(!selectedTaskDetail?.runs || selectedTaskDetail.runs.length === 0) && (
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>No execution runs recorded yet.</p>
              )}

              {selectedTaskDetail?.runs?.map((run: any, rIndex: number) => (
                <div
                  key={run.id ?? rIndex}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    padding: 10,
                    marginBottom: 8,
                    fontSize: 11,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <strong style={{ color: "var(--accent-indigo)" }}>
                      Run #{rIndex + 1} — {run.provider} ({run.model})
                    </strong>
                    <span style={{ color: run.status === "success" ? "var(--accent-emerald)" : "var(--accent-crimson)" }}>
                      {run.status.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: 12, color: "var(--text-muted)" }}>
                    <span>Tokens: {(run.inputTokens ?? 0) + (run.outputTokens ?? 0)}</span>
                    <span>Latency: {run.latencyMs ? `${(run.latencyMs / 1000).toFixed(2)}s` : "N/A"}</span>
                  </div>

                  {run.error && (
                    <div style={{ marginTop: 6, color: "var(--accent-crimson)", fontSize: 11 }}>
                      <strong>Error:</strong> {run.error}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Produced Artifacts */}
            <div>
              <h4 style={{ fontSize: 13, marginBottom: 6, color: "var(--text-secondary)" }}>Deliverables Produced:</h4>
              {selectedTaskDetail?.artifacts?.length === 0 && (
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>No deliverables produced yet.</p>
              )}
              {selectedTaskDetail?.artifacts?.map((art: any) => (
                <div
                  key={art.id}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    padding: 10,
                    marginBottom: 6,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 12 }}>{art.type}</strong>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      v{art.version} • {art.id.slice(0, 8)}...
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      color: art.status === "approved" ? "var(--accent-emerald)" : "var(--accent-amber)",
                    }}
                  >
                    {art.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
