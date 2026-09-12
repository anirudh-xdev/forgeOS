export interface AgentCapabilityProfile {
  agentId: string;
  role: string;
  capabilities: string[];
}

export const DEFAULT_AGENT_PROFILES: AgentCapabilityProfile[] = [
  {
    agentId: "forgeos-pm-agent",
    role: "Product Manager",
    capabilities: [
      "requirements_analysis",
      "user_stories",
      "feature_prioritization",
      "spec_writing",
      "acceptance_criteria",
    ],
  },
  {
    agentId: "forgeos-architect-agent",
    role: "Architect",
    capabilities: [
      "system_design",
      "database_design",
      "api_design",
      "security_review",
      "technology_selection",
      "adr_creation",
    ],
  },
  {
    agentId: "forgeos-database-agent",
    role: "Database Engineer",
    capabilities: [
      "schema_design",
      "migration_planning",
      "sql_generation",
      "indexing_strategy",
      "prisma_schema",
      "database_modeling",
    ],
  },
  {
    agentId: "forgeos-backend-agent",
    role: "Backend Engineer",
    capabilities: [
      "api_implementation",
      "business_logic",
      "service_design",
      "unit_testing",
      "fastify_routes",
      "controller_design",
    ],
  },
  {
    agentId: "forgeos-frontend-agent",
    role: "Frontend Engineer",
    capabilities: [
      "component_architecture",
      "ui_design",
      "state_management",
      "responsive_layout",
      "react_components",
      "css_styling",
    ],
  },
  {
    agentId: "forgeos-reviewer-agent",
    role: "Code Reviewer",
    capabilities: [
      "code_audit",
      "architecture_compliance",
      "best_practices",
      "defect_detection",
      "code_review",
    ],
  },
  {
    agentId: "forgeos-qa-agent",
    role: "QA Engineer",
    capabilities: [
      "test_strategy",
      "sandbox_testing",
      "boundary_testing",
      "acceptance_verification",
      "integration_tests",
    ],
  },
  {
    agentId: "forgeos-security-agent",
    role: "Security Auditor",
    capabilities: [
      "vulnerability_assessment",
      "auth_audit",
      "injection_checks",
      "threat_modeling",
      "security_hardening",
    ],
  },
];

const KEYWORD_MAP: Record<string, string[]> = {
  requirement: ["requirements_analysis", "spec_writing"],
  product: ["requirements_analysis", "feature_prioritization"],
  spec: ["spec_writing", "acceptance_criteria"],
  story: ["user_stories"],
  architect: ["system_design", "technology_selection"],
  topology: ["system_design"],
  database: ["schema_design", "database_modeling"],
  schema: ["schema_design", "prisma_schema"],
  migration: ["migration_planning", "sql_generation"],
  sql: ["sql_generation", "indexing_strategy"],
  backend: ["api_implementation", "service_design"],
  api: ["api_design", "api_implementation"],
  endpoint: ["api_implementation", "fastify_routes"],
  route: ["fastify_routes", "api_implementation"],
  service: ["service_design", "business_logic"],
  frontend: ["component_architecture", "ui_design"],
  ui: ["ui_design", "react_components"],
  component: ["component_architecture", "react_components"],
  css: ["css_styling", "responsive_layout"],
  layout: ["responsive_layout", "ui_design"],
  review: ["code_audit", "code_review"],
  audit: ["code_audit", "defect_detection"],
  qa: ["test_strategy", "sandbox_testing"],
  test: ["test_strategy", "integration_tests"],
  security: ["vulnerability_assessment", "security_hardening"],
  auth: ["auth_audit", "vulnerability_assessment"],
  vulnerability: ["vulnerability_assessment", "threat_modeling"],
};

export class CapabilityMatcher {
  private profiles: Map<string, AgentCapabilityProfile>;

  constructor(customProfiles?: AgentCapabilityProfile[]) {
    this.profiles = new Map();
    const source = customProfiles ?? DEFAULT_AGENT_PROFILES;
    for (const p of source) {
      this.profiles.set(p.agentId, p);
    }
  }

  public registerProfile(profile: AgentCapabilityProfile): void {
    this.profiles.set(profile.agentId, profile);
  }

  public getProfile(agentId: string): AgentCapabilityProfile | undefined {
    return this.profiles.get(agentId);
  }

  public getAllProfiles(): AgentCapabilityProfile[] {
    return Array.from(this.profiles.values());
  }

  public inferCapabilitiesFromText(text: string): string[] {
    const lower = text.toLowerCase();
    const matched = new Set<string>();

    for (const [kw, caps] of Object.entries(KEYWORD_MAP)) {
      if (lower.includes(kw)) {
        for (const c of caps) {
          matched.add(c);
        }
      }
    }

    if (matched.size === 0) {
      matched.add("requirements_analysis");
    }

    return Array.from(matched);
  }

  public calculateMatchScore(required: string[], candidateCapabilities: string[]): number {
    if (required.length === 0) return 1.0;
    if (candidateCapabilities.length === 0) return 0.0;

    const candidateSet = new Set(candidateCapabilities);
    let intersectionCount = 0;

    for (const r of required) {
      if (candidateSet.has(r)) {
        intersectionCount++;
      }
    }

    // Intersection over required
    const coverage = intersectionCount / required.length;

    // Jaccard similarity
    const unionCount = new Set([...required, ...candidateCapabilities]).size;
    const jaccard = unionCount > 0 ? intersectionCount / unionCount : 0;

    // Blended score with baseline
    const score = coverage * 0.7 + jaccard * 0.3;
    return Number(Math.max(0.05, Math.min(1.0, score)).toFixed(4));
  }
}

export const defaultCapabilityMatcher = new CapabilityMatcher();
