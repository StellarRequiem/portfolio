"""Loopback-only FastMCP server used by the signed-agent fixture."""

from __future__ import annotations

import asyncio
import base64
import json
import socket
from dataclasses import dataclass, field
from typing import Any, Callable

import uvicorn
from fastmcp import FastMCP
from fastmcp.exceptions import ToolError
from fastmcp.server.dependencies import get_http_headers
from fastmcp.server.middleware import CallNext, Middleware, MiddlewareContext

from identity import AgentIdentityGate, FIXTURE_METHOD, FIXTURE_RESOURCE, FIXTURE_TOOL

FIXTURE_BEARER = "fixture.fastmcp.signed-agent.read"
RECORDS = (
    {"id": "fastmcp-fixture-record-1", "value": 12},
    {"id": "fastmcp-fixture-record-2", "value": 27},
)


@dataclass
class FixtureState:
    gate: AgentIdentityGate
    requests: list[dict[str, str | None]] = field(default_factory=list)


class SignedAgentMiddleware(Middleware):
    """Verify the synthetic signed envelope before FastMCP dispatches the tool."""

    def __init__(self, state: FixtureState) -> None:
        self.state = state

    async def on_call_tool(self, context: MiddlewareContext[Any], call_next: CallNext[Any, Any]) -> Any:
        headers = get_http_headers(include_all=True)
        if headers.get("authorization") != f"Bearer {FIXTURE_BEARER}":
            self.state.requests.append({"method": "tools/call", "outcome": "bearer_required"})
            raise ToolError("bearer_required")
        if headers.get("mcp-resource") != FIXTURE_RESOURCE:
            self.state.requests.append({"method": "tools/call", "outcome": "resource_mismatch"})
            raise ToolError("resource_mismatch")
        raw_envelope = headers.get("x-fixture-agent-envelope")
        if raw_envelope is None:
            self.state.requests.append({"method": "tools/call", "outcome": "agent_envelope_required"})
            raise ToolError("agent_envelope_required")
        try:
            decoded = base64.urlsafe_b64decode(raw_envelope + "=" * (-len(raw_envelope) % 4))
            envelope = json.loads(decoded.decode("utf-8"))
        except (ValueError, UnicodeDecodeError, json.JSONDecodeError):
            self.state.requests.append({"method": "tools/call", "outcome": "agent_envelope_invalid"})
            raise ToolError("agent_envelope_invalid")
        operation = {
            "resource": FIXTURE_RESOURCE,
            "method": FIXTURE_METHOD,
            "params": {"name": context.message.name, "arguments": context.message.arguments or {}},
        }
        decision = self.state.gate.authorize(envelope=envelope, operation=operation)
        if not decision.ok:
            self.state.requests.append({"method": "tools/call", "outcome": decision.error_code})
            raise ToolError(str(decision.error_code))
        self.state.requests.append({"method": "tools/call", "outcome": "agent_authorized"})
        return await call_next(context)


@dataclass
class FastMcpSignedAgentFixture:
    base_url: str
    state: FixtureState
    server: uvicorn.Server
    server_task: asyncio.Task[None]
    listener: socket.socket

    async def close(self) -> None:
        self.server.should_exit = True
        try:
            await asyncio.wait_for(self.server_task, timeout=5)
        finally:
            self.listener.close()


async def create_fastmcp_signed_agent_fixture(
    *,
    registrations: list[dict[str, Any]] | None = None,
    now: Callable[[], int] = lambda: 1_000,
    host: str = "127.0.0.1",
) -> FastMcpSignedAgentFixture:
    if host != "127.0.0.1":
        raise ValueError("fixture_host_must_be_loopback")
    gate = AgentIdentityGate(now=now)
    for registration in registrations or []:
        result = gate.register(registration)
        if not result.ok:
            raise ValueError(f"registration_failed:{result.error_code}")
    state = FixtureState(gate=gate)
    mcp = FastMCP(
        "fastmcp-signed-agent-fixture",
        instructions="Synthetic loopback fixture. It exposes no external data or side effects.",
        middleware=[SignedAgentMiddleware(state)],
        mask_error_details=False,
    )

    @mcp.tool(name=FIXTURE_TOOL, annotations={"readOnlyHint": True, "destructiveHint": False, "openWorldHint": False})
    async def fixture_records_read() -> dict[str, Any]:
        return {"fixture": True, "readOnly": True, "records": list(RECORDS)}

    app = mcp.http_app(
        path="/mcp",
        transport="streamable-http",
        stateless_http=True,
        json_response=True,
        allowed_hosts=["127.0.0.1", "localhost"],
        host_origin_protection=True,
    )
    listener = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    listener.bind((host, 0))
    listener.listen(16)
    listener.setblocking(False)
    port = int(listener.getsockname()[1])
    server = uvicorn.Server(
        uvicorn.Config(
            app,
            host=host,
            port=port,
            lifespan="on",
            log_level="warning",
            access_log=False,
        )
    )
    server_task = asyncio.create_task(server.serve(sockets=[listener]))
    for _ in range(100):
        if server.started:
            return FastMcpSignedAgentFixture(
                base_url=f"http://{host}:{port}",
                state=state,
                server=server,
                server_task=server_task,
                listener=listener,
            )
        if server_task.done():
            listener.close()
            await server_task
        await asyncio.sleep(0.01)
    server.should_exit = True
    listener.close()
    await asyncio.wait_for(server_task, timeout=5)
    raise RuntimeError("fixture_start_timeout")
