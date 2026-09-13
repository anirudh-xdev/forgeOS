import React from "react";
import { DashboardView } from "./components/DashboardView";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Project 6e170406</h1>
        <p className="text-slate-400 mt-2">Build a multi-tenant SaaS project management platform for small software teams.

The platform should allow organizations to create workspaces, invite team members, create projects, manage tasks, assign tasks to users, track task status and priority, and view project progress through a modern dashboard.

### Technical requirements

* Backend: Node.js + Fastify
* Database: PostgreSQL
* ORM: Prisma
* Frontend: Next.js + TypeScript
* Styling: Tailwind CSS
* Animations: Framer Motion
* API: REST
* Validation: Zod
* Authentication: secure session-based or JWT authentication
* Realtime updates: WebSockets where useful
* Local development: Docker Compose
* Testing: Vitest + Playwright

### Core features

1. User registration and authentication
2. Organization/workspace creation
3. Team member invitations
4. Role-based permissions
5. Project creation and management
6. Task CRUD
7. Task assignment
8. Task priority and status
9. Project progress tracking
10. Dashboard with project/task statistics
11. Activity history
12. Search and filtering
13. Responsive UI
14. Loading, empty, and error states
15. Basic audit logging

### Engineering requirements

Design the system with clear separation between:

* Product requirements
* Architecture
* Database schema
* API contracts
* Backend implementation
* Frontend implementation
* Testing
* Security review

The application should be developed incrementally rather than generated as one large implementation.

Produce structured artifacts for each stage and validate each stage before moving to the next one.

The final application should be runnable locally with a single documented development workflow.
</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DashboardView />
      </div>
    </main>
  );
}
