import { redirect } from "next/navigation";

/**
 * /book/<serviceId> — the same link the app intercepts, for web visitors.
 *
 * The website already has the whole booking flow at /booking/<serviceId>;
 * this is just the short, shareable address that WhatsApp messages carry, so
 * one URL works whether or not the app is installed.
 */
export default async function BookServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const serviceId = Number(id);
  redirect(Number.isFinite(serviceId) && serviceId > 0 ? `/booking/${serviceId}` : "/");
}
