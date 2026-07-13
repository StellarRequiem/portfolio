"""Generate the public-safe FastMCP signed-agent scenario receipt."""

from __future__ import annotations

import asyncio
import importlib.metadata
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from client import call_fastmcp_signed_agent_tool
from identity import build_signed_operation, create_fixture_agent, create_forest_style_lineage, export_fixture_registration
from server import create_fastmcp_signed_agent_fixture

ROOT = Path(__file__).resolve().parent


def public_scenario(identifier: str, result: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": identifier,
        "ok": result["ok"],
        "status": result["status"],
        "errorCode": result["errorCode"],
        "toolsListed": result.get("toolsListed", False),
        "externalActionsExecuted": result["externalActionsExecuted"],
    }


async def build_report() -> dict[str, Any]:
    alpha = create_fixture_agent(lineage=create_forest_style_lineage(role="worker", purpose="fastmcp_records_read", sequence=51))
    beta = create_fixture_agent(
        lineage=create_forest_style_lineage(role="worker", purpose="fastmcp_profile_read", sequence=52),
        allowed_tools=("fixture.profile.read",),
        allowed_scopes=("profile:read",),
    )
    fixture = await create_fastmcp_signed_agent_fixture(
        registrations=[export_fixture_registration(alpha), export_fixture_registration(beta)],
        now=lambda: 1_000,
    )
    try:
        clean = await call_fastmcp_signed_agent_tool(
            base_url=fixture.base_url,
            agent=alpha,
            operation_id="fastmcp-scenario-clean",
            discover=True,
        )
        unsigned = await call_fastmcp_signed_agent_tool(
            base_url=fixture.base_url,
            agent=alpha,
            include_envelope=False,
            operation_id="fastmcp-scenario-unsigned",
        )
        forged = build_signed_operation(beta, agent_id=alpha.agent_id, operation_id="fastmcp-scenario-wrong-key")
        forged["envelope"]["lineageHash"] = alpha.lineage_hash
        forged["envelope"]["keyId"] = alpha.key_id
        wrong_key = await call_fastmcp_signed_agent_tool(base_url=fixture.base_url, agent=beta, signed=forged)
        replay_signed = build_signed_operation(alpha, operation_id="fastmcp-scenario-replay")
        await call_fastmcp_signed_agent_tool(base_url=fixture.base_url, agent=alpha, signed=replay_signed)
        replay = await call_fastmcp_signed_agent_tool(base_url=fixture.base_url, agent=alpha, signed=replay_signed)
        revoked = create_fixture_agent(lineage=create_forest_style_lineage(role="worker", purpose="fastmcp_revoked", sequence=53))
        fixture.state.gate.register(export_fixture_registration(revoked))
        fixture.state.gate.revoke(agent_id=revoked.agent_id, key_id=revoked.key_id)
        revoked_result = await call_fastmcp_signed_agent_tool(
            base_url=fixture.base_url,
            agent=revoked,
            operation_id="fastmcp-scenario-revoked",
        )
        external = await call_fastmcp_signed_agent_tool(
            base_url="https://example.invalid",
            agent=alpha,
            operation_id="fastmcp-scenario-external",
        )
        return {
            "schema": "xclusivexo.fastmcp-signed-agent-scenario-report.v1",
            "classification": "fixture_mechanics_only",
            "generatedAt": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
            "fastmcp": {
                "package": "fastmcp",
                "version": importlib.metadata.version("fastmcp"),
                "transport": "streamable_http_json_stateless",
            },
            "statusSemantics": "fixture_policy_status",
            "externalActionsExecuted": 0,
            "scenarios": [
                public_scenario("clean_control", clean),
                public_scenario("unsigned_envelope_denied", unsigned),
                public_scenario("wrong_agent_signature_denied", wrong_key),
                public_scenario("operation_replay_denied", replay),
                public_scenario("revoked_key_denied", revoked_result),
                public_scenario("external_host_denied", external),
            ],
            "caveat": "Operator-owned FastMCP 3.4.4 loopback fixture using stateless JSON Streamable HTTP. The signed-agent envelope is application-layer policy, not an MCP standard, FastMCP-wide assessment, interoperability result, or conformance result. Scenario status values classify fixture-policy decisions; denied tool calls are MCP tool errors, not asserted HTTP authorization statuses.",
        }
    finally:
        await fixture.close()


async def main() -> None:
    report = await build_report()
    artifact_directory = ROOT / "artifacts"
    artifact_directory.mkdir(exist_ok=True)
    (artifact_directory / "latest-scenarios.json").write_text(f"{json.dumps(report, indent=2)}\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
