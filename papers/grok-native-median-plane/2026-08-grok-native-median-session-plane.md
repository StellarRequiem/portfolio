# A Grok-Native Median Session Plane: Light Remote Intent Under Deny-by-Default Host Authority

**Author:** Alex Price (StellarRequiem)  
**Contact:** security@xclusivexo.com · https://xclusivexo.com  
**Date:** 2026-08-06  
**Status:** Working paper · claim-safe · companion to *Authority Is Not Ambient*  
**Version:** 1.0  
**arXiv:** package ready (`arxiv/main.tex`, primary **cs.CR**; ID pending announcement)  
**Companion release notes:** https://xclusivexo.com/control-plane/

---

## Abstract

Frontier chat products and local agent runtimes have diverged: operators want one reasoning surface (here, **Grok**), while high-privilege tool execution still belongs on a **mediated host control plane**. This paper specifies a **median session plane**—a shared, append-only session between (1) a full host actor (Grok Build under agent-control / leashes / mcp-assure) and (2) light remote clients (Safari on a private network path; Grok chat via public HTTPS MCP Connectors).  

We describe device-bound light clients, pairing and TOTP reauth, plain-English routing onto an **allowlisted** host skill set, and an explicit claim ceiling: the phone is not a full computer-use agent. The design is a **stepping stone** toward a host-side task runner that can accept free-text work from Grok iOS without granting ambient shell. Evaluation is framed as re-runnable unit tests, smoke suites, and live connector checks—not product marketing metrics.

**Keywords:** agent control plane, MCP Connectors, session bus, Grok Build, deny-by-default, remote light client, claim ceilings

---

## 1. Introduction

### 1.1 Problem

Operators increasingly want:

1. **One frontier model family** for daily reasoning (product familiarity, account continuity, Connectors/Skills).  
2. **Local high-privilege execution** (browser, desktop, files, git) that is not ambient.  
3. **Mobile access** that does not force a second vendor’s agent stack or an unmediated reverse shell.

The failure modes are:

- **Capability confused with authority** (tools available ⇒ tools always runnable).  
- **Product fragmentation** (Mac agent in one app; phone chat in another ecosystem with no shared receipt trail).  
- **Overclaiming remote control** (marketing “full agent on phone” while bypassing host gates).

### 1.2 Thesis

> **Full agent authority stays on the host under deny-by-default mediation.  
> Remote clients share a *median session*—intent, status skills, and notes—not ambient OS control.**

Grok Build is the preferred **host actor**. Grok chat (web/iOS) is a **light remote actor** over a constrained MCP surface. Both share one `session_id` transcript.

### 1.3 Contributions

1. **Median session plane architecture** for dual-actor operation (host full plane + light remote).  
2. **Grok-native product path**: Build for execution; Connectors MCP for remote light tools; Skills for plain-English steering.  
3. **Remote posture stack**: source allowlist, token/OAuth to tunnel, device bind, optional TOTP and security-mailbox enroll, FREEZE honor.  
4. **`session_work`**: plain-English → allowlisted skills with same-turn results; unmatched text → notes for host Build.  
5. **Public claim ceiling** and a published narrative surface (control-plane release notes) weaker than evidence.  
6. **Roadmap** to a host task runner as the next step toward “phone task → full plane” without free shell.

### 1.4 Non-contributions (explicit)

- We do **not** claim Grok iOS is a full CUA host or native skill runtime.  
- We do **not** claim enterprise IdP/FIDO/SOC completeness.  
- We do **not** publish free-shell-from-phone or unmediated desktop from the tunnel.  
- We do **not** claim model superiority or win-rates over other frontiers—only an **operator architecture** that prefers Grok.

---

## 2. Related work and positioning

Prior companion paper [*Authority Is Not Ambient*](/papers/mediated-control-plane/) details mcp-assure, browser-leash, desktop-leash, agent-control, and agent-soc. Industry MCP guidance emphasizes remote OAuth, gateways, and integrity; this work focuses on **local multi-plane authority** plus a **median remote** path that remains light.

