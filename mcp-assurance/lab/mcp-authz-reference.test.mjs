import http from "node:http";
import assert from "node:assert/strict";
import test from "node:test";

const RESOURCE = "mcp://fixture.local/records";
const TOKENS = {
  aliceRead: { subject: "alice", audience: RESOURCE, scopes: ["records:read"] },
  bobRead: { subject: "bob", audience: RESOURCE, scopes: ["records:read"] },
  aliceNarrow: { subject: "alice", audience: RESOURCE, scopes: ["profile:read"] },
  wrongAudience: { subject: "alice", audience: "mcp://fixture.local/other", scopes: ["records:read"] },
};

function respond(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

async function fixture() {
  const sessions = new Map();
  let serial = 0;
  const server = http.createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const rpc = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const token = request.headers.authorization?.replace("Bearer ", "");
    const claims = TOKENS[token];
    const deny = (status, code) => respond(response, status, { jsonrpc: "2.0", id: rpc.id, error: { code: -32001, data: { code } } });
    if (!claims) return deny(401, "bearer_required");
    if (request.headers["x-downstream-authorization"]) return deny(400, "token_passthrough_forbidden");
    if (request.headers["mcp-resource"] !== RESOURCE) return deny(403, "resource_mismatch");
    if (claims.audience !== RESOURCE) return deny(403, "audience_mismatch");
    if (rpc.method === "initialize") {
      const sessionId = `fixture-session-${++serial}`;
      sessions.set(sessionId, claims.subject);
      return respond(response, 200, { jsonrpc: "2.0", id: rpc.id, result: { sessionId } });
    }
    const sessionSubject = sessions.get(request.headers["mcp-session-id"]);
    if (!sessionSubject) return deny(403, "session_required");
    if (sessionSubject !== claims.subject) return deny(403, "session_subject_mismatch");
    if (!claims.scopes.includes("records:read")) return deny(403, "insufficient_scope");
    return respond(response, 200, { jsonrpc: "2.0", id: rpc.id, result: { content: [{ type: "text", text: "synthetic records" }] } });
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  return { baseUrl: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())) };
}

async function call(baseUrl, { token = "aliceRead", resource = RESOURCE, sessionId, method = "tools/call", downstreamAuthorization } = {}) {
  if (!baseUrl.startsWith("http://127.0.0.1:")) return { status: 0, code: "base_url_out_of_scope" };
  const headers = { "content-type": "application/json", authorization: `Bearer ${token}`, "mcp-resource": resource };
  if (sessionId) headers["mcp-session-id"] = sessionId;
  if (downstreamAuthorization) headers["x-downstream-authorization"] = downstreamAuthorization;
  const response = await fetch(`${baseUrl}/mcp`, { method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", id: "reference", method }) });
  const body = await response.json();
  return { status: response.status, code: body.error?.data?.code ?? null, body };
}

let api;
test.before(async () => { api = await fixture(); });
test.after(async () => { if (api) await api.close(); });

test("clean control: minimal scope can initialize and read", async () => {
  const init = await call(api.baseUrl, { method: "initialize" });
  const read = await call(api.baseUrl, { sessionId: init.body.result.sessionId });
  assert.equal(read.status, 200);
});

test("missing bearer is denied", async () => assert.equal((await call(api.baseUrl, { token: "unknown", method: "initialize" })).code, "bearer_required"));
test("wrong resource is denied", async () => assert.equal((await call(api.baseUrl, { resource: "mcp://fixture.local/other", method: "initialize" })).code, "resource_mismatch"));
test("wrong audience is denied", async () => assert.equal((await call(api.baseUrl, { token: "wrongAudience", method: "initialize" })).code, "audience_mismatch"));
test("underscoped tool call is denied", async () => {
  const init = await call(api.baseUrl, { token: "aliceNarrow", method: "initialize" });
  assert.equal((await call(api.baseUrl, { token: "aliceNarrow", sessionId: init.body.result.sessionId })).code, "insufficient_scope");
});
test("session replay by another subject is denied", async () => {
  const init = await call(api.baseUrl, { method: "initialize" });
  assert.equal((await call(api.baseUrl, { token: "bobRead", sessionId: init.body.result.sessionId })).code, "session_subject_mismatch");
});
test("token passthrough and external hosts are denied", async () => {
  assert.equal((await call(api.baseUrl, { method: "initialize", downstreamAuthorization: "synthetic" })).code, "token_passthrough_forbidden");
  assert.equal((await call("https://example.com")).code, "base_url_out_of_scope");
});
