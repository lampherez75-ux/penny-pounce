import Link from "next/link";
import Image from "next/image";

const footerLinks = {
  Product: [
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing" },
    { label: "How It Works", href: "/#how-it-works" },
  ],
  Company: [
    { label: "About Us", href: "/about" },
    { label: "Account Portal", href: "/account" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-[#3b0820] text-[#fdf7ed]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand column */}
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2 w-fit">
              <Image
                src="/fox-jumping.png"
                alt="PennyPounce fox"
                width={32}
                height={32}
                className="object-contain"
              />
              <span className="text-base font-bold">
                <span className="text-[#f2d3a4]">Penny</span>
                <span className="text-[#f4a824]">Pounce</span>
              </span>
            </Link>
            <p className="text-sm text-[#c4a882] leading-relaxed max-w-xs">
              Automatically find and apply the best coupon codes while you shop.
              Save time. Save money.
            </p>
            <a
              href="https://chrome.google.com/webstore"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#f4a824] hover:bg-[#e09718] text-[#3b0820] text-xs font-bold px-4 py-2 rounded-full w-fit transition-colors"
            >
              Add to Chrome — Free
            </a>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section} className="flex flex-col gap-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#f4a824]">
                {section}
              </h3>
              <ul className="flex flex-col gap-2">
                {links.map(({ label, href }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-[#c4a882] hover:text-[#fdf7ed] transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-[#6b4c2c] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#6b4c2c]">
          <span>© {new Date().getFullYear()} PennyPounce. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-[#c4a882] transition-colors">
              Privacy Policy
            </Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-[#c4a882] transition-colors">
              Terms of Service
            </Link>
            <span>·</span>
            <a href="mailto:hello@pennypounce.com" className="hover:text-[#c4a882] transition-colors">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
