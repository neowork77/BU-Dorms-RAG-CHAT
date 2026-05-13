import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { InferenceClient } from '@huggingface/inference';
import { RAGLogger } from '@/lib/rag-logger';
import type { RetrievedDoc } from '@/lib/rag-logger';

// Initialize the Typhoon API client
const openai = new OpenAI({
    apiKey: process.env.TYPHOON_API_KEY,
    baseURL: 'https://api.opentyphoon.ai/v1',
});

// ── HuggingFace Inference SDK for embeddings ──────────────────
// Uses the same model (paraphrase-multilingual-MiniLM-L12-v2, 384-dim)
// via the official @huggingface/inference SDK — compatible with Vercel serverless.
const HF_EMBEDDING_MODEL = 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2';
const hfClient = new InferenceClient(process.env.HF_API_TOKEN || '');

async function getEmbedding(text: string): Promise<number[]> {
    const result = await hfClient.featureExtraction({
        model: HF_EMBEDDING_MODEL,
        inputs: text,
    });

    // The SDK returns a flat number[] (384-dim) for sentence-transformers models
    if (Array.isArray(result) && typeof result[0] === 'number') {
        return result as number[];
    }

    // Fallback: nested array → take first element
    if (Array.isArray(result) && Array.isArray(result[0])) {
        // If doubly nested [seq_len, 384] → mean pool
        if (Array.isArray(result[0]) && typeof (result[0] as number[])[0] === 'number') {
            return result[0] as number[];
        }
    }

    throw new Error('Unexpected embedding response format from HuggingFace SDK');
}

// ── BU Coordinates ─────────────────────────────────────────────
const BU_LAT = 14.039417;
const BU_LNG = 100.611633;

// ── BU Context สำหรับ LLM ──────────────────────────────────────
const BU_CONTEXT = `
มหาวิทยาลัยกรุงเทพ วิทยาเขตรังสิต ตั้งอยู่ที่ ถ.พหลโยธิน ต.คลองหนึ่ง อ.คลองหลวง จ.ปทุมธานี
พิกัด: ${BU_LAT}, ${BU_LNG}
ย่านใกล้เคียง: คลองหนึ่ง, ลำลูกกา, รังสิต, ฟิวเจอร์พาร์ค, คลองหลวง
รถสาธารณะ: BTS สายสีแดง สถานีมหาวิทยาลัยกรุงเทพ, รถตู้ รังสิต-ม.กรุงเทพ
ระดับระยะทาง:
  - ใกล้มาก: น้อยกว่า 1 กม. (เดินหรือปั่นจักรยานได้)
  - ใกล้: 1–3 กม. (ขับมอเตอร์ไซค์ / รถสองแถว)
  - ปานกลาง: 3–5 กม. (ขับรถยนต์หรือมอเตอร์ไซค์)
  - ไกล: มากกว่า 5 กม. (ต้องใช้รถยนต์หรือ Grab)
`.trim();

