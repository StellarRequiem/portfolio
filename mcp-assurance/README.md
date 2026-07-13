# MCP Authorization Assurance Proofs

Public reference fixtures for inspecting bounded MCP-shaped authorization
mechanics without connecting to an external service.

## Authorization-boundary reference

Run the self-contained Node.js fixture with Node 20 or newer:

```bash
node --test mcp-assurance/lab/mcp-authz-reference.test.mjs
```

It covers a clean minimally scoped read plus denials for missing bearer
authorization, resource mismatch, audience mismatch, insufficient scope,
session replay, token passthrough, and external-host preflight.

## FastMCP signed-agent reference

[`fastmcp-signed-agent/`](./fastmcp-signed-agent/) is a separate local
implementation boundary. It uses FastMCP `3.4.4` native middleware around one
synthetic, read-only tool and a local Ed25519 signed-agent envelope.

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r mcp-assurance/fastmcp-signed-agent/requirements.txt
cd mcp-assurance/fastmcp-signed-agent
../../.venv/bin/python -W error::ResourceWarning -m unittest -v test_integration.py
../../.venv/bin/python run_scenarios.py
../../.venv/bin/python verify_scenarios.py
```

The FastMCP fixture records one clean control plus denials for a missing
envelope, forged signature, replayed operation, revoked key, and non-loopback
target before fetch. Its checked-in scenario receipt and evidence snapshot are
sanitized public artifacts.

## Local replay-record reference

[`replay-record/`](./replay-record/) is a self-contained Node.js fixture for a
synthetic replay record. It writes a digest-only JSON record through exclusive
file creation, rejects a valid repeated claim, and fails closed on deliberately
malformed replay state.

```bash
cd mcp-assurance/replay-record
node --test test-file-replay-ledger.mjs
```

The direct public test covers six replay-record checks: first claim, ordinary
replay, twelve-process contention, sequential fresh-process replay, digest-only
storage, and malformed/interrupted marker refusal. The checked-in signed-agent
scenario receipt and evidence snapshot describe a broader local fixture result;
they are not an independent public execution of every local identity test.

The repository contains bounded evidence snapshots for the original fixture
([`evidence.json`](./evidence.json)) and the FastMCP fixture
([`fastmcp-signed-agent/evidence.json`](./fastmcp-signed-agent/evidence.json)),
plus the replay-record fixture
([`replay-record/evidence.json`](./replay-record/evidence.json)).

These are fixture mechanics only. They are not complete MCP/OAuth
implementations, protocol conformance suites, production assessments,
external-token tests, independent certifications, cross-framework
interoperability results, recovery from forced process kills or power loss,
or guarantees that unknown defects are caught.
