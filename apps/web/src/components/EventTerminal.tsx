import React, { useState, useRef, useEffect } from "react";
import { DomainEvent } from "../types.js";
import { Terminal, Shield, AlertTriangle, Play, Check, Filter, Trash2, ArrowDown } from "lucide-react";

interface EventTerminalProps {
  events: DomainEvent[];
  onClearEvents: () => void;
}

export const EventTerminal: React.FC<EventTerminalProps> = ({ events, onClearEvents }) => {
  const [filter, setFilter] = useState<"ALL" | "TASKS" | "GATES" | "RECOVERY">("ALL");
  const [autoScroll, setAutoScroll] = useState(true);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const filteredEvents = events.filter((e) => {
    if (filter === "ALL") return true;
    if (filter === "TASKS") {
      return ["TASK_CREATED", "TASK_STARTED", "TASK_COMPLETED", "TASK_FAILED"].includes(e.type);
    }
    if (filter === "GATES") {
      return [
        "REVIEW_REQUESTED",
        "REVIEW_FAILED",
        "SPEC_APPROVED",
        "ARCHITECTURE_APPROVED",
        "CONTRACT_CREATED",
      ].includes(e.type);
    }
    if (filter === "RECOVERY") {
      return ["RETRY_REQUESTED", "LOOP_DETECTED", "BUILD_FAILED", "TEST_FAILED"].includes(e.type);
    }
    return true;
  });

  useEffect(() => {
    if (autoScroll) {
      terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [events, autoScroll]);

  const getEventBadge = (type: string) => {
    let color = "var(--text-muted)";
    let bg = "rgba(255, 255, 255, 0.05)";
    let border = "var(--border-subtle)";

    if (type.includes("STARTED")) {
      color = "var(--accent-cyan)";
      bg = "var(--accent-cyan-glow)";
      border = "rgba(0, 242, 254, 0.3)";
    } else if (type.includes("COMPLETED") || type.includes("APPROVED")) {
      color = "var(--accent-emerald)";
      bg = "var(--accent-emerald-glow)";
      border = "rgba(16, 185, 129, 0.3)";
    } else if (type.includes("RETRY") || type.includes("REVIEW_FAILED")) {
      color = "var(--accent-amber)";
      bg = "var(--accent-amber-glow)";
      border = "rgba(245, 158, 11, 0.3)";
    } else if (type.includes("FAILED") || type.includes("LOOP_DETECTED")) {
      color = "var(--accent-crimson)";
      bg = "var(--accent-crimson-glow)";
      border = "rgba(239, 68, 68, 0.3)";
    }

    return (
      <span
        style={{
          display: "inline-block",
          padding: "2px 6px",
          borderRadius: 4,
          fontSize: 10,
          fontWeight: 700,
          color,
          background: bg,
          border: `1px solid ${border}`,
          fontFamily: "var(--font-mono)",
        }}
      >
        {type}
      </span>
    );
  };

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toTimeString().split(" ")[0] + "." + String(d.getMilliseconds()).padStart(3, "0");
    } catch {
      return ts;
    }
  };

  return (
    <div className="glass-panel" style={{ padding: 20, display: "flex", flexDirection: "column", height: 420 }}>
      {/* Terminal Header & Filters */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Terminal size={16} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: 14, margin: 0 }}>Realtime Domain Event Stream</h3>
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            ({filteredEvents.length} events)
          </span>
        </div>

        {/* Filter Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {(["ALL", "TASKS", "GATES", "RECOVERY"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? "var(--accent-cyan-glow)" : "var(--bg-card)",
                color: filter === f ? "var(--accent-cyan)" : "var(--text-muted)",
                border: `1px solid ${filter === f ? "var(--accent-cyan)" : "var(--border-subtle)"}`,
                borderRadius: "var(--radius-sm)",
                padding: "3px 8px",
                fontSize: 10,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {f}
            </button>
          ))}

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            title={autoScroll ? "Pause auto-scroll" : "Enable auto-scroll"}
            style={{
              background: autoScroll ? "var(--accent-emerald-glow)" : "var(--bg-card)",
              color: autoScroll ? "var(--accent-emerald)" : "var(--text-muted)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: "3px 6px",
              cursor: "pointer",
            }}
          >
            <ArrowDown size={12} />
          </button>

          <button
            onClick={onClearEvents}
            title="Clear event log"
            style={{
              background: "var(--bg-card)",
              color: "var(--text-muted)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: "3px 6px",
              cursor: "pointer",
            }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Terminal Output Body */}
      <div
        style={{
          flex: 1,
          background: "#04060a",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          borderRadius: "var(--radius-md)",
          padding: 12,
          overflowY: "auto",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {filteredEvents.length === 0 && (
          <div style={{ color: "var(--text-dim)", textAlign: "center", marginTop: 80 }}>
            No domain events logged yet. Trigger a workflow to observe real-time streams.
          </div>
        )}

        {filteredEvents.map((e, idx) => (
          <div
            key={e.id ?? idx}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "4px 6px",
              borderRadius: 4,
              background: idx % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
            }}
          >
            <span style={{ color: "var(--text-dim)", whiteSpace: "nowrap" }}>{formatTimestamp(e.timestamp)}</span>
            <div style={{ flexShrink: 0 }}>{getEventBadge(e.type)}</div>
            {e.taskId && (
              <span style={{ color: "var(--text-muted)", fontSize: 10, whiteSpace: "nowrap" }}>
                [{e.taskId.slice(0, 6)}]
              </span>
            )}
            <span
              style={{
                color: "var(--text-secondary)",
                wordBreak: "break-all",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={JSON.stringify(e.payload)}
            >
              {typeof e.payload === "object" && e.payload !== null
                ? JSON.stringify(e.payload).replace(/^{|}$/g, "")
                : String(e.payload)}
            </span>
          </div>
        ))}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
};
