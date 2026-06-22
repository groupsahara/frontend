import { SearchIcon, StarIcon } from "@/src/components/icons";

function BoltIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

export function HowItWorks() {
  return (
    <section className="bg-gray-50 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-[38px]">
            HOW IT WORKS
          </h2>
          <p className="mt-2 text-sm text-gray-500 sm:text-base">
            A simple and reliable process from discovery to service completion.
          </p>
        </div>

        <div className="mb-6 grid gap-6 md:grid-cols-3">
          {/* Card 1 */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-white">
              <SearchIcon className="h-5 w-5" />
            </div>
            <h3 className="mb-3 text-lg font-bold text-gray-900">Search & Discover</h3>
            <p className="text-sm leading-relaxed text-gray-500">
              Browse through a wide range of professional services and filter by category, rating, and location.
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-white">
              <BoltIcon className="h-5 w-5" />
            </div>
            <h3 className="mb-3 text-lg font-bold text-gray-900">Book Instantly</h3>
            <p className="text-sm leading-relaxed text-gray-500">
              Select your preferred date and time, then confirm your booking with transparent pricing.
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-white">
              <StarIcon className="h-5 w-5" />
            </div>
            <h3 className="mb-3 text-lg font-bold text-gray-900">Enjoy & Review</h3>
            <p className="text-sm leading-relaxed text-gray-500">
              Relax while verified professionals handle the work and share your rating after completion.
            </p>
          </div>
        </div>

        {/* Wide bottom card */}
        <div className="grid overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm md:grid-cols-[1fr_1fr]">
          <div className="relative min-h-[250px] overflow-hidden bg-[#111827] md:min-h-[300px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80"
              alt="Professional service technician at work"
              className="h-full w-full object-cover opacity-90"
              style={{ position: "absolute", inset: 0 }}
            />
            {/* subtle dark overlay for contrast */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-black/20" />
          </div>
          <div className="flex flex-col justify-center p-8 md:p-12">
            <h3 className="mb-4 text-2xl font-bold text-gray-900 sm:text-3xl">
              See how on-demand service works in real life
            </h3>
            <p className="text-sm leading-relaxed text-gray-500 sm:text-base">
              From instant booking to doorstep delivery, our on-demand workflow keeps everything simple, transparent, and fast. Watch how professionals are assigned, tracked, and completed with quality checks at every step.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
