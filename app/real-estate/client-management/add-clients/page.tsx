import { UserPlus } from "lucide-react";
import dynamic from "next/dynamic";

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-10 w-full rounded-lg bg-muted/60" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-muted/50" style={{ animationDelay: `${i * 60}ms` }} />
        ))}
      </div>
      <div className="h-12 w-40 rounded-lg bg-muted/60 ml-auto" />
    </div>
  );
}

const AddClientForm = dynamic(
  () => import("./components/add-client-form").then((m) => ({ default: m.AddClientForm })),
  { loading: () => <FormSkeleton /> },
);

export const metadata = {
  title: "Add Client",
  description: "Onboard a new client with the multi-step client form.",
};

export default function AddClientPage() {
  return (
    <div className="@container/main flex w-full flex-col gap-4 md:gap-6">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
            <UserPlus className="size-4" />
          </div>
          <h1 className="font-semibold text-xl tracking-tight">Add Client</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Complete the form below to onboard a new client to the platform.
        </p>
      </div>

      {/* Multi-step form */}
      <AddClientForm />
    </div>
  );
}
