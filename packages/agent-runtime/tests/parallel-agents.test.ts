import { describe, it, expect } from "vitest";
import { MockProvider } from "@forgeos/ai-provider";
import {
  DatabaseSchemaContent,
  BackendImplementationContent,
  UISpecificationContent,
  DatabaseSchemaContentSchema,
  BackendImplementationContentSchema,
  UISpecificationContentSchema,
  AgentTask,
} from "@forgeos/contracts";
import { AgentRunner } from "../src/agent-runner.js";
import { DatabaseAgentDefinition } from "../src/agents/database.agent.js";
import { BackendAgentDefinition } from "../src/agents/backend.agent.js";
import { FrontendAgentDefinition } from "../src/agents/frontend.agent.js";

describe("Parallel Specialized Agents (Database, Backend, Frontend)", () => {
  const sampleDbSchema: DatabaseSchemaContent = {
    engine: "postgresql",
    prismaSchemaFragment: "model Item { id String @id @default(uuid()) }",
    entities: [
      {
        name: "Item",
        fields: ["id String @id", "title String", "createdAt DateTime"],
        indexes: ["title"],
        relations: [],
      },
    ],
    migrationPlan: ["Create Item table with primary key"],
    rollbackPlan: 'DROP TABLE "Item";',
  };

  const sampleBackendImpl: BackendImplementationContent = {
    framework: "fastify",
    routes: [
      {
        path: "/api/items",
        method: "GET",
        handlerDescription: "Returns all items",
        responseSchema: "ItemListSchema",
      },
    ],
    services: [
      {
        name: "ItemService",
        methods: ["listItems()", "createItem(data)"],
      },
    ],
    unitTests: [
      {
        testName: "should list items",
        scenario: "Given items in DB, when GET /api/items is called, then return 200 with items",
      },
    ],
  };

  const sampleUISpec: UISpecificationContent = {
    framework: "nextjs",
    components: [
      {
        name: "ItemList",
        description: "Renders grid of items",
        props: ["items: Item[]"],
        state: ["loading: boolean"],
      },
    ],
    layout: {
      pages: ["HomePage", "ItemsPage"],
      navigation: ["Navbar", "Footer"],
    },
    clientRoutes: ["/", "/items"],
  };

  it("should run Database Agent and produce valid DatabaseSchema artifact", async () => {
    const mockProvider = new MockProvider([JSON.stringify(sampleDbSchema)]);
    const runner = new AgentRunner({ aiProvider: mockProvider });

    const task: AgentTask = {
      id: "db-task-1",
      projectId: "proj-1",
      agentId: DatabaseAgentDefinition.id,
      input: { directive: "Create schema" },
      dependencies: [],
      status: "PENDING",
      retryCount: 0,
    };

    const context = { projectId: "proj-1", taskId: "db-task-1" };
    const result = await runner.execute(
      DatabaseAgentDefinition,
      task,
      context,
      DatabaseSchemaContentSchema,
      "DatabaseSchema"
    );

    expect(result.success).toBe(true);
    expect(result.artifact).toBeDefined();
    expect(result.artifact?.type).toBe("DatabaseSchema");
    const content = result.artifact?.content as DatabaseSchemaContent;
    expect(content.engine).toBe("postgresql");
    expect(content.entities).toHaveLength(1);
    expect(content.entities[0]?.name).toBe("Item");
  });

  it("should run Backend Agent and produce valid BackendImplementation artifact", async () => {
    const mockProvider = new MockProvider([JSON.stringify(sampleBackendImpl)]);
    const runner = new AgentRunner({ aiProvider: mockProvider });

    const task: AgentTask = {
      id: "backend-task-1",
      projectId: "proj-1",
      agentId: BackendAgentDefinition.id,
      input: { directive: "Implement API" },
      dependencies: [],
      status: "PENDING",
      retryCount: 0,
    };

    const context = { projectId: "proj-1", taskId: "backend-task-1" };
    const result = await runner.execute(
      BackendAgentDefinition,
      task,
      context,
      BackendImplementationContentSchema,
      "SourceCode"
    );

    expect(result.success).toBe(true);
    expect(result.artifact).toBeDefined();
    const content = result.artifact?.content as BackendImplementationContent;
    expect(content.framework).toBe("fastify");
    expect(content.routes).toHaveLength(1);
    expect(content.services).toHaveLength(1);
  });

  it("should run Frontend Agent and produce valid UISpecification artifact", async () => {
    const mockProvider = new MockProvider([JSON.stringify(sampleUISpec)]);
    const runner = new AgentRunner({ aiProvider: mockProvider });

    const task: AgentTask = {
      id: "frontend-task-1",
      projectId: "proj-1",
      agentId: FrontendAgentDefinition.id,
      input: { directive: "Design UI" },
      dependencies: [],
      status: "PENDING",
      retryCount: 0,
    };

    const context = { projectId: "proj-1", taskId: "frontend-task-1" };
    const result = await runner.execute(
      FrontendAgentDefinition,
      task,
      context,
      UISpecificationContentSchema,
      "UISpecification"
    );

    expect(result.success).toBe(true);
    expect(result.artifact).toBeDefined();
    expect(result.artifact?.type).toBe("UISpecification");
    const content = result.artifact?.content as UISpecificationContent;
    expect(content.framework).toBe("nextjs");
    expect(content.components).toHaveLength(1);
    expect(content.layout.pages).toContain("HomePage");
  });
});
