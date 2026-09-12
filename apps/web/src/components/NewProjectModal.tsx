import React, { useState } from "react";
import { Plus, X, Rocket, Sparkles, Shield, RefreshCw } from "lucide-react";
import { CreateProjectRequest } from "@forgeos/contracts";

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProjectRequest) => Promise<void>;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [requirement, setRequirement] = useState(
    "Build a SaaS customer billing and subscription portal with PostgreSQL, Fastify REST APIs, and a modern Next.js client."
  );
  const [workflowType, setWorkflowType] = useState<"full_factory" | "requirement_to_architecture">("full_factory");
  const [enableGates, setEnableGates] = useState(true);
  const [enableRecovery, setEnableRecovery] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requirement.trim().length < 5) return;

    setSubmitting(true);
    try {
      await onSubmit({
        requirement,
        workflowType,
        enableGates,
        enableRecovery,
      });
      onClose();
    } catch (err) {
      console.error("Failed to launch project:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "var(--radius-md)",
                background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-indigo))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Rocket size={18} color="#050811" />
            </div>
            <h3 style={{ fontSize: 18, margin: 0 }}>Launch New Multi-Agent Factory</h3>
          </div>
          <button className="btn btn-secondary" onClick={onClose} style={{ padding: 6, borderRadius: "50%" }}>
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
          Specify your software product requirement. ForgeOS will assemble the engineering team (PM, Architect, Database, Frontend, Backend, Reviewer, QA, and Security agents) to synthesize and validate the implementation.
        </p>

        <form onSubmit={handleSubmit}>
          {/* Requirement Text */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-muted)" }}>
              Product Requirement Directive:
            </label>
            <textarea
              rows={4}
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              placeholder="e.g. Build an event ticketing system with Stripe checkout and QR code passes..."
              style={{
                width: "100%",
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                padding: 12,
                fontSize: 13,
                fontFamily: "var(--font-sans)",
                resize: "vertical",
                outline: "none",
              }}
              required
            />
          </div>

          {/* Workflow Mode Selector */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 8, color: "var(--text-muted)" }}>
              Orchestration Workflow:
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div
                onClick={() => setWorkflowType("full_factory")}
                style={{
                  padding: 12,
                  borderRadius: "var(--radius-md)",
                  border: `1px solid ${workflowType === "full_factory" ? "var(--accent-cyan)" : "var(--border-subtle)"}`,
                  background: workflowType === "full_factory" ? "var(--accent-cyan-glow)" : "var(--bg-card)",
                  cursor: "pointer",
                }}
              >
                <strong style={{ fontSize: 13, display: "block", marginBottom: 2, color: "#fff" }}>
                  Full Software Factory
                </strong>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  PM $\rightarrow$ Architect $\rightarrow$ [DB || Frontend] $\rightarrow$ Backend
                </span>
              </div>

              <div
                onClick={() => setWorkflowType("requirement_to_architecture")}
                style={{
                  padding: 12,
                  borderRadius: "var(--radius-md)",
                  border: `1px solid ${workflowType === "requirement_to_architecture" ? "var(--accent-cyan)" : "var(--border-subtle)"}`,
                  background: workflowType === "requirement_to_architecture" ? "var(--accent-cyan-glow)" : "var(--bg-card)",
                  cursor: "pointer",
                }}
              >
                <strong style={{ fontSize: 13, display: "block", marginBottom: 2, color: "#fff" }}>
                  Architecture Baseline
                </strong>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  PM $\rightarrow$ Architect Spec & ADRs
                </span>
              </div>
            </div>
          </div>

          {/* Feature Toggles */}
          <div style={{ display: "flex", gap: 20, marginBottom: 24, padding: "12px 16px", background: "var(--bg-card)", borderRadius: "var(--radius-md)" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={enableGates}
                onChange={(e) => setEnableGates(e.target.checked)}
              />
              <span>Adversarial Review Gates (Phase 8)</span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={enableRecovery}
                onChange={(e) => setEnableRecovery(e.target.checked)}
              />
              <span>Self-Healing Recovery & Circuit Breakers (Phase 9)</span>
            </label>
          </div>

          {/* Submit Button */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <Sparkles size={16} />
              <span>{submitting ? "Launching..." : "Launch Engineering Pipeline"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
