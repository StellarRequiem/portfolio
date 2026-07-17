# AGENTS.md — xclusivexo.com / StellarRequiem portfolio

This repo **is** the professional website. Apex domain: **xclusivexo.com** (GitHub Pages).
Remote: `github.com/StellarRequiem/portfolio`. Operator: Alex Price / StellarRequiem.

## Product

Public calling card for:

- MCP / AI-infra security research (authz, replay isolation, scanner blind spots)
- Verification tooling (verity, scorecheck, calibration-log, groundtruth-bench, …)
- Public-safe workflow bible (`/workflow/`)
- Interactive surfaces (`/village/`, `/realm/`, `/daemon/`, forum, feedback)

Tagline: **Verified work, or it doesn't ship.**

## Hard rules

1. **No belief without verification.** Every public metric needs a re-runnable source (CI, PR link, test command). Prefer honest gaps over polish.
2. **Public wording ≤ evidence.** FastMCP work = *merged PRs / public fixes*, not CVE/GHSA claims unless an advisory exists.
3. **No secrets / exploit steps / private targets** on this site. Method is copyable; private mechanics are not.
4. **Real-name link is intentional.** Alex Price ↔ StellarRequiem is public here. Still: no PII beyond what's already on the page; no operator home paths in committed HTML.
5. **Ship only on operator ask.** `git push` / Pages deploy is a human gate.
6. **Git hygiene before ship.** This tree often runs **ahead/behind** and dirty with realm WIP. Never push a kitchen-sink commit. Prefer:
   - branch or cherry-pick for pro-only slices, or
   - commit only the files in the approved scope after `git status` + diff review.
7. Static site: HTML/CSS/JS, no build step required for most pages. Service worker: `sw.js` — bump carefully when caching matters.

## Key paths

| Path | Role |
|------|------|
| `index.html` | Homepage hero + portfolio sections |
| `workflow/` | Public operating manual |
| `capability-statement.html` + PDF | Hire-facing one-pager |
| `daemon/` | Local Daemon artifact (may lag live until shipped) |
| `CNAME` | `xclusivexo.com` |
| `village/`, `realm/`, `room/`, `create/` | Interactive product surfaces |
| `account/`, `supabase/` | Auth / chat-relay (sensitive config stays out of git) |
| `ask-widget.js`, `sw.js` | Site chrome |

## Verify before calling done

```sh
# local
git -C ~/portfolio status -sb
git -C ~/portfolio diff --stat

# live (after deploy)
curl -sI https://xclusivexo.com/ | head -5
curl -sI https://xclusivexo.com/workflow/ | head -5
# claim spot-check: page must not overclaim vs linked GitHub evidence
```

## Voice

Professional, sharp, slightly dry. Matches verification brand. Not X-reply energy.
Corrections beat ego: if a claim is overstrong, cut or downgrade it.

## ROI priorities on this repo

1. Clarity of offer (who hires you / what proof exists)
2. Trust (re-runnable links, honest gaps)
3. Conversion paths (capability statement, contacts, GitHub, workflow)
4. Ship hygiene (Pages green, no 404 on linked paths like `/daemon/`)
