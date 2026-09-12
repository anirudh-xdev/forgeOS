import React from "react";
import { ProjectSummary, ProjectDetail } from "../types.js";
import { Activity, Plus, RefreshCw, Cpu, Layers, DollarSign, Clock } from "lucide-react";

interface HeaderProps {
  projects: ProjectSummary[];
  selectedProjectId: string | null;
  projectDetail: ProjectDetail | null;
  isConnected: boolean;
  onSelectProject: (id: string) => void;
  onOpenNewProject: () => void;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  projects,
  selectedProjectId,
  projectDetail,
  isConnected,
  onSelectProject,
  onOpenNewProject,
  onRefresh,
}) => {
  // Compute aggregate stats from active project
  const tasks = projectDetail?.tasks ?? [];
  const completedCount = tasks.filter((t) => t.status === "COMPLETED").length;
  const runningCount = tasks.filter((t) => t.status === "RUNNING" || t.status === "RETRYING").length;

  let totalTokens = 0;
  let totalLatencyMs = 0;

  for (const t of tasks) {
    for (const r of t.runs) {
      totalTokens += (r.inputTokens ?? 0) + (r.outputTokens ?? 0);
      totalLatencyMs += r.latencyMs ?? 0;
    }
  }

  const estimatedCost = (totalTokens * 0.000002).toFixed(4); // ~$2 per 1M tokens estimated

  return (
    <header
      style={{
        borderBottom: "1px solid var(--border-subtle)",
        background: "rgba(11, 15, 25, 0.8)",
        backdropFilter: "blur(16px)",
        position: "sticky",
        top: 0,
        zIndex: 100,
        padding: "12px 24px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        {/* Logo & Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "var(--radius-md)",
              background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-indigo))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 16px rgba(0, 242, 254, 0.4)",
            }}
          >
            <Cpu size={20} color="#050811" />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>ForgeOS</h1>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  padding: "1px 6px",
                  borderRadius: 4,
                  background: "rgba(0, 242, 254, 0.12)",
                  color: "var(--accent-cyan)",
                  border: "1px solid rgba(0, 242, 254, 0.3)",
                }}
              >
                v0.10.0
              </span>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>Multi-Agent Software Factory Control Plane</p>
          </div>
        </div>

        {/* Project Selector & Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Connection Status Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px",
              borderRadius: "var(--radius-full)",
              background: isConnected ? "var(--accent-emerald-glow)" : "var(--accent-crimson-glow)",
              border: `1px solid ${isConnected ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
              fontSize: 11,
              fontWeight: 600,
              color: isConnected ? "var(--accent-emerald)" : "var(--accent-crimson)",
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: isConnected ? "var(--accent-emerald)" : "var(--accent-crimson)",
                boxShadow: isConnected ? "0 0 8px var(--accent-emerald)" : "none",
              }}
            />
            {isConnected ? "LIVE STREAM" : "DISCONNECTED"}
          </div>

          {/* Project Dropdown */}
          <select
            value={selectedProjectId ?? ""}
            onChange={(e) => onSelectProject(e.target.value)}
            style={{
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "6px 12px",
              fontSize: 13,
              fontFamily: "var(--font-sans)",
              cursor: "pointer",
              outline: "none",
              minWidth: 220,
            }}
          >
            {projects.length === 0 && <option value="">No projects available</option>}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} [{p.status}]
              </option>
            ))}
          </select>

          {/* Refresh Button */}
          <button className="btn btn-secondary" onClick={onRefresh} title="Refresh project state" style={{ padding: "7px 10px" }}>
            <RefreshCw size={14} />
          </button>

          {/* New Project Button */}
          <button className="btn btn-primary" onClick={onOpenNewProject}>
            <Plus size={15} />
            <span>Launch Factory</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Bar */}
      {projectDetail && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginTop: 12,
            paddingTop: 10,
            borderTop: "1px solid var(--border-subtle)",
            fontSize: 12,
            color: "var(--text-secondary)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Layers size={14} color="var(--accent-cyan)" />
            <span>Tasks:</span>
            <strong style={{ color: "var(--text-primary)" }}>
              {completedCount} / {tasks.length} Completed
            </strong>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Activity size={14} color={runningCount > 0 ? "var(--accent-amber)" : "var(--text-muted)"} />
            <span>Active Agents:</span>
            <strong style={{ color: runningCount > 0 ? "var(--accent-amber)" : "var(--text-primary)" }}>
              {runningCount}
            </strong>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Cpu size={14} color="var(--accent-indigo)" />
            <span>Total Tokens:</span>
            <strong style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
              {totalTokens.toLocaleString()}
            </strong>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <DollarSign size={14} color="var(--accent-emerald)" />
            <span>Estimated Cost:</span>
            <strong style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
              ${estimatedCost}
            </strong>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Clock size={14} color="var(--text-muted)" />
            <span>Execution Time:</span>
            <strong style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
              {(totalLatencyMs / 1000).toFixed(1)}s
            </strong>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Requirement:</span>
            <span
              style={{
                maxWidth: 320,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                color: "var(--text-primary)",
              }}
              title={projectDetail.requirement}
            >
              {projectDetail.requirement}
            </span>
          </div>
        </div>
      )}
    </header>
  );
};
