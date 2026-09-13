import { AIProvider, GenerateRequest, GenerateResponse } from "../types.js";

export class MockProvider implements AIProvider {
  public readonly name = "mock";
  private queuedResponses: Array<string | Partial<GenerateResponse>> = [];
  private customHandler?: (request: GenerateRequest) => Promise<string> | string;
  public recordedCalls: GenerateRequest[] = [];

  constructor(defaultResponses?: Array<string | Partial<GenerateResponse>>) {
    if (defaultResponses) {
      this.queuedResponses.push(...defaultResponses);
    }
  }

  public queueResponse(response: string | Partial<GenerateResponse>): void {
    this.queuedResponses.push(response);
  }

  public setHandler(handler: (request: GenerateRequest) => Promise<string> | string): void {
    this.customHandler = handler;
  }

  public clear(): void {
    this.queuedResponses = [];
    this.customHandler = undefined;
    this.recordedCalls = [];
  }

  public async healthCheck(): Promise<boolean> {
    return true;
  }

  public async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const startTime = Date.now();
    this.recordedCalls.push(request);

    let content = "";
    let usageOverride: GenerateResponse["usage"] | undefined;

    if (this.queuedResponses.length > 0) {
      const next = this.queuedResponses.shift()!;
      if (typeof next === "string") {
        content = next;
      } else {
        content = next.content ?? "";
        usageOverride = next.usage;
      }
    } else if (this.customHandler) {
      content = await this.customHandler(request);
    } else {
      content = generateAgentMockContent(request);
    }

    const inputTokens = Math.max(1, Math.ceil((request.systemPrompt.length + request.userPrompt.length) / 4));
    const outputTokens = Math.max(1, Math.ceil(content.length / 4));

    return {
      content,
      usage: usageOverride ?? {
        inputTokens,
        outputTokens,
        costEstimateUSD: 0.0,
      },
      latencyMs: Date.now() - startTime,
      model: request.model ?? "mock-model-v1",
      provider: this.name,
    };
  }

  public async *stream(request: GenerateRequest): AsyncIterable<string> {
    const response = await this.generate(request);
    const chunks = response.content.split(" ");
    for (const chunk of chunks) {
      yield chunk + " ";
    }
  }
}

