# FastMCP Signed-Agent Reference Fixture

Status: public, synthetic, local-only reproduction fixture.

This directory contains the FastMCP `3.4.4` portion of the published
MCP-assurance evidence. It binds only to an operator-owned `127.0.0.1`
endpoint using stateless JSON Streamable HTTP. Native `on_call_tool`
middleware reads request headers before FastMCP dispatches the one static,
read-only tool.

The application-layer policy checks a synthetic bearer marker, resource
binding, active key, Ed25519 signature, exact tool/argument binding, scope,
expiry, replay, and a local-only target rule. The fixture has no real MCP
server, OAuth issuer, account, customer data, credential, or external target.

## Run

From a clone of this repository, using Python 3.11 or newer:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r mcp-assurance/fastmcp-signed-agent/requirements.txt
cd mcp-assurance/fastmcp-signed-agent
../../.venv/bin/python -W error::ResourceWarning -m unittest -v test_integration.py
../../.venv/bin/python run_scenarios.py
../../.venv/bin/python verify_scenarios.py
```

The checked-in `artifacts/latest-scenarios.json` is a sanitized six-scenario
receipt. Running `run_scenarios.py` refreshes it locally.

## Contract

The contract contains one clean synthetic read plus denials for a missing
envelope, forged signature, replayed operation, revoked key, and a
non-loopback target before fetch. Its `status` values are application-policy
classifications. Refused FastMCP tool calls are MCP tool errors, not asserted
HTTP authorization response statuses.

## Boundaries

This is an application-layer fixture, not an MCP identity extension, FastMCP
security assessment, protocol conformance result, cross-framework
interoperability result, OAuth deployment, production key-management system,
or production security claim. It is a reproducible local comparison boundary,
not a shared production implementation.
