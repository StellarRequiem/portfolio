"""Integration tests for the isolated FastMCP signed-agent fixture."""

from __future__ import annotations

import json
import unittest

from client import call_fastmcp_signed_agent_tool
from identity import build_signed_operation, create_fixture_agent, create_forest_style_lineage, export_fixture_registration
from server import create_fastmcp_signed_agent_fixture


class FastMcpSignedAgentIntegrationTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.alpha = create_fixture_agent(lineage=create_forest_style_lineage(role="worker", purpose="fastmcp_records_read", sequence=41))
        self.beta = create_fixture_agent(
            lineage=create_forest_style_lineage(role="worker", purpose="fastmcp_profile_read", sequence=42),
            allowed_tools=("fixture.profile.read",),
            allowed_scopes=("profile:read",),
        )
        self.fixture = await create_fastmcp_signed_agent_fixture(
            registrations=[export_fixture_registration(self.alpha), export_fixture_registration(self.beta)],
            now=lambda: 1_000,
        )

    async def asyncTearDown(self) -> None:
        await self.fixture.close()

    async def test_fastmcp_client_initializes_discovers_and_reads_synthetic_records(self) -> None:
        result = await call_fastmcp_signed_agent_tool(
            base_url=self.fixture.base_url,
            agent=self.alpha,
            operation_id="fastmcp-clean",
            discover=True,
        )
        self.assertTrue(result["ok"], result)
        self.assertEqual(len(result["tools"]), 1)
        self.assertEqual(result["tools"][0].name, "fixture.records.read")
        self.assertFalse(result["result"].is_error)
        self.assertEqual(result["externalActionsExecuted"], 0)

    async def test_missing_signed_agent_envelope_is_refused(self) -> None:
        result = await call_fastmcp_signed_agent_tool(
            base_url=self.fixture.base_url,
            agent=self.alpha,
            include_envelope=False,
        )
        self.assertFalse(result["ok"])
        self.assertEqual(result["errorCode"], "agent_envelope_required")

    async def test_signature_from_another_agent_is_refused(self) -> None:
        forged = build_signed_operation(self.beta, agent_id=self.alpha.agent_id, operation_id="fastmcp-wrong-key")
        forged["envelope"]["lineageHash"] = self.alpha.lineage_hash
        forged["envelope"]["keyId"] = self.alpha.key_id
        result = await call_fastmcp_signed_agent_tool(base_url=self.fixture.base_url, agent=self.beta, signed=forged)
        self.assertFalse(result["ok"])
        self.assertEqual(result["status"], 400)
        self.assertEqual(result["errorCode"], "agent_signature_invalid")

    async def test_replayed_signed_operation_is_refused(self) -> None:
        signed = build_signed_operation(self.alpha, operation_id="fastmcp-replay")
        first = await call_fastmcp_signed_agent_tool(base_url=self.fixture.base_url, agent=self.alpha, signed=signed)
        replay = await call_fastmcp_signed_agent_tool(base_url=self.fixture.base_url, agent=self.alpha, signed=signed)
        self.assertTrue(first["ok"], first)
        self.assertFalse(replay["ok"])
        self.assertEqual(replay["status"], 400)
        self.assertEqual(replay["errorCode"], "operation_replayed")

    async def test_revoked_key_is_refused(self) -> None:
        revoked = create_fixture_agent(lineage=create_forest_style_lineage(role="worker", purpose="fastmcp_revoked", sequence=43))
        self.assertTrue(self.fixture.state.gate.register(export_fixture_registration(revoked)).ok)
        self.assertTrue(self.fixture.state.gate.revoke(agent_id=revoked.agent_id, key_id=revoked.key_id).ok)
        result = await call_fastmcp_signed_agent_tool(base_url=self.fixture.base_url, agent=revoked, operation_id="fastmcp-revoked")
        self.assertFalse(result["ok"])
        self.assertEqual(result["errorCode"], "agent_key_revoked")

    async def test_non_loopback_target_is_refused_before_fetch(self) -> None:
        result = await call_fastmcp_signed_agent_tool(base_url="https://example.invalid", agent=self.alpha)
        self.assertEqual(
            result,
            {"ok": False, "status": 0, "errorCode": "base_url_out_of_scope", "toolsListed": False, "externalActionsExecuted": 0},
        )

    async def test_receipt_omits_operation_and_identity_material(self) -> None:
        signed = build_signed_operation(self.alpha, operation_id="fastmcp-private-operation")
        result = await call_fastmcp_signed_agent_tool(base_url=self.fixture.base_url, agent=self.alpha, signed=signed)
        receipt = json.dumps(result["receipt"], sort_keys=True)
        self.assertNotIn(signed["envelope"]["signature"], receipt)
        self.assertNotIn(signed["envelope"]["operationId"], receipt)
        self.assertNotIn(self.alpha.fingerprint, receipt)


if __name__ == "__main__":
    unittest.main(verbosity=2)
