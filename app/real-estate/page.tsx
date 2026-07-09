import dynamic from "next/dynamic";

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="h-7 w-52 rounded bg-muted animate-pulse" />
          <div className="h-4 w-72 rounded bg-muted/60 animate-pulse mt-1.5" />
        </div>
        <div className="h-9 w-32 rounded-lg bg-muted animate-pulse" />
      </div>
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-lg bg-muted/60 animate-pulse"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
      {/* Table + panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        <div className="h-64 rounded-lg bg-muted/40 animate-pulse" />
        <div className="h-64 rounded-lg bg-muted/40 animate-pulse" style={{ animationDelay: "80ms" }} />
      </div>
      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-48 rounded-lg bg-muted/30 animate-pulse"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

const DashboardContent = dynamic(() => import("./DashboardContent"), {
  loading: () => <DashboardSkeleton />,
});

export default function DashboardPage() {
  return <DashboardContent />;
}