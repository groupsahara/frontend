export function PartnerCTA() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl bg-[#070b16] px-6 py-16 shadow-2xl sm:px-10 sm:py-20 md:py-24">
        {/* Base gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0c1326] via-[#0a1020] to-[#070b16]" />

        {/* Glowing top arc */}
        <div className="pointer-events-none absolute left-1/2 top-0 h-[560px] w-[1200px] max-w-[150%] -translate-x-1/2 -translate-y-[86%] rounded-[50%] border border-blue-400/30 [box-shadow:0_40px_140px_rgba(59,130,246,0.25)]" />

        {/* Perspective grid floor */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 opacity-40 [background-image:linear-gradient(to_right,rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:44px_44px] [transform:perspective(320px)_rotateX(62deg)] [transform-origin:bottom]" />

        {/* Ambient center glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-3xl" />

        {/* Content */}
        <div className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-[44px] sm:leading-[1.1]">
            Become a Service Partner
          </h2>
          <p className="mt-4 max-w-xl text-sm text-gray-400 sm:text-base">
            Grow your business by listing your services and receiving quality bookings daily.
          </p>
          <button className="group mt-8 inline-flex items-center gap-2 rounded-full bg-orange-500 px-8 py-3.5 text-sm font-bold text-white transition hover:bg-orange-400 [box-shadow:0_0_45px_rgba(249,115,22,0.55)]">
            Get Started
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </button>
          <p className="mt-5 text-xs text-gray-500">
            Free to join. No hidden fees. Start receiving bookings today.
          </p>
        </div>
      </div>
    </div>
  );
}

export function Testimonials() {
  const reviews = [
    {
      id: 1,
      title: '"Excellent Experience"',
      content: "Booking was smooth and the professional arrived on time. Highly recommended for busy families.",
      avatar: "https://randomuser.me/api/portraits/women/44.jpg",
    },
    {
      id: 2,
      title: '"Very Convenient"',
      content: "I found and booked an electrician in under five minutes. The app flow is fast and very clear.",
      avatar: "https://randomuser.me/api/portraits/men/32.jpg",
    },
    {
      id: 3,
      title: '"Best Service Quality"',
      content: "The quality of work was top-notch and support team was quick to respond throughout the process.",
      avatar: "https://randomuser.me/api/portraits/women/68.jpg",
    },
    {
      id: 4,
      title: '"Will Book Again"',
      content: "Transparent pricing, clean UI, and reliable providers. I already booked my second service.",
      avatar: "https://randomuser.me/api/portraits/men/46.jpg",
    },
  ];

  return (
    <section className="bg-white pb-20 pt-4">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10">
          <h2 className="text-3xl font-bold tracking-tight text-[#0A192F] sm:text-[38px] uppercase">
            WHAT OUR CUSTOMERS SAY
          </h2>
          <p className="mt-2 text-sm text-gray-500 sm:text-base">
            Real feedback from users who book services daily on our platform.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
            >
              <div className="mb-4 h-12 w-12 overflow-hidden rounded-full bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={review.avatar}
                  alt="Customer avatar"
                  className="h-full w-full object-cover"
                />
              </div>
              <h3 className="mb-2 text-base font-bold text-gray-900">
                {review.title}
              </h3>
              <p className="text-sm leading-relaxed text-gray-500">
                {review.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
