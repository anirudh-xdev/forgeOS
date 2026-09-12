# TypeScript Standards & Contract Enforcement
*Guidelines for strict type safety, schema validation, and monorepo project references.*

---

## 1. Compiler Configuration & Strictness

All packages in the ForgeOS monorepo must inherit from a common `tsconfig.base.json` with strict compilation settings:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

---

## 2. Prohibition of `any`

1. **`any` is Forbidden**: The use of `any` is strictly prohibited anywhere in production or testing code.
2. **Handling Dynamic or Unknown Data**:
   - Use `unknown` for unstructured or external data (such as raw LLM outputs, incoming HTTP bodies, or message payloads).
   - Immediately narrow `unknown` data using **Zod schemas** or custom type predicates before accessing properties:
     ```typescript
     // FORBIDDEN:
     const data: any = JSON.parse(rawOutput);
     console.log(data.features[0]);

     // REQUIRED:
     const parsed = JSON.parse(rawOutput);
     const validated = ProductSpecificationSchema.parse(parsed);
     console.log(validated.features[0]);
     ```

---

## 3. Schema-First Contracts with Zod

All data structures that cross module, agent, process, or network boundaries must be defined as Zod schemas within `packages/contracts`:

1. **Single Source of Truth**: Define the Zod schema first; infer the TypeScript type from the schema:
   ```typescript
   import { z } from "zod";

   export const TaskStatusSchema = z.enum([
     "PENDING",
     "RUNNING",
     "WAITING",
     "COMPLETED",
     "FAILED",
     "RETRYING",
     "BLOCKED",
     "CANCELLED",
   ]);

   export type TaskStatus = z.infer<typeof TaskStatusSchema>;

   export const AgentTaskSchema = z.object({
     id: z.string().uuid(),
     projectId: z.string().uuid(),
     agentId: z.string().min(1),
     input: z.unknown(),
     expectedOutput: z.unknown(),
     dependencies: z.array(z.string().uuid()),
     status: TaskStatusSchema,
   });

   export type AgentTask = z.infer<typeof AgentTaskSchema>;
   ```

2. **Error Handling**: Always handle `ZodError` explicitly and format issues into readable error contexts for agent retry loops.

---

## 4. Discriminated Unions for Events & Artifacts

1. **Domain Events**: Use discriminated unions on the `type` property:
   ```typescript
   export const ProjectCreatedEventSchema = z.object({
     id: z.string().uuid(),
     type: z.literal("PROJECT_CREATED"),
     projectId: z.string().uuid(),
     timestamp: z.string().datetime(),
     payload: z.object({ requirement: z.string() }),
   });

   export const TaskCompletedEventSchema = z.object({
     id: z.string().uuid(),
     type: z.literal("TASK_COMPLETED"),
     projectId: z.string().uuid(),
     taskId: z.string().uuid(),
     timestamp: z.string().datetime(),
     payload: z.object({ artifactId: z.string().uuid() }),
   });

   export const DomainEventSchema = z.discriminatedUnion("type", [
     ProjectCreatedEventSchema,
     TaskCompletedEventSchema,
     // ...
   ]);
   ```

2. **Exhaustive Type Checking**: In switch statements processing events or task statuses, enforce compile-time exhaustiveness using `assertNever`:
   ```typescript
   export function assertNever(x: never): never {
     throw new Error(`Unexpected object: ${JSON.stringify(x)}`);
   }
   ```
