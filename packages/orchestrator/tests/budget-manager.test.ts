import { describe, it, expect, vi } from "vitest";
import { BudgetManager } from "../src/budget/budget-manager.js";
import { CostEstimator, MetricsRegistry } from "@forgeos/logger";
import type { ProjectRepository } from "@forgeos/database";

describe("BudgetManager (Phase 11)", () => {
  const metrics = new MetricsRegistry(false);
  const estimator = new CostEstimator();

  it("should permit execution when within token and cost limits", async () => {
    const mockRepo = {
      getProjectBudget: vi.fn().mockResolvedValue({
        id: "budget-1",
        projectId: "proj-1",
        maxTokens: 500000,
        usedTokens: 10000,
        maxCost: 10.0,
        usedCost: 0.25,
        maxRuntimeMinutes: 60,
      }),
    } as unknown as ProjectRepository;

    const manager = new BudgetManager(mockRepo, metrics, estimator);
    const check = await manager.checkBudget("proj-1");

    expect(check.allowed).toBe(true);
    expect(check.budget?.isExceeded).toBe(false);
  });

  it("should halt execution when token quota is exceeded", async () => {
    const mockRepo = {
      getProjectBudget: vi.fn().mockResolvedValue({
        id: "budget-2",
        projectId: "proj-2",
        maxTokens: 50000,
        usedTokens: 50001,
        maxCost: 10.0,
        usedCost: 1.0,
        maxRuntimeMinutes: 60,
      }),
    } as unknown as ProjectRepository;

    const manager = new BudgetManager(mockRepo, metrics, estimator);
    const check = await manager.checkBudget("proj-2");

    expect(check.allowed).toBe(false);
    expect(check.reason).toContain("Token quota exceeded");
    expect(check.budget?.isExceeded).toBe(true);
  });

  it("should halt execution when monetary cost quota is exceeded", async () => {
    const mockRepo = {
      getProjectBudget: vi.fn().mockResolvedValue({
        id: "budget-3",
        projectId: "proj-3",
        maxTokens: 500000,
        usedTokens: 10000,
        maxCost: 5.0,
        usedCost: 5.5,
        maxRuntimeMinutes: 60,
      }),
    } as unknown as ProjectRepository;

    const manager = new BudgetManager(mockRepo, metrics, estimator);
    const check = await manager.checkBudget("proj-3");

    expect(check.allowed).toBe(false);
    expect(check.reason).toContain("Cost quota exceeded");
    expect(check.budget?.isExceeded).toBe(true);
  });

  it("should calculate cost and update repository on usage recording", async () => {
    const mockIncrement = vi.fn().mockResolvedValue({
      id: "budget-4",
      projectId: "proj-4",
      maxTokens: 100000,
      usedTokens: 15000,
      maxCost: 10.0,
      usedCost: 0.05,
    });

    const mockRepo = {
      incrementBudgetUsage: mockIncrement,
    } as unknown as ProjectRepository;

    const manager = new BudgetManager(mockRepo, metrics, estimator);
    const result = await manager.recordUsage("proj-4", "gpt-4o", 10000, 5000);

    // 10k input (0.025) + 5k output (0.05) = 0.075
    expect(result.costUSD).toBe(0.075);
    expect(mockIncrement).toHaveBeenCalledWith("proj-4", 15000, 0.075);
    expect(result.isExceeded).toBe(false);
  });
});
