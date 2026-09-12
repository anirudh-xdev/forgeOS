import { z } from "zod";
import { randomUUID } from "node:crypto";
import { SecurityFinding } from "@forgeos/contracts";
import { ToolDefinition } from "../types.js";

interface SecretPattern {
  name: string;
  pattern: RegExp;
  severity: "critical" | "high" | "medium";
  description: string;
  remediation: string;
}

const SECRET_PATTERNS: SecretPattern[] = [
  {
    name: "AWS Access Key",
    pattern: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
    severity: "critical",
    description: "Hardcoded AWS Access Key ID detected.",
    remediation: "Move credentials to environment variables or IAM role configuration.",
  },
  {
    name: "GitHub Token",
    pattern: /gh[pousr]_[A-Za-z0-9_]{36,255}/g,
    severity: "critical",
    description: "Hardcoded GitHub Personal Access Token detected.",
    remediation: "Store GitHub tokens in environment secrets, never in source code.",
  },
  {
    name: "Stripe API Key",
    pattern: /sk_live_[0-9a-zA-Z]{24,}/g,
    severity: "critical",
    description: "Hardcoded Stripe live secret key detected.",
    remediation: "Store Stripe secret keys in secure environment variables.",
  },
  {
    name: "OpenAI API Key",
    pattern: /(?:sk-[a-zA-Z0-9]{32,}|sk-proj-[a-zA-Z0-9_-]{40,})/g,
    severity: "critical",
    description: "Hardcoded OpenAI API key detected.",
    remediation: "Load OpenAI API keys from runtime environment variables.",
  },
  {
    name: "Private Cryptographic Key",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
    severity: "critical",
    description: "Hardcoded private cryptographic key header detected.",
    remediation: "Store private keys in a secret vault or load from encrypted files at runtime.",
  },
  {
    name: "Slack Token",
    pattern: /xox[baprs]-[0-9a-zA-Z]{10,48}/g,
    severity: "high",
    description: "Hardcoded Slack API/bot token detected.",
    remediation: "Inject Slack tokens via environment configuration.",
  },
  {
    name: "Hardcoded Secret Assignment",
    pattern: /(?:password|passwd|api_key|apikey|app_secret|client_secret)\s*[:=]\s*["'][^"'\s]{6,}["']/gi,
    severity: "high",
    description: "Hardcoded password or secret string literal assigned directly.",
    remediation: "Inject credentials via environment variables (e.g., process.env).",
  },
];

interface StaticPattern {
  name: string;
  pattern: RegExp;
  severity: "critical" | "high" | "medium";
  category: string;
  description: string;
  remediation: string;
}

const STATIC_PATTERNS: StaticPattern[] = [
  {
    name: "Arbitrary Code Execution (eval)",
    pattern: /\beval\s*\(/g,
    severity: "critical",
    category: "INJECTION",
    description: "Dangerous use of 'eval()' allows arbitrary remote code execution.",
    remediation: "Replace eval with safe JSON parsing or explicit logic dispatch.",
  },
  {
    name: "Command Injection (exec)",
    pattern: /(?:child_process|cp)\.(?:exec|execSync)\s*\(/g,
    severity: "critical",
    category: "SYSTEM",
    description: "Direct invocation of shell execution (`child_process.exec`) poses command injection risks.",
    remediation: "Use execFile or spawn with explicitly parameterized argument arrays.",
  },
  {
    name: "Prototype Pollution",
    pattern: /(?:__proto__|constructor\.prototype)/g,
    severity: "high",
    category: "SECURITY",
    description: "Potential prototype pollution detected via object property access.",
    remediation: "Use Object.create(null) or Map data structures to avoid prototype manipulation.",
  },
  {
    name: "Raw SQL Injection Pattern",
    pattern: /(?:SELECT|INSERT|UPDATE|DELETE)\s+.*?\$\{/gi,
    severity: "critical",
    category: "INJECTION",
    description: "Raw SQL query constructed via dynamic string template interpolation.",
    remediation: "Use parameterized queries or Prisma ORM query builders to prevent SQL injection.",
  },
];

/**
 * Pure function to scan content for leaked credentials and secrets
 */
export function scanSecrets(content: string, filename = "source"): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (typeof line !== "string") continue;
    for (const rule of SECRET_PATTERNS) {
      // Reset regex index if global
      rule.pattern.lastIndex = 0;
      if (rule.pattern.test(line)) {
        findings.push({
          id: `SEC-SECRET-${randomUUID().slice(0, 8)}`,
          severity: rule.severity,
          category: "SECRET",
          file: filename,
          line: i + 1,
          description: rule.description,
          remediation: rule.remediation,
        });
      }
    }
  }

  return findings;
}

/**
 * Pure function for static analysis of dangerous system calls and injection flaws
 */
export function auditStaticSecurity(content: string, filename = "source"): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (typeof line !== "string") continue;
    for (const rule of STATIC_PATTERNS) {
      rule.pattern.lastIndex = 0;
      if (rule.pattern.test(line)) {
        findings.push({
          id: `SEC-STATIC-${randomUUID().slice(0, 8)}`,
          severity: rule.severity,
          category: rule.category,
          file: filename,
          line: i + 1,
          description: rule.description,
          remediation: rule.remediation,
        });
      }
    }
  }

  return findings;
}

/**
 * Tool Definition for Agents to scan for secrets
 */
export function createScanSecretsTool(): ToolDefinition<
  { content: string; filename?: string },
  { findings: SecurityFinding[]; count: number }
> {
  return {
    name: "scan_secrets",
    description: "Scan code or text content for hardcoded API keys, secrets, private keys, and passwords.",
    permission: "READ",
    schema: z.object({
      content: z.string().min(1),
      filename: z.string().optional(),
    }),
    async execute(args) {
      const findings = scanSecrets(args.content, args.filename);
      return { findings, count: findings.length };
    },
  };
}

/**
 * Tool Definition for Agents to audit static security patterns
 */
export function createAuditStaticSecurityTool(): ToolDefinition<
  { content: string; filename?: string },
  { findings: SecurityFinding[]; count: number }
> {
  return {
    name: "audit_static_security",
    description: "Audit source code for dangerous system calls (eval, exec) and raw SQL injection templates.",
    permission: "READ",
    schema: z.object({
      content: z.string().min(1),
      filename: z.string().optional(),
    }),
    async execute(args) {
      const findings = auditStaticSecurity(args.content, args.filename);
      return { findings, count: findings.length };
    },
  };
}
