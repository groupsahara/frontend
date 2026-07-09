// "use client";

// import Link from "next/link";

// import {
//   CheckCircle2,
//   LayoutDashboard,
//   PlusCircle,
// } from "lucide-react";

// import {
//   Button,
//   buttonVariants,
// } from "@/components/ui/button";

// import { cn } from "@/lib/utils";

// interface SuccessScreenProps {
//   clientName: string;
//   companyName: string;
//   onAddAnother: () => void;
// }

// export function SuccessScreen({
//   clientName,
//   companyName,
//   onAddAnother,
// }: SuccessScreenProps) {
//   return (
//     <div className="flex min-h-[520px] flex-col items-center justify-center px-6 py-10">
//       {/* Success Icon */}
//       <div className="relative mb-8 flex items-center justify-center">
//         <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" />

//         <div className="relative flex h-36 w-36 items-center justify-center rounded-full border border-border bg-muted/40 shadow-2xl">
//           <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-background">
//             <CheckCircle2 className="h-9 w-9 text-primary" />
//           </div>
//         </div>
//       </div>

//       {/* Heading */}
//       <div className="flex max-w-2xl flex-col items-center gap-3 text-center">
//         <h2 className="text-4xl font-bold tracking-tight text-foreground">
//           Client Added Successfully!
//         </h2>

//         <p className="max-w-xl text-lg leading-8 text-muted-foreground">
//           <span className="font-semibold text-foreground">
//             {clientName}
//           </span>{" "}
//           from{" "}
//           <span className="font-semibold text-foreground">
//             {companyName}
//           </span>{" "}
//           has been onboarded successfully. Your team can now manage
//           leads, AI calling, workflows, and onboarding directly from
//           the dashboard.
//         </p>
//       </div>

//       {/* Buttons */}
//       <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
//         <Button
//           id="add-another-client-btn"
//           variant="outline"
//           onClick={onAddAnother}
//           className="h-12 rounded-xl px-6 text-sm font-medium shadow-sm transition-all duration-200 hover:scale-[1.02]"
//         >
//           <PlusCircle className="mr-2 h-4 w-4" />
//           Add Another Client
//         </Button>

//         <Link
//           href="/real-estate/client-management/manage-clients"
//           id="go-to-dashboard-btn"
//           className={cn(
//             buttonVariants({
//               variant: "default",
//             }),
//             "h-12 rounded-xl px-6 text-sm font-medium shadow-sm transition-all duration-200 hover:scale-[1.02]",
//           )}
//         >
//           <LayoutDashboard className="mr-2 h-4 w-4" />
//           View All Clients
//         </Link>
//       </div>
//     </div>
//   );
// }


"use client";

import Link from "next/link";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import {
  CheckCircle2,
  LayoutDashboard,
  PlusCircle,
} from "lucide-react";

import {
  Button,
  buttonVariants,
} from "@/components/ui/button";

import { cn } from "@/lib/utils";

interface SuccessScreenProps {
  clientName: string;
  companyName: string;
  onAddAnother: () => void;
}

export function SuccessScreen({
  clientName,
  companyName,
  onAddAnother,
}: SuccessScreenProps) {
  const router = useRouter();

  // AUTO REDIRECT AFTER 3 SECONDS
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push(
        "/real-estate/client-management/manage-clients",
      );
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex min-h-[520px] flex-col items-center justify-center px-6 py-10">
      {/* Success Icon */}
      <div className="relative mb-8 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" />

        <div className="relative flex h-36 w-36 items-center justify-center rounded-full border border-border bg-muted/40 shadow-2xl">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-background">
            <CheckCircle2 className="h-9 w-9 text-primary" />
          </div>
        </div>
      </div>

      {/* Heading */}
      <div className="flex max-w-2xl flex-col items-center gap-3 text-center">
        <h2 className="text-4xl font-bold tracking-tight text-foreground">
          Client Added Successfully!
        </h2>

        <p className="max-w-xl text-lg leading-8 text-muted-foreground">
          <span className="font-semibold text-foreground">
            {clientName}
          </span>{" "}
          from{" "}
          <span className="font-semibold text-foreground">
            {companyName}
          </span>{" "}
          has been onboarded successfully. Your team can now manage
          leads, AI calling, workflows, and onboarding directly from
          the dashboard.
        </p>

        {/* AUTO REDIRECT TEXT */}
        <p className="mt-2 text-sm text-muted-foreground">
          Redirecting to Manage Clients in{" "}
          <span className="font-semibold text-foreground">
            3 seconds...
          </span>
        </p>
      </div>

      {/* Buttons */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Button
          id="add-another-client-btn"
          variant="outline"
          onClick={onAddAnother}
          className="h-12 rounded-xl px-6 text-sm font-medium shadow-sm transition-all duration-200 hover:scale-[1.02]"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Another Client
        </Button>

        <Link
          href="/real-estate/client-management/manage-clients"
          id="go-to-dashboard-btn"
          className={cn(
            buttonVariants({
              variant: "default",
            }),
            "h-12 rounded-xl px-6 text-sm font-medium shadow-sm transition-all duration-200 hover:scale-[1.02]",
          )}
        >
          <LayoutDashboard className="mr-2 h-4 w-4" />
          View All Clients
        </Link>
      </div>
    </div>
  );
}