import Reveal from "@/components/Reveal";

interface RecentWorkGalleryProps {
  images: string[];
}

const RecentWorkGallery = ({ images }: RecentWorkGalleryProps) => {
  const displayImages = images.slice(0, 9);

  if (displayImages.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="text-title text-foreground mb-5">Recent Work</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {displayImages.map((url, i) => (
          <Reveal key={url} delay={i * 60}>
            <div className="group">
              <img
                src={url}
                alt={`Recent work ${i + 1}`}
                className="rounded-xl aspect-square object-cover w-full transition-transform duration-300 group-hover:scale-[1.02]"
                loading="lazy"
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">Recent work</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
};

export default RecentWorkGallery;
