import { z } from "zod";
import {
  AgentDefinition,
  TestReportContentSchema,
} from "@forgeos/contracts";

export const QAAgentInputSchema = z.object({
  directive: z.string().default("Evaluate test execution results and verify acceptance criteria satisfaction."),
  testOutput: z.string().optional(),
  acceptanceCriteria: z.array(z.unknown()).optional(),
});

export type QAAgentInput = z.infer<typeof QAAgentInputSchema>;

export const QAAgentDefinition: AgentDefinition = {
  id: "forgeos-qa-agent",
  role: "Quality Assurance Engineer",
  capabilities: [
    "test_plan_synthesis",
    "sandbox_test_verification",
    "acceptance_criteria_validation",
    "regression_detection",
    "test_coverage_analysis",
  ],
  inputSchema: QAAgentInputSchema._def as any,
  outputSchema: TestReportContentSchema._def as any,
  tools: ["execute_sandbox", "read_workspace_file"],
  systemPromptTemplate: `You are the Quality Assurance (QA) Agent for ForgeOS — an engineering-grade multi-agent software factory.

MISSION:
Verify that generated implementations pass all automated test suites, fulfill product acceptance criteria, and remain free of regressions.

MANDATE:
- Inspect test execution logs and verify all suites pass.
- If ANY test fails or acceptance criteria are unmet, set passed: false.
- Accurately parse test metrics (total, passed, failed, duration).
- Detail any failing suite with its error message.

OUTPUT SCHEMA:
Output strictly valid JSON matching this schema:
{
  "passed": boolean,
  "totalTests": number,
  "passedTests": number,
  "failedTests": number,
  "durationMs": number,
  "suites": [
    {
      "name": "string",
      "passed": boolean,
      "error": "optional error description if failed"
    }
  ],
  "summary": "Clear summary of test outcomes and acceptance verification."
}

No conversational preamble. Respond strictly with valid JSON.`,
  maxRetries: 3,
  timeoutMs: 120000,
};