function generateAgentMockContent(request: GenerateRequest): string {
  const sys = request.systemPrompt.toLowerCase();
  const user = request.userPrompt.toLowerCase();

  // 1. Reviewer Agent
  if (sys.includes("adversarial code") || sys.includes("reviewer") || (sys === "" && user.includes("reviewreport"))) {
    return JSON.stringify({
      status: "pass",
      issues: [],
      summary: "Artifact conforms to all architectural boundaries, validation rules, and acceptance criteria."
    });
  }

  // 2. QA Agent
  if (sys.includes("quality assurance") || sys.includes("qa agent") || (sys === "" && user.includes("testreport"))) {
    return JSON.stringify({
      passed: true,
      totalTests: 5,
      passedTests: 5,
      failedTests: 0,
      durationMs: 142,
      suites: [
        { name: "Core Integration Suite", passed: true }
      ],
      summary: "All 5 automated tests passed with 100% acceptance criteria fulfillment."
    });
  }

  // 3. Security Agent
  if (sys.includes("security auditor") || (sys === "" && user.includes("securityreport"))) {
    return JSON.stringify({
      status: "secure",
      findings: [],
      riskScore: 0,
      summary: "Zero high or critical vulnerabilities found. All input schemas validated."
    });
  }

  // 4. Database Architect Agent (Checked BEFORE general architect)
  if (
    sys.includes("database architect") ||
    sys.includes("database engineer") ||
    (sys === "" && user.includes("databaseschema")) ||
    (sys === "" && user.includes("prismaschemafragment"))
  ) {
    return JSON.stringify({
      engine: "postgresql",
      prismaSchemaFragment: "model CoreEntity {\n  id String @id @default(uuid())\n  title String\n  status String @default(\"ACTIVE\")\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  @@index([status])\n}",
      entities: [
        {
          name: "CoreEntity",
          fields: ["id: String", "title: String", "status: String", "createdAt: DateTime", "updatedAt: DateTime"],
          indexes: ["status"],
          relations: []
        }
      ],
      migrationPlan: [
        "CREATE TABLE \"CoreEntity\" (id UUID PRIMARY KEY, title TEXT NOT NULL, status TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL);",
        "CREATE INDEX idx_core_entity_status ON \"CoreEntity\" (status);"
      ],
      rollbackPlan: "DROP TABLE IF EXISTS \"CoreEntity\" CASCADE;"
    });
  }

  // 5. Frontend Engineer Agent
  if (sys.includes("frontend engineer") || (sys === "" && user.includes("uispecification"))) {
    return JSON.stringify({
      framework: "nextjs",
      components: [
        {
          name: "DashboardView",
          description: "Main overview layout with interactive metric charts",
          props: ["projectId: string", "refreshInterval?: number"],
          state: ["activeTab: string", "isRefreshing: boolean"]
        }
      ],
      layout: {
        pages: ["/dashboard", "/settings", "/analytics"],
        navigation: ["Sidebar", "HeaderNav"]
      },
      clientRoutes: ["/dashboard", "/projects/:id"]
    });
  }

  // 6. Backend Engineer Agent
  if (sys.includes("backend engineer") || (sys === "" && user.includes("backendimplementation"))) {
    return JSON.stringify({
      framework: "fastify",
      routes: [
        {
          path: "/api/v1/resource",
          method: "GET",
          handlerDescription: "Fetches resource list with pagination and error handling",
          responseSchema: "ResourceListResponse"
        }
      ],
      services: [
        {
          name: "ResourceService",
          methods: ["findAll", "findById", "create"]
        }
      ],
      unitTests: [
        {
          testName: "should return 200 on valid query",
          scenario: "GET /api/v1/resource with valid session"
        }
      ]
    });
  }

  // 7. Software Architect Agent
  if (
    sys.includes("software architect") ||
    (sys === "" && user.includes("architecturespecification")) ||
    (sys.includes("architect") && !sys.includes("database"))
  ) {
    return JSON.stringify({
      architecture: {
        pattern: "Modular Monolith / Event-Driven Services",
        components: [
          { name: "API Gateway", role: "Handles ingress REST routing", technologies: ["Fastify", "TypeScript"] },
          { name: "Event Dispatcher", role: "Pub/Sub message router", technologies: ["Redis", "Socket.IO"] }
        ]
      },
      database: {
        engine: "PostgreSQL 16",
        entities: ["User", "Project", "Artifact", "Task"],
        strategy: "Normalized relational schema with foreign key indexes"
      },
      apis: [
        {
          endpoint: "/api/v1/health",
          method: "GET",
          description: "System health and liveness check",
          responseSchemaName: "HealthResponse"
        },
        {
          endpoint: "/api/v1/projects",
          method: "POST",
          description: "Initialize a new project execution",
          requestSchemaName: "CreateProjectRequest",
          responseSchemaName: "CreateProjectResponse"
        }
      ],
      decisions: [
        {
          title: "ADR-001: Relational Persistence",
          decision: "Adopt PostgreSQL 16 with Prisma ORM",
          alternatives: ["MongoDB", "SQLite"],
          tradeoffs: "Strong relational integrity at the cost of strict schema migrations"
        }
      ]
    });
  }

  // 8. Product Manager Agent
  if (
    sys.includes("product manager") ||
    sys.includes("pm agent") ||
    (sys === "" && user.includes("productspecification"))
  ) {
    return JSON.stringify({
      project: "ForgeOS Mock Deliverable",
      goals: ["Deliver robust microservices architecture", "Ensure 100% test coverage and schema validation"],
      actors: [
        { role: "System Operator", description: "Configures and monitors pipeline execution" },
        { role: "End User", description: "Interacts with realtime dashboard views" }
      ],
      features: [
        {
          id: "FEAT-001",
          title: "Core Service Engine",
          description: "High-throughput message broker and event dispatcher",
          priority: "must_have"
        },
        {
          id: "FEAT-002",
          title: "Realtime Dashboard",
          description: "Live visualization and monitoring interface",
          priority: "must_have"
        }
      ],
      constraints: ["PostgreSQL 16 relational persistence", "Node.js 20+ runtime"],
      acceptanceCriteria: [
        {
          featureId: "FEAT-001",
          scenario: "Service startup",
          given: "Database connection is healthy",
          when: "Server boots",
          then: "Emits ready signal on configured port"
        }
      ]
    });
  }

  // Default deterministic fallback
  return JSON.stringify({
    project: "ForgeOS Mock Deliverable",
    status: "success",
    mockGeneratedAt: new Date().toISOString(),
  });
}
