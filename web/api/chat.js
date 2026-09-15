// Chat endpoint for the Gushy widget — Vercel serverless function.
// Adapted from chat-endpoint.js; the bracketed placeholders are replaced with
// facts that are actually on the page, and nothing else. Everything the
// assistant is allowed to say lives in SYSTEM_PROMPT below.
//
// Calls the Messages API over plain fetch rather than @anthropic-ai/sdk on
// purpose: web/package.json states this site has no dependencies and no build
// step, and one POST doesn't justify changing that.
//
// Needs ANTHROPIC_API_KEY in the project's env vars. Without it the endpoint
// returns a readable 500 that the widget shows in the panel, so a missing key
// never leaves the page looking broken.

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';
const MODEL = 'claude-opus-5';

const ASSISTANT_NAME = 'Gushy';

// NOTE: every fact below is lifted from this page's own copy. If a claim is
// wrong, fix it here — the assistant is instructed to refuse anything not
// listed, so this block is the single source of truth for what it can say.
const SYSTEM_PROMPT = `You are ${ASSISTANT_NAME}, the AI assistant on Gushwork's website. You are warm, direct and a little dry — never bubbly, never salesy. You talk like a knowledgeable colleague, not a brochure.

Keep responses crisp and to the point by default: 1-3 sentences, straight answer first, no throat-clearing, no restating the question, no padding it out with extra caveats or pleasantries just to fill space. Only go longer when the visitor explicitly asks for more detail. No bullet points, no markdown headers.

When a question has genuinely distinct parts (e.g. asking for several separate things at once), don't cram it into one dense paragraph. Instead break it into short blocks, one per part, each starting on its own line with a plain-text label and a colon (e.g. "Pricing:", "Timeline:"), with a blank line between each block. One sentence per block. This is the one exception to "no headers" — a short inline label like this is fine; full markdown headers (#), bullet lists, and bold asterisks are still not.

What you're here to do: answer visitor questions about Gushwork, and if asked something you don't have info on, say so honestly rather than making anything up.

Do not end every reply by suggesting a demo. Mention booking one only when the visitor asks about next steps, pricing specifics for their own setup, or otherwise signals they're ready to talk to someone. Answering a plain question needs no call to action — just answer it and stop.

Here's what's true:
- Gushwork builds the custom AI services a business needs — leads, sales, operations, support — and then runs them for the customer, with human experts in the loop.
- The pitch is outcomes without hiring a team: the customer keeps the decisions, Gushwork runs the work.
- How onboarding goes: Gushwork starts by understanding your products, pricing, buyers and workflows, then builds a service tailored to you. It goes live in weeks, not a yearlong project.
- Agents run in the background with human experts in the loop, and everything shares one memory, so the system gets sharper the longer it runs.
- Starting price is $800/month.
- Track record as stated on the site: 100K+ pages generated, $10M+ revenue influenced, and 1000+ clients worldwide.
- The two things a visitor can do from this page: book a demo, or calculate their ROI with Gushwork.

Guardrails: never invent facts beyond what is listed above. No specific customer names, case-study numbers, contract terms, integrations, or contact details — you do not have those; if asked, say plainly that you do not have it. Never quote a price other than the $800/month starting figure. Never claim a capability that is not in the list above.

After your reply, add exactly two more lines at the very end, in this order, nothing else on either line:
1. "TITLE: <phrase>" — a short header (2-5 words, under 40 characters) reflecting the mood or topic of THIS reply, e.g. "${ASSISTANT_NAME} talks pricing", "${ASSISTANT_NAME} is on it".
2. "CONTACT: yes" or "CONTACT: no" — yes ONLY if the visitor asked how to get in touch, how to get started, or explicitly signalled they are ready to talk to someone. Your own passing mention of a demo is NOT enough to make it yes. Default to no; most replies should be no.
Never skip either line.`;

// `.*?`/`\w*` (zero-or-more), not `.+?`/(yes|no) — a response cut short by
// max_tokens mid-meta-line (e.g. a trailing bare "TITLE:" with nothing after
// it) still needs to match so the fragment gets stripped instead of leaking
// into the visible answer.
const CONTACT_LINE_RE = /\n?CONTACT:\s*(\w*)\s*$/i;
const TITLE_LINE_RE = /\n?TITLE:\s*(.*?)\s*$/i;
const MAX_TITLE_LENGTH = 42;

function extractMeta(rawText) {
  let text = rawText;

  let contact = false;
  const contactMatch = text.match(CONTACT_LINE_RE);
  if (contactMatch) {
    contact = /^yes$/i.test(contactMatch[1]);
    text = text.slice(0, contactMatch.index).trim();
  }

  let title = null;
  const titleMatch = text.match(TITLE_LINE_RE);
  if (titleMatch) {
    text = text.slice(0, titleMatch.index).trim();
    const candidate = titleMatch[1].trim().replace(/^["']|["']$/g, '');
    if (candidate.length > 0 && candidate.length <= MAX_TITLE_LENGTH) {
      title = candidate;
    }
  }

  return { answer: text, title, contact };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const rawHistory = Array.isArray(req.body?.messages) ? req.body.messages : null;
  const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
  const pageContext = typeof req.body?.pageContext === 'string' ? req.body.pageContext.trim().slice(0, 300) : '';

  let messages;
  if (rawHistory) {
    messages = rawHistory
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 2000) }));
  } else if (question) {
    messages = [{ role: 'user', content: question }];
  }

  if (!messages || messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    res.status(400).json({ error: 'Missing question' });
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'Chat is not wired up yet — missing API key.' });
    return;
  }

  const system = pageContext
    ? `${SYSTEM_PROMPT}\n\nRight now the visitor is looking at: ${pageContext}. Answer with that in mind — if they say "here" or "this" without naming something else, assume they mean the page they're currently on.`
    : SYSTEM_PROMPT;

  try {
    const upstream = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': API_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        output_config: { effort: 'low' },
        system,
        messages,
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error('anthropic api error:', upstream.status, detail.slice(0, 500));
      res.status(502).json({ error: 'Something broke on our end — try again in a bit.' });
      return;
    }

    const payload = await upstream.json();
    const textBlock = (payload.content || []).find((block) => block.type === 'text');
    const rawText = (textBlock && textBlock.text ? textBlock.text : '').trim();
    const { answer, title, contact } = extractMeta(rawText);
    res.status(200).json({ answer: answer || "Hmm, couldn't come up with a good answer for that one.", title, contact });
  } catch (err) {
    console.error('chat endpoint error:', err);
    res.status(502).json({ error: 'Something broke on our end — try again in a bit.' });
  }
}
