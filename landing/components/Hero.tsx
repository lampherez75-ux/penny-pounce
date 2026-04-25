import Image from "next/image";
import Link from "next/link";

const featuredIn = [
  { name: "TechCrunch", className: "font-bold tracking-tight" },
  { name: "Product Hunt", className: "font-semibold" },
  { name: "Forbes", className: "font-bold italic" },
  { name: "Lifehacker", className: "font-medium" },
];

const brands = ["Amazon", "Target", "Walmart", "Best Buy", "Nike", "eBay", "Etsy", "Costco"];

const brandColors: Record<string, string> = {
  Amazon: "#FF9900",
  Target: "#CC0000",
  Walmart: "#0071CE",
  "Best Buy": "#003087",
  Nike: "#111111",
  eBay: "#E53238",
  Etsy: "#F1641E",
  Costco: "#005DAA",
};

export default function Hero() {
  return (
    <section className="bg-[#fdf7ed] overflow-hidden">
      {/* Main hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left: copy */}
          <div className="flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 bg-[#fdf1dc] border border-[#f2d3a4] rounded-full px-4 py-1.5 w-fit">
              <span className="w-2 h-2 rounded-full bg-[#f4a824] animate-pulse" />
              <span className="text-xs font-semibold text-[#7a1740] tracking-wide uppercase">
                Free Browser Extension
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight text-[#3b0820]">
              Jump on{" "}
              <span className="shimmer-text">Savings</span>
              <br />
              Instantly
            </h1>

            <p className="text-base sm:text-lg text-[#6b4c2c] leading-relaxed max-w-md">
              The free browser extension that automatically finds and applies
              the best coupon codes while you shop online. Save time and money
              effortlessly.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3">
              <a
                href="https://chrome.google.com/webstore"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#f4a824] hover:bg-[#e09718] text-[#3b0820] font-bold px-6 py-3 rounded-full shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 14.5v-9l7 4.5-7 4.5z" />
                </svg>
                Add to Chrome — Free
              </a>
              <Link
                href="/features"
                className="inline-flex items-center gap-2 border-2 border-[#7a1740] text-[#7a1740] font-bold px-6 py-3 rounded-full hover:bg-[#7a1740] hover:text-[#fdf7ed] transition-all duration-200"
              >
                Learn More
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex items-center gap-4 text-sm text-[#6b4c2c]">
              <span className="flex items-center gap-1">
                <span className="text-[#f4a824]">★★★★★</span>
                <span className="font-semibold">4.9</span>
              </span>
              <span className="w-px h-4 bg-[#f2d3a4]" />
              <span>10,000+ active shoppers</span>
              <span className="w-px h-4 bg-[#f2d3a4]" />
              <span>Free forever</span>
            </div>
          </div>

          {/* Right: fox mascot */}
          <div className="flex justify-center md:justify-end relative">
            <div className="relative w-72 h-72 sm:w-96 sm:h-96">
              {/* Decorative gold coin rings */}
              <div className="absolute top-6 right-8 w-14 h-14 rounded-full bg-[#f4a824] opacity-20 blur-md" />
              <div className="absolute bottom-10 left-6 w-10 h-10 rounded-full bg-[#7a1740] opacity-15 blur-sm" />
              {/* Sparkle dots */}
              {[
                "top-4 left-16",
                "top-12 right-12",
                "bottom-16 right-6",
                "bottom-8 left-20",
              ].map((pos, i) => (
                <span
                  key={i}
                  className={`absolute ${pos} w-2 h-2 rounded-full bg-[#f4a824] opacity-70`}
                  style={{ animationDelay: `${i * 0.4}s` }}
                />
              ))}
              <Image
                src="/fox-jumping.png"
                alt="PennyPounce fox jumping on a gold coin"
                fill
                className="object-contain float-anim drop-shadow-xl"
                priority
              />
            </div>
          </div>
        </div>
      </div>

      {/* Featured In strip */}
      <div className="border-t border-b border-[#f2d3a4] bg-[#fdf1dc]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
            <span className="text-xs font-semibold text-[#6b4c2c] uppercase tracking-widest whitespace-nowrap">
              As Featured In
            </span>
            <div className="w-px h-5 bg-[#f2d3a4] hidden sm:block" />
            {featuredIn.map(({ name, className }) => (
              <span
                key={name}
                className={`text-sm text-[#3b0820] opacity-70 hover:opacity-100 transition-opacity ${className}`}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Save on brands strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center mb-5">
          <span className="text-sm font-bold text-[#7a1740] uppercase tracking-widest">
            Save on 10,000+ Brands
          </span>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {brands.map((brand) => (
            <span
              key={brand}
              className="px-4 py-2 rounded-full border border-[#f2d3a4] bg-white text-xs font-bold shadow-sm"
              style={{ color: brandColors[brand] }}
            >
              {brand}
            </span>
          ))}
          <span className="px-4 py-2 rounded-full border border-[#f2d3a4] bg-white text-xs font-semibold text-[#6b4c2c] shadow-sm">
            + thousands more
          </span>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-[#fdf1dc] border-t border-[#f2d3a4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-center text-[#3b0820] mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                icon: "🛒",
                title: "Shop Normally",
                desc: "Browse your favorite stores just like you always do.",
              },
              {
                step: "2",
                icon: "🦊",
                title: "Penn Finds Deals",
                desc: "PennyPounce detects the store and searches for active coupons instantly.",
              },
              {
                step: "3",
                icon: "💰",
                title: "Save Automatically",
                desc: "The best code is applied at checkout — zero effort on your part.",
              },
            ].map(({ step, icon, title, desc }) => (
              <div
                key={step}
                className="flex flex-col items-center text-center gap-3 p-6 rounded-2xl bg-white border border-[#f2d3a4] shadow-sm"
              >
                <div className="w-12 h-12 rounded-full bg-[#7a1740] text-[#fdf7ed] flex items-center justify-center text-lg font-extrabold shadow-md">
                  {step}
                </div>
                <span className="text-3xl">{icon}</span>
                <h3 className="font-bold text-[#3b0820] text-base">{title}</h3>
                <p className="text-sm text-[#6b4c2c] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="bg-[#7a1740]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#fdf7ed] mb-3">
            Ready to start saving?
          </h2>
          <p className="text-[#f2d3a4] mb-7 text-base">
            Join thousands of smart shoppers — it&apos;s completely free.
          </p>
          <a
            href="https://chrome.google.com/webstore"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#f4a824] hover:bg-[#e09718] text-[#3b0820] font-bold px-8 py-3.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 text-base"
          >
            Add to Chrome — It&apos;s Free
          </a>
        </div>
      </div>
    </section>
  );
}