| Approach | Full host tools | Phone path | Authority model |
|----------|-----------------|------------|-----------------|
| Raw SSH / reverse shell | Yes | Yes | Ambient — refused |
| Vendor A agent on phone only | Vendor-defined | Native | Split ecosystem |
| This work | Grok Build + leashes | Grok chat MCP + Safari bus | Mediated host; light remote |

---

## 3. Design goals

| ID | Goal | Mechanism |
|----|------|-----------|
| G1 | Prefer one model product (Grok) | Build + Connectors + Skills |
| G2 | Host tools never ambient | ARM, allowlists, FREEZE, human high-blast |
| G3 | Mobile useful without second agent stack | Median session + `session_work` |
| G4 | Public honesty | Claim cards ≤ evidence; explicit non-claims |
| G5 | Stepping stone | Task queue + host actor without free shell |

---

## 4. Architecture

### 4.1 Two planes, one session

```
┌─────────────────────────────────────────────────────────────┐
│  FULL AGENT PLANE (Mac)                                     │
│  Grok Build → agent-control → browser/desktop leashes       │
│               + mcp-assure + agent-soc FREEZE               │
└───────────────────────────┬─────────────────────────────────┘
                            │ shared session_id / JSONL
┌───────────────────────────▼─────────────────────────────────┐
│  MEDIAN SESSION PLANE (session-bus)                         │
│  append-only events · skill bind · arm · device bind        │
│  allowlisted host skills · notes / future tasks             │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        ▼                                       ▼
 Safari light UI (Tailscale)          Grok chat MCP (public tunnel)
 device cookie + TOTP/enroll          session_work / OAuth→Bearer
```

### 4.2 Why a public tunnel for Grok Connectors

xAI Connectors invoke tools from **cloud** infrastructure. Private Tailscale addresses (`100.x`) are not reachable as custom MCP URLs. A temporary public HTTPS tunnel (e.g. cloudflared) fronts a local MCP HTTP adapter; Tailscale remains the **Safari UI** path and optional Funnel alternative.

### 4.3 Light tools (public-safe inventory)

| Tool | Role |
|------|------|
| `session_work` | Plain English → allowlisted skill or note |
| `session_skills` | List skills + routing help |
| `session_read` | Transcript / results |
| `session_propose` | Named skill (same-turn host exec) |
| `session_message` | Free note |
| `session_list_open` / `session_bus_status` | Discovery / health |

Allowlisted skills (illustrative operator set): `plane.status`, `bus.status`, `git_status`, `host.whoami`, `session.info`, `disk.free`. Expansion is deliberate and host-gated.

### 4.4 Remote posture

| Control | Purpose |
|---------|---------|
| Source IP allowlist (loopback + Tailscale CGNAT for bus UI) | No LAN/public bind of bus UI |
| Bus token + MCP OAuth shim → Bearer | Connectors auth |
| Device cookie (HttpOnly) | URL alone insufficient across browsers |
| Pairing challenges + optional TOTP (Apple Passwords) | Second factor |
| security@ SMTP enroll codes | Operator mailbox when configured |
| FREEZE paths | Skill exec halt under lockdown |

---

## 5. Plain-English routing

Remote users speak natural language. The median plane maps **conservatively**:

1. Slash or bare skill name (`/git_status portfolio`).  
2. Keyword intents (“disk space”, “whoami”, “plane status”).  
3. Else: post **note** for host Build (`NOTE_POSTED` / pending-react)—no invented shell.

This is intentional under-claiming: better a note than an unsafe generalization.

---

## 6. Evaluation (re-runnable, not theatrical)

Public and local evidence classes (operator-reproducible). **No secrets** appear below—only public URLs, design defaults, and fixture-shaped stubs.

### 6.1 Public open-source surfaces (third-party reachable)

