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
    <section className="bg-white py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-24">
          {/* Left content */}
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-[#0A192F] sm:text-[38px]">
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

          {/* Right — stacked image collage */}
          <div className="relative grid grid-cols-2 gap-4">
            {/* Top-left: large main image */}
            <div className="col-span-2 overflow-hidden rounded-2xl shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/verified-providers.png"
                alt="Verified providers with quality checks"
                className="h-56 w-full object-cover lg:h-64"
              />
            </div>
            {/* Bottom-left */}
            <div className="overflow-hidden rounded-2xl shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/fast-reschedule.png"
                alt="Fast reschedule and cancellation options"
                className="h-40 w-full object-cover"
              />
            </div>
            {/* Bottom-right */}
            <div className="overflow-hidden rounded-2xl shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/realtime-updates.png"
                alt="Real-time order and booking updates"
                className="h-40 w-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
