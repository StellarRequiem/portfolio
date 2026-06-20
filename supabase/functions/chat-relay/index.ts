// supabase/functions/chat-relay/index.ts
// SERVER-ENFORCED chat moderation relay for the xclusivexo village.
//
// Client calls this via supabase.functions.invoke('chat-relay', { body:{ realm, name, text, pid } }).
// On CLEAN content (text AND name both pass the server filter) it broadcasts to the PRIVATE topic
// `chat:<realm>` via the Realtime REST batch API using the service-role/secret key (BYPASSRLS) — the
// ONLY write path. Anon clients can SELECT-subscribe `chat:<realm>` to RECEIVE, but have NO INSERT
// policy, so they cannot broadcast directly.
//
// WHY THIS IS ONLY TAMPER-PROOF AFTER THE CUTOVER (the load-bearing fact):
//   Per the current Supabase docs (verified June 2026), "To enforce private channels you need to
//   disable the 'Allow public access' setting in Realtime Settings." The setting is PROJECT-WIDE
//   binary (allow-public  vs.  private-only) — there is NO per-channel coexistence mode that enforces.
//   While public access is ON, a tampered client can subscribe/send on the SAME topic name with
//   config:{ private:false }, which Realtime treats as a DISTINCT public channel where the
//   realtime.messages RLS deny is NEVER evaluated (Supabase Discussion #29334). So this relay's
//   guarantee holds ONLY once the operator flips the project to private-only AND the realm:%
//   allow-policies are in place first. See account/CHAT_MODERATION.md for the safe-order cutover.
//
// Verified API shapes (live Supabase docs, June 2026):
//   - Broadcast REST batch: POST {SUPABASE_URL}/realtime/v1/api/broadcast
//       headers { apikey: <secret>, Content-Type: application/json }    (apikey-only; see note at send)
//       body   { "messages":[ { "topic","event","payload","private":true } ] }   -> 202 Accepted
//     (each message object carries its own "private" flag in the batch endpoint; the single-event
//      endpoint instead uses ?private=true as a query param — do NOT mix them.)
//   - service_role / secret key uses BYPASSRLS, "skipping any and all Row Level Security policies"
//     (docs/guides/api/api-keys) — that is how this relay writes while anon cannot.
//   - Deno runtime, Deno.serve handler. SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY auto-injected.
//
// SECRET HANDLING: the service-role/secret key is read ONLY from Deno.env, NEVER hardcoded, NEVER
// logged (only resp.status is logged on failure), NEVER reflected into the client response, and used
// for exactly one broadcast fetch. No request data is echoed into any other privileged call.

// ── CORS: allowlist, not wildcard (review SHOULD-FIX #4) ──
// Echo the request Origin back ONLY if it is on the allowlist; otherwise emit no ACAO header (the
// browser then blocks the cross-origin read). CORS is browser-only and does NOT stop curl/server
// callers — the real gates are the server filter + the RLS deny + the (post-cutover) private-only
// enforcement. This just removes arbitrary in-browser pages as an amplifier.
const ALLOWED_ORIGINS = new Set<string>([
  "https://xclusivexo.com",
  "https://www.xclusivexo.com",
  "http://127.0.0.1:8137", // local dev (village_check / static preview)
  "http://localhost:8137",
]);

function corsFor(origin: string | null): Record<string, string> {
  const h: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) h["Access-Control-Allow-Origin"] = origin;
  return h;
}