| Artifact | Stub / locator |
|----------|----------------|
| mcp-assure | `https://github.com/StellarRequiem/mcp-assure` |
| agent-control | `https://github.com/StellarRequiem/agent-control` |
| browser-leash | `https://github.com/StellarRequiem/browser-leash` |
| desktop-leash | `https://github.com/StellarRequiem/desktop-leash` |
| agent-soc | `https://github.com/StellarRequiem/agent-soc` |
| MCP assurance site | `https://xclusivexo.com/mcp-assurance/` |
| Host-plane paper | `https://xclusivexo.com/papers/mediated-control-plane/` |
| This paper (site) | `https://xclusivexo.com/papers/grok-native-median-plane/` |
| Release notes | `https://xclusivexo.com/control-plane/` |

### 6.2 Design defaults (not live secrets)

| Parameter | Public-safe default / shape |
|-----------|-----------------------------|
| Bus HTTP port | `8758` (loopback or Tailscale UI) |
| MCP HTTP port | `8760` (local; fronted by public tunnel for Connectors) |
| Browser leash | `8756` · Desktop leash `8757` |
| Tunnel URL shape | `https://<ephemeral-host>.example-tunnel/mcp` — **never** publish live tunnel hostnames |
| Session id shape | UUID v4 string, e.g. `00000000-0000-4000-8000-000000000001` (fixture) |
| Allowlisted skills | `plane.status`, `bus.status`, `git_status`, `host.whoami`, `session.info`, `disk.free` |
| Plain-English stubs | `"how's the host"` → `host.whoami`; `"git status on portfolio"` → `git_status` |
| OAuth client id (local shim) | `session-bus` (not a secret); client secret = **operator bus token** (never published) |
| Enroll mailbox | public contact `security@xclusivexo.com` (address is intentional; mailbox password never published) |

### 6.3 Local test classes (operator machine)

| Class | What was exercised (no private payloads) |
|-------|------------------------------------------|
| Unit | store create/bind/device cookie; TOTP round-trip; NL intent routes; mailer outbox without SMTP |
| Smoke | MCP `initialize` + `tools/list`; `session_work` with fixture phrasing → skill result |
| Live (operator) | Connectors UI shows custom connector **Connected**; SMTP enroll when `mail.json` present |
| Posture | FREEZE paths halt skill exec; device cookie required for Safari light UI posts |

### 6.4 Fixture-shaped response stubs (public-safe)

These are **real response shapes** used in local smoke tests. Values are fixtures — not live operator sessions, tokens, or hosts.

**`tools/list` (excerpt):**

```json
{
  "tools": [
    {"name": "session_work", "description": "Plain English → allowlisted skill or note"},
    {"name": "session_skills", "description": "List skills + routing help"},
    {"name": "session_read", "description": "Transcript / results"},
    {"name": "session_propose", "description": "Named skill (same-turn host exec)"},
    {"name": "session_message", "description": "Free note"},
    {"name": "session_list_open", "description": "List open sessions"},
    {"name": "session_bus_status", "description": "Bus health"}
  ]
}
```

**`session_work` matched skill (fixture):**

```json
{
  "ok": true,
  "kind": "skill_result",
  "skill": "host.whoami",
  "input": "how's the host",
  "session_id": "00000000-0000-4000-8000-000000000001",
  "result": {"user": "operator", "host": "example-host", "plane": "full"}
}
```

**`session_work` unmatched → note (fixture):**

```json
{
  "ok": true,
  "kind": "NOTE_POSTED",
  "input": "ship the control-plane page when ready",
  "session_id": "00000000-0000-4000-8000-000000000001",
  "note_id": "note-fixture-0001",
  "for_host": "Grok Build"
}
```

**Device bind cookie name (public):** `session_bus_device` (HttpOnly; value is opaque, never published).

**OAuth token response shape (local shim; secret redacted):**

```json
{
  "token_type": "Bearer",
  "access_token": "<redacted-operator-bus-token>",
  "expires_in": 3600
}
```

