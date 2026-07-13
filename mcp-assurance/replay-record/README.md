# Local Replay-Record Reference

This public fixture is a narrow, local-only reproduction of replay-record
mechanics for synthetic operation identifiers. It creates an exclusive JSON
record named with a SHA-256 digest, stores no raw operation ID, and treats
ambiguous existing state as a denial.

Run with Node 20 or newer:

```bash
cd mcp-assurance/replay-record
node --test test-file-replay-ledger.mjs
```

The direct public test contains six checks:

1. A first local claim is accepted and the next claim is refused.
2. Twelve concurrent local Node processes yield exactly one accepted claim.
3. A sequential fresh local Node process refuses the persisted claim.
4. The stored marker contains a digest rather than the raw operation ID.
5. Simulated interrupted and malformed markers fail closed after recreation.
6. A fresh local Node process fails closed on a deliberately malformed marker.

`file-replay-ledger.mjs` fsyncs the record and containing directory before
reporting success. This is not a forced process-kill, filesystem-crash, or
power-loss test, and it is not a distributed database, replicated lock,
backup/retention system, production replay store, MCP feature, or security
guarantee.

The sanitized signed-agent scenario receipt and `evidence.json` are separate
local evidence snapshots. They do not mean this directory independently
reproduces the wider signed-agent fixture or its full toolchain suite.