const json = (body: unknown, cors: Record<string, string>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

// ── server-side blocklist (authoritative; the client copy is advisory UX only) ──
const BADWORDS = [
  "fuck", "shit", "bitch", "asshole", "cunt", "dick", "piss", "bastard", "slut", "whore",
  "fag", "retard", "nigger", "spic", "kike", "chink", "tranny", "faggot",
]; // STARTER list — a FLOOR, not a ceiling. Static blocklists miss novel evasion, context, and
// non-English; swap in an AI/Perspective moderation call here without any client change for the
// real gate. The normalization below raises the floor against the common evasions.

// ── homoglyph / confusables fold: map common non-ASCII look-alikes to their ASCII letter ──
// Covers Cyrillic look-alikes, Greek, and a few accented forms most often used to dodge a blocklist.
// Fullwidth (U+FF21..FF5A) is handled by NFKC; this table covers what NFKC does NOT fold.
const HOMOGLYPHS: Record<string, string> = {
  "а": "a", "ѕ": "s", "е": "e", "о": "o", "р": "p", "с": "c", "у": "y", "х": "x", "к": "k",
  "і": "i", "ї": "i", "ј": "j", "м": "m", "н": "h", "т": "t", "в": "b", "ԁ": "d", "ɡ": "g", "ո": "n",
  "α": "a", "ε": "e", "ο": "o", "ρ": "p", "ϲ": "c", "τ": "t", "ι": "i", "κ": "k", "ν": "v",
  "à": "a", "á": "a", "â": "a", "ä": "a", "ã": "a", "å": "a", "é": "e", "è": "e", "ê": "e",
  "ë": "e", "í": "i", "ì": "i", "î": "i", "ï": "i", "ó": "o", "ò": "o", "ô": "o", "ö": "o",
  "õ": "o", "ú": "u", "ù": "u", "û": "u", "ü": "u", "ñ": "n", "ç": "c", "ý": "y", "ÿ": "y",
  "ı": "i", "ƒ": "f", "ѵ": "v", "ѡ": "w",
};

// normalize BEFORE the blocklist (review SHOULD-FIX #5): NFKC -> strip zero-width/combining marks ->
// fold homoglyphs to ASCII -> leetspeak -> strip non-letters (defeats "f u c k") -> collapse runs
// (defeats "fuuuuck"). Strictly raises the floor over the previous ASCII-only normalizer.
function chatNorm(s: string): string {
  let n = (s || "").normalize("NFKC").toLowerCase();
  // strip zero-width + word-joiner + BOM + soft hyphen, then combining marks (U+0300..036F):
  n = n.replace(/[​-‍⁠﻿­]/g, "");
  n = n.replace(/[̀-ͯ]/g, "");
  // fold homoglyphs:
  n = n.replace(/[À-￿]/g, (ch) => HOMOGLYPHS[ch] ?? ch);
  // leetspeak:
  n = n.replace(/[@4]/g, "a")
       .replace(/[3]/g, "e")
       .replace(/[1!|]/g, "i")
       .replace(/[0]/g, "o")
       .replace(/[$5]/g, "s")
       .replace(/[7]/g, "t");
  n = n.replace(/[^a-z]+/g, "");      // strip spaces/punct/leftover non-letters
  n = n.replace(/(.)\1{2,}/g, "$1");  // collapse 3+ runs -> single
  return n;
}
function isBad(text: string): boolean {
  const n = chatNorm(text);
  for (const w of BADWORDS) if (n.indexOf(w) >= 0) return true;
  return false;
}

// ── best-effort per-identity rate limit ──
// HONEST LIMIT (review SHOULD-FIX #8): this Map lives in ONE warm isolate. Supabase Edge Functions
// scale horizontally and recycle isolates, so this resets per cold-start and is per-instance, NOT a
// hard cross-instance limit. A flooder exploiting instance churn can exceed it. It is keyed on the
// JWT `sub` when present (not the user-supplied name, which is spoofable). The durable-counter
// upgrade path: an atomic Postgres counter (an RPC the relay calls) or Redis keyed on sub+realm,
// plus a per-realm ceiling — that breaks strict ephemerality, so it is documented, not built.
const RATE_MS = 1200; // min gap between messages per identity per realm
const lastSent = new Map<string, number>();
function rateOk(key: string): boolean {
  const now = Date.now();
  const prev = lastSent.get(key) || 0;
  if (now - prev < RATE_MS) return false;
  lastSent.set(key, now);
  if (lastSent.size > 5000) { // bound the map so it can't grow unboundedly on a long-lived instance
    const cutoff = now - 60_000;
    for (const [k, t] of lastSent) if (t < cutoff) lastSent.delete(k);
  }
  return true;
}

const MAX_LEN = 200;          // text cap
const MAX_NAME = 24;          // display-name cap
const MAX_PID = 64;           // presenceKey cap (positions a bubble only; not a trust boundary)
const REALM_RE = /^[a-z0-9]{2,40}$/; // realms + private link-spaces (matches the client's id rule)
const PID_RE = /^[A-Za-z0-9_-]{1,64}$/; // safe presenceKey shape

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const cors = corsFor(origin);

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ rejected: true, reason: "method" }, cors, 405);

  // ── input validation (review SHOULD-FIX #6): body must be a JSON object; each field type-checked,
  //    length-capped, and (realm/pid) pattern-checked. Reject junk rather than coercing it. ──
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ rejected: true, reason: "bad_json" }, cors, 400);
  }
  if (typeof body !== "object" || body === null) {
    return json({ rejected: true, reason: "bad_body" }, cors, 400);
  }
  const b = body as Record<string, unknown>;

  // realm: must be a string matching the safe pattern (gates which topic we can fan out to)
  if (typeof b.realm !== "string") return json({ rejected: true, reason: "bad_realm" }, cors, 400);
  const realm = b.realm.toLowerCase();
  if (!REALM_RE.test(realm)) return json({ rejected: true, reason: "bad_realm" }, cors, 400);

  // name: must be a string; trimmed + capped; defaulted if empty
  if (b.name !== undefined && typeof b.name !== "string") {
    return json({ rejected: true, reason: "bad_name" }, cors, 400);
  }
  const name = (typeof b.name === "string" ? b.name : "").trim().slice(0, MAX_NAME) || "someone";

  // text: must be a string; trimmed + capped; non-empty
  if (typeof b.text !== "string") return json({ rejected: true, reason: "bad_text" }, cors, 400);
  const text = b.text.trim().slice(0, MAX_LEN);
  if (!text) return json({ rejected: true, reason: "empty" }, cors, 400);

  // pid: OPTIONAL sender presenceKey, echoed so the bubble floats over the right critter
  // (review NIT #9). NOT a trust boundary — it only positions a UI bubble — but validate its shape
  // so we never fan out arbitrary junk. Still apply the name/text filter regardless.
  let pid: string | undefined;
  if (b.pid !== undefined) {
    if (typeof b.pid !== "string" || !PID_RE.test(b.pid.slice(0, MAX_PID))) {
      return json({ rejected: true, reason: "bad_pid" }, cors, 400);
    }
    pid = b.pid.slice(0, MAX_PID);
  }

  // ── per-identity rate limit (best-effort) ──
  // identity = caller JWT sub if present (invoke auto-attaches the anon/publishable token), else
  // name+realm fallback. NOTE: the anon JWT's sub is shared across anon sessions, so this is a weak
  // identity until real auth (even anonymous sign-in) gives a stable per-user sub. Keyed on sub, NOT
  // the user-supplied name (which a tampered client fully controls).
  let identity = name + "@" + realm;
  try {
    const auth = req.headers.get("Authorization") || "";
    const jwt = auth.replace(/^Bearer\s+/i, "");
    const part = jwt.split(".")[1];
    if (part) {
      const claims = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
      if (claims?.sub) identity = String(claims.sub) + "@" + realm;
    }
  } catch { /* fall back to name+realm */ }
  if (!rateOk(identity)) return json({ rejected: true, reason: "rate" }, cors, 429);

  // ── content blocklist on BOTH text AND name (review SHOULD-FIX #3) ──
  // The original ran isBad() on text only, so a tampered client could smuggle a slur in `name`.
  if (isBad(text) || isBad(name)) return json({ rejected: true, reason: "blocked" }, cors);

  // ── CLEAN -> broadcast to the PRIVATE topic chat:<realm> via the Realtime REST batch endpoint ──
  // Send ONLY the apikey header (the service/secret key). Do NOT add an empty Authorization header:
  // the supabase-js REST fallback sends an empty Authorization that 500s (supabase-js #1936); a
  // manual apikey-only fetch returns 202. We never log or reflect the key.
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); // auto-injected; BYPASSRLS
  if (!SUPABASE_URL || !SECRET) return json({ rejected: true, reason: "server_misconfig" }, cors, 500);

  // pid echoed for bubble placement; if absent we fall back to the rate-limit identity (the self-echo
  // already shows the local user's own bubble, so a missing pid only loses the over-critter bubble).
  const payload = { pid: pid ?? identity, name, text, t: Date.now() };
  const resp = await fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SECRET },
    body: JSON.stringify({
      messages: [
        { topic: `chat:${realm}`, event: "chat", payload, private: true },
      ],
    }),
  });

  if (!resp.ok) {
    // do not leak the upstream body to the client; log status only (NEVER the key)
    console.error("broadcast failed", resp.status);
    return json({ rejected: true, reason: "broadcast_failed" }, cors, 502);
  }
  return json({ ok: true }, cors);
});
