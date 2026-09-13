import React, { useState } from "react";
import { FileCode, Shield, CheckCircle2, AlertCircle, FileText, Database, Layers, Check, X, ShieldAlert, FolderDown, Loader2 } from "lucide-react";

interface ArtifactExplorerProps {
  artifacts: any[];
  projectId?: string | null;
  onOpenGateDecision: (artifact: any) => void;
}

export const ArtifactExplorer: React.FC<ArtifactExplorerProps> = ({ artifacts, projectId, onOpenGateDecision }) => {
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const handleExport = async () => {
    const targetProjectId = projectId ?? selectedArtifact?.projectId;
    if (!targetProjectId) return;

    setExporting(true);
    setExportMessage(null);
    try {
      const res = await fetch(`http://localhost:3001/api/projects/${targetProjectId}/export`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setExportMessage(`Codebase exported successfully (${data.totalFiles} files) to: ${data.exportDir}`);
      } else {
        setExportMessage(`Export failed: ${data.error ?? "Unknown error"}`);
      }
    } catch (err: any) {
      setExportMessage(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  if (!artifacts || artifacts.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
        <FileCode size={36} color="var(--border-card)" style={{ marginBottom: 12 }} />
        <p>No deliverables generated yet. Run a software factory workflow to inspect artifacts.</p>
      </div>
    );
  }

  const selectedArtifact = artifacts.find((a) => a.id === selectedArtifactId) ?? artifacts[0];

  const getArtifactIcon = (type: string) => {
    switch (type) {
      case "ProductSpecification":
        return <FileText size={16} color="var(--accent-cyan)" />;
      case "ArchitectureSpecification":
        return <Layers size={16} color="var(--accent-indigo)" />;
      case "DatabaseSchema":
        return <Database size={16} color="var(--accent-purple)" />;
      case "SourceCode":
      case "BackendImplementation":
        return <FileCode size={16} color="var(--accent-emerald)" />;
      case "SecurityReport":
        return <ShieldAlert size={16} color="var(--accent-crimson)" />;
      case "TestReport":
      case "ReviewReport":
        return <Shield size={16} color="var(--accent-amber)" />;
      default:
        return <FileText size={16} color="var(--text-muted)" />;
    }
  };

  return (
    <div className="glass-panel" style={{ padding: 20, display: "flex", flexDirection: "column", minHeight: 520 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 16, margin: 0 }}>Artifact Deliverable Explorer</h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0 0" }}>
            Audit and inspect structured specifications, database schemas, code, and quality gate reports.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            className="btn btn-secondary"
            onClick={handleExport}
            disabled={exporting}
            style={{ fontSize: 12, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}
            title="Export complete runnable project with Prisma, Fastify, Next.js, and Docs to disk"
          >
            {exporting ? <Loader2 size={14} className="spin" /> : <FolderDown size={14} color="var(--accent-emerald)" />}
            <span>{exporting ? "Exporting..." : "Export Codebase to Disk"}</span>
          </button>

          {selectedArtifact && (selectedArtifact.status === "draft" || selectedArtifact.status === "rejected") && (
            <button
              className="btn btn-secondary"
              onClick={() => onOpenGateDecision(selectedArtifact)}
              style={{ fontSize: 12, padding: "6px 12px" }}
            >
              <Shield size={14} color="var(--accent-amber)" />
              <span>Review Gate Action</span>
            </button>
          )}
        </div>
      </div>

      {exportMessage && (
        <div
          style={{
            padding: "8px 14px",
            marginBottom: 14,
            borderRadius: "var(--radius-sm)",
            background: exportMessage.includes("failed") ? "rgba(244, 63, 94, 0.15)" : "rgba(16, 185, 129, 0.15)",
            border: exportMessage.includes("failed") ? "1px solid var(--accent-crimson)" : "1px solid var(--accent-emerald)",
            color: exportMessage.includes("failed") ? "var(--accent-crimson)" : "var(--accent-emerald)",
            fontSize: 12,
            fontFamily: "var(--font-mono)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{exportMessage}</span>
          <button
            onClick={() => setExportMessage(null)}
            style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0 }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>
        {/* Artifacts List Sidebar */}
        <div
          style={{
            width: 260,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            borderRight: "1px solid var(--border-subtle)",
            paddingRight: 12,
          }}
        >
          {artifacts.map((art) => {
            const isSelected = art.id === selectedArtifact?.id;
            return (
              <div
                key={art.id}
                onClick={() => setSelectedArtifactId(art.id)}
                style={{
                  padding: 10,
                  borderRadius: "var(--radius-md)",
                  background: isSelected ? "var(--bg-panel)" : "var(--bg-card)",
                  border: isSelected ? "1px solid var(--accent-cyan)" : "1px solid var(--border-subtle)",
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  {getArtifactIcon(art.type)}
                  <strong style={{ fontSize: 12, color: isSelected ? "#fff" : "var(--text-primary)" }}>
                    {art.type}
                  </strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10 }}>
                  <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    v{art.version} • {art.createdBy}
                  </span>
                  <span
                    style={{
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color:
                        art.status === "approved"
                          ? "var(--accent-emerald)"
                          : art.status === "rejected"
                          ? "var(--accent-crimson)"
                          : "var(--accent-amber)",
                    }}
                  >
                    {art.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Artifact Content View */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
          {selectedArtifact && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingBottom: 10,
                  borderBottom: "1px solid var(--border-subtle)",
                  marginBottom: 10,
                }}
              >
                <div>
                  <h4 style={{ fontSize: 14, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                    {getArtifactIcon(selectedArtifact.type)}
                    <span>{selectedArtifact.type} Deliverable</span>
                  </h4>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    ID: {selectedArtifact.id}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 4,
                      background:
                        selectedArtifact.status === "approved"
                          ? "var(--accent-emerald-glow)"
                          : selectedArtifact.status === "rejected"
                          ? "var(--accent-crimson-glow)"
                          : "var(--accent-amber-glow)",
                      color:
                        selectedArtifact.status === "approved"
                          ? "var(--accent-emerald)"
                          : selectedArtifact.status === "rejected"
                          ? "var(--accent-crimson)"
                          : "var(--accent-amber)",
                    }}
                  >
                    Status: {selectedArtifact.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Artifact JSON / Code Pane */}
              <div
                style={{
                  flex: 1,
                  background: "#04060a",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                  borderRadius: "var(--radius-md)",
                  padding: 14,
                  overflowY: "auto",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--text-primary)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {typeof selectedArtifact.content === "string"
                  ? selectedArtifact.content
                  : JSON.stringify(selectedArtifact.content, null, 2)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
