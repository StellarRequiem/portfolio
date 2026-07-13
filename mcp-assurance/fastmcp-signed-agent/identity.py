"""Fixture-only signed-agent policy for the FastMCP integration lab."""

from __future__ import annotations

import base64
import hashlib
import json
from dataclasses import dataclass, field
from typing import Any, Callable

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

FIXTURE_RESOURCE = "mcp://fixture.local/records"
FIXTURE_TOOL = "fixture.records.read"
FIXTURE_METHOD = "tools/call"
FIXTURE_SCOPE = "records:read"


def stable_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def sha256(value: Any) -> str:
    serialized = value if isinstance(value, bytes) else (value if isinstance(value, str) else stable_json(value))
    return hashlib.sha256(serialized.encode("utf-8") if isinstance(serialized, str) else serialized).hexdigest()


def b64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def b64url_decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def normalize_part(value: Any) -> str:
    return "_".join("".join(char for char in part if char.isalnum()) for part in str(value).strip().upper().split()).strip("_")


def create_forest_style_lineage(
    *,
    spawn_time: str = "2026-07-13-00-00-00",
    tier: int = 1,
    role: str = "worker",
    purpose: str = "general",
    sequence: int = 0,
) -> dict[str, Any]:
    normalized_role = normalize_part(role)
    normalized_purpose = normalize_part(purpose)
    return {
        "spawnTime": spawn_time,
        "tier": tier,
        "role": normalized_role,
        "purpose": normalized_purpose,
        "sequence": sequence,
        "agentId": f"F-{spawn_time}-L{tier}-{normalized_role}-{normalized_purpose}-{sequence:03d}",
    }


@dataclass
class FixtureAgent:
    agent_id: str
    lineage: dict[str, Any]
    lineage_hash: str
    allowed_tools: tuple[str, ...]
    allowed_scopes: tuple[str, ...]
    key_not_before: int
    key_expires_at: int | None
    private_key: Ed25519PrivateKey
    public_key: Ed25519PublicKey
    fingerprint: str
    key_id: str

    def sign(self, payload: dict[str, Any]) -> str:
        return b64url_encode(self.private_key.sign(stable_json(payload).encode("utf-8")))


def create_fixture_agent(
    *,
    agent_id: str | None = None,
    lineage: dict[str, Any] | None = None,
    allowed_tools: tuple[str, ...] = (FIXTURE_TOOL,),
    allowed_scopes: tuple[str, ...] = (FIXTURE_SCOPE,),
    key_not_before: int = 0,
    key_expires_at: int | None = None,
) -> FixtureAgent:
    resolved_lineage = dict(lineage or create_forest_style_lineage(role="fixture_agent", purpose=agent_id or "local_operation"))
    resolved_agent_id = agent_id or str(resolved_lineage["agentId"])
    resolved_lineage["agentId"] = resolved_agent_id
    private_key = Ed25519PrivateKey.generate()
    public_key = private_key.public_key()
    public_der = public_key.public_bytes(Encoding.DER, PublicFormat.SubjectPublicKeyInfo)
    fingerprint = sha256(public_der)[:24]
    return FixtureAgent(
        agent_id=resolved_agent_id,
        lineage=resolved_lineage,
        lineage_hash=sha256(resolved_lineage),
        allowed_tools=allowed_tools,
        allowed_scopes=allowed_scopes,
        key_not_before=key_not_before,
        key_expires_at=key_expires_at,
        private_key=private_key,
        public_key=public_key,
        fingerprint=fingerprint,
        key_id=f"fixture-ed25519-{fingerprint}",
    )


def export_fixture_registration(agent: FixtureAgent) -> dict[str, Any]:
    return {
        "agentId": agent.agent_id,
        "lineageHash": agent.lineage_hash,
        "keyId": agent.key_id,
        "fingerprint": agent.fingerprint,
        "publicKey": b64url_encode(agent.public_key.public_bytes(Encoding.Raw, PublicFormat.Raw)),
        "allowedTools": list(agent.allowed_tools),
        "allowedScopes": list(agent.allowed_scopes),
        "keyNotBefore": agent.key_not_before,
        "keyExpiresAt": agent.key_expires_at,
    }


@dataclass(frozen=True)
class GateResult:
    ok: bool
    status: int
    error_code: str | None
    external_actions_executed: int = 0
    agent_fingerprint: str | None = None


@dataclass
class Registration:
    agent_id: str
    lineage_hash: str
    key_id: str
    fingerprint: str
    public_key: Ed25519PublicKey
    allowed_tools: set[str]
    allowed_scopes: set[str]
    key_not_before: int
    key_expires_at: int | None


def denied(error_code: str, status: int = 403) -> GateResult:
    return GateResult(ok=False, status=status, error_code=error_code)


