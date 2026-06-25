export function TopProviders() {
  const reels = [
    {
      id: 1,
      handle: "🟢",
      caption: "Our live professionals",
      video: "/videos/serviceprovider1.mp4",
    },
    {
      id: 2,
      handle: "🟢",
      caption: "Our live professionals",
      video: "/videos/serviceprovider2.mp4",
    },
    {
      id: 3,
      handle: "🟢",
      caption: "Our live professionals",
      video: "/videos/serviceprovider3.mp4",
    },
    {
      id: 4,
      handle: "🟢",
      caption: "Our live professionals",
      video: "/videos/serviceprovider4.mp4",
    },
  ];

  return (
    <section className="bg-gray-50 py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10">
          <h2 className="text-xl font-bold tracking-tight text-[#0A192F] sm:text-[38px]">
            Our Top Service Providers
          </h2>
          <p className="mt-2 text-sm text-gray-500 sm:text-base">
            Watch our trusted professionals in action.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {reels.map((reel) => (
            <div
              key={reel.id}
              className="group relative aspect-9/16 overflow-hidden rounded-2xl bg-black shadow-sm transition hover:shadow-lg"
            >
              <video
                src={reel.video}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
              />

              {/* Gradient overlay for legibility */}
              <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-black/10" />

              {/* Caption */}
              <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                <p className="text-sm font-semibold text-white drop-shadow">
                  {reel.handle}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-white/80 drop-shadow">
                  {reel.caption}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
