import { describe, it, expect } from "vitest";
import { z } from "zod";
import { ToolRegistry } from "../src/tool-registry.js";
import { ToolDefinition } from "../src/types.js";
import { ForgeOSError, ValidationError } from "@forgeos/shared";

describe("ToolRegistry", () => {
  const sampleTool: ToolDefinition<{ query: string }, { result: string }> = {
    name: "search_docs",
    description: "Search internal docs",
    permission: "READ",
    schema: z.object({
      query: z.string().min(3),
    }),
    execute: async (args) => {
      return { result: `Found results for ${args.query}` };
    },
  };

  it("should register and execute tools with validated arguments", async () => {
    const registry = new ToolRegistry();
    registry.register(sampleTool);

    expect(registry.has("search_docs")).toBe(true);

    const result = await registry.execute(
      "search_docs",
      { query: "authentication" },
      { projectId: "p-1", taskId: "t-1" }
    );

    expect(result).toEqual({ result: "Found results for authentication" });
  });

  it("should reject execution if tool arguments fail schema validation", async () => {
    const registry = new ToolRegistry();
    registry.register(sampleTool);

    await expect(
      registry.execute(
        "search_docs",
        { query: "a" }, // Invalid: min length 3
        { projectId: "p-1", taskId: "t-1" }
      )
    ).rejects.toThrow(ValidationError);
  });

  it("should reject tool if not in allowedTools list", async () => {
    const registry = new ToolRegistry();
    registry.register(sampleTool);

    await expect(
      registry.execute(
        "search_docs",
        { query: "auth" },
        { projectId: "p-1", taskId: "t-1" },
        ["read_db"] // "search_docs" not allowed
      )
    ).rejects.toThrow(ForgeOSError);
  });
});
