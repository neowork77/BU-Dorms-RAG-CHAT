"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RAGLogEntry, RAGStage, RetrievedDoc, ReasoningInfo } from "@/lib/rag-logger";

/* ─── Stage icon helper ─────────────────────────────────── */
const STAGE_ICON: Record<string, string> = {
  reasoning: "🧠",
  search: "🔍",
  retrieval: "📦",
  generation: "✍️",
  error: "❌",
  done: "✅",
};

export function LogsViewer() {
  const supabase = createClient();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [refreshing, setRefreshing] = useState(false);
  const detailsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of details when log updates
  useEffect(() => {
    if (detailsEndRef.current) {
      detailsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedLog]);

  useEffect(() => {
    fetchLogs();

    // Set up realtime subscription
    const channel = supabase
      .channel("rag_logs_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rag_pipeline_logs" },
        (payload) => {
          setLogs((prev) => {
            const existsIdx = prev.findIndex(
              (l) => l.request_id === payload.new.request_id
            );
            if (existsIdx !== -1) {
              const newArr = [...prev];
              newArr[existsIdx] = payload.new;
              return newArr;
            }
            return [payload.new, ...prev];
          });
          setSelectedLog(payload.new);
          setMobileView("detail");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    setRefreshing(true);
    const { data, error } = await supabase
      .from("rag_pipeline_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (!error && data) {
      const uniqueLogs: any[] = [];
      const seen = new Set();
      for (const log of data) {
        if (!seen.has(log.request_id)) {
          seen.add(log.request_id);
          uniqueLogs.push(log);
        }
      }
      setLogs(uniqueLogs);
      if (uniqueLogs.length > 0 && !selectedLog) {
        setSelectedLog(uniqueLogs[0]);
      }
    }
    if (error) console.error("Error fetching logs:", error);
    setLoading(false);
    setRefreshing(false);
  };

  const getStageStyle = (stage: string) => {
    switch (stage) {
      case "search":
        return "text-violet-300 bg-violet-500/15 border-violet-500/30";
      case "retrieval":
        return "text-amber-300 bg-amber-500/15 border-amber-500/30";
      case "reasoning":
        return "text-yellow-300 bg-yellow-500/15 border-yellow-500/30";
      case "generation":
        return "text-purple-300 bg-purple-500/15 border-purple-500/30";
      case "done":
        return "text-emerald-300 bg-emerald-500/15 border-emerald-500/30";
      case "error":
        return "text-red-300 bg-red-500/15 border-red-500/30";
      default:
        return "text-gray-400 bg-gray-500/15 border-gray-500/30";
    }
  };

  const getTimelineColor = (stage: string) => {
    switch (stage) {
      case "reasoning":
        return "bg-yellow-400";
      case "search":
        return "bg-violet-400";
      case "retrieval":
        return "bg-amber-400";
      case "generation":
        return "bg-purple-400";
      case "error":
        return "bg-red-400";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusInfo = (log: any) => {
    if (log.error)
      return {
        label: "Error",
        cls: "text-red-400 bg-red-500/10 border-red-500/25",
        dot: "bg-red-400",
      };
    if (log.llm_response)
      return {
        label: "Success",
        cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
        dot: "bg-emerald-400",
      };
    return {
      label: "In Progress",
      cls: "text-yellow-400 bg-yellow-500/10 border-yellow-500/25 animate-pulse",
      dot: "bg-yellow-400 animate-pulse",
    };
  };

  const handleSelectLog = (log: any) => {
    setSelectedLog(log);
    setMobileView("detail");
  };

  /* ─────────────────── RENDER ─────────────────── */
  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-[#0c0a14] text-gray-200 font-sans overflow-hidden">
      {/* ═══ Sidebar: Log List ═══ */}
      <div
        className={`${
          mobileView === "list" ? "flex" : "hidden"
        } md:flex w-full md:w-[380px] lg:w-[420px] border-r border-purple-900/30 flex-col h-full bg-[#110e1c] shrink-0`}
      >
        {/* Header */}
        <div className="p-4 border-b border-purple-900/30 flex justify-between items-center bg-[#13102a]/80 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">           
            <h1 className="text-lg font-bold bg-gradient-to-r from-purple-300 via-violet-300 to-yellow-300 bg-clip-text text-transparent">
              Pipeline Logs
            </h1>
          </div>
          <button
            onClick={fetchLogs}
            className="p-2 rounded-lg hover:bg-purple-500/10 transition-all text-purple-400 hover:text-purple-300 active:scale-95 cursor-pointer"
            title="Refresh"
          >
            <svg
              className={`w-5 h-5 transition-transform duration-500 ${refreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>

        {/* Log list */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2 scrollbar-thin">
          {loading && logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-purple-400/60 space-y-3">
              <div className="w-6 h-6 border-2 border-purple-500/40 border-t-purple-400 rounded-full animate-spin" />
              <span className="text-sm">Loading logs…</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 text-purple-400/40">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-sm font-medium">No logs yet</p>
              <p className="text-xs mt-1 text-purple-400/30">
                Start a chat to see pipeline logs
              </p>
            </div>
          ) : (
            logs.map((log) => {
              const status = getStatusInfo(log);
              const isSelected =
                selectedLog?.request_id === log.request_id;
              return (
                <div
                  key={log.request_id || log.id}
                  onClick={() => handleSelectLog(log)}
                  className={`p-3 rounded-xl cursor-pointer transition-all duration-200 border ${
                    isSelected
                      ? "bg-purple-500/10 border-purple-500/40 shadow-[0_0_20px_rgba(139,92,246,0.08)]"
                      : "bg-[#16132a]/70 border-purple-900/20 hover:border-purple-700/30 hover:bg-purple-500/5"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div className="font-medium text-sm truncate text-gray-100 flex-1">
                      {log.query || (
                        <span className="italic text-purple-400/40">
                          No query
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap font-semibold uppercase tracking-wider ${status.cls}`}
                    >
                      {status.label}
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs text-purple-400/50">
                    <div className="flex items-center gap-1">
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>
                        {new Date(
                          log.created_at || log.timestamp
                        ).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="font-mono text-purple-300/70">
                      {log.total_duration_ms}ms
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ═══ Main Content: Detail View ═══ */}
      <div
        className={`${
          mobileView === "detail" ? "flex" : "hidden"
        } md:flex flex-1 flex-col overflow-y-auto bg-[#0c0a14]`}
      >
        {selectedLog ? (
          <div className="max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-5">
            {/* Back button (mobile only) */}
            <button
              onClick={() => setMobileView("list")}
              className="md:hidden flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300 mb-2 active:scale-95 transition-all"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Logs
            </button>

            {/* ─── Header Card ─── */}
            <div className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-[#1a1530] to-[#120f22] p-5 sm:p-6">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-yellow-500/5 pointer-events-none" />
              <div className="relative flex flex-col sm:flex-row justify-between items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-200 to-yellow-200 bg-clip-text text-transparent mb-1">
                    Query Details
                  </h2>
                  <div className="text-xs text-purple-400/60 font-mono truncate">
                    {selectedLog.request_id}
                  </div>
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <div className="text-xs text-purple-400/60">
                    {new Date(
                      selectedLog.created_at || selectedLog.timestamp
                    ).toLocaleString("th-TH")}
                  </div>
                  <div className="text-xl font-mono font-bold bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent mt-0.5">
                    {selectedLog.total_duration_ms}ms
                  </div>
                </div>
              </div>
            </div>

            {/* ─── User Query ─── */}
            <div className="rounded-xl border border-purple-500/15 bg-[#16132a]/60 p-4 sm:p-5">
              <div className="text-[10px] text-purple-400/50 mb-2 uppercase tracking-widest font-bold">
                User Query
              </div>
              <div className="text-base sm:text-lg text-gray-100 leading-relaxed">
                &ldquo;{selectedLog.query}&rdquo;
              </div>
            </div>

            {/* ─── Error ─── */}
            {selectedLog.error && (
              <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-4 sm:p-5">
                <div className="text-[10px] text-red-400/70 mb-2 uppercase tracking-widest font-bold">
                  ❌ Pipeline Error
                </div>
                <div className="text-red-300 font-mono text-sm break-words whitespace-pre-wrap">
                  {selectedLog.error}
                </div>
              </div>
            )}

            {/* ─── Pipeline Timeline ─── */}
            <div className="rounded-xl border border-purple-500/15 bg-[#16132a]/60 p-4 sm:p-5">
              <div className="text-[10px] text-purple-400/50 mb-5 uppercase tracking-widest font-bold">
                Pipeline Stages
              </div>

              <div className="relative">
                {selectedLog.stages?.map((stage: any, i: number) => {
                  const isLast =
                    i === (selectedLog.stages?.length ?? 0) - 1;
                  return (
                    <div key={i} className="relative flex gap-4 pb-5 last:pb-0">
                      {/* Timeline line */}
                      <div className="flex flex-col items-center shrink-0">
                        <div
                          className={`w-3 h-3 rounded-full ${getTimelineColor(
                            stage.stage
                          )} ring-4 ring-[#16132a] z-10 shrink-0`}
                        />
                        {!isLast && (
                          <div className="w-0.5 flex-1 bg-gradient-to-b from-purple-500/30 to-purple-500/5 mt-1" />
                        )}
                      </div>

                      {/* Stage content */}
                      <div className="flex-1 min-w-0 pb-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border font-semibold uppercase tracking-wider ${getStageStyle(
                              stage.stage
                            )}`}
                          >
                            <span>{STAGE_ICON[stage.stage] || "⚙️"}</span>
                            {stage.stage}
                          </span>
                          <span className="text-xs font-mono text-purple-400/50">
                            {stage.durationMs !== undefined
                              ? `${stage.durationMs}ms`
                              : "—"}
                          </span>
                        </div>

                        {/* Reasoning Info */}
                        {stage.metadata?.reasoningInfo && (
                          <div className="mt-2.5 rounded-lg bg-yellow-500/5 border border-yellow-500/15 p-3 space-y-2">
                            <div className="flex items-start gap-2 text-xs">
                              <span className="text-yellow-500/60 shrink-0">
                                Intent:
                              </span>
                              <span className="text-yellow-300 font-mono break-all">
                                {
                                  stage.metadata.reasoningInfo
                                    .intent_summary
                                }
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                              <div className="flex justify-between">
                                <span className="text-purple-400/50">
                                  Dorm Query
                                </span>
                                <span className="text-gray-200">
                                  {stage.metadata.reasoningInfo
                                    .is_dorm_query
                                    ? "✅"
                                    : "❌"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-purple-400/50">
                                  Sort By
                                </span>
                                <span className="text-gray-200">
                                  {stage.metadata.reasoningInfo
                                    .sort_by !== "N/A"
                                    ? stage.metadata.reasoningInfo
                                        .sort_by
                                    : "—"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-purple-400/50">
                                  Max Price
                                </span>
                                <span className="text-gray-200">
                                  {stage.metadata.reasoningInfo
                                    .max_price
                                    ? `฿${stage.metadata.reasoningInfo.max_price.toLocaleString()}`
                                    : "—"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-purple-400/50">
                                  Results
                                </span>
                                <span className="text-gray-200">
                                  {
                                    stage.metadata.reasoningInfo
                                      .after_filter_count
                                  }{" "}
                                  /{" "}
                                  {
                                    stage.metadata.reasoningInfo
                                      .total_raw_results
                                  }
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Retrieved Docs */}
                        {stage.metadata?.docs &&
                          stage.metadata.docs.length > 0 && (
                            <div className="mt-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15 p-3">
                              <div className="text-[10px] text-amber-400/60 mb-2 uppercase tracking-widest font-bold">
                                Retrieved Documents (
                                {stage.metadata.docs.length})
                              </div>
                              <div className="overflow-x-auto -mx-1">
                                <table className="w-full text-xs text-left min-w-[400px]">
                                  <thead>
                                    <tr className="text-[10px] text-purple-400/40 uppercase">
                                      <th className="px-2 py-1.5 font-semibold">
                                        #
                                      </th>
                                      <th className="px-2 py-1.5 font-semibold">
                                        Name
                                      </th>
                                      <th className="px-2 py-1.5 font-semibold">
                                        Price
                                      </th>
                                      <th className="px-2 py-1.5 font-semibold">
                                        Dist
                                      </th>
                                      <th className="px-2 py-1.5 font-semibold">
                                        Score
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {stage.metadata.docs.map(
                                      (doc: any, j: number) => (
                                        <tr
                                          key={j}
                                          className="border-t border-amber-500/10 hover:bg-amber-500/5 transition-colors"
                                        >
                                          <td className="px-2 py-1.5 text-purple-400/40">
                                            {doc.rank}
                                          </td>
                                          <td
                                            className="px-2 py-1.5 text-violet-300 truncate max-w-[180px]"
                                            title={doc.name}
                                          >
                                            {doc.url ? (
                                              <a
                                                href={doc.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="hover:underline"
                                              >
                                                {doc.name}
                                              </a>
                                            ) : (
                                              doc.name
                                            )}
                                          </td>
                                          <td className="px-2 py-1.5 text-yellow-300/80">
                                            {doc.price}
                                          </td>
                                          <td className="px-2 py-1.5 text-gray-400">
                                            {doc.distance_km !== null
                                              ? `${doc.distance_km.toFixed(
                                                  2
                                                )}km`
                                              : "—"}
                                          </td>
                                          <td
                                            className={`px-2 py-1.5 font-mono ${
                                              doc.similarity_score >
                                              0.5
                                                ? "text-emerald-400"
                                                : doc.similarity_score >
                                                  0.3
                                                ? "text-yellow-400"
                                                : "text-red-400"
                                            }`}
                                          >
                                            {doc.similarity_score !==
                                            null
                                              ? doc.similarity_score.toFixed(
                                                  4
                                                )
                                              : "—"}
                                          </td>
                                        </tr>
                                      )
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                        {/* LLM Prompt */}
                        {stage.metadata?.llmPromptSummary && (
                          <div className="mt-2.5 rounded-lg bg-purple-500/5 border border-purple-500/15 p-3 space-y-1 text-xs">
                            <div className="text-[10px] text-purple-400/60 uppercase tracking-widest font-bold mb-1">
                              ✍️ LLM Prompt
                            </div>
                            <div className="text-purple-300/60">
                              <span className="text-purple-400/40">
                                System:{" "}
                              </span>
                              {stage.metadata.systemSnippet}
                            </div>
                            <div className="text-purple-300/60">
                              <span className="text-purple-400/40">
                                User:{" "}
                              </span>
                              {stage.metadata.userSnippet}
                            </div>
                          </div>
                        )}

                        {/* LLM Response */}
                        {stage.metadata?.llmResponse && (
                          <div className="mt-2.5 rounded-lg bg-purple-500/5 border border-purple-500/15 p-3 text-xs">
                            <div className="text-[10px] text-purple-400/60 uppercase tracking-widest font-bold mb-1">
                              ✍️ LLM Response
                            </div>
                            <div className="text-gray-300/80 italic leading-relaxed">
                              &ldquo;{stage.metadata.snippet}&rdquo;
                            </div>
                          </div>
                        )}

                        {/* Other metadata */}
                        {stage.metadata &&
                          !stage.metadata.reasoningInfo &&
                          !stage.metadata.docs &&
                          !stage.metadata.llmPromptSummary &&
                          !stage.metadata.llmResponse &&
                          Object.keys(stage.metadata).length > 0 && (
                            <div className="mt-2 text-[11px] font-mono text-purple-400/30 break-all bg-purple-500/5 rounded-lg p-2 border border-purple-500/10">
                              {JSON.stringify(stage.metadata)}
                            </div>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─── Raw JSON ─── */}
            <details className="rounded-xl border border-purple-500/15 bg-[#16132a]/60 group cursor-pointer">
              <summary className="p-4 text-sm text-purple-400/50 font-medium hover:text-purple-300 transition-colors flex justify-between items-center outline-none select-none">
                <span>View Raw JSON</span>
                <svg
                  className="w-4 h-4 transform group-open:rotate-180 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </summary>
              <div className="p-4 border-t border-purple-500/10 bg-black/20 overflow-x-auto rounded-b-xl">
                <pre className="text-[11px] text-purple-300/60 font-mono leading-relaxed">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </div>
            </details>

            {/* Invisible div for auto-scrolling */}
            <div ref={detailsEndRef} className="h-4" />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-purple-400/30 px-4">
            <div className="w-20 h-20 mb-5 rounded-2xl bg-gradient-to-br from-purple-500/10 to-yellow-500/10 border border-purple-500/15 flex items-center justify-center text-3xl">
              🔬
            </div>
            <p className="text-lg font-semibold text-purple-300/50">
              Select a log entry
            </p>
            <p className="text-sm mt-1 text-purple-400/30">
              Click on any request from the sidebar to view details
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
