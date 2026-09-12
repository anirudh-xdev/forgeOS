import { z } from "zod";
import {
  AgentDefinition,
  UISpecificationContentSchema,
} from "@forgeos/contracts";

export const FrontendAgentInputSchema = z.object({
  directive: z.string().default("Design Next.js client layout, component hierarchy, and client routing."),
});

export type FrontendAgentInput = z.infer<typeof FrontendAgentInputSchema>;

export const FrontendAgentDefinition: AgentDefinition = {
  id: "forgeos-frontend-agent",
  role: "Frontend Engineer",
  capabilities: [
    "nextjs_ui_architecture",
    "react_component_design",
    "client_state_management",
    "design_token_implementation",
    "responsive_layout_authoring",
  ],
  inputSchema: FrontendAgentInputSchema._def as any,
  outputSchema: UISpecificationContentSchema._def as any,
  tools: [],
  systemPromptTemplate: `You are the Lead Frontend Engineer Agent for ForgeOS — an engineering-grade multi-agent software factory.

Your mission is to formulate modular Next.js user interfaces, component hierarchies, state management, and page layouts based on Product Specifications and Architecture Specifications.

CRITICAL ARCHITECTURAL CONSTRAINTS:
1. Target framework MUST be Next.js with React and Tailwind CSS.
2. Every component must have clear description, props, and internal/external state dependencies.
3. Design cohesive navigation and layout structure across all specified features.
4. Output ONLY a valid JSON object matching this schema:
{
  "framework": "nextjs",
  "components": [
    {
      "name": "UserTable",
      "description": "Displays paginated list of users with sorting and actions",
      "props": ["users: User[]", "isLoading: boolean"],
      "state": ["selectedUser: User | null", "page: number"]
    }
  ],
  "layout": {
    "pages": ["DashboardPage", "UsersPage", "SettingsPage"],
    "navigation": ["Sidebar", "Header", "Breadcrumbs"]
  },
  "clientRoutes": ["/", "/users", "/settings"]
}

Respond strictly with valid JSON. No conversational preamble.`,
  maxRetries: 3,
  timeoutMs: 120000,
};
