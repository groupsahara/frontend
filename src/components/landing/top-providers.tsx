export function TopProviders() {
  const providers = [
    {
      id: 1,
      category: "ELECTRICIAN",
      name: "PowerPro Electric",
      description: "Certified electricians handling wiring, repairs, and installations with safety and efficiency guaranteed.",
      rating: "4.5",
      reviews: "220",
      image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: 2,
      category: "DEEP CLEANING",
      name: "CleanHub Pro",
      description: "Deep home and apartment cleaning with trained professionals and eco-safe products for hygiene.",
      rating: "4.0",
      reviews: "184",
      image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: 3,
      category: "TECHNICIAN",
      name: "FixPro Technicians",
      description: "Expert repair and maintenance services delivered by skilled professionals with precision and care.",
      rating: "4.8",
      reviews: "161",
      image: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: 4,
      category: "PEST CONTROL",
      name: "SafeGuard Pest Control",
      description: "Comprehensive pest management solutions to keep your home safe and bug-free year-round.",
      rating: "4.7",
      reviews: "142",
      image: "https://plus.unsplash.com/premium_photo-1682126097276-57e5d1d3f812?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8U2FmZUd1YXJkJTIwUGVzdCUyMENvbnRyb2x8ZW58MHx8MHx8fDA%3D",
    },
    {
      id: 5,
      category: "PLUMBER",
      name: "Prime Plumbers",
      description: "Reliable plumbing services for leak fixes, pipe installations, and emergency water repairs.",
      rating: "4.9",
      reviews: "310",
      image: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: 6,
      category: "PAINTER",
      name: "Pro Paint Services",
      description: "Professional interior and exterior painting services to give your home a fresh, vibrant look.",
      rating: "4.6",
      reviews: "198",
      image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80",
    },
  ];

  return (
    <section className="bg-gray-50 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10">
          <h2 className="text-3xl font-bold tracking-tight text-[#0A192F] sm:text-[38px] uppercase">
            TOP PROVIDERS
          </h2>
          <p className="mt-2 text-sm text-gray-500 sm:text-base">
            Highly rated professionals delivering quality service at your doorstep.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="relative h-48 w-full shrink-0 bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={provider.image}
                  alt={provider.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <span className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  {provider.category}
                </span>
                <h3 className="mb-3 text-lg font-bold text-gray-900">
                  {provider.name}
                </h3>
                <p className="mb-6 text-sm leading-relaxed text-gray-500 line-clamp-3">
                  {provider.description}
                </p>
                <div className="mt-auto flex justify-end">
                  <span className="text-xs font-medium text-gray-500">
                    {provider.rating} ({provider.reviews} reviews)
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
