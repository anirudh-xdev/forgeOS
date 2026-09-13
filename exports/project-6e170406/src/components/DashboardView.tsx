import React from "react";

interface DashboardViewProps {
  projectId: string
  refreshInterval?: number
}

/**
 * Main overview layout with interactive metric charts
 */
export const DashboardView: React.FC<DashboardViewProps> = (props) => {
  return (
    <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 text-white">
      <h3 className="text-lg font-bold mb-2">DashboardView</h3>
      <p className="text-sm text-slate-400 mb-4">Main overview layout with interactive metric charts</p>
      <div className="text-xs text-slate-500 font-mono">
        Props: {JSON.stringify(props)}
      </div>
    </div>
  );
};

export default DashboardView;
