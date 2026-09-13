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

  it("should filter out hallucinated code issues on ProductSpecification and approve valid spec", async () => {
    // The exact reviewer output reported by the user when deepseek-coder hallucinated code issues
    const hallucinatedReport: ReviewReportContent = {
      status: "fail",
      severity: "critical",
      issues: [
        {
          file: "src/services/urlShortener.ts",
          line: 21,
          problem: "The URLShortener service does not handle rate limiting correctly",
          recommendation: "Implement rate limiting in the URLShortener service",
          severity: "critical",
        },
        {
          file: "src/services/urlShortener.ts",
          line: 26,
          problem: "The URLShortener service does not handle QR codes correctly",
          recommendation: "Implement QR code generation in the URLShortener service",
          severity: "critical",
        },
        {
          file: "src/services/urlShortener.ts",
          line: 31,
          problem: "The URLShortener service does not handle click analytics correctly",
          recommendation: "Implement click analytics in the URLShortener service",
          severity: "critical",
        },
      ],
      summary: "The URLShortener service does not handle rate limiting, QR codes, and click analytics correctly.",
    };

    const mockProvider = new MockProvider([JSON.stringify(hallucinatedReport)]);
    const runner = new AgentRunner({ aiProvider: mockProvider });
    const gateEngine = new ApprovalGateEngine(runner);

    const artifact: Artifact = {
      id: "art-pm-url",
      projectId: "proj-01",
      type: "ProductSpecification",
      version: 1,
      createdBy: "forgeos-pm-agent",
      content: {
        project: "URL Shortener Service",
        goals: ["Shorten URLs", "Track analytics"],
        actors: [{ role: "User", description: "Creates short links" }],
        features: [
          { id: "feat-1", title: "Shorten URL", description: "Generates short hash", priority: "must_have" },
        ],
        constraints: ["Must respond under 50ms"],
        acceptanceCriteria: [
          {
            featureId: "feat-1",
            scenario: "Valid URL input",
            given: "User provides long URL",
            when: "Submit button clicked",
            then: "Short URL returned",
          },
        ],
      },
      status: "draft",
    };

    const result = await gateEngine.evaluateArtifact(artifact, {
      projectId: "proj-01",
    });

    expect(result.passed).toBe(true);
    expect(result.status).toBe("approved");
    expect(result.reports.reviewReport?.status).toBe("pass");
    expect(result.reports.reviewReport?.issues).toHaveLength(0);
    expect(result.reasons).toHaveLength(0);
  });

  it("should filter out hallucinated vulnerabilities and approve valid DatabaseSchema", async () => {
    // The exact security findings reported by the user when deepseek-coder hallucinated
    const hallucinatedSecurity: SecurityReportContent = {
      status: "blocked",
      findings: [
        {
          id: "VU001",
          file: "model/URL.prisma",
          line: 4,
          category: "AUTH",
          severity: "critical",
          description: "Long URL can be easily manipulated by an attacker. This can lead to unauthorized access.",
          remediation: "Restrict access to the longUrl field to only authorized users.",
        },
        {
          id: "VU004",
          file: "model/QRCode.prisma",
          line: 1,
          category: "SECRET",
          severity: "critical",
          description: "QRCode can be easily manipulated by an attacker. This can lead to unauthorized access.",
          remediation: "Restrict access to the qrCode field to only authorized users.",
        },
      ],
      riskScore: 100,
      summary: "Security audit blocked.",
    };

    // The exact reviewer issues reported on DatabaseSchema
    const hallucinatedReview: ReviewReportContent = {
      status: "fail",
      severity: "blocker",
      issues: [
        {
          file: "prismaSchema.ts",
          line: 1,
          problem: "Model 'URL' has no unique constraint on 'id'",
          recommendation: "Add a unique constraint on 'id' in 'URL' model",
          severity: "critical",
        },
      ],
      summary: "Database schema constraint violations.",
    };

    const mockProvider = new MockProvider([
      JSON.stringify(hallucinatedSecurity),
      JSON.stringify(hallucinatedReview),
    ]);
    const runner = new AgentRunner({ aiProvider: mockProvider });
    const gateEngine = new ApprovalGateEngine(runner);

    const artifact: Artifact = {
      id: "art-db-url",
      projectId: "proj-01",
      type: "DatabaseSchema",
      version: 1,
      createdBy: "forgeos-database-agent",
      content: {
        engine: "postgresql",
        prismaSchemaFragment: `
          model URL {
            id String @id @default(uuid())
            longUrl String
            shortUrl String @unique
            createdAt DateTime @default(now())
          }
        `,
        entities: [
          {
            name: "URL",
            fields: ["id String", "longUrl String", "shortUrl String"],
            indexes: ["shortUrl"],
            relations: [],
          },
        ],
        migrationPlan: ["CREATE TABLE url (id UUID PRIMARY KEY, long_url TEXT, short_url TEXT UNIQUE)"],
        rollbackPlan: "DROP TABLE url",
      },
      status: "draft",
    };

    const result = await gateEngine.evaluateArtifact(artifact, {
      projectId: "proj-01",
    });

    expect(result.passed).toBe(true);
    expect(result.status).toBe("approved");
    expect(result.reports.securityReport?.status).toBe("secure");
    expect(result.reports.reviewReport?.status).toBe("pass");
    expect(result.reasons).toHaveLength(0);
  });

  it("should filter out hallucinated component code issues and approve valid UISpecification", async () => {
    // The exact reviewer issues reported on UISpecification
    const hallucinatedReview: ReviewReportContent = {
      status: "fail",
      severity: "blocker",
      issues: [
        {
          file: "UserTable.tsx",
          line: 12,
          problem: "UserTable component does not handle the selectedUser state correctly.",
          recommendation: "Add a method to handle the selectedUser state correctly.",
          severity: "critical",
        },
      ],
      summary: "Component methods missing.",
    };

    const mockProvider = new MockProvider([JSON.stringify(hallucinatedReview)]);
    const runner = new AgentRunner({ aiProvider: mockProvider });
    const gateEngine = new ApprovalGateEngine(runner);

    const artifact: Artifact = {
      id: "art-ui-01",
      projectId: "proj-01",
      type: "UISpecification",
      version: 1,
      createdBy: "forgeos-frontend-agent",
      content: {
        framework: "nextjs",
        components: [
          {
            name: "UserTable",
            props: ["users: User[]"],
            state: ["selectedUser: User | null"],
            description: "Displays paginated list of users",
          },
        ],
        layout: {
          pages: ["DashboardPage"],
          navigation: ["Sidebar"],
        },
        clientRoutes: ["/dashboard"],
      },
      status: "draft",
    };

    const result = await gateEngine.evaluateArtifact(artifact, {
      projectId: "proj-01",
    });

    expect(result.passed).toBe(true);
    expect(result.status).toBe("approved");
    expect(result.reports.reviewReport?.status).toBe("pass");
    expect(result.reports.reviewReport?.issues).toHaveLength(0);
    expect(result.reasons).toHaveLength(0);
  });

  it("should filter out hallucinated vulnerabilities and code review complaints and approve valid BackendImplementation specification", async () => {
    const securityReport: SecurityReportContent = {
      status: "blocked",
      summary: "Insecure POST route and password hashing in UserService.js",
      findings: [
        {
          id: "SEC-01",
          file: "UserService.js",
          line: 12,
          category: "AUTH",
          severity: "critical",
          description: "Insecure password hashing. Use bcrypt or similar for password hashing.",
          remediation: "Use bcrypt for password hashing.",
        },
        {
          id: "SEC-02",
          file: "UserService.js",
          line: 14,
          category: "INJECTION",
          severity: "critical",
          description: "Insecure method for creating user. Use Zod for input validation.",
          remediation: "Use Zod for input validation.",
        },
      ],
      riskScore: 100,
    };

    const reviewReport: ReviewReportContent = {
      status: "fail",
      severity: "blocker",
      issues: [
        {
          file: "src/services/UserService.ts",
          line: 12,
          problem: "UserService.createUser method does not validate the input data",
          severity: "critical",
          recommendation: "Add input validation in UserService.createUser method",
        },
        {
          file: "UserController.ts",
          line: 8,
          problem: "UserController.create method does not return the created user",
          severity: "critical",
          recommendation: "Add return statement in UserController.create method",
        },
      ],
      summary: "Validation and return statements missing in UserService.ts",
    };

    const testReport: TestReportContent = {
      passed: true,
      totalTests: 1,
      passedTests: 1,
      failedTests: 0,
      durationMs: 50,
      suites: [{ name: "Fastify Route Suite", passed: true }],
      summary: "All automated test suites executed successfully.",
    };

    const mockProvider = new MockProvider([
      JSON.stringify(securityReport),
      JSON.stringify(testReport),
      JSON.stringify(reviewReport),
    ]);
    const runner = new AgentRunner({ aiProvider: mockProvider });
    const gateEngine = new ApprovalGateEngine(runner);

    const artifact: Artifact = {
      id: "art-backend-01",
      projectId: "proj-01",
      type: "SourceCode",
      version: 1,
      createdBy: "forgeos-backend-agent",
      content: {
        framework: "fastify",
        routes: [
          {
            path: "/api/users",
            method: "POST",
            handlerDescription: "Validates request payload with Zod, invokes UserService.create, returns 201",
            requestSchema: "CreateUserSchema",
            responseSchema: "UserResponseSchema",
          },
        ],
        services: [
          {
            name: "UserService",
            methods: ["createUser(data)", "getUserById(id)"],
          },
        ],
        unitTests: [
          {
            testName: "should create user when valid payload provided",
            scenario: "Given valid user payload, when POST /api/users is called, then return 201 with created user",
          },
        ],
      },
      status: "draft",
    };

    const result = await gateEngine.evaluateArtifact(artifact, {
      projectId: "proj-01",
    });

    expect(result.passed).toBe(true);
    expect(result.status).toBe("approved");
    expect(result.reports.securityReport?.status).toBe("secure");
    expect(result.reports.securityReport?.findings).toHaveLength(0);
    expect(result.reports.reviewReport?.status).toBe("pass");
    expect(result.reports.reviewReport?.issues).toHaveLength(0);
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
