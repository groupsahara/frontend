import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project Preview",
  description: "View project details and enquire",
};

export default function ProjectPreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
