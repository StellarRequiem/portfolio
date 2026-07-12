# MCP Authorization Assurance Proof

A public reference fixture for inspecting MCP-shaped HTTP authorization boundaries without connecting to an external service.

Run the self-contained fixture with Node.js 20 or newer:

```bash
node --test mcp-assurance/lab/mcp-authz-reference.test.mjs
```

It covers a clean minimally scoped read plus denials for missing bearer authorization, resource mismatch, audience mismatch, insufficient scope, session replay, token passthrough, and external-host preflight.

The repository also contains [`evidence.json`](./evidence.json), a bounded evidence snapshot from the broader controlled local proof suite.

This is fixture mechanics only. It is not a complete MCP/OAuth implementation, a protocol conformance suite, a production assessment, external-token test, independent certification, or a guarantee that unknown defects are caught.
