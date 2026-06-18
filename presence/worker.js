// Live-presence counter for the Bifrost Village — Cloudflare Worker + Durable Object.
// Counts UNIQUE visitor IPs currently connected (one person with several tabs counts once),
// broadcasts the live count to every connected client over WebSocket. Ephemeral: no storage,
// no accounts, no PII retained (IPs live only in memory for the life of a connection).
//
// Deploy: see DEPLOY.md. Endpoint after deploy: wss://api.xclusivexo.com/presence

const ALLOW_ORIGINS = ["https://xclusivexo.com", "https://www.xclusivexo.com", "http://localhost:8137"];

function corsHeaders(origin) {
  const ok = ALLOW_ORIGINS.includes(origin);
  return {
    "access-control-allow-origin": ok ? origin : "https://xclusivexo.com",
    "access-control-allow-methods": "GET,OPTIONS",
    "access-control-allow-headers": "content-type",
  };
}

export class Presence {
  constructor(state, env) {
    this.state = state;
    this.byIp = new Map(); // ip -> Set<WebSocket>  (unique IPs = the headcount)
  }

  count() { return this.byIp.size; }

  broadcast() {
    const msg = JSON.stringify({ count: this.count() });
    for (const set of this.byIp.values()) {
      for (const ws of set) { try { ws.send(msg); } catch (e) { /* dropped below on close */ } }
    }
  }

  add(ip, ws) {
    let set = this.byIp.get(ip);
    if (!set) { set = new Set(); this.byIp.set(ip, set); }
    set.add(ws);
  }

  remove(ip, ws) {
    const set = this.byIp.get(ip);
    if (set) { set.delete(ws); if (set.size === 0) this.byIp.delete(ip); }
  }

  async fetch(request) {
    // plain GET -> JSON snapshot (handy for a health check / non-socket clients)
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response(JSON.stringify({ count: this.count() }),
        { headers: { "content-type": "application/json", "access-control-allow-origin": "*" } });
    }
    const ip = request.headers.get("CF-Connecting-IP") || "anon";
    const pair = new WebSocketPair();
    const client = pair[0], server = pair[1];
    server.accept();
    this.add(ip, server);
    this.broadcast();
    const drop = () => { this.remove(ip, server); this.broadcast(); };
    server.addEventListener("close", drop);
    server.addEventListener("error", drop);
    return new Response(null, { status: 101, webSocket: client });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders(origin) });
    if (url.pathname === "/presence") {
      // one global room ("village"); a Durable Object keeps the live set in memory
      const id = env.PRESENCE.idFromName("village");
      return env.PRESENCE.get(id).fetch(request);
    }
    return new Response("Bifrost Village presence — try /presence", { headers: corsHeaders(origin) });
  },
};
