import { ForgeOSError, ValidationError } from "@forgeos/shared";
import { AgentContext, ToolDefinition } from "./types.js";

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  public register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new ForgeOSError(`Tool '${tool.name}' is already registered.`, "TOOL_DUPLICATE", 400);
    }
    this.tools.set(tool.name, tool);
  }

  public get(name: string): ToolDefinition {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new ForgeOSError(`Tool '${name}' not found in registry. Available: [${this.list().join(", ")}]`, "TOOL_NOT_FOUND", 404);
    }
    return tool;
  }

  public has(name: string): boolean {
    return this.tools.has(name);
  }

  public list(): string[] {
    return Array.from(this.tools.keys());
  }

  public async execute(
    toolName: string,
    args: unknown,
    context: AgentContext,
    allowedTools?: string[]
  ): Promise<unknown> {
    if (allowedTools && !allowedTools.includes(toolName)) {
      throw new ForgeOSError(
        `Agent is not permitted to use tool '${toolName}'. Allowed: [${allowedTools.join(", ")}]`,
        "TOOL_PERMISSION_DENIED",
        403
      );
    }

    const tool = this.get(toolName);

    // Validate parameters
    const parseResult = tool.schema.safeParse(args);
    if (!parseResult.success) {
      throw new ValidationError(`Invalid arguments for tool '${toolName}': ${parseResult.error.message}`, parseResult.error.issues);
    }

    return await tool.execute(parseResult.data, context);
  }
}
