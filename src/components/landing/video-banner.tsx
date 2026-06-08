export function VideoBanner() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      {/* Video shown normally */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="aspect-video w-full rounded-2xl object-cover shadow-sm"
      >
        {/* Restaurant service professionals at work (local asset) */}
        <source src="/videos/restocare-service.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </section>
  );
}
