import ComingSoon from "@/components/ComingSoon";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us — PennyPounce",
};

export default function AboutPage() {
  return (
    <ComingSoon
      title="Our Story Is Coming"
      description="PennyPounce was built by shoppers, for shoppers. Our mission page — including our founding story, values, and team — is on its way."
    />
  );
}