We do **not** report unmeasured “detection rates,” tunnel hostnames, bus tokens, TOTP seeds, pairing codes, or Tailscale addresses in public text.

---

## 7. Narrative: why this is a portfolio crown jewel

The professional story is **fact-shaped**:

1. **Systems depth** — multi-plane mediation already public.  
2. **Product realism** — Grok as daily driver without abandoning host security.  
3. **Mobile without fantasy** — light remote, honest limits.  
4. **Publishable honesty** — claim ceilings as a feature, not an apology.  
5. **Roadmap** — task runner is the next engineering step, not a press claim.

Together with the control-plane release notes, this paper is the **crown jewel pair**: technical architecture + public-safe narrative.

---

## 8. Next work (stepping stones)

| Priority | Deliverable | Unlocks |
|----------|-------------|---------|
| P0 | `session_task` + host task runner (named agent-control cmds only) | Phone free text → real Build work |
| P1 | High-blast confirm channel (email/TOTP) for publish/push | Safer expansion |
| P2 | Stable tunnel (named CF Tunnel / Tailscale Funnel) | Fewer reconnects |
| P3 | AdaptiveGate blast budgets on bus tasks | Same doctrine as leashes |
| P4 | Optional public open-sourcing of session-bus once hardened | Third-party re-run |

---

## 9. Conclusion

A Grok-native operator path does not require ambient phone control. It requires a **full mediated plane on the host** and a **median session** for light remote intent. We specified that split, implemented a working light path (`session_work`, Connectors, device bind, optional SMTP/TOTP), and published claim ceilings that keep portfolio language weaker than evidence. The next milestone is a host task runner that turns free-text remote notes into allowlisted Build work—still without free shell.

---

## References / public artifacts

1. Price, A. *Authority Is Not Ambient…* Working paper, 2026-08. https://xclusivexo.com/papers/mediated-control-plane/  
2. StellarRequiem public repos: mcp-assure, agent-control, browser-leash, desktop-leash, agent-soc.  
3. MCP assurance fixtures: https://xclusivexo.com/mcp-assurance/  
4. Control-plane release notes: https://xclusivexo.com/control-plane/ (operator ship)  
5. xAI Connectors / custom MCP public reachability (product docs, 2026).  

---

## Appendix B — Security publication checklist

Before any public mirror (site, PDF, preprint):

- [x] No bus tokens, OAuth client secrets, or SMTP passwords  
- [x] No live tunnel hostnames or Tailscale `100.x` addresses  
- [x] No TOTP seeds or pairing codes  
- [x] No private home paths (`~/…` only as operator docs, not required in paper)  
- [x] Session identifiers only as UUID **shapes** / fixtures  
- [x] Contact address `security@xclusivexo.com` is intentional public contact  
- [x] Claims weaker than evidence; non-claims listed in §1.4  

## Appendix A — Claim cards (public wording)

### Claim A1
**Grok Build on a mediated host control plane can drive leashed browser and desktop tools under deny-by-default gates.**  
**Evidence:** public agent-control, browser-leash, desktop-leash, mcp-assure; prior working paper.  
**Caveats:** not ambient CUA; not enterprise SOC.  
**State:** Verified (public repos + paper) · Publish-ready.

### Claim A2
**A light remote path via Grok chat Connectors can run allowlisted host status skills and post session notes.**  
**Evidence:** operator live connector Connected; session_work smoke; SMTP enroll to security@ when configured; public architecture on this site.  
**Caveats:** tunnel required; not free shell; session-bus is an operator median plane, not multi-tenant SaaS; live tunnel URLs must not be published.  
**State:** Verified for operator stack · public wording as architecture + limits (this paper + release notes).

### Claim A3
**The architecture prefers Grok as the operator’s frontier surface without claiming model leaderboard superiority.**  
**Evidence:** design choice + wiring.  
**Caveats:** no win-rate claims.  
**State:** Narrative · Publish-ready.

---

*End of working paper v1.0*
