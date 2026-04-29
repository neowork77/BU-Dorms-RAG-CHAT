import type { Metadata } from "next";
import { LandingContent } from "./components/LandingContent";

export const metadata: Metadata = {
  title: "Puffin AI - Your Soft & Smart Companion",
  description:
    "Experience a high-performance RAG chatbot wrapped in a squishy, friendly interface. Talk to your documents without the anxiety of complex tools.",
};

export default function LandingPage() {
  return <LandingContent />;
}
