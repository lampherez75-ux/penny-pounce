"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "About Us", href: "/about" },
  { label: "Account", href: "/account" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#fdf1dc] border-b-2 border-[#7a1740] shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image
            src="/fox-jumping.png"
            alt="PennyPounce fox mascot"
            width={38}
            height={38}
            className="object-contain"
            priority
          />
          <span className="text-lg font-bold leading-none select-none">
            <span className="text-[#7a1740]">Penny</span>
            <span className="text-[#f4a824]">Pounce</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <ul className="hidden md:flex items-center gap-1">
          {navLinks.map(({ label, href }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors duration-150 ${
                    active
                      ? "bg-[#7a1740] text-[#fdf7ed]"
                      : "text-[#3b0820] hover:bg-[#f2d3a4]"
                  }`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Sign In button */}
        <div className="hidden md:block">
          <Link
            href="/account"
            className="bg-[#7a1740] text-[#fdf7ed] text-sm font-semibold px-5 py-2 rounded-full hover:bg-[#6a1235] transition-colors duration-150 shadow-sm"
          >
            Sign In
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-md text-[#7a1740] hover:bg-[#f2d3a4] transition-colors"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-[#fdf1dc] border-t border-[#f2d3a4] px-4 pb-4">
          <ul className="flex flex-col gap-1 pt-2">
            {navLinks.map(({ label, href }) => {
              const active = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-[#7a1740] text-[#fdf7ed]"
                        : "text-[#3b0820] hover:bg-[#f2d3a4]"
                    }`}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 pt-3 border-t border-[#f2d3a4]">
            <Link
              href="/account"
              onClick={() => setMenuOpen(false)}
              className="block text-center bg-[#7a1740] text-[#fdf7ed] text-sm font-semibold px-5 py-2 rounded-full hover:bg-[#6a1235] transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
