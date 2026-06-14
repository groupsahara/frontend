export function PartnerCTA() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="flex flex-col items-center justify-between gap-6 rounded-2xl bg-[#2C3440] px-8 py-10 shadow-xl md:flex-row md:px-12 md:py-12">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            BECOME A SERVICE PARTNER
          </h2>
          <p className="mt-2 text-sm text-gray-300 sm:text-base">
            Grow your business by listing your services and receiving quality bookings daily.
          </p>
        </div>
        <button className="shrink-0 rounded-lg bg-[#FA5C7C] px-8 py-3.5 text-sm font-bold text-white transition hover:bg-[#FF4A6D]">
          Get Started
        </button>
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
          <h2 className="text-2xl font-bold tracking-tight text-[#0A192F] sm:text-3xl uppercase">
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
