// deno-lint-ignore-file no-explicit-any
// Generates an AI summary, flags and recommendations for a submitted report
// using Claude Haiku 4.5 (claude-haiku-4-5-20251001).
//
// Two invocation modes:
//
//   1. DB webhook (preferred) — Supabase dashboard → Database → Webhooks,
//      AFTER UPDATE on reports, condition status='submitted'.
//      Body shape: { type, table, record, old_record }.
//
//   2. Direct invoke (for backfill):
//      POST body: { reportId: string }
//
// Env vars:
//   ANTHROPIC_API_KEY           — sk-ant-...
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto set by Supabase)

import { preflight, json } from '../_shared/cors.ts';
import { adminClient } from '../_shared/supabaseAdmin.ts';

interface DbWebhookPayload {
  type: 'INSERT' | 'UPDATE';
  table: string;
  record: { id: string; status: string };
  old_record: { status?: string } | null;
}

function isWebhookPayload(p: any): p is DbWebhookPayload {
  return p && typeof p.table === 'string' && p.table === 'reports' && p.record?.id;
}

interface ClaudeJsonResponse {
  summary: string;
  flags: string[];
  recommendations: string;
}

async function callClaude(prompt: string): Promise<ClaudeJsonResponse> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system:
        'You are analysing a mystery-diner visit report for a UK hospitality ' +
        'client. Respond with ONLY a JSON object matching the requested shape. ' +
        'No prose outside the JSON.',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude API ${res.status}: ${body}`);
  }

  const data = await res.json() as { content: { type: string; text?: string }[] };
  const text = data.content.find(c => c.type === 'text')?.text ?? '';

  // Try to parse JSON out of the response (strip any code fences defensively).
  const cleaned = text.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');

  try {
    const parsed = JSON.parse(cleaned) as Partial<ClaudeJsonResponse>;
    return {
      summary: parsed.summary ?? '',
      flags: Array.isArray(parsed.flags) ? parsed.flags.filter(f => typeof f === 'string') : [],
      recommendations: parsed.recommendations ?? '',
    };
  } catch (err) {
    console.error('Failed to parse Claude response', cleaned);
    throw new Error(`Claude returned non-JSON: ${(err as Error).message}`);
  }
}

function buildPrompt(
  restaurantName: string,
  answers: Record<string, any>,
  proformaQuestions: Array<{ id: string; label: string; category: string; type: string }>,
): string {
  const questionMap = new Map(proformaQuestions.map(q => [q.id, q]));
  const SCORE_LABEL = ['Poor', 'Fair', 'Good', 'Excellent'];

  const lines: string[] = [];
  for (const [qId, answer] of Object.entries(answers)) {
    const q = questionMap.get(qId);
    const label = q?.label ?? qId;
    const category = q?.category ?? 'General';
    const a = answer as any;

    if (a?.score !== undefined) {
      lines.push(`[${category}] ${label}: ${SCORE_LABEL[a.score] ?? a.score}${a.notes ? ` — "${a.notes}"` : ''}`);
    } else if (a?.value !== undefined) {
      lines.push(`[${category}] ${label}: ${a.value ? 'Yes' : 'No'}`);
    } else if (a?.text) {
      lines.push(`[${category}] ${label}: "${a.text}"`);
    }
  }

  return `Restaurant: ${restaurantName}

Mystery diner answers:
${lines.join('\n')}

Respond with ONLY this JSON shape:
{
  "summary": "2-3 sentence plain-English summary of the visit, written for the restaurant owner",
  "flags": ["short", "urgent issue", "tags"],
  "recommendations": "One or two sentences naming the lowest-scoring categories as constructive focus areas, e.g. \\"Lowest scoring areas: Staff Greeting, Drinks Speed.\\""
}

Rules:
- flags should only contain URGENT issues (hygiene, rude staff, excessive waits, safety). If none, return [].
- Keep it professional and constructive. This will be read by restaurant managers.
- Do not include markdown or prose outside the JSON.`;
}

async function summariseReport(reportId: string) {
  const sb = adminClient();

  const { data: report, error } = await sb
    .from('reports')
    .select(`
      id,
      answers,
      restaurant:restaurants(id, name)
    `)
    .eq('id', reportId)
    .single();
  if (error || !report) throw new Error(`Report ${reportId} not found`);

  const restaurantId = (report as any).restaurant?.id;
  const restaurantName = (report as any).restaurant?.name ?? 'the restaurant';

  // Fetch the latest proforma for this restaurant so we know each question label
  const { data: proforma } = await sb
    .from('proformas')
    .select('questions')
    .eq('restaurant_id', restaurantId)
    .order('version', { ascending: false })
    .limit(1)
    .single();
  const questions = ((proforma as any)?.questions ?? []) as Array<{
    id: string; label: string; category: string; type: string;
  }>;

  const prompt = buildPrompt(restaurantName, (report as any).answers ?? {}, questions);
  const aiResult = await callClaude(prompt);

  await sb
    .from('reports')
    .update({
      ai_summary: aiResult.summary,
      ai_flags: aiResult.flags,
      ai_recommendations: aiResult.recommendations,
    })
    .eq('id', reportId);

  return aiResult;
}

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const payload = await req.json();

    let reportId: string | null = null;
    if (isWebhookPayload(payload)) {
      const submittedNow =
        payload.record.status === 'submitted'
        && payload.old_record?.status !== 'submitted';
      if (!submittedNow) return json({ skipped: true });
      reportId = payload.record.id;
    } else if (typeof payload.reportId === 'string') {
      reportId = payload.reportId;
    }

    if (!reportId) return json({ error: 'reportId required' }, 400);

    const result = await summariseReport(reportId);
    return json({ reportId, ...result });
  } catch (err) {
    console.error('summarise-report error', err);
    return json({ error: (err as Error).message }, 500);
  }
});
