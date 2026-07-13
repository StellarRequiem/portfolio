"""Verify the expected public-safe FastMCP scenario contract."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
EXPECTED = {
    "clean_control": (True, 200, None, True),
    "unsigned_envelope_denied": (False, 403, "agent_envelope_required", False),
    "wrong_agent_signature_denied": (False, 400, "agent_signature_invalid", False),
    "operation_replay_denied": (False, 400, "operation_replayed", False),
    "revoked_key_denied": (False, 403, "agent_key_revoked", False),
    "external_host_denied": (False, 0, "base_url_out_of_scope", False),
}


def main() -> None:
    report = json.loads((ROOT / "artifacts" / "latest-scenarios.json").read_text(encoding="utf-8"))
    assert report["schema"] == "xclusivexo.fastmcp-signed-agent-scenario-report.v1"
    assert report["classification"] == "fixture_mechanics_only"
    assert report["fastmcp"] == {
        "package": "fastmcp",
        "version": "3.4.4",
        "transport": "streamable_http_json_stateless",
    }
    assert report["statusSemantics"] == "fixture_policy_status"
    assert report["externalActionsExecuted"] == 0
    assert len(report["scenarios"]) == len(EXPECTED)
    for scenario in report["scenarios"]:
        contract = EXPECTED.get(scenario["id"])
        assert contract is not None, f"unexpected scenario: {scenario['id']}"
        actual = (scenario["ok"], scenario["status"], scenario["errorCode"], scenario["toolsListed"])
        assert actual == contract, scenario["id"]
        assert scenario["externalActionsExecuted"] == 0, scenario["id"]
    print(json.dumps({"verified": True, "scenarios": len(report["scenarios"])}, indent=2))


if __name__ == "__main__":
    main()
