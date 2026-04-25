import ComingSoon from "@/components/ComingSoon";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — PennyPounce",
};

export default function PricingPage() {
  return (
    <ComingSoon
      title="Plans & Pricing Coming Soon"
      description="We're finalizing our plans — including a free tier that will always stay free. Be the first to know when pricing launches."
    />
  );
}
