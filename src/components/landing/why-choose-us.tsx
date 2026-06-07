function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function WhyChooseUs() {
  const points = [
    "Verified providers with quality checks",
    "Real-time order and booking updates",
    "Secure checkout and easy support",
    "Fast reschedule and cancellation options",
  ];

  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-24">
          {/* Left content */}
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-[#0A192F] sm:text-4xl">
              WHY CUSTOMERS CHOOSE US
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-500 max-w-lg">
              We combine trusted professionals, verified reviews, transparent pricing, and premium customer support.
            </p>

            <ul className="mt-8 space-y-4">
              {points.map((point, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="shrink-0 text-emerald-500">
                    <CheckIcon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium text-gray-600 sm:text-base">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right image */}
          <div className="relative overflow-hidden rounded-[2rem] shadow-sm bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80"
              alt="Customer service"
              className="h-full w-full object-cover aspect-video lg:aspect-[4/3]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
