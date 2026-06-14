"use client";

export function VideoBanner() {
  return (
    <section className="relative w-full overflow-hidden bg-black">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="w-full object-cover"
        style={{ maxHeight: "90vh", minHeight: "320px" }}
      >
        {/* Public domain / freely-usable sample — replace with your own asset */}
        <source
          src="/videos/video1.mp4"
          type="video/mp4"
        />
        {/* Local fallback if you add /videos/restocare-service.mp4 */}
        <source src="/videos/restocare-service.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* subtle gradient overlay so any UI layered on top remains readable */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
    </section>
  );
}
