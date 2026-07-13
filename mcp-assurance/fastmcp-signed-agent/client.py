"""FastMCP client helper that keeps fixture traffic on loopback."""

from __future__ import annotations

import base64
import importlib.metadata
import json
from typing import Any
from urllib.parse import urlsplit

from fastmcp import Client
from fastmcp.client.transports import StreamableHttpTransport

from identity import FIXTURE_METHOD, FIXTURE_RESOURCE, FIXTURE_TOOL, FixtureAgent, build_signed_operation
from server import FIXTURE_BEARER

DENIAL_CODES = {
    "agent_envelope_invalid",
    "agent_envelope_required",
    "agent_key_revoked",
    "agent_key_not_active",
    "agent_lineage_mismatch",
    "agent_signature_invalid",
    "agent_tool_not_allowed",
    "bearer_required",
    "method_mismatch",
    "operation_parameters_mismatch",
    "operation_replayed",
    "resource_mismatch",
}

POLICY_STATUS_BY_CODE = {
    "agent_envelope_invalid": 400,
    "agent_envelope_required": 403,
    "agent_key_revoked": 403,
    "agent_key_not_active": 403,
    "agent_lineage_mismatch": 400,
    "agent_signature_invalid": 400,
    "agent_tool_not_allowed": 403,
    "bearer_required": 401,
    "method_mismatch": 403,
    "operation_parameters_mismatch": 400,
    "operation_replayed": 400,
    "resource_mismatch": 403,
}


def is_loopback_base_url(base_url: str) -> bool:
    parsed = urlsplit(base_url)
    return parsed.scheme == "http" and parsed.hostname in {"127.0.0.1", "localhost", "::1"}


def envelope_header(signed: dict[str, Any]) -> str:
    body = json.dumps(signed["envelope"], sort_keys=True, separators=(",", ":")).encode("utf-8")
    return base64.urlsafe_b64encode(body).rstrip(b"=").decode("ascii")


def result_error_code(result: Any) -> str:
    for content in getattr(result, "content", []):
        text = getattr(content, "text", "")
        for code in DENIAL_CODES:
            if code in text:
                return code
    return "fastmcp_tool_denied"


def receipt_for(*, base_url: str, include_envelope: bool, outcome: dict[str, Any]) -> dict[str, Any]:
    return {
        "schema": "xclusivexo.fixture-receipt.v1",
        "assuranceLevel": "fixture_mechanics_only",
        "lab": "fastmcp-signed-agent-integration",
        "inputs": {
            "baseUrlClass": "loopback" if is_loopback_base_url(base_url) else "out_of_scope",
            "agentEnvelopePresent": include_envelope,
            "fastmcp": f"fastmcp@{importlib.metadata.version('fastmcp')}",
            "toolClass": "fixture_allowed",
        },
        "events": [{"verdict": "pass" if outcome["ok"] else "deny", "status": outcome["status"], "reason": outcome["errorCode"] or "fixture_read_authorized"}],
        "outputs": {
            "ok": outcome["ok"],
            "status": outcome["status"],
            "errorCode": outcome["errorCode"],
            "externalActionsExecuted": 0,
        },
        "caveats": [
            "Operator-owned loopback FastMCP fixture only; no external MCP server, OAuth issuer, account, customer data, or production credential was used.",
            "Application-layer signed-agent envelope only; this is not an MCP identity standard, FastMCP-wide result, interoperability claim, or conformance result.",
            "Receipts omit bearer values, key bytes, signatures, agent fingerprints, session IDs, and operation identifiers.",
        ],
    }


async def call_fastmcp_signed_agent_tool(
    *,
    base_url: str,
    agent: FixtureAgent,
    signed: dict[str, Any] | None = None,
    operation_id: str = "fastmcp-signed-call",
    include_envelope: bool = True,
    discover: bool = False,
) -> dict[str, Any]:
    if not is_loopback_base_url(base_url):
        return {"ok": False, "status": 0, "errorCode": "base_url_out_of_scope", "toolsListed": False, "externalActionsExecuted": 0}
    operation = signed or build_signed_operation(
        agent,
        operation_id=operation_id,
        resource=FIXTURE_RESOURCE,
        method=FIXTURE_METHOD,
        params={"name": FIXTURE_TOOL, "arguments": {}},
    )
    headers = {
        "authorization": f"Bearer {FIXTURE_BEARER}",
        "mcp-resource": FIXTURE_RESOURCE,
    }
    if include_envelope:
        headers["x-fixture-agent-envelope"] = envelope_header(operation)
    transport = StreamableHttpTransport(f"{base_url}/mcp", headers=headers)
    client = Client(transport, name="fastmcp-signed-agent-fixture-client")
    tools: list[Any] = []
    try:
        async with client:
            if discover:
                tools = await client.list_tools()
            result = await client.call_tool(FIXTURE_TOOL, {}, raise_on_error=False)
            if result.is_error:
                error_code = result_error_code(result)
                outcome = {
                    "ok": False,
                    "status": POLICY_STATUS_BY_CODE.get(error_code, 403),
                    "errorCode": error_code,
                    "toolsListed": bool(tools),
                    "externalActionsExecuted": 0,
                }
            else:
                outcome = {
                    "ok": True,
                    "status": 200,
                    "errorCode": None,
                    "toolsListed": bool(tools),
                    "tools": tools,
                    "result": result,
                    "externalActionsExecuted": 0,
                }
    except Exception as error:  # Fixture transport errors are returned as bounded evidence, not raised into callers.
        outcome = {
            "ok": False,
            "status": 0,
            "errorCode": "fastmcp_transport_error",
            "errorName": type(error).__name__,
            "toolsListed": bool(tools),
            "externalActionsExecuted": 0,
        }
    finally:
        await client.close()
    outcome["receipt"] = receipt_for(base_url=base_url, include_envelope=include_envelope, outcome=outcome)
    return outcome
