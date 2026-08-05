#!/usr/bin/env python3
"""Stamp the canonical nav (_nav/nav.html) into site pages.

Idempotent: the block is fenced by XNAV markers, so re-running replaces the old
copy instead of stacking duplicates. Edit _nav/nav.html, re-run this, done.

Why static injection instead of a JS component: security/index.html ships
`default-src 'none'` — no scripts, no external stylesheets. A JS nav would be
blocked there, and weakening that CSP to gain a menu is a bad trade. Inline
HTML+CSS works on every page and keeps the hardening intact.

Usage:  python3 _nav/inject.py [--pages doc|app|all] [--dry-run]
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
START, END = "<!--XNAV:START-->", "<!--XNAV:END-->"

# Document/professional pages: static prose, safe to take a sticky header.
DOC = [
    "index.html", "security/index.html", "mcp-assurance/index.html",
    "assurance/index.html", "mcp-review-sample/index.html", "papers/index.html",
    "papers/mediated-control-plane/index.html", "capability-statement.html",
    "workflow/index.html", "daemon/index.html",
]
# App/interactive pages: own chrome + island navs; superseded by the canonical nav.
APP = [
    "village/index.html", "realm/index.html", "room/index.html", "create/index.html",
    "forum/index.html", "account/index.html", "feedback/index.html",
    "report/index.html", "diagnostics/index.html",
]


def canonical() -> str:
    """Load the nav, minus the maintainer comment (docs stay in the source file)."""
    raw = (ROOT / "_nav" / "nav.html").read_text(encoding="utf-8")
    return re.sub(r"<!--\s*=====.*?-->\s*", "", raw, count=1, flags=re.S).strip()


def mark_current(nav: str, page: str) -> str:
    """Flag the active top-level link for orientation."""
    route = "/" + page.replace("index.html", "")
    if page == "index.html":
        route = "/"
    return nav.replace(f'href="{route}">', f'href="{route}" aria-current="page">', 1)


def ensure_main_anchor(html: str) -> str:
    """Give the skip-link a target: tag the first content element after the nav.

    Searches past XNAV:END so we never tag the nav's own markup.
    """
    if 'id="main"' in html:
        return html
    start = html.find(END)
    start = start + len(END) if start != -1 else 0
    for tag in ("main", "header", "section", "article", "div"):
        m = re.search(rf"<{tag}\b", html[start:], re.I)
        if m:
            at = start + m.end()
            return html[:at] + ' id="main"' + html[at:]
    return html


def strip_island_nav(html: str) -> tuple[str, int]:
    """Drop pre-existing one-off <nav> blocks (canonical nav supersedes them)."""
    pat = re.compile(r"[ \t]*<nav\b(?![^>]*class=\"xn\")[^>]*>.*?</nav>\s*", re.S | re.I)
    html2, n = pat.subn("", html)
    return html2, n


def inject(page: str, dry: bool, drop_islands: bool) -> str:
    p = ROOT / page
    if not p.exists():
        return f"  SKIP (missing)  {page}"
    html = p.read_text(encoding="utf-8")
    before = html

    # remove previous injection
    html = re.sub(re.escape(START) + r".*?" + re.escape(END) + r"\s*", "", html, flags=re.S)

    removed = 0
    if drop_islands:
        html, removed = strip_island_nav(html)

    block = START + "\n" + mark_current(canonical(), page) + "\n" + END + "\n"
    m = re.search(r"<body[^>]*>", html, re.I)
    if not m:
        return f"  SKIP (no <body>) {page}"
    html = html[:m.end()] + "\n" + block + html[m.end():]
    html = ensure_main_anchor(html)

    if html == before:
        return f"  unchanged      {page}"
    if not dry:
        p.write_text(html, encoding="utf-8")
    return f"  {'would stamp' if dry else 'STAMPED'}    {page}" + (f"  (removed {removed} island nav)" if removed else "")


def main(argv: list[str]) -> int:
    dry = "--dry-run" in argv
    which = "doc"
    if "--pages" in argv:
        which = argv[argv.index("--pages") + 1]
    pages = {"doc": DOC, "app": APP, "all": DOC + APP}[which]
    print(f"canonical nav: _nav/nav.html · target set: {which} ({len(pages)} pages)"
          + ("  [DRY RUN]" if dry else ""))
    for pg in pages:
        # canonical nav supersedes every one-off island nav, doc or app
        print(inject(pg, dry, drop_islands=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
