import { describe, it, expect } from "vitest";
import { ProviderRegistry } from "../src/provider-registry.js";
import { MockProvider } from "../src/providers/mock.provider.js";
import { ProviderError } from "@forgeos/shared";

describe("ProviderRegistry", () => {
  it("should register and retrieve providers", () => {
    const registry = new ProviderRegistry();
    const mock = new MockProvider();

    registry.register(mock);
    expect(registry.has("mock")).toBe(true);
    expect(registry.get("mock")).toBe(mock);
    expect(registry.list()).toEqual(["mock"]);
  });

  it("should reject duplicate registrations", () => {
    const registry = new ProviderRegistry();
    registry.register(new MockProvider());

    expect(() => registry.register(new MockProvider())).toThrow(ProviderError);
  });

  it("should throw when retrieving unregistered provider", () => {
    const registry = new ProviderRegistry();
    expect(() => registry.get("non-existent")).toThrow(ProviderError);
  });

  it("should check health across all providers", async () => {
    const registry = new ProviderRegistry();
    registry.register(new MockProvider());

    const health = await registry.checkAllHealth();
    expect(health).toEqual({ mock: true });
  });
});
