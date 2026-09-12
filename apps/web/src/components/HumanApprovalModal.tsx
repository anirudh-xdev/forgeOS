import React, { useState } from "react";
import { Shield, CheckCircle2, XCircle, X, MessageSquare } from "lucide-react";

interface HumanApprovalModalProps {
  artifact: any;
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmitDecision: (action: "approve" | "reject", feedback: string) => Promise<void>;
}

export const HumanApprovalModal: React.FC<HumanApprovalModalProps> = ({
  artifact,
  projectId,
  isOpen,
  onClose,
  onSubmitDecision,
}) => {
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !artifact) return null;

  const handleAction = async (action: "approve" | "reject") => {
    setSubmitting(true);
    try {
      await onSubmitDecision(action, feedback);
      onClose();
    } catch (err) {
      console.error("Failed to submit gate decision:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Shield size={20} color="var(--accent-amber)" />
            <h3 style={{ fontSize: 16, margin: 0 }}>Human-in-the-Loop Review Gate</h3>
          </div>
          <button className="btn btn-secondary" onClick={onClose} style={{ padding: 6, borderRadius: "50%" }}>
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
          You are reviewing deliverable <strong>{artifact.type}</strong> (v{artifact.version}). You can approve the deliverable to advance downstream agents or reject it to trigger failure recovery.
        </p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-muted)" }}>
            Review Feedback & Instructions:
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Provide guidance or reason for rejection/approval..."
            rows={4}
            style={{
              width: "100%",
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-primary)",
              padding: 10,
              fontSize: 13,
              fontFamily: "var(--font-sans)",
              resize: "vertical",
              outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button
            className="btn btn-danger"
            disabled={submitting}
            onClick={() => handleAction("reject")}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <XCircle size={15} />
            <span>Reject Deliverable</span>
          </button>

          <button
            className="btn btn-success"
            disabled={submitting}
            onClick={() => handleAction("approve")}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <CheckCircle2 size={15} />
            <span>Approve & Continue</span>
          </button>
        </div>
      </div>
    </div>
  );
};
