import { describe, it, expect } from "vitest";
import { MockProvider } from "@forgeos/ai-provider";
import { AgentRunner } from "@forgeos/agent-runtime";
import {
  Artifact,
  ReviewReportContent,
  TestReportContent,
  SecurityReportContent,
} from "@forgeos/contracts";
import { ApprovalGateEngine } from "../src/gates/approval-gate.js";

describe("ApprovalGateEngine (Phase 8 Quality & Security Gates)", () => {
  it("should approve artifact when Reviewer Agent passes with zero blockers", async () => {
    const reviewReport: ReviewReportContent = {
      status: "pass",
      severity: "info",
      issues: [],
      summary: "All acceptance criteria met. Clean modular architecture.",
    };

    const mockProvider = new MockProvider([JSON.stringify(reviewReport)]);
    const runner = new AgentRunner({ aiProvider: mockProvider });
    const gateEngine = new ApprovalGateEngine(runner);

    const artifact: Artifact = {
      id: "art-pm-01",
      projectId: "proj-01",
      type: "ProductSpecification",
      version: 1,
      createdBy: "forgeos-pm-agent",
      content: { project: "Test Spec", goals: ["Validate quality gate"] },
      status: "draft",
    };

    const result = await gateEngine.evaluateArtifact(artifact, {
      projectId: "proj-01",
    });

    expect(result.passed).toBe(true);
    expect(result.status).toBe("approved");
    expect(result.reports.reviewReport).toBeDefined();
    expect(result.reports.reviewReport?.status).toBe("pass");
    expect(result.reasons).toHaveLength(0);
  });

  it("should reject artifact when Reviewer Agent reports blocker or critical flaw", async () => {
    const reviewReport: ReviewReportContent = {
      status: "fail",
      severity: "blocker",
      issues: [
        {
          file: "architecture.json",
          problem: "Missing authentication and authorization boundary definition",
          recommendation: "Define JWT Bearer auth middleware",
          severity: "blocker",
        },
      ],
      summary: "Critical architectural omissions detected.",
    };

    const mockProvider = new MockProvider([JSON.stringify(reviewReport)]);
    const runner = new AgentRunner({ aiProvider: mockProvider });
    const gateEngine = new ApprovalGateEngine(runner);

    const artifact: Artifact = {
      id: "art-arch-01",
      projectId: "proj-01",
      type: "ArchitectureSpecification",
      version: 1,
      createdBy: "forgeos-architect-agent",
      content: { pattern: "Microservices", apis: [] },
      status: "draft",
    };

    const result = await gateEngine.evaluateArtifact(artifact, {
      projectId: "proj-01",
    });

    expect(result.passed).toBe(false);
    expect(result.status).toBe("rejected");
    expect(result.reasons.some((r) => r.includes("Reviewer gate failed"))).toBe(true);
  });

  it("should reject SourceCode artifact when leaked secrets or critical static vulnerabilities exist", async () => {
    const securityReport: SecurityReportContent = {
      status: "secure",
      findings: [],
      riskScore: 0,
      summary: "AI model checks passed",
    };
    const reviewReport: ReviewReportContent = {
      status: "pass",
      issues: [],
      summary: "Code review passed",
    };
    const testReport: TestReportContent = {
      passed: true,
      totalTests: 5,
      passedTests: 5,
      failedTests: 0,
      durationMs: 120,
      suites: [{ name: "suite", passed: true }],
      summary: "Tests passed",
    };

    const mockProvider = new MockProvider([
      JSON.stringify(securityReport),
      JSON.stringify(testReport),
      JSON.stringify(reviewReport),
    ]);
    const runner = new AgentRunner({ aiProvider: mockProvider });
    const gateEngine = new ApprovalGateEngine(runner);

    const maliciousCode = `
      const awsKey = "AKIAIOSFODNN7EXAMPLE";
      eval(userPayload);
    `;

    const artifact: Artifact = {
      id: "art-src-01",
      projectId: "proj-01",
      type: "SourceCode",
      version: 1,
      createdBy: "forgeos-backend-agent",
      content: { code: maliciousCode },
      status: "draft",
    };

    const result = await gateEngine.evaluateArtifact(artifact, {
      projectId: "proj-01",
      sourceCodeContent: maliciousCode,
    });

    expect(result.passed).toBe(false);
    expect(result.status).toBe("rejected");
    expect(result.reports.securityReport?.status).toBe("blocked");
    expect(result.reports.securityReport?.findings.length).toBeGreaterThanOrEqual(2);
    expect(result.reasons.some((r) => r.includes("Security gate failed"))).toBe(true);
  });

  it("should reject SourceCode artifact when QA test suite has failing tests", async () => {
    const securityReport: SecurityReportContent = {
      status: "secure",
      findings: [],
      riskScore: 0,
      summary: "Clean",
    };
    const testReport: TestReportContent = {
      passed: false,
      totalTests: 10,
      passedTests: 8,
      failedTests: 2,
      durationMs: 350,
      suites: [
        { name: "AuthSuite > login", passed: true },
        { name: "AuthSuite > tokenRefresh", passed: false, error: "TokenExpiredError" },
      ],
      summary: "2 test failures detected in token refresh suite.",
    };
    const reviewReport: ReviewReportContent = {
      status: "pass",
      issues: [],
      summary: "Clean code structure",
    };

    const mockProvider = new MockProvider([
      JSON.stringify(securityReport),
      JSON.stringify(testReport),
      JSON.stringify(reviewReport),
    ]);
    const runner = new AgentRunner({ aiProvider: mockProvider });
    const gateEngine = new ApprovalGateEngine(runner);

    const artifact: Artifact = {
      id: "art-src-02",
      projectId: "proj-01",
      type: "SourceCode",
      version: 1,
      createdBy: "forgeos-backend-agent",
      content: { code: "export const auth = {};" },
      status: "draft",
    };

    const result = await gateEngine.evaluateArtifact(artifact, {
      projectId: "proj-01",
      sourceCodeContent: "export const auth = {};",
    });

    expect(result.passed).toBe(false);
    expect(result.status).toBe("rejected");
    expect(result.reports.testReport?.passed).toBe(false);
    expect(result.reasons.some((r) => r.includes("QA gate failed"))).toBe(true);
  });
});
