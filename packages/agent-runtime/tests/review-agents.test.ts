import { describe, it, expect } from "vitest";
import { MockProvider } from "@forgeos/ai-provider";
import {
  ReviewReportContentSchema,
  TestReportContentSchema,
  SecurityReportContentSchema,
} from "@forgeos/contracts";
import { AgentRunner } from "../src/agent-runner.js";
import { ToolRegistry } from "../src/tool-registry.js";
import {
  ReviewerAgentDefinition,
  QAAgentDefinition,
  SecurityAgentDefinition,
} from "../src/index.js";
import {
  scanSecrets,
  auditStaticSecurity,
  createScanSecretsTool,
  createAuditStaticSecurityTool,
} from "../src/tools/security-tools.js";

describe("Review System Agents & Security Tools", () => {
  describe("Security Scanning Tools", () => {
    it("should detect leaked API keys and passwords in source code", () => {
      const leakyCode = `
        const apiKey = "AKIA1234567890ABCDEF";
        const openaiKey = "sk-12345678901234567890123456789012";
        const dbPassword = "password: \\"supersecret123\\"";
      `;

      const findings = scanSecrets(leakyCode, "config.ts");
      expect(findings.length).toBeGreaterThanOrEqual(2);
      expect(findings.some((f) => f.description.includes("AWS Access Key"))).toBe(true);
      expect(findings.some((f) => f.description.includes("OpenAI"))).toBe(true);
      expect(findings.every((f) => f.category === "SECRET")).toBe(true);
    });

    it("should return no findings for clean code", () => {
      const cleanCode = `
        export const getApiKey = () => process.env.API_KEY ?? "";
        export const dbUser = process.env.DB_USER;
      `;

      const findings = scanSecrets(cleanCode, "safe.ts");
      expect(findings).toHaveLength(0);
    });

    it("should detect dangerous eval and raw SQL interpolation", () => {
      const vulnerableCode = `
        function runCode(userScript: string) {
          eval(userScript);
          const query = \`SELECT * FROM users WHERE id = \${userId}\`;
        }
      `;

      const findings = auditStaticSecurity(vulnerableCode, "query.ts");
      expect(findings.length).toBeGreaterThanOrEqual(2);
      expect(findings.some((f) => f.category === "INJECTION" && f.severity === "critical")).toBe(true);
    });

    it("should execute via ToolRegistry successfully", async () => {
      const registry = new ToolRegistry();
      registry.register(createScanSecretsTool());
      registry.register(createAuditStaticSecurityTool());

      const result = (await registry.execute(
        "scan_secrets",
        { content: "const key = 'sk_live_123456789012345678901234';" },
        { projectId: "p1", taskId: "t1" }
      )) as { count: number; findings: unknown[] };

      expect(result.count).toBe(1);
      expect(result.findings).toHaveLength(1);
    });
  });

  describe("Reviewer Agent", () => {
    it("should execute via AgentRunner and produce valid ReviewReport", async () => {
      const response = JSON.stringify({
        status: "pass",
        severity: "info",
        issues: [
          {
            file: "src/user.service.ts",
            line: 45,
            problem: "Consider adding logging for cache miss",
            recommendation: "Log debug statement when cache returns null",
            severity: "info",
          },
        ],
        summary: "Architecture and implementation fully comply with specifications. Zero blockers.",
      });

      const mockProvider = new MockProvider([response]);
      const runner = new AgentRunner({ aiProvider: mockProvider });
      const task = {
        id: "task-rev-01",
        projectId: "proj-01",
        agentId: ReviewerAgentDefinition.id,
        input: { directive: "Review backend implementation" },
        dependencies: [],
        status: "RUNNING" as const,
        retryCount: 0,
      };

      const result = await runner.execute(
        ReviewerAgentDefinition,
        task,
        { projectId: "proj-01", taskId: task.id },
        ReviewReportContentSchema,
        "ReviewReport"
      );

      expect(result.success).toBe(true);
      expect(result.artifact?.type).toBe("ReviewReport");
      const content = result.artifact?.content as any;
      expect(content.status).toBe("pass");
      expect(content.issues).toHaveLength(1);
    });
  });

  describe("QA Agent", () => {
    it("should execute via AgentRunner and produce valid TestReport", async () => {
      const response = JSON.stringify({
        passed: true,
        totalTests: 8,
        passedTests: 8,
        failedTests: 0,
        durationMs: 420,
        suites: [
          {
            name: "UserService > should create user",
            passed: true,
          },
        ],
        summary: "All 8 acceptance test suites passed in Docker sandbox without regressions.",
      });

      const mockProvider = new MockProvider([response]);
      const runner = new AgentRunner({ aiProvider: mockProvider });
      const task = {
        id: "task-qa-01",
        projectId: "proj-01",
        agentId: QAAgentDefinition.id,
        input: { directive: "Verify test suites" },
        dependencies: [],
        status: "RUNNING" as const,
        retryCount: 0,
      };

      const result = await runner.execute(
        QAAgentDefinition,
        task,
        { projectId: "proj-01", taskId: task.id },
        TestReportContentSchema,
        "TestReport"
      );

      expect(result.success).toBe(true);
      expect(result.artifact?.type).toBe("TestReport");
      const content = result.artifact?.content as any;
      expect(content.passed).toBe(true);
      expect(content.totalTests).toBe(8);
      expect(content.failedTests).toBe(0);
    });
  });

  describe("Security Agent", () => {
    it("should execute via AgentRunner and produce valid SecurityReport", async () => {
      const response = JSON.stringify({
        status: "secure",
        findings: [],
        riskScore: 0,
        summary: "Zero high or critical vulnerabilities found. Secret scans and static checks clean.",
      });

      const mockProvider = new MockProvider([response]);
      const runner = new AgentRunner({ aiProvider: mockProvider });
      const task = {
        id: "task-sec-01",
        projectId: "proj-01",
        agentId: SecurityAgentDefinition.id,
        input: { directive: "Audit source code security" },
        dependencies: [],
        status: "RUNNING" as const,
        retryCount: 0,
      };

      const result = await runner.execute(
        SecurityAgentDefinition,
        task,
        { projectId: "proj-01", taskId: task.id },
        SecurityReportContentSchema,
        "SecurityReport"
      );

      expect(result.success).toBe(true);
      expect(result.artifact?.type).toBe("SecurityReport");
      const content = result.artifact?.content as any;
      expect(content.status).toBe("secure");
      expect(content.riskScore).toBe(0);
      expect(content.findings).toHaveLength(0);
    });
  });
});
