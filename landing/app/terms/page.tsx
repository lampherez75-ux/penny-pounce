import ComingSoon from "@/components/ComingSoon";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — PennyPounce",
};

export default function TermsPage() {
  return (
    <ComingSoon
      title="Terms of Service"
      description="Our full terms of service are being finalized and will be published here before launch. Thank you for your patience."
    />
  );
}
