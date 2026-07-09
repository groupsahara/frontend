import { Suspense } from "react";
import dynamic from "next/dynamic";

const AuditLogsClient = dynamic(() => import("./components/AuditLogsClient"));

function AuditLogsSkeleton() {
  return (
    <div className="flex w-full flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <div className="h-8 w-44 bg-muted rounded-lg animate-pulse" />
        <div className="h-4 w-80 bg-muted/60 rounded animate-pulse mt-1" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-16 bg-muted/60 rounded-xl animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
        ))}
      </div>
      <div className="h-12 bg-muted/40 rounded-xl animate-pulse" />
      <div className="h-64 bg-muted/30 rounded-2xl animate-pulse" />
    </div>
  );
}

export default function AuditLogsPage() {
  return (
    <Suspense fallback={<AuditLogsSkeleton />}>
      <AuditLogsClient />
    </Suspense>
  );
}