@dataclass
class AgentIdentityGate:
    now: Callable[[], int] = lambda: 0
    registrations: dict[str, Registration] = field(default_factory=dict)
    revoked_keys: set[str] = field(default_factory=set)
    used_operation_ids: set[str] = field(default_factory=set)

    def register(self, registration: dict[str, Any]) -> GateResult:
        try:
            agent_id = str(registration["agentId"])
            key_id = str(registration["keyId"])
            lineage_hash = str(registration["lineageHash"])
            public_key = Ed25519PublicKey.from_public_bytes(b64url_decode(str(registration["publicKey"])))
            key_not_before = int(registration["keyNotBefore"])
            key_expires_at = registration["keyExpiresAt"]
            if key_expires_at is not None:
                key_expires_at = int(key_expires_at)
        except (KeyError, TypeError, ValueError):
            return denied("registration_invalid", 400)
        if key_expires_at is not None and key_not_before >= key_expires_at:
            return denied("registration_validity_invalid", 400)
        self.registrations[agent_id] = Registration(
            agent_id=agent_id,
            lineage_hash=lineage_hash,
            key_id=key_id,
            fingerprint=str(registration.get("fingerprint", "")),
            public_key=public_key,
            allowed_tools=set(registration.get("allowedTools", [])),
            allowed_scopes=set(registration.get("allowedScopes", [])),
            key_not_before=key_not_before,
            key_expires_at=key_expires_at,
        )
        return GateResult(ok=True, status=201, error_code=None)

    def revoke(self, *, agent_id: str, key_id: str) -> GateResult:
        record = self.registrations.get(agent_id)
        if record is None or record.key_id != key_id:
            return denied("revocation_key_mismatch", 400)
        self.revoked_keys.add(key_id)
        return GateResult(ok=True, status=200, error_code=None)

    def authorize(self, *, envelope: dict[str, Any] | None, operation: dict[str, Any]) -> GateResult:
        if not isinstance(envelope, dict):
            return denied("agent_envelope_required")
        record = self.registrations.get(str(envelope.get("agentId", "")))
        if record is None:
            return denied("agent_unregistered")
        current_time = self.now()
        if envelope.get("keyId") in self.revoked_keys:
            return denied("agent_key_revoked")
        if envelope.get("keyId") != record.key_id:
            return denied("agent_key_not_active")
        if current_time < record.key_not_before:
            return denied("agent_key_not_yet_valid")
        if record.key_expires_at is not None and current_time >= record.key_expires_at:
            return denied("agent_key_expired")
        if envelope.get("lineageHash") != record.lineage_hash:
            return denied("agent_lineage_mismatch", 400)
        if envelope.get("resource") != FIXTURE_RESOURCE or operation.get("resource") != FIXTURE_RESOURCE:
            return denied("resource_mismatch")
        if envelope.get("method") != FIXTURE_METHOD or operation.get("method") != FIXTURE_METHOD:
            return denied("method_mismatch")
        if operation.get("params", {}).get("name") not in record.allowed_tools:
            return denied("agent_tool_not_allowed")
        if envelope.get("scope") not in record.allowed_scopes:
            return denied("agent_scope_not_allowed")
        try:
            issued_at = int(envelope["issuedAt"])
            expires_at = int(envelope["expiresAt"])
        except (KeyError, TypeError, ValueError):
            return denied("operation_validity_invalid", 400)
        if issued_at > current_time:
            return denied("operation_not_yet_valid", 400)
        if expires_at <= current_time:
            return denied("operation_expired", 400)
        if envelope.get("paramsHash") != sha256(operation.get("params", {})):
            return denied("operation_parameters_mismatch", 400)
        signed_payload = {
            "agentId": envelope.get("agentId"),
            "lineageHash": envelope.get("lineageHash"),
            "keyId": envelope.get("keyId"),
            "operationId": envelope.get("operationId"),
            "issuedAt": issued_at,
            "expiresAt": expires_at,
            "resource": envelope.get("resource"),
            "method": envelope.get("method"),
            "scope": envelope.get("scope"),
            "paramsHash": envelope.get("paramsHash"),
        }
        try:
            record.public_key.verify(b64url_decode(str(envelope.get("signature", ""))), stable_json(signed_payload).encode("utf-8"))
        except (InvalidSignature, ValueError):
            return denied("agent_signature_invalid", 400)
        operation_id = envelope.get("operationId")
        if not isinstance(operation_id, str) or not operation_id:
            return denied("operation_id_invalid", 400)
        if operation_id in self.used_operation_ids:
            return denied("operation_replayed", 400)
        self.used_operation_ids.add(operation_id)
        return GateResult(ok=True, status=200, error_code=None, agent_fingerprint=record.fingerprint)


def build_signed_operation(
    agent: FixtureAgent,
    *,
    operation_id: str = "fixture-operation-1",
    issued_at: int = 1_000,
    expires_at: int = 61_000,
    resource: str = FIXTURE_RESOURCE,
    method: str = FIXTURE_METHOD,
    scope: str = FIXTURE_SCOPE,
    params: dict[str, Any] | None = None,
    agent_id: str | None = None,
) -> dict[str, Any]:
    resolved_params = params or {"name": FIXTURE_TOOL, "arguments": {}}
    payload = {
        "agentId": agent_id or agent.agent_id,
        "lineageHash": agent.lineage_hash,
        "keyId": agent.key_id,
        "operationId": operation_id,
        "issuedAt": issued_at,
        "expiresAt": expires_at,
        "resource": resource,
        "method": method,
        "scope": scope,
        "paramsHash": sha256(resolved_params),
    }
    return {
        "operation": {"resource": resource, "method": method, "params": resolved_params},
        "envelope": {**payload, "signature": agent.sign(payload)},
    }