// ── Haversine distance (km) ────────────────────────────────────
function haversineDistance(lat1: number, lon1: number, lat2: any, lon2: any): number {
    try {
        const sLat = String(lat2).trim().toLowerCase();
        const sLon = String(lon2).trim().toLowerCase();
        if (['', 'nan', 'none', '-'].includes(sLat) || ['', 'nan', 'none', '-'].includes(sLon)) return Infinity;
        const R = 6371.0;
        const fLat2 = parseFloat(sLat);
        const fLon2 = parseFloat(sLon);
        if (isNaN(fLat2) || isNaN(fLon2)) return Infinity;
        const dlat = (fLat2 - lat1) * Math.PI / 180;
        const dlon = (fLon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dlat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) *
            Math.cos(fLat2 * Math.PI / 180) *
            Math.sin(dlon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    } catch {
        return Infinity;
    }
}

// ── Fix URL ────────────────────────────────────────────────────
function fixUrl(url: any): string {
    if (typeof url !== 'string') return String(url ?? '');
    let fixed = url.replace(/[\u200b\u200c\u200d\ufeff]/g, '');
    fixed = fixed.replace(/[\u{1D400}-\u{1D7FF}]/gu, '');
    try {
        const parsed = new URL(fixed);
        parsed.pathname = encodeURI(decodeURI(parsed.pathname));
        return parsed.toString();
    } catch {
        return fixed;
    }
}

// ── Helper: get field from row ─────────────────────────────────
function getField(row: any, ...keys: string[]): string {
    for (const k of keys) {
        const val = row[k];
        if (val !== undefined && val !== null) {
            const s = String(val).trim();
            if (s && !['nan', 'none', '-'].includes(s.toLowerCase())) return s;
        }
    }
    return '';
}

// ── Label ระยะทาง ──────────────────────────────────────────────
function distanceLabel(km: number): string {
    if (km === Infinity) return 'ไม่ระบุพิกัด';
    if (km < 1) return `${(km * 1000).toFixed(0)} ม. จาก ม.กรุงเทพ (เดินได้)`;
    if (km < 3) return `${km.toFixed(2)} กม. จาก ม.กรุงเทพ (มอเตอร์ไซค์/รถยนต์)`;
    if (km < 5) return `${km.toFixed(2)} กม. จาก ม.กรุงเทพ (รถยนต์)`;
    return `${km.toFixed(2)} กม. จาก ม.กรุงเทพ (ไกล ต้องใช้รถยนต์)`;
}

// ── Candidate type ─────────────────────────────────────────────
type Candidate = {
    id: number | null;
    name: string;
    price: string;
    price_val: number;
    details: string;
    url: string;
    img1: string;
    images: string[];
    distance_km: number;
};

// ── Process raw row ────────────────────────────────────────────
function processRow(row: any): Candidate | null {
    let price_val: number = 999999;
    let price_str = 'ไม่ระบุ';

    if (typeof row.price === 'number') {
        price_val = row.price;
        price_str = price_val.toLocaleString();
    } else {
        try {
            const raw = getField(row, 'price_numeric', 'price');
            if (raw) {
                const parsed = Math.floor(parseFloat(raw.replace(/,/g, '')));
                if (!isNaN(parsed)) {
                    price_val = parsed;
                    price_str = price_val.toLocaleString();
                }
            }
        } catch { /* ignore */ }
    }

    const extracted_name = getField(row, 'name', 'project_name') || 'ไม่ระบุ';

    let detail_str = getField(row, 'details');
    if (!detail_str || detail_str === 'ไม่มีรายละเอียดเพิ่มเติม') {
        const parts: string[] = [];
        const room_type = getField(row, 'room_type');
        const bedrooms = getField(row, 'bedrooms');
        const size = getField(row, 'room_size_sqm');
        const floor = getField(row, 'floor');
        const building = getField(row, 'building');
        const room_fac = getField(row, 'room_facilities');
        const proj_fac = getField(row, 'project_facilities');
        if (room_type) parts.push(`ประเภท: ${room_type}`);
        if (bedrooms) parts.push(`${bedrooms} ห้องนอน`);
        if (size) parts.push(`ขนาด ${size} ตร.ม.`);
        if (floor) parts.push(`ชั้น ${floor}`);
        if (building) parts.push(`ตึก ${building}`);
        if (room_fac) parts.push(`ในห้อง: ${room_fac}`);
        if (proj_fac) parts.push(`ส่วนกลาง: ${proj_fac}`);
        detail_str = parts.length > 0 ? parts.join(' | ') : 'ไม่ระบุ';
    }

    let dist_km = typeof row.distance_km === 'number' ? row.distance_km : Infinity;
    if (!isFinite(dist_km)) {
        const lat = row.latitude ?? row.lat ?? '';
        const lng = row.longitude ?? row.lng ?? '';
        dist_km = haversineDistance(BU_LAT, BU_LNG, lat, lng);
    }

    let img1 = '';
    for (const col of ['img1', 'image_1', 'image1']) {
        const val = getField(row, col);
        if (val) { img1 = val; break; }
    }

    const images: string[] = [];
    for (const col of ['img1', 'img2', 'img3', 'img4']) {
        const val = getField(row, col);
        if (val && val.startsWith('http')) images.push(val);
    }

    return {
        id: typeof row.id === 'number' ? row.id : null,
        name: extracted_name,
        price: price_str,
        price_val,
        details: detail_str,
        url: fixUrl(getField(row, 'url') || '-'),
        img1,
        images,
        distance_km: dist_km,
    };
}

// ── 2-Level Sort ───────────────────────────────────────────────
function sortCandidates(
    candidates: Candidate[],
    sortBy: 'distance' | 'price_asc' | 'price_desc'
): Candidate[] {
    return [...candidates].sort((a, b) => {
        if (sortBy === 'price_asc') {
            if (a.price_val !== b.price_val) return a.price_val - b.price_val;
            return a.distance_km - b.distance_km;
        }
        if (sortBy === 'price_desc') {
            if (a.price_val !== b.price_val) return b.price_val - a.price_val;
            return a.distance_km - b.distance_km;
        }
        // default: distance
        if (a.distance_km !== b.distance_km) return a.distance_km - b.distance_km;
        return a.price_val - b.price_val;
    });
}

// ── Build context string สำหรับ LLM ───────────────────────────
function buildContext(results: Candidate[]): string {
    return results.map((item, i) => {
        const distText = item.distance_km === Infinity
            ? 'ไม่ระบุพิกัด'
            : `${item.distance_km.toFixed(2)} กม.`;
        return [
            `[หอพักที่ ${i + 1}]`,
            `ชื่อ: ${item.name}`,
            `ราคา: ${item.price} บาท/เดือน`,
            `ระยะจาก ม.กรุงเทพ: ${distText}`,
            `รายละเอียด: ${item.details}`,
            `URL: ${item.url}`,
        ].join('\n');
    }).join('\n\n');
}

// ── Fetch images for candidates ────────────────────────────────
async function hydrateImages(supabase: any, candidates: Candidate[]): Promise<void> {
    const dormIds = candidates.map(c => c.id).filter((id): id is number => id !== null);
    if (dormIds.length === 0) return;
    try {
        const { data: imgRows } = await supabase
            .from('dorms')
            .select('id, img1, img2, img3, img4')
            .in('id', dormIds);
        if (!imgRows) return;
        const imgMap = new Map<number, string[]>();
        for (const row of imgRows) {
            const imgs = ['img1', 'img2', 'img3', 'img4']
                .map(c => (row as any)[c])
                .filter((v: any) => typeof v === 'string' && v.startsWith('http'));
            imgMap.set(row.id, imgs);
        }
        candidates.forEach(c => {
            if (c.id && imgMap.has(c.id)) c.images = imgMap.get(c.id)!;
        });
    } catch { /* ignore image fetch errors */ }
}

// ── Shared embedding + retrieval helper ───────────────────────
async function embedAndRetrieve(
    queryText: string,
    matchCount: number,
    filterPrice: number | null,
    supabase: any
): Promise<{ candidates: Candidate[]; rawCount: number; rawDocs: RetrievedDoc[] }> {
    const embedding = await getEmbedding(queryText);

    // ยิงเข้า Supabase RPC
    const { data: rawResults, error } = await supabase.rpc('match_dorms', {
        query_embedding: embedding,
        match_count: matchCount,
        filter_price: filterPrice,
    });

    if (error || !rawResults || rawResults.length === 0) {
        return { candidates: [], rawCount: 0, rawDocs: [] };
    }

    const rawDocs: RetrievedDoc[] = rawResults.map((row: any, i: number) => ({
        rank: i + 1,
        name: getField(row, 'name', 'project_name') || 'ไม่ระบุ',
        price: getField(row, 'price_numeric', 'price') || 'ไม่ระบุ',
        distance_km: typeof row.distance_km === 'number' ? row.distance_km : null,
        similarity_score: row.similarity ?? row.score ?? null,
        url: getField(row, 'url') || '-',
    }));

    const candidates = rawResults
        .map((r: any) => processRow(r))
        .filter(Boolean) as Candidate[];

    return { candidates, rawCount: rawResults.length, rawDocs };
}

// 🔥 Helper Function สำหรับค้นหาชื่อหอพักแบบยืดหยุ่น (Fuzzy Keyword Matching) ที่แม่นยำขึ้น 100%
function filterCandidatesByTargetName(candidates: Candidate[], targetName: string): Candidate[] {
    // หั่นคำ และตัดคำทั่วๆ ไปทิ้ง (ถ้ามี)
    const targetKeywords = targetName.toLowerCase().split(/\s+/).filter(w => w.length > 1);

    return candidates.filter(c => {
        const nameLower = c.name.toLowerCase();

        // 1. ถ้าชื่อตรงเป๊ะๆ แบบ Substring
        if (nameLower.includes(targetName.toLowerCase())) return true;

        // 2. ถ้าพิมพ์แยกคำ (เช่น kave space) บังคับว่า "ทุกคำ" ต้องอยู่ในชื่อหอพัก (matchCount === targetKeywords.length)
        const matchCount = targetKeywords.filter(k => nameLower.includes(k)).length;

        // 🔥 แก้ตรงนี้: เปลี่ยนจากหลวมๆ (>= 0.5) เป็นต้องตรงครบทุกคำ!
        return matchCount > 0 && matchCount === targetKeywords.length;
    });
}

// ════════════════════════════════════════════════════════════════
// 🤖 TOOL DEFINITIONS
// ════════════════════════════════════════════════════════════════
const agentTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
        type: "function",
        function: {
            name: "search_dorm_database",
            description:
                "ค้นหาหอพักใกล้ ม.กรุงเทพ รังสิต ตามงบประมาณหรือชื่อหอพัก " +
                "ใช้เมื่อผู้ใช้ถามว่า 'หอพักราคาไม่เกิน X', 'หอพักถูก/แพง', " +
                "'แนะนำหอพัก', หรือถามชื่อหอพักเฉพาะเจาะจง " +
                "❌ ห้ามใช้เมื่อผู้ใช้ระบุระยะทาง → ให้ใช้ filter_by_distance แทน " +
                "❌ ห้ามใช้เมื่อต้องการเปรียบเทียบหอพัก 2 แห่งขึ้นไป → ให้ใช้ compare_dorms แทน",
            parameters: {
                type: "object",
                properties: {
                    max_price: { type: "number", description: "ราคาสูงสุดต่อเดือน (บาท) ถ้าไม่ระบุให้ส่ง null" },
                    sort_by: { type: "string", enum: ["distance", "price_asc", "price_desc"], description: "การเรียงลำดับ" },
                    target_dorm_name: { type: "string", description: "ชื่อหอพักที่ผู้ใช้ถามเจาะจง เช่น 'Plum Condo' หรือ 'kave space' ถ้าไม่ระบุให้ส่ง null" }
                },
                required: ["sort_by"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "filter_by_distance",
            description: "ค้นหาหอพักโดยกรองตามระยะทางจาก ม.กรุงเทพ รังสิต",
            parameters: {
                type: "object",
                properties: {
                    max_distance_km: { type: "number", description: "ระยะทางสูงสุดจาก ม.กรุงเทพ (กิโลเมตร) เช่น 1.0, 2.5" },
                    max_price: { type: "number", description: "ราคาสูงสุดต่อเดือน (บาท) ถ้าไม่ระบุให้ส่ง null" },
                    sort_by: { type: "string", enum: ["distance", "price_asc", "price_desc"] }
                },
                required: ["max_distance_km", "sort_by"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "compare_dorms",
            description: "ดึงข้อมูลและเปรียบเทียบหอพัก 2 แห่งขึ้นไปแบบ side-by-side",
            parameters: {
                type: "object",
                properties: {
                    dorm_names: {
                        type: "array",
                        items: { type: "string" },
                        description: "รายชื่อหอพักที่ต้องการเปรียบเทียบ (อย่างน้อย 2 ชื่อ) เช่น ['Plum Condo', 'Kave']"
                    }
                },
                required: ["dorm_names"]
            }
        }
    }
];

// ════════════════════════════════════════════════════════════════
// POST handler
// ════════════════════════════════════════════════════════════════
export async function POST(request: Request) {
    try {
        const { message, history = [], session_id } = await request.json();
        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        // Get authenticated user (non-blocking — log works without auth too)
        let userId: string | null = null;
        try {
            const authSupabase = await createClient();
            const { data: { user } } = await authSupabase.auth.getUser();
            userId = user?.id ?? null;
        } catch { /* ignore auth errors for logging */ }

        const conversationHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
            (Array.isArray(history) ? history : [])
                .filter((m: any) => m?.role && m?.content)
                .map((m: any) => ({ role: m.role, content: String(m.content) }))
                .slice(-10);

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const send = (data: Record<string, unknown>) => {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                };

                try {
                    const logger = new RAGLogger(message, {
                        userId: userId ?? undefined,
                        sessionId: session_id ?? undefined,
                    });

                    logger.startStage('reasoning');
                    send({ stage: 'reasoning' });

                    const agentSystemPrompt =
                        `คุณคือ 'BU Dorms' ผู้เชี่ยวชาญด้านข้อมูลหอพักใกล้มหาวิทยาลัยกรุงเทพ (BU) รังสิต\n` +
                        `คาแรคเตอร์: สุภาพ มืออาชีพ ข้อมูลแน่น ชัดเจน และตรงไปตรงมา\n\n` +
                        `## ข้อมูลมหาวิทยาลัย:\n${BU_CONTEXT}\n\n` +
                        `## กฎการใช้ Tools (สำคัญมาก):\n` +
                        `1. เมื่อเรียกใช้ Tool ค้นหาและได้ข้อมูลหอพักมาแล้ว **ให้หยุดการเรียก Tool ทันที** และสร้างคำตอบจากข้อมูลนั้น\n` +
                        `2. ห้ามเรียก Tool เปรียบเทียบ (compare_dorms) ซ้ำซ้อน หากผู้ใช้ไม่ได้สั่งให้เปรียบเทียบโดยตรง\n` +
                        `3. หากข้อมูลใน Tool เพียงพอต่อการตอบคำถามแล้ว ให้เข้าสู่ขั้นตอนการตอบ (Answer) ทันที ห้ามวนลูป\n\n` +
                        `## หน้าที่ของคุณ (Autonomous Agent)\n` +
                        `1. วิเคราะห์คำถามและเลือกใช้ Tools เพื่อดึงข้อมูล เมื่อได้ข้อมูลแล้วให้สรุปเป็นคำตอบที่ละเอียดและครอบคลุมที่สุด\n` +
                        `2. หากผู้ใช้ถามนอกเรื่อง ให้ตอบปฏิเสธอย่างสุภาพแล้วดึงกลับมาเรื่องหอพัก\n\n` +
                        `## 💬 กฎการสื่อสารและการตอบคำถาม\n` +
                        `1. **การเริ่มต้น:** ให้ทวนคำถามหรือเงื่อนไขของผู้ใช้อย่างเป็นธรรมชาติ (เช่น "สำหรับหอพักในงบ 5,000 บาทที่ใกล้ ม.กรุงเทพ ที่คุณสนใจ มีรายการดังนี้ครับ")\n` +
                        `2. **การให้ข้อมูลที่แน่นและเจาะลึก:** ดึงข้อมูลจากส่วน <context_data> มานำเสนอให้ครบถ้วนที่สุด\n` +
                        `3. **ห้ามพิมพ์คำว่า [ประโยคเกริ่นนำ] หรือ [ประโยคปิดท้าย] ออกมาบนหน้าจอเด็ดขาด** ให้พิมพ์เป็นเนื้อหาภาษาคนตามปกติ\n` +
                        `4. **ความถูกต้อง:** ข้อมูลชื่อ ราคา ระยะทาง ต้องตรงตามที่ Tool ส่งมาเป๊ะๆ ห้ามแต่งเอง\n` +
                        `5. **การปิดบทสนทนา:** ทิ้งท้ายด้วยความยินดีให้บริการ\n\n` +
                        `⚠️ กฎเหล็กขั้นเด็ดขาด (CRITICAL RULES):\n` +
                        `1. ข้อมูลทั้งหมดต้องมาจากผลลัพธ์ของ Tools (role: 'tool') ท่านั้น ห้ามแต่งข้อมูลเองเด็ดขาด\n` +
                        `2. ถ้าระบบ Tool ตอบว่า 'ไม่พบข้อมูล' ให้คุณตอบขออภัยผู้ใช้ตรงๆ ห้ามเสนอหอพักอื่นที่เขาไม่ได้ถามหา\n\n` +
                        `3. ห้ามแอบอ้างหรือเสนอตัวว่ามีข้อมูล "รีวิวจากผู้พักจริง", "ความพึงพอใจ", หรือ "ระบบการจอง" เนื่องจากระบบปัจจุบันยังไม่รองรับข้อมูลส่วนนี้\n` +
                        `4. หากผู้ใช้ถามหารีวิวหรือการจอง ให้ตอบปฏิเสธอย่างสุภาพว่า "ขณะนี้ระบบยังไม่มีข้อมูลรีวิวและการจองโดยตรง" เท่านั้น\n` +
                        `5. ในประโยคปิดท้าย ให้เน้นการกระตุ้นให้ผู้ใช้คุยต่อเกี่ยวกับหอพักที่เพิ่งนำเสนอไป หรือเสนอให้ช่วยกรองข้อมูลในแง่มุมอื่นๆ เช่น 'อยากให้ลองดูห้องที่ราคาถูกลงกว่านี้ไหม' หรือ 'สนใจดูภาพของที่ไหนเพิ่มเติมแจ้งได้เลยนะ' เป็นต้น\n` +
                        `## 📝 รูปแบบการแสดงผล\n` +
                        `[เกริ่นนำด้วยสไตล์ที่สอดคล้องกับคาแรคเตอร์ผู้เชี่ยวชาญที่ใจดี ทวนคำถามสั้นๆ ให้ดูเป็นกันเอง]\n\n` +
                        `🏠 1. [ชื่อหอพัก]\n` +
                        `  💸 ราคา: [ราคา] บาท/เดือน\n` +
                        `  📍 ระยะทาง: [ระยะทาง]\n` +
                        `  🛋️ ภายในห้อง: [สรุปข้อมูลห้อง]\n` +
                        `  🏊‍♂️ ส่วนกลาง: [สรุปสิ่งอำนวยความสะดวก]\n` +
                        `  💡 จุดเด่น: [สรุปสั้นๆ ว่าที่นี่เหมาะกับใคร]\n\n` +
                        `(ทำซ้ำให้ครบทุกรายการที่ Tool ค้นพบ โดยเปลี่ยนตัวเลขลำดับ 🏠 1., 🏠 2. ไปเรื่อยๆ)\n\n` +
                        `[ปิดท้ายบทสนทนาด้วยการสรุปภาพรวมสั้นๆ หรือคำแนะนำที่ทำให้ผู้ใช้รู้สึกประทับใจ โดยสอบถามความสนใจเพิ่มเติมได้]`;

                    const messagesForAgent: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
                        { role: 'system', content: agentSystemPrompt },
                        ...conversationHistory,
                        { role: 'user', content: message }
                    ];

                    let finalAnswer = "";
                    let finalDorms: any[] = [];
                    let loopCount = 0;
                    const MAX_LOOPS = 5;

                    while (loopCount < MAX_LOOPS) {
                        loopCount++;
                        console.log(`🤖 ReAct Loop #${loopCount}`);

                        const agentResponse = await openai.chat.completions.create({
                            model: 'typhoon-v2.5-30b-a3b-instruct',
                            messages: messagesForAgent,
                            tools: agentTools,
                            tool_choice: 'auto',
                            temperature: 0.1,
                            max_tokens: 8000,
                        });

                        const responseMessage = agentResponse.choices[0].message;
                        messagesForAgent.push(responseMessage);

                        if (!responseMessage.tool_calls || responseMessage.tool_calls.length === 0) {
                            if (loopCount === 1) {
                                logger.logReasoning({
                                    is_dorm_query: false, sort_by: 'N/A' as any, max_price: null,
                                    total_raw_results: 0, after_filter_count: 0, top_k: 0,
                                    intent_summary: 'Non-dorm query → direct answer',
                                });
                                logger.endStage('reasoning');
                            }

                            logger.startStage('generation');
                            send({ stage: 'generation' });
                            finalAnswer = responseMessage.content || "ขออภัยครับ ไม่สามารถสร้างคำตอบได้ในขณะนี้";
                            logger.logLLMResponse(finalAnswer);
                            logger.endStage('generation');
                            break;
                        }

                        if (loopCount === 1) {
                            logger.logReasoning({
                                is_dorm_query: true,
                                sort_by: 'tool_call' as any,
                                max_price: null,
                                total_raw_results: 0, after_filter_count: 0, top_k: 0,
                                intent_summary: `Tool(s) selected: ${responseMessage.tool_calls.map(t => t.type === 'function' ? t.function.name : t.type).join(', ')}`,
                            });
                            logger.endStage('reasoning');
                        }

                        for (const toolCall of responseMessage.tool_calls) {
                            if (toolCall.type !== 'function') continue;

                            const fn = (toolCall as any).function;
                            if (!fn) continue;

                            const toolName = fn.name;
                            let args: any = {};
                            try { args = JSON.parse(fn.arguments); } catch { args = {}; }
                            console.log(`🔧 Tool: ${toolName}`, args);

                            let toolResultText = "";

                            // ══════════════════════════════════════════
                            // TOOL 1: search_dorm_database
                            // ══════════════════════════════════════════
                            if (toolName === "search_dorm_database") {
                                const maxPrice: number | null = (args.max_price && !isNaN(parseInt(String(args.max_price).replace(/,/g, ''), 10)))
                                    ? parseInt(String(args.max_price).replace(/,/g, ''), 10) : null;
                                const sortBy: 'distance' | 'price_asc' | 'price_desc' = args.sort_by || 'distance';
                                const targetDormName: string | null = args.target_dorm_name
                                    ? String(args.target_dorm_name).toLowerCase().trim() : null;

                                logger.startStage('search', { model: 'MiniLM-L12' });
                                send({ stage: 'search' });

                                const supabase = await createClient();
                                // 🔥 ดึงข้อมูลมา 1000 รายการ เพื่อไม่ให้หลุดแม้แต่ห้องเดียว!
                                const { candidates: rawCandidates, rawCount, rawDocs } =
                                    await embedAndRetrieve(message, 1000, maxPrice, supabase);

                                logger.endStage('search', { embedding_dim: 384 });

                                logger.startStage('retrieval', { filter_price: maxPrice });
                                send({ stage: 'retrieval' });

                                if (rawCount === 0) {
                                    toolResultText = "ระบบฐานข้อมูล: ไม่พบข้อมูลที่ตรงกับเงื่อนไข กรุณาตอบขออภัยผู้ใช้";
                                    logger.logReasoning({ is_dorm_query: true, sort_by: sortBy, max_price: maxPrice, total_raw_results: 0, after_filter_count: 0, top_k: 0, intent_summary: `search_dorm_database | No results` });
                                    logger.logRetrievedDocs([]);
                                    logger.endStage('retrieval', { raw_count: 0 });
                                } else {
                                    let candidates = [...rawCandidates];

                                    if (maxPrice !== null) {
                                        candidates = candidates.filter(c => c.price_val <= maxPrice);
                                    }

                                    // 🔥 กรองด้วยฟังก์ชัน Fuzzy Search ตัวใหม่!
                                    if (targetDormName) {
                                        candidates = filterCandidatesByTargetName(candidates, targetDormName);
                                    }

                                    candidates = sortCandidates(candidates, sortBy);

                                    // --- ตรรกะการเลือกให้หลากหลายแบบฉลาดขึ้น ---
                                    const uniqueProjects = new Set();
                                    const diverseResults: Candidate[] = [];

                                    // รอบแรก: พยายามหาโครงการที่ไม่ซ้ำกันก่อน
                                    for (const c of candidates) {
                                        const projectName = c.name.split(' (')[0].replace(/ตึก\s*\w+/g, '').replace(/ชั้น\s*\d+/g, '').trim();
                                        if (!uniqueProjects.has(projectName)) {
                                            diverseResults.push(c);
                                            uniqueProjects.add(projectName);
                                        }
                                        if (diverseResults.length >= 5) break;
                                    }

                                    // 🔥 เพิ่มส่วนนี้: ถ้าได้โครงการไม่ซ้ำมาไม่ครบ 5 แห่ง ให้เอาห้องที่เหลือของโครงการเดิมมาเติมให้เต็ม
                                    if (diverseResults.length < 5) {
                                        for (const c of candidates) {
                                            if (!diverseResults.find(item => item.name === c.name)) { // กันห้องซ้ำตัวเดิม
                                                diverseResults.push(c);
                                            }
                                            if (diverseResults.length >= 5) break;
                                        }
                                    }

                                    const topResults = diverseResults;

                                    const filteredDocsForLog: RetrievedDoc[] = topResults.map((c, i) => {
                                        const originalDoc = rawDocs.find(r => r.name === c.name);
                                        return {
                                            rank: i + 1,
                                            name: c.name,
                                            price: c.price,
                                            distance_km: c.distance_km === Infinity ? null : c.distance_km,
                                            similarity_score: originalDoc?.similarity_score ?? null,
                                            url: c.url
                                        };
                                    });
                                    logger.logRetrievedDocs(filteredDocsForLog);

                                    logger.logReasoning({
                                        is_dorm_query: true, sort_by: sortBy, max_price: maxPrice,
                                        total_raw_results: rawCount, after_filter_count: candidates.length, top_k: topResults.length,
                                        intent_summary: `search_dorm_database | Sort=${sortBy}, target=${targetDormName ?? 'any'}, top=${topResults.length}`,
                                    });
                                    logger.endStage('retrieval', { raw_count: rawCount });

                                    if (topResults.length === 0) {
                                        toolResultText = "ระบบฐานข้อมูล: พบข้อมูลเบื้องต้น แต่หลังกรองแล้วไม่พบหอพักที่ตรงกัน กรุณาตอบขออภัยผู้ใช้";
                                    } else {
                                        await hydrateImages(supabase, topResults);
                                        toolResultText = `ค้นพบ ${topResults.length} แห่ง:\n${buildContext(topResults)}`;
                                        finalDorms = topResults.map(item => ({
                                            name: item.name, price: item.price,
                                            distance_km: isFinite(item.distance_km) ? item.distance_km : null,
                                            distance_label: distanceLabel(item.distance_km),
                                            details: item.details, url: item.url, img: item.img1, images: item.images,
                                        }));
                                    }
                                }
                            }

                            // ══════════════════════════════════════════
                            // TOOL 2: filter_by_distance
                            // ══════════════════════════════════════════
                            else if (toolName === "filter_by_distance") {
                                const maxDistKm: number | null = (args.max_distance_km && !isNaN(parseFloat(String(args.max_distance_km))))
                                    ? parseFloat(String(args.max_distance_km)) : null;
                                const maxPrice: number | null = (args.max_price && !isNaN(parseInt(String(args.max_price).replace(/,/g, ''), 10)))
                                    ? parseInt(String(args.max_price).replace(/,/g, ''), 10) : null;
                                const sortBy: 'distance' | 'price_asc' | 'price_desc' = args.sort_by || 'distance';

                                if (maxDistKm === null) {
                                    toolResultText = "ระบบ Error: filter_by_distance ต้องการค่า max_distance_km กรุณาถามผู้ใช้ว่าต้องการระยะทางเท่าไหร่";
                                } else {
                                    logger.startStage('search', { model: 'MiniLM-L12' });
                                    send({ stage: 'search' });

                                    const supabase = await createClient();
                                    const { candidates: rawCandidates, rawCount, rawDocs } =
                                        await embedAndRetrieve(message, 1000, null, supabase);

                                    logger.endStage('search', { embedding_dim: 384 });

                                    logger.startStage('retrieval', { filter_distance_km: maxDistKm, filter_price: maxPrice });
                                    send({ stage: 'retrieval' });

                                    if (rawCount === 0) {
                                        toolResultText = "ระบบฐานข้อมูล: ไม่พบข้อมูลหอพัก กรุณาตอบขออภัยผู้ใช้";
                                        logger.logReasoning({ is_dorm_query: true, sort_by: sortBy, max_price: maxPrice, total_raw_results: 0, after_filter_count: 0, top_k: 0, intent_summary: `filter_by_distance | No raw results` });
                                        logger.logRetrievedDocs([]);
                                        logger.endStage('retrieval', { raw_count: 0 });
                                    } else {
                                        let candidates = [...rawCandidates];

                                        candidates = candidates.filter(c =>
                                            isFinite(c.distance_km) && c.distance_km <= maxDistKm
                                        );
                                        if (maxPrice !== null) {
                                            candidates = candidates.filter(c => c.price_val <= maxPrice);
                                        }

                                        candidates = sortCandidates(candidates, sortBy);

                                        // --- ตรรกะการเลือกให้หลากหลาย (Diversity) ---
                                        const uniqueProjects = new Set();
                                        const diverseResults: Candidate[] = [];

                                        for (const c of candidates) {
                                            const projectName = c.name
                                                .split(' (')[0]
                                                .replace(/ตึก\s*\w+/g, '')
                                                .replace(/ชั้น\s*\d+/g, '')
                                                .trim();

                                            if (!uniqueProjects.has(projectName)) {
                                                diverseResults.push(c);
                                                uniqueProjects.add(projectName);
                                            }
                                            if (diverseResults.length >= 5) break;
                                        }

                                        const topResults = diverseResults.length > 0 ? diverseResults : candidates.slice(0, 5);

                                        const filteredDocsForLog: RetrievedDoc[] = topResults.map((c, i) => {
                                            const originalDoc = rawDocs.find(r => r.name === c.name);
                                            return {
                                                rank: i + 1,
                                                name: c.name,
                                                price: c.price,
                                                distance_km: c.distance_km === Infinity ? null : c.distance_km,
                                                similarity_score: originalDoc?.similarity_score ?? null,
                                                url: c.url
                                            };
                                        });
                                        logger.logRetrievedDocs(filteredDocsForLog);

                                        logger.logReasoning({
                                            is_dorm_query: true, sort_by: sortBy, max_price: maxPrice,
                                            total_raw_results: rawCount, after_filter_count: candidates.length, top_k: topResults.length,
                                            intent_summary: `filter_by_distance | dist≤${maxDistKm}km, price≤${maxPrice ?? '∞'}, top=${topResults.length}`,
                                        });
                                        logger.endStage('retrieval', { raw_count: rawCount });

                                        if (topResults.length === 0) {
                                            toolResultText =
                                                `ระบบฐานข้อมูล: ไม่พบหอพักในระยะ ${maxDistKm} กม. จาก ม.กรุงเทพ ` +
                                                `(จากทั้งหมด ${rawCount} รายการ หลังกรองระยะทางแล้วเหลือ 0) ` +
                                                `กรุณาแจ้งผู้ใช้และแนะนำให้ขยายระยะทาง`;
                                        } else {
                                            await hydrateImages(supabase, topResults);
                                            toolResultText = `ค้นพบ ${topResults.length} แห่ง ในระยะ ${maxDistKm} กม.:\n${buildContext(topResults)}`;
                                            finalDorms = topResults.map(item => ({
                                                name: item.name, price: item.price,
                                                distance_km: isFinite(item.distance_km) ? item.distance_km : null,
                                                distance_label: distanceLabel(item.distance_km),
                                                details: item.details, url: item.url, img: item.img1, images: item.images,
                                            }));
                                        }
                                    }
                                }
                            }

                            // ══════════════════════════════════════════
                            // TOOL 3: compare_dorms
                            // ══════════════════════════════════════════
                            else if (toolName === "compare_dorms") {
                                let dormNames: string[] = [];
                                if (Array.isArray(args.dorm_names)) {
                                    dormNames = args.dorm_names;
                                } else if (typeof args.dorm_names === 'string') {
                                    dormNames = args.dorm_names.split(',').map((s: string) => s.trim());
                                }

                                if (dormNames.length < 2) {
                                    toolResultText = "ระบบ Error: ต้องการชื่อหอพักอย่างน้อย 2 ชื่อ กรุณาสอบถามผู้ใช้เพิ่มเติม";
                                    logger.logReasoning({ is_dorm_query: true, sort_by: 'distance', max_price: null, total_raw_results: 0, after_filter_count: 0, top_k: 0, intent_summary: `compare_dorms | Failed: <2 names` });
                                } else {
                                    logger.startStage('search', { model: 'MiniLM-L12' });
                                    send({ stage: 'search' });

                                    const supabase = await createClient();
                                    const { candidates: rawCandidates, rawCount, rawDocs } =
                                        await embedAndRetrieve(dormNames.join(' '), 1000, null, supabase);

                                    logger.endStage('search', { embedding_dim: 384 });

                                    logger.startStage('retrieval');
                                    send({ stage: 'retrieval' });

                                    if (rawCount === 0) {
                                        toolResultText = "ระบบฐานข้อมูล: ไม่พบข้อมูลหอพักที่ต้องการเปรียบเทียบ กรุณาตอบขออภัย";
                                        logger.logReasoning({ is_dorm_query: true, sort_by: 'distance', max_price: null, total_raw_results: 0, after_filter_count: 0, top_k: 0, intent_summary: `compare_dorms | No results` });
                                        logger.logRetrievedDocs([]);
                                        logger.endStage('retrieval', { raw_count: 0 });
                                    } else {
                                        // 🔥 ใช้ Fuzzy Keyword Matching ในการเปรียบเทียบด้วย!
                                        let matched: Candidate[] = [];
                                        dormNames.forEach(targetName => {
                                            const matchesForThisName = filterCandidatesByTargetName(rawCandidates, targetName);
                                            // เอาตัวที่เหมือนที่สุด (เรียงตามคะแนนที่ดึงมาจาก Faiss หรือใกล้สุด) มา 1 ตัว
                                            if (matchesForThisName.length > 0) {
                                                matched.push(matchesForThisName[0]);
                                            }
                                        });

                                        const topResults = sortCandidates(matched, 'distance').slice(0, 4);

                                        const filteredDocsForLog: RetrievedDoc[] = topResults.map((c, i) => {
                                            const originalDoc = rawDocs.find(r => r.name === c.name);
                                            return {
                                                rank: i + 1,
                                                name: c.name,
                                                price: c.price,
                                                distance_km: c.distance_km === Infinity ? null : c.distance_km,
                                                similarity_score: originalDoc?.similarity_score ?? null,
                                                url: c.url
                                            };
                                        });
                                        logger.logRetrievedDocs(filteredDocsForLog);

                                        logger.logReasoning({
                                            is_dorm_query: true, sort_by: 'distance', max_price: null,
                                            total_raw_results: rawCount, after_filter_count: matched.length, top_k: topResults.length,
                                            intent_summary: `compare_dorms | [${dormNames.join(', ')}] → found ${topResults.length}`,
                                        });
                                        logger.endStage('retrieval', { raw_count: rawCount });

                                        if (topResults.length < 2) {
                                            const foundName = topResults[0]?.name ?? 'ไม่พบ';
                                            toolResultText = `ระบบฐานข้อมูล: พบข้อมูลหอพักเพียง 1 แห่ง (${foundName}) ไม่เพียงพอต่อการเปรียบเทียบ กรุณาแจ้งผู้ใช้`;
                                        } else {
                                            await hydrateImages(supabase, topResults);
                                            toolResultText =
                                                `ข้อมูลสำหรับเปรียบเทียบ:\n${buildContext(topResults)}\n\n` +
                                                `คำสั่ง: กรุณาเปรียบเทียบหอพักเหล่านี้แบบ side-by-side ` +
                                                `(ชูจุดเด่น ราคา ระยะทาง สิ่งอำนวยความสะดวก) และสรุปคำแนะนำ`;
                                            finalDorms = topResults.map(item => ({
                                                name: item.name, price: item.price,
                                                distance_km: isFinite(item.distance_km) ? item.distance_km : null,
                                                distance_label: distanceLabel(item.distance_km),
                                                details: item.details, url: item.url, img: item.img1, images: item.images,
                                            }));
                                        }
                                    }
                                }
                            }

                            else {
                                toolResultText = `ระบบ Error: ไม่รองรับคำสั่ง '${toolName}'`;
                            }

                            const distanceKeywords = ['ใกล้', 'ไกล', 'กม', 'กิโล', 'เดิน', 'จักรยาน', 'ติดมหา', 'ระยะ', 'km'];
                            const messageHasDistance = distanceKeywords.some(k => message.includes(k));
                            if (
                                toolName === 'search_dorm_database' &&
                                messageHasDistance &&
                                !args.target_dorm_name
                            ) {
                                console.warn('⚠️ Intent mismatch detected: distance query routed to search_dorm_database');
                                toolResultText +=
                                    `\n\n[SYSTEM HINT]: ตรวจพบว่าผู้ใช้ระบุเรื่องระยะทางในคำถาม ` +
                                    `กรุณาเรียก filter_by_distance แทน search_dorm_database ในรอบถัดไป ` +
                                    `พร้อมระบุ max_distance_km ให้ถูกต้อง`;
                            }

                            messagesForAgent.push({
                                role: "tool",
                                tool_call_id: toolCall.id,
                                content: toolResultText
                            });
                        }
                    }

                    // ── เปลี่ยนจาก Error Message เป็นการพยายามตอบจาก Context ──
                    if (loopCount >= MAX_LOOPS && !finalAnswer) {
                        // แทนที่จะตอบว่านานเกินไป สั่งให้ AI สรุปจากข้อมูลที่บันทึกไว้ใน messagesForAgent เลย
                        const finalAttempt = await openai.chat.completions.create({
                            model: 'typhoon-v2.5-30b-a3b-instruct',
                            messages: [
                                ...messagesForAgent,
                                { role: 'user', content: 'สรุปคำตอบจากข้อมูลทั้งหมดที่มีตอนนี้ตามรูปแบบที่กำหนด (🏠)' }
                            ],
                            temperature: 0.1,
                        });
                        finalAnswer = finalAttempt.choices[0].message.content || "ขออภัยครับ ไม่พบข้อมูลที่ต้องการ กรุณาลองใหม่อีกครั้ง";
                    }

                    let answer = finalAnswer.replace(/\\n/g, '\n').replace(/\n{3,}/g, '\n\n');
                    const lines = answer.split('\n');
                    let cardIndex = 0;
                    const newLines: string[] = [];
                    for (const line of lines) {
                        newLines.push(line);
                        if (/^(🏠\s*)?\d+\./.test(line.trim()) && finalDorms.length > 0) {
                            cardIndex++;
                            if (cardIndex <= finalDorms.length) {
                                newLines.push(`[CARD_${cardIndex}]`);
                            }
                        }
                    }
                    answer = newLines.join('\n');

                    // Log the final AI response (ensures both tool and non-tool paths are captured)
                    logger.logLLMResponse(answer);
                    await logger.finalize();
                    send({ stage: 'done', result: answer, dorms: finalDorms, request_id: logger.getRequestId() });
                    controller.close();

                } catch (err: any) {
                    console.error('Stream Error:', err);
                    send({ error: true, result: err.message || 'เกิดข้อผิดพลาดในระบบ โปรดลองใหม่อีกครั้งครับ' });
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message || 'เกิดข้อผิดพลาดในระบบ' }, { status: 500 });
    }
}