import React from "react";
import { DashboardView } from "./components/DashboardView";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Project f4e7a05b</h1>
        <p className="text-slate-400 mt-2">Build a high-performance inventory manager with PostgreSQL and Redis</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DashboardView />
      </div>
    </main>
  );
}
