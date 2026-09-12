import { ProjectSummary, ProjectDetail, TaskGraphSnapshot } from "../types.js";
import { CreateProjectRequest, CreateProjectResponse, GateDecisionRequest } from "@forgeos/contracts";

const API_BASE = ""; // Vite proxy forwards /api to backend

export async function fetchProjects(): Promise<ProjectSummary[]> {
  const res = await fetch(`${API_BASE}/api/projects`);
  if (!res.ok) throw new Error(`Failed to fetch projects (${res.status})`);
  return res.json();
}

export async function fetchProjectDetail(projectId: string): Promise<ProjectDetail> {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}`);
  if (!res.ok) throw new Error(`Failed to fetch project detail (${res.status})`);
  return res.json();
}

export async function fetchProjectDAG(projectId: string): Promise<TaskGraphSnapshot> {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/dag`);
  if (!res.ok) throw new Error(`Failed to fetch DAG graph (${res.status})`);
  return res.json();
}

export async function fetchArtifact(projectId: string, artifactId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/artifacts/${artifactId}`);
  if (!res.ok) throw new Error(`Failed to fetch artifact (${res.status})`);
  return res.json();
}

export async function createProject(data: CreateProjectRequest): Promise<CreateProjectResponse> {
  const res = await fetch(`${API_BASE}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Failed to create project (${res.status})`);
  }
  return res.json();
}

export async function submitGateDecision(
  projectId: string,
  artifactId: string,
  data: GateDecisionRequest
): Promise<any> {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/gates/${artifactId}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to submit gate decision (${res.status})`);
  return res.json();
}
