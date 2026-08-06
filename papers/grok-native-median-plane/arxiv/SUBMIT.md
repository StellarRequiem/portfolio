# Submit to arXiv — operator checklist

Package root: `papers/grok-native-median-plane/arxiv/`

| File | Role |
|------|------|
| `main.tex` | **Upload this** (PDFLaTeX top-level) |
| `metadata.txt` | Copy fields into arXiv form |
| `SUBMIT.md` | This guide (do **not** upload) |
| `main.pdf` | Local preview only — arXiv rebuilds from TeX |

## Why this path

You asked for scrutiny and eyes that recognize systems/security work. arXiv `cs.CR` (with `cs.AI` / `cs.SE` cross-lists) is the right index for a deny-by-default agent control-plane architecture paper. The site pair remains the portfolio narrative surface; arXiv is the archival + discoverability surface.

## 0. Before you open arXiv

1. **Security re-check (already done in source):** no bus tokens, live tunnels, TOTP seeds, SMTP passwords, Tailscale addresses.
2. **Local compile is optional.** arXiv recompiles PDFLaTeX on their servers from `main.tex`. This host may not have TeX installed; that does not block submission.
3. If you want a local preview: install BasicTeX (`brew install --cask basictex`) then `pdflatex main.tex` twice, or upload `main.tex` to Overleaf once and export PDF for a pre-read.
4. **Site still canonical:** `https://xclusivexo.com/papers/grok-native-median-plane/` (push portfolio if Pages is lagging).

## 1. Account + endorsement (often the long pole)

arXiv only accepts registered authors. As of 2026-01-21, **new** submitters need either:

**Path A — automatic-style (stricter):** institutional email **and** prior ownership of a paper already on arXiv in the same endorsement domain.

**Path B — personal endorsement:** an established arXiv author in the same endorsement domain endorses you for that category (e.g. `cs.CR`).

If this is your first arXiv paper under Alex Price / `security@xclusivexo.com`:

1. Register: <https://arxiv.org/user/register>
2. Start a draft submission to see the endorsement prompt.
3. Request endorsement: <https://info.arxiv.org/help/endorsement.html>
4. Realistic paths for independent security systems work:
   - Ask a prior coauthor / mentor / reviewer who already has arXiv CS history.
   - Some open-source maintainers in security will endorse after reading a draft PDF (send `main.pdf` + one-paragraph abstract; do not cold-spam strangers with walls of text).
   - If you have any prior arXiv coauthorship under another email, claim ownership first.

**Do not invent an institutional affiliation** to clear endorsement. Misrepresentation can get the account banned.

## 2. Create submission

1. Log in → **START NEW SUBMISSION**
2. License: prefer **CC BY 4.0** (or arXiv non-exclusive distribution license — pick one and stick to it; CC BY helps reuse).
3. **Prepare Files:** upload `main.tex` alone (or a `.tar.gz` containing only `main.tex` if you add figures later).
4. Processor: **PDFLaTeX**
5. Top-level file: `main.tex`
6. Check compile log; fix any package issues (source uses only common packages: `geometry`, `times`, `booktabs`, `tabularx`, `hyperref`, `enumitem`, `listings`, `xcolor`, `url`, `microtype`).
7. Preview PDF carefully.

## 3. Metadata (from `metadata.txt`)

- **Primary:** `cs.CR`
- **Cross-lists:** `cs.AI`, `cs.SE` (optional; recommended for agent + systems eyes)
- **ACM-class:** `D.4.6; K.6.5; I.2.11`
- **Authors:** `Alex Price` only (no Grok/AI as author)
- **Comments:** page count + site URLs (see metadata.txt)
- **Abstract:** paste the ASCII block from metadata.txt

## 4. Final Submit

1. Confirm you are an author (`yes`).
2. Review title/abstract for smart quotes / en-dashes (ASCII preferred in form fields).
3. **Submit Article** before 14:00 US Eastern on a weekday for same-day announcement window (see arXiv availability schedule).
4. After announcement, add the arXiv ID to:
   - site paper page (`index.html`)
   - Markdown working paper header
   - control-plane release notes
   - companion paper bibliography when you update it

## 5. What not to do

- Do **not** upload live tunnel hostnames, bus tokens, or operator logs.
- Do **not** list generative AI as an author.
- Do **not** claim win-rates, CVE counts, or enterprise SOC completeness.
- Do **not** submit a marketing landing page; this TeX is already claim-safe.
- Prefer **replace** for corrections after announcement; do not open a duplicate submission.

## 6. After announce (hire / scrutiny loop)

1. Tweet/post only with **live arXiv abs URL** + site pair (operator voice; agent drafts only if asked).
2. Point security reviewers at: claim cards (Appendix A), public repos, fixture stubs.
3. Track feedback in a short notes file; fold substantive corrections into v1.1 replace.

## Package build (local)

```bash
cd ~/portfolio/papers/grok-native-median-plane/arxiv
pdflatex -interaction=nonstopmode main.tex
pdflatex -interaction=nonstopmode main.tex
# optional ship tarball for offline backup (main.tex is enough for arXiv):
tar czf grok-native-median-plane-arxiv-src.tar.gz main.tex metadata.txt
```
