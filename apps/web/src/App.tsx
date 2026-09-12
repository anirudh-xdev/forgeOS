import React, { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header.js";
import { DAGVisualizer } from "./components/DAGVisualizer.js";
import { EventTerminal } from "./components/EventTerminal.js";
import { ArtifactExplorer } from "./components/ArtifactExplorer.js";
import { FailureExplorer } from "./components/FailureExplorer.js";
import { MetricsDashboard } from "./components/MetricsDashboard.js";
import { AgentMatrix } from "./components/AgentMatrix.js";
import { HumanApprovalModal } from "./components/HumanApprovalModal.js";
import { NewProjectModal } from "./components/NewProjectModal.js";
import { socketService } from "./services/socket.js";
import {
  fetchProjects,
  fetchProjectDetail,
  fetchProjectDAG,
  createProject,
  submitGateDecision,
} from "./services/api.js";
import { ProjectSummary, ProjectDetail, TaskGraphSnapshot, DomainEvent } from "./types.js";
import { GitBranch, FileCode, AlertOctagon, Activity, Terminal, Cpu } from "lucide-react";

export function App() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectDetail, setProjectDetail] = useState<ProjectDetail | null>(null);
  const [dag, setDag] = useState<TaskGraphSnapshot | null>(null);
  const [events, setEvents] = useState<DomainEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Active Tab: "PIPELINE" | "ARTIFACTS" | "FAILURES" | "METRICS" | "MATRIX"
  const [activeTab, setActiveTab] = useState<"PIPELINE" | "ARTIFACTS" | "FAILURES" | "METRICS" | "MATRIX">("PIPELINE");

  // Modals
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [gateReviewArtifact, setGateReviewArtifact] = useState<any | null>(null);

  // Alert Banner
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Load project list
  const loadProjects = useCallback(async () => {
    try {
      const list = await fetchProjects();
      setProjects(list);
      if (list.length > 0 && !selectedProjectId) {
        setSelectedProjectId(list[0].id);
      }
    } catch (err) {
      console.error("Failed to load projects:", err);
    }
  }, [selectedProjectId]);

  // Load active project detail & DAG
  const loadProjectData = useCallback(async (projectId: string) => {
    try {
      const [detail, dagSnapshot] = await Promise.all([
        fetchProjectDetail(projectId),
        fetchProjectDAG(projectId).catch(() => null),
      ]);
      setProjectDetail(detail);
      setDag(dagSnapshot);
      setEvents(detail.events ?? []);
    } catch (err) {
      console.error("Failed to load project detail:", err);
    }
  }, []);

  // Initialize Socket.IO connection & load projects
  useEffect(() => {
    loadProjects();

    const socket = socketService.connect();
    setIsConnected(socketService.isConnected());

    const unsubConnection = socketService.on("connection_change", (connected: boolean) => {
      setIsConnected(connected);
    });

    const unsubDomainEvent = socketService.on("domain_event", (event: DomainEvent) => {
      // Append event to stream
      setEvents((prev) => [...prev, event]);

      // If event pertains to active project, refresh state
      if (event.projectId === selectedProjectId) {
        loadProjectData(event.projectId);
      }

      if (event.type === "PROJECT_COMPLETED") {
        setBannerMessage("Project completed successfully! All deliverables vetted and approved.");
      } else if (event.type === "LOOP_DETECTED") {
        setBannerMessage(`Circuit Breaker Alert: Loop detected in agent ${(event.payload as any)?.agentId}`);
      }
    });

    return () => {
      unsubConnection();
      unsubDomainEvent();
    };
  }, [loadProjects, selectedProjectId, loadProjectData]);

  // When selected project changes, subscribe to room and load data
  useEffect(() => {
    if (selectedProjectId) {
      socketService.subscribeToProject(selectedProjectId);
      loadProjectData(selectedProjectId);
    }
  }, [selectedProjectId, loadProjectData]);

  // Handlers
  const handleCreateProject = async (data: any) => {
    const res = await createProject(data);
    await loadProjects();
    setSelectedProjectId(res.projectId);
  };

  const handleGateDecision = async (action: "approve" | "reject", feedback: string) => {
    if (!selectedProjectId || !gateReviewArtifact) return;
    await submitGateDecision(selectedProjectId, gateReviewArtifact.id, {
      action,
      reason: feedback,
      overrideFeedback: feedback,
    });
    await loadProjectData(selectedProjectId);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header Bar */}
      <Header
        projects={projects}
        selectedProjectId={selectedProjectId}
        projectDetail={projectDetail}
        isConnected={isConnected}
        onSelectProject={(id) => setSelectedProjectId(id)}
        onOpenNewProject={() => setIsNewProjectOpen(true)}
        onRefresh={() => selectedProjectId && loadProjectData(selectedProjectId)}
      />

      {/* Alert Banner */}
      {bannerMessage && (
        <div
          style={{
            background: bannerMessage.includes("Alert") ? "var(--accent-crimson-glow)" : "var(--accent-emerald-glow)",
            borderBottom: `1px solid ${bannerMessage.includes("Alert") ? "rgba(239, 68, 68, 0.4)" : "rgba(16, 185, 129, 0.4)"}`,
            color: bannerMessage.includes("Alert") ? "var(--accent-crimson)" : "var(--accent-emerald)",
            padding: "8px 24px",
            fontSize: 12,
            fontWeight: 600,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{bannerMessage}</span>
          <button
            onClick={() => setBannerMessage(null)}
            style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", fontSize: 13 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Container */}
      <main style={{ flex: 1, padding: "20px 24px", maxWidth: 1600, width: "100%", margin: "0 auto" }}>
        {/* Navigation Tabs */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <button
            onClick={() => setActiveTab("PIPELINE")}
            className={`btn ${activeTab === "PIPELINE" ? "btn-primary" : "btn-secondary"}`}
          >
            <GitBranch size={15} />
            <span>Pipeline & DAG Visualizer</span>
          </button>

          <button
            onClick={() => setActiveTab("ARTIFACTS")}
            className={`btn ${activeTab === "ARTIFACTS" ? "btn-primary" : "btn-secondary"}`}
          >
            <FileCode size={15} />
            <span>Deliverables & Artifacts ({projectDetail?.artifacts?.length ?? 0})</span>
          </button>

          <button
            onClick={() => setActiveTab("FAILURES")}
            className={`btn ${activeTab === "FAILURES" ? "btn-primary" : "btn-secondary"}`}
          >
            <AlertOctagon size={15} />
            <span>Recovery & Circuit Breakers</span>
          </button>

          <button
            onClick={() => setActiveTab("METRICS")}
            className={`btn ${activeTab === "METRICS" ? "btn-primary" : "btn-secondary"}`}
          >
            <Activity size={15} />
            <span>Metrics & Observability</span>
          </button>

          <button
            onClick={() => setActiveTab("MATRIX")}
            className={`btn ${activeTab === "MATRIX" ? "btn-primary" : "btn-secondary"}`}
          >
            <Cpu size={15} />
            <span>Agent Matrix & Smart Router</span>
          </button>
        </div>

        {/* Tab 1: Pipeline & Event Terminal */}
        {activeTab === "PIPELINE" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <DAGVisualizer dag={dag} projectDetail={projectDetail} />
            <EventTerminal events={events} onClearEvents={() => setEvents([])} />
          </div>
        )}

        {/* Tab 2: Artifacts Explorer */}
        {activeTab === "ARTIFACTS" && (
          <ArtifactExplorer
            artifacts={projectDetail?.artifacts ?? []}
            onOpenGateDecision={(art) => setGateReviewArtifact(art)}
          />
        )}

        {/* Tab 3: Failures & Recovery */}
        {activeTab === "FAILURES" && (
          <FailureExplorer events={events} projectDetail={projectDetail} />
        )}

        {/* Tab 4: Metrics & Observability */}
        {activeTab === "METRICS" && (
          <MetricsDashboard projectId={selectedProjectId} />
        )}

        {/* Tab 5: Dynamic Agent Selection & Matrix */}
        {activeTab === "MATRIX" && (
          <AgentMatrix />
        )}
      </main>

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        onSubmit={handleCreateProject}
      />

      {/* Human-in-the-Loop Review Gate Modal */}
      {selectedProjectId && (
        <HumanApprovalModal
          isOpen={gateReviewArtifact !== null}
          artifact={gateReviewArtifact}
          projectId={selectedProjectId}
          onClose={() => setGateReviewArtifact(null)}
          onSubmitDecision={handleGateDecision}
        />
      )}
    </div>
  );
}
