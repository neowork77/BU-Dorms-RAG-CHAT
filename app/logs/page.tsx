import { Metadata } from "next";
import { LogsViewer } from "./LogsViewer";

export const metadata: Metadata = {
  title: "RAG Pipeline Logs | BU Dorms",
  description: "View and analyze RAG pipeline execution logs.",
};

export default function LogsPage() {
  return <LogsViewer />;
}
