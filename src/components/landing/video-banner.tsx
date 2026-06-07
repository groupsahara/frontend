export function VideoBanner() {
  return (
    <section className="relative flex h-[400px] w-full items-center justify-center sm:h-[500px]">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      >
        {/* Dummy MP4 video of a commercial kitchen */}
        <source
          src="https://assets.mixkit.co/videos/preview/mixkit-chef-cooking-in-a-commercial-kitchen-41804-large.mp4"
          type="video/mp4"
        />
        Your browser does not support the video tag.
      </video>

      {/* Dark overlay to ensure text contrast and match the deep black look */}
      <div className="absolute inset-0 bg-black/80"></div>

      {/* Centered Text Content */}
      <div className="relative z-10 px-4 text-center">
        <h2 className="mb-4 text-4xl font-bold tracking-[0.15em] text-white sm:text-5xl uppercase">
          RESTOCARE
        </h2>
        <p className="text-base font-medium text-gray-300 sm:text-lg">
          Premium Restaurant Services & Maintenance
        </p>
      </div>
    </section>
  );
}
