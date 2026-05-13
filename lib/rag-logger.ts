import { createClient } from '@/lib/supabase/server';

// ── Types ──────────────────────────────────────────────────────
export type RAGStage = 'search' | 'retrieval' | 'reasoning' | 'generation' | 'done' | 'error';

export interface RetrievedDoc {
    rank: number;
    name: string;
    price: string;
    distance_km: number | null;
    similarity_score: number | null;
    url: string;
}

export interface ReasoningInfo {
    is_dorm_query: boolean;
    sort_by: string;
    max_price: number | null;
    total_raw_results: number;
    after_filter_count: number;
    top_k: number;
    intent_summary?: string;
}

interface StageEntry {
    stage: RAGStage;
    startedAt: number;
    endedAt?: number;
    durationMs?: number;
    metadata?: Record<string, unknown>;
}

export interface RAGLogEntry {
    request_id: string;
    timestamp: string;
    user_id: string | null;
    session_id: string | null;
    query: string;
    stages: StageEntry[];
    reasoning: ReasoningInfo | null;
    retrieved_docs: RetrievedDoc[];
    llm_prompt_summary: string | null;
    llm_response: string | null;
    llm_response_length: number | null;
    total_duration_ms: number | null;
    error: string | null;
}

// ── Color helpers for console ──────────────────────────────────
const COLORS = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    magenta: '\x1b[35m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    white: '\x1b[37m',
    bgCyan: '\x1b[46m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgMagenta: '\x1b[45m',
    bgBlue: '\x1b[44m',
    bgRed: '\x1b[41m',
};

const STAGE_STYLES: Record<RAGStage, { icon: string; color: string; bg: string; label: string }> = {
    search:     { icon: '🔍', color: COLORS.cyan,    bg: COLORS.bgCyan,    label: 'SEARCH' },
    retrieval:  { icon: '📦', color: COLORS.green,   bg: COLORS.bgGreen,   label: 'RETRIEVAL' },
    reasoning:  { icon: '🧠', color: COLORS.yellow,  bg: COLORS.bgYellow,  label: 'REASONING' },
    generation: { icon: '✍️',  color: COLORS.magenta, bg: COLORS.bgMagenta, label: 'GENERATION' },
    done:       { icon: '✅', color: COLORS.green,   bg: COLORS.bgGreen,   label: 'DONE' },
    error:      { icon: '❌', color: COLORS.red,     bg: COLORS.bgRed,     label: 'ERROR' },
};

// ── RAGLogger class ────────────────────────────────────────────
export class RAGLogger {
    private requestId: string;
    private userId: string | null = null;
    private sessionId: string | null = null;
    private query: string;
    private startTime: number;
    private stages: StageEntry[] = [];
    private currentStage: StageEntry | null = null;
    private reasoning: ReasoningInfo | null = null;
    private retrievedDocs: RetrievedDoc[] = [];
    private llmPromptSummary: string | null = null;
    private llmResponse: string | null = null;
    private llmResponseLength: number | null = null;
    private errorMsg: string | null = null;

    constructor(query: string, opts?: { userId?: string; sessionId?: string }) {
        this.requestId = this.generateId();
        this.query = query;
        this.userId = opts?.userId ?? null;
        this.sessionId = opts?.sessionId ?? null;
        this.startTime = performance.now();

        this.printHeader();
    }

    /** Set/update the session ID (useful when session is created after logger init) */
    setSessionId(id: string) {
        this.sessionId = id;
    }

    /** Get the unique request ID for this pipeline run */
    getRequestId(): string {
        return this.requestId;
    }

    // ── Stage tracking ─────────────────────────────────────────
    startStage(stage: RAGStage, metadata?: Record<string, unknown>) {
        // Close previous stage
        if (this.currentStage && !this.currentStage.endedAt) {
            this.endCurrentStage();
        }

        const entry: StageEntry = {
            stage,
            startedAt: performance.now(),
            metadata,
        };

        this.currentStage = entry;
        this.stages.push(entry);

        const style = STAGE_STYLES[stage];
        const elapsed = (performance.now() - this.startTime).toFixed(0);
        console.log(
            `${COLORS.dim}[${elapsed}ms]${COLORS.reset} ` +
            `${style.icon} ${style.color}${COLORS.bold}▶ ${style.label}${COLORS.reset}` +
            (metadata ? ` ${COLORS.dim}${JSON.stringify(metadata)}${COLORS.reset}` : '')
        );
    }

    endStage(stage: RAGStage, metadata?: Record<string, unknown>) {
        const entry = this.stages.find(s => s.stage === stage && !s.endedAt);
        if (entry) {
            entry.endedAt = performance.now();
            entry.durationMs = Math.round(entry.endedAt - entry.startedAt);
            if (metadata) entry.metadata = { ...entry.metadata, ...metadata };

            const style = STAGE_STYLES[stage];
            console.log(
                `${COLORS.dim}[${(performance.now() - this.startTime).toFixed(0)}ms]${COLORS.reset} ` +
                `${style.icon} ${style.color}■ ${style.label} completed${COLORS.reset} ` +
                `${COLORS.bold}(${entry.durationMs}ms)${COLORS.reset}`
            );
        }
    }

    private endCurrentStage() {
        if (this.currentStage && !this.currentStage.endedAt) {
            this.currentStage.endedAt = performance.now();
            this.currentStage.durationMs = Math.round(
                this.currentStage.endedAt - this.currentStage.startedAt
            );
        }
    }

    // ── Reasoning ──────────────────────────────────────────────
    logReasoning(info: ReasoningInfo) {
        this.reasoning = info;

        console.log(
            `\n${COLORS.yellow}${COLORS.bold}🧠 Reasoning Summary${COLORS.reset}\n` +
            `${COLORS.dim}${'─'.repeat(50)}${COLORS.reset}\n` +
            `  ${COLORS.white}Is Dorm Query:${COLORS.reset}    ${info.is_dorm_query ? '✅ Yes' : '❌ No'}\n` +
            `  ${COLORS.white}Sort By:${COLORS.reset}          ${info.sort_by}\n` +
            `  ${COLORS.white}Max Price:${COLORS.reset}        ${info.max_price ? `${info.max_price.toLocaleString()} ฿` : 'N/A'}\n` +
            `  ${COLORS.white}Raw Results:${COLORS.reset}      ${info.total_raw_results}\n` +
            `  ${COLORS.white}After Filter:${COLORS.reset}     ${info.after_filter_count}\n` +
            `  ${COLORS.white}Top K:${COLORS.reset}            ${info.top_k}\n` +
            (info.intent_summary
                ? `  ${COLORS.white}Intent:${COLORS.reset}           ${info.intent_summary}\n`
                : '') +
            `${COLORS.dim}${'─'.repeat(50)}${COLORS.reset}`
        );
    }

    // ── Retrieved Docs ─────────────────────────────────────────
    logRetrievedDocs(docs: RetrievedDoc[]) {
        this.retrievedDocs = docs;

        if (docs.length === 0) {
            console.log(`\n${COLORS.red}📭 No documents retrieved${COLORS.reset}`);
            return;
        }

        console.log(
            `\n${COLORS.green}${COLORS.bold}📦 Retrieved Documents (${docs.length})${COLORS.reset}\n` +
            `${COLORS.dim}${'─'.repeat(80)}${COLORS.reset}`
        );

        // Table header
        console.log(
            `  ${COLORS.bold}${pad('#', 4)}${pad('Name', 30)}${pad('Price', 12)}${pad('Dist (km)', 12)}${pad('Score', 10)}${COLORS.reset}`
        );
        console.log(`  ${COLORS.dim}${'─'.repeat(68)}${COLORS.reset}`);

        for (const doc of docs) {
            const scoreStr = doc.similarity_score !== null
                ? doc.similarity_score.toFixed(4)
                : 'N/A';
            const distStr = doc.distance_km !== null
                ? doc.distance_km.toFixed(2)
                : 'N/A';

            // Color score: green > 0.5, yellow > 0.3, red otherwise
            let scoreColor = COLORS.red;
            if (doc.similarity_score !== null) {
                if (doc.similarity_score > 0.5) scoreColor = COLORS.green;
                else if (doc.similarity_score > 0.3) scoreColor = COLORS.yellow;
            }

            console.log(
                `  ${COLORS.dim}${pad(String(doc.rank), 4)}${COLORS.reset}` +
                `${pad(truncate(doc.name, 28), 30)}` +
                `${pad(doc.price, 12)}` +
                `${pad(distStr, 12)}` +
                `${scoreColor}${pad(scoreStr, 10)}${COLORS.reset}`
            );
        }

        console.log(`${COLORS.dim}${'─'.repeat(80)}${COLORS.reset}\n`);
    }

    // ── LLM Prompt / Response ──────────────────────────────────
    logLLMPrompt(systemPrompt: string, userPrompt: string) {
        const summary = `System(${systemPrompt.length} chars) | User(${userPrompt.length} chars)`;
        this.llmPromptSummary = summary;

        console.log(
            `${COLORS.magenta}${COLORS.bold}✍️  LLM Prompt${COLORS.reset}\n` +
            `  ${COLORS.dim}System prompt: ${systemPrompt.length} chars${COLORS.reset}\n` +
            `  ${COLORS.dim}User prompt:   ${userPrompt.length} chars${COLORS.reset}\n` +
            `  ${COLORS.dim}System snippet: "${truncate(systemPrompt, 120)}"${COLORS.reset}\n` +
            `  ${COLORS.dim}User snippet:   "${truncate(userPrompt, 120)}"${COLORS.reset}`
        );
    }

    logLLMResponse(response: string) {
        this.llmResponse = response;
        this.llmResponseLength = response.length;

        console.log(
            `${COLORS.magenta}✍️  LLM Response: ${response.length} chars${COLORS.reset}\n` +
            `  ${COLORS.dim}Snippet: "${truncate(response, 150)}"${COLORS.reset}`
        );
    }

    // ── Error ──────────────────────────────────────────────────
    logError(error: string | Error) {
        const msg = error instanceof Error ? error.message : error;
        this.errorMsg = msg;

        console.error(
            `${COLORS.red}${COLORS.bold}❌ Pipeline Error${COLORS.reset}\n` +
            `  ${COLORS.red}${msg}${COLORS.reset}`
        );
    }

    // ── Finalize: console summary + write to Supabase ──────────
    async finalize(): Promise<RAGLogEntry> {
        this.endCurrentStage();

        const totalMs = Math.round(performance.now() - this.startTime);

        // Console summary
        this.printFooter(totalMs);

        // Build structured log entry
        const logEntry: RAGLogEntry = {
            request_id: this.requestId,
            timestamp: new Date().toISOString(),
            user_id: this.userId,
            session_id: this.sessionId,
            query: this.query,
            stages: this.stages.map(s => ({
                stage: s.stage,
                startedAt: s.startedAt,
                endedAt: s.endedAt,
                durationMs: s.durationMs,
                metadata: s.metadata,
            })),
            reasoning: this.reasoning,
            retrieved_docs: this.retrievedDocs,
            llm_prompt_summary: this.llmPromptSummary,
            llm_response: this.llmResponse,
            llm_response_length: this.llmResponseLength,
            total_duration_ms: totalMs,
            error: this.errorMsg,
        };

        // ── Write to Supabase ──────────────────────────────────
        try {
            const supabase = await createClient();

            const row = {
                request_id: logEntry.request_id,
                user_id: logEntry.user_id,
                session_id: logEntry.session_id,
                query: logEntry.query,
                stages: logEntry.stages,
                is_dorm_query: logEntry.reasoning?.is_dorm_query ?? false,
                sort_by: logEntry.reasoning?.sort_by ?? null,
                max_price: logEntry.reasoning?.max_price ?? null,
                total_raw_results: logEntry.reasoning?.total_raw_results ?? 0,
                after_filter_count: logEntry.reasoning?.after_filter_count ?? 0,
                top_k: logEntry.reasoning?.top_k ?? 0,
                intent_summary: logEntry.reasoning?.intent_summary ?? null,
                retrieved_docs: logEntry.retrieved_docs,
                llm_prompt_summary: logEntry.llm_prompt_summary,
                llm_response: logEntry.llm_response,
                llm_response_length: logEntry.llm_response_length,
                total_duration_ms: logEntry.total_duration_ms,
                error: logEntry.error,
            };

            const { error } = await supabase
                .from('rag_pipeline_logs')
                .insert(row);

            if (error) {
                console.error(
                    `${COLORS.red}⚠️ Failed to write log to Supabase:${COLORS.reset}`,
                    error.message
                );
            } else {
                console.log(
                    `${COLORS.green}📤 Log saved to Supabase${COLORS.reset} ` +
                    `${COLORS.dim}(request_id: ${logEntry.request_id})${COLORS.reset}`
                );
            }
        } catch (err: any) {
            // Don't crash the API if logging fails
            console.error(
                `${COLORS.red}⚠️ Supabase log write error:${COLORS.reset}`,
                err.message || err
            );
        }

        return logEntry;
    }

    // ── Internal helpers ───────────────────────────────────────
    private generateId(): string {
        const ts = Date.now().toString(36);
        const rand = Math.random().toString(36).substring(2, 8);
        return `rag_${ts}_${rand}`;
    }

    private printHeader() {
        const line = '═'.repeat(60);
        console.log(
            `\n${COLORS.cyan}${COLORS.bold}${line}${COLORS.reset}\n` +
            `${COLORS.cyan}${COLORS.bold}  🔬 RAG Pipeline Observability  │  ${this.requestId}${COLORS.reset}\n` +
            `${COLORS.cyan}${COLORS.bold}${line}${COLORS.reset}\n` +
            `  ${COLORS.white}Query:${COLORS.reset} "${truncate(this.query, 80)}"\n` +
            `  ${COLORS.dim}Started: ${new Date().toISOString()}${COLORS.reset}\n`
        );
    }

    private printFooter(totalMs: number) {
        const line = '═'.repeat(60);

        // Build stage timeline
        const timeline = this.stages
            .map(s => {
                const style = STAGE_STYLES[s.stage];
                const dur = s.durationMs !== undefined ? `${s.durationMs}ms` : '?';
                return `  ${style.icon} ${style.color}${style.label}${COLORS.reset} ${COLORS.bold}${dur}${COLORS.reset}`;
            })
            .join('\n');

        console.log(
            `\n${COLORS.blue}${COLORS.bold}📊 Pipeline Summary${COLORS.reset}\n` +
            `${COLORS.dim}${'─'.repeat(50)}${COLORS.reset}\n` +
            `${timeline}\n` +
            `${COLORS.dim}${'─'.repeat(50)}${COLORS.reset}\n` +
            `  ⏱️  ${COLORS.bold}Total: ${totalMs}ms${COLORS.reset}\n` +
            `  📄 Docs: ${this.retrievedDocs.length} retrieved\n` +
            (this.errorMsg ? `  ❌ Error: ${this.errorMsg}\n` : '') +
            `${COLORS.cyan}${COLORS.bold}${line}${COLORS.reset}\n`
        );
    }
}

// ── Utility helpers ────────────────────────────────────────────
function pad(str: string, len: number): string {
    return str.length >= len ? str.substring(0, len) : str + ' '.repeat(len - str.length);
}

function truncate(str: string, maxLen: number): string {
    if (str.length <= maxLen) return str;
    return str.substring(0, maxLen - 3) + '...';
}
