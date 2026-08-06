#!/usr/bin/env python3
"""Preview PDF builder for the median-session-plane arXiv package.

Prefer real PDFLaTeX when available:

    pdflatex -interaction=nonstopmode main.tex
    pdflatex -interaction=nonstopmode main.tex

This script is the fallback when TeX is not installed. It tries reportlab
first, then a stdlib-only minimal PDF writer so the package still has a
readable main.pdf for local skim / endorsement mail.

Usage:
    python3 build_preview.py
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "main.pdf"
TEX = HERE / "main.tex"

TITLE = (
    "A Grok-Native Median Session Plane: "
    "Light Remote Intent Under Deny-by-Default Host Authority"
)
AUTHOR = "Alex Price  ·  security@xclusivexo.com  ·  https://xclusivexo.com"
DATE = "August 2026  ·  Working paper v1.0  ·  PREVIEW (not PDFLaTeX)"
BANNER = (
    "PREVIEW PDF — generated without TeX. "
    "arXiv rebuilds from main.tex via PDFLaTeX. Not the submission typeset."
)


def _extract_abstract(tex: str) -> str:
    m = re.search(r"\\begin\{abstract\}(.*?)\\end\{abstract\}", tex, re.S)
    if not m:
        return "(abstract missing)"
    body = m.group(1)
    body = re.sub(r"\\emph\{([^}]*)\}", r"\1", body)
    body = re.sub(r"\\textbf\{([^}]*)\}", r"\1", body)
    body = re.sub(r"\\texttt\{([^}]*)\}", r"\1", body)
    body = re.sub(r"~", " ", body)
    body = re.sub(r"---+", "—", body)
    body = re.sub(r"\s+", " ", body).strip()
    return body


def _extract_sections(tex: str) -> list[str]:
    out: list[str] = []
    for m in re.finditer(r"\\(?:sub)?section\*?\{([^}]+)\}", tex):
        out.append(m.group(1).replace("\\\\", " ").strip())
    return out


def _extract_claims(tex: str) -> list[str]:
    claims: list[str] = []
    for m in re.finditer(
        r"\\paragraph\{Claim (A\d+)\.\}\s*(.*?)(?=\\paragraph\{|\\section|\\end\{document\})",
        tex,
        re.S,
    ):
        cid, body = m.group(1), m.group(2)
        body = re.sub(r"\\textbf\{([^}]*)\}", r"\1", body)
        body = re.sub(r"\\texttt\{([^}]*)\}", r"\1", body)
        body = re.sub(r"\\emph\{([^}]*)\}", r"\1", body)
        body = re.sub(r"\s+", " ", body).strip()
        claims.append(f"Claim {cid}. {body[:420]}")
    return claims


def build_with_reportlab(abstract: str, sections: list[str], claims: list[str]) -> bool:
    try:
        from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import inch
        from reportlab.platypus import (
            ListFlowable,
            ListItem,
            PageBreak,
            Paragraph,
            SimpleDocTemplate,
            Spacer,
        )
    except ImportError:
        return False

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "T",
        parent=styles["Title"],
        fontSize=14,
        leading=18,
        alignment=TA_CENTER,
        spaceAfter=10,
    )
    meta = ParagraphStyle(
        "M",
        parent=styles["Normal"],
        fontSize=10,
        leading=13,
        alignment=TA_CENTER,
        spaceAfter=6,
    )
    warn = ParagraphStyle(
        "W",
        parent=styles["Normal"],
        fontSize=8,
        leading=10,
        alignment=TA_CENTER,
        textColor="0x666666",
        spaceAfter=16,
    )
    body = ParagraphStyle(
        "B",
        parent=styles["Normal"],
        fontSize=10,
        leading=13,
        alignment=TA_JUSTIFY,
        spaceAfter=10,
    )
    h1 = ParagraphStyle(
        "H1",
        parent=styles["Heading1"],
        fontSize=12,
        leading=15,
        spaceBefore=12,
        spaceAfter=6,
    )

    def esc(s: str) -> str:
        return (
            s.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
        )

    story = [
        Paragraph(esc(TITLE), title_style),
        Paragraph(esc(AUTHOR), meta),
        Paragraph(esc(DATE), meta),
        Paragraph(esc(BANNER), warn),
        Paragraph("<b>Abstract</b>", h1),
        Paragraph(esc(abstract), body),
        Paragraph("<b>Outline</b>", h1),
    ]
    items = [ListItem(Paragraph(esc(s), body), leftIndent=12) for s in sections]
    story.append(ListFlowable(items, bulletType="1", start="1"))
    story.append(Spacer(1, 0.15 * inch))
    story.append(Paragraph("<b>Claim cards (appendix excerpt)</b>", h1))
    for c in claims:
        story.append(Paragraph(esc(c), body))
    story.append(PageBreak())
    story.append(Paragraph("<b>How to build the real PDF</b>", h1))
    story.append(
        Paragraph(
            esc(
                "Install BasicTeX or MacTeX, then from this directory run: "
                "pdflatex -interaction=nonstopmode main.tex twice. "
                "Upload main.tex (or a tar of sources) to arXiv; arXiv rebuilds."
            ),
            body,
        )
    )
    story.append(
        Paragraph(
            esc(
                "Site companion: https://xclusivexo.com/papers/grok-native-median-plane/ "
                "Release notes: https://xclusivexo.com/control-plane/"
            ),
            body,
        )
    )
    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=inch,
        rightMargin=inch,
        topMargin=inch,
        bottomMargin=inch,
        title=TITLE,
        author="Alex Price",
    )
    doc.build(story)
    return True


def _pdf_escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _wrap(text: str, width: int = 88) -> list[str]:
    words = text.split()
    lines: list[str] = []
    cur: list[str] = []
    n = 0
    for w in words:
        add = len(w) + (1 if cur else 0)
        if n + add > width and cur:
            lines.append(" ".join(cur))
            cur = [w]
            n = len(w)
        else:
            cur.append(w)
            n += add
    if cur:
        lines.append(" ".join(cur))
    return lines or [""]


def build_stdlib(abstract: str, sections: list[str], claims: list[str]) -> int:
    """Write a minimal multi-page PDF without third-party deps. Returns page count."""
    # Page content as lists of (font_size, text) lines drawn top-down
    pages_src: list[list[tuple[int, str]]] = []

    def new_page() -> list[tuple[int, str]]:
        p: list[tuple[int, str]] = []
        pages_src.append(p)
        return p

    p = new_page()
    p.append((9, BANNER))
    p.append((8, ""))
    for line in _wrap(TITLE, 70):
        p.append((14, line))
    p.append((8, ""))
    p.append((10, AUTHOR))
    p.append((10, DATE))
    p.append((8, ""))
    p.append((12, "Abstract"))
    for line in _wrap(abstract, 92):
        p.append((10, line))
    p.append((8, ""))
    p.append((12, "Outline"))
    for i, s in enumerate(sections, 1):
        for j, line in enumerate(_wrap(f"{i}. {s}", 90)):
            p.append((10, line if j == 0 else "   " + line))
        if len(p) > 48:
            p = new_page()
            p.append((9, BANNER + " (cont.)"))
            p.append((8, ""))

    p = new_page()
    p.append((9, BANNER + " — claims"))
    p.append((8, ""))
    p.append((12, "Claim cards (public wording)"))
    p.append((8, ""))
    for c in claims:
        for line in _wrap(c, 92):
            p.append((9, line))
        p.append((8, ""))
        if len(p) > 50:
            p = new_page()
            p.append((9, BANNER + " (cont.)"))
            p.append((8, ""))

    p = new_page()
    p.append((9, BANNER))
    p.append((8, ""))
    p.append((12, "Build notes"))
    p.append((8, ""))
    for line in _wrap(
        "This preview was produced because PDFLaTeX was unavailable in the "
        "build environment. Canonical source is main.tex. Install BasicTeX "
        "or MacTeX, then: pdflatex -interaction=nonstopmode main.tex (twice).",
        92,
    ):
        p.append((10, line))
    p.append((8, ""))
    p.append((10, "Site: https://xclusivexo.com/papers/grok-native-median-plane/"))
    p.append((10, "Release notes: https://xclusivexo.com/control-plane/"))
    p.append((10, "Contact: security@xclusivexo.com"))
    p.append((8, ""))
    p.append((10, "Package: tar czf grok-native-median-plane-arxiv-src.tar.gz \\"))
    p.append((10, "         main.tex metadata.txt main.pdf"))

    # Geometry: A4 595.28 x 841.89 pt
    W, H = 595.28, 841.89
    margin = 54.0
    objects: list[bytes] = []

    def add_obj(body: bytes) -> int:
        objects.append(body)
        return len(objects)

    # font object
    font_id = add_obj(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

    page_ids: list[int] = []
    content_ids: list[int] = []

    for lines in pages_src:
        # build content stream
        y = H - margin
        cmds = ["BT"]
        for size, text in lines:
            if not text and size <= 8:
                y -= 8
                continue
            if y < margin + 20:
                break
            cmds.append(f"/F1 {size} Tf")
            cmds.append(f"1 0 0 1 {margin:.2f} {y:.2f} Tm")
            cmds.append(f"({_pdf_escape(text)}) Tj")
            y -= size + 4
        cmds.append("ET")
        stream = "\n".join(cmds).encode("latin-1", errors="replace")
        content = (
            f"<< /Length {len(stream)} >>\nstream\n".encode()
            + stream
            + b"\nendstream"
        )
        cid = add_obj(content)
        content_ids.append(cid)

    # pages kids after we know page object ids — allocate page objs
    for cid in content_ids:
        # placeholder; rewrite after we know pages parent
        page_ids.append(0)  # filled below

    pages_id = len(objects) + len(content_ids) + 1  # will be after page objs
    # Actually: add page objects now, then pages, then catalog
    real_page_ids: list[int] = []
    for cid in content_ids:
        body = (
            f"<< /Type /Page /Parent {0} 0 R /MediaBox [0 0 {W} {H}] "
            f"/Contents {cid} 0 R /Resources << /Font << /F1 {font_id} 0 R >> >> >>"
        ).encode()
        real_page_ids.append(add_obj(body))

    kids = " ".join(f"{pid} 0 R" for pid in real_page_ids)
    pages_obj_id = add_obj(
        f"<< /Type /Pages /Kids [{kids}] /Count {len(real_page_ids)} >>".encode()
    )
    # fix Parent refs in page objects
    for pid in real_page_ids:
        raw = objects[pid - 1]
        objects[pid - 1] = raw.replace(b"/Parent 0 0 R", f"/Parent {pages_obj_id} 0 R".encode())

    catalog_id = add_obj(f"<< /Type /Catalog /Pages {pages_obj_id} 0 R >>".encode())
    info_id = add_obj(
        f"<< /Title ({_pdf_escape(TITLE[:120])}) /Author (Alex Price) "
        f"/Creator (build_preview.py stdlib) /Subject (Preview; not PDFLaTeX) >>".encode()
    )

    # assemble file with xref
    out = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for i, obj in enumerate(objects, 1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n".encode()
        out += obj
        out += b"\nendobj\n"
    xref_pos = len(out)
    out += f"xref\n0 {len(objects) + 1}\n".encode()
    out += b"0000000000 65535 f \n"
    for off in offsets[1:]:
        out += f"{off:010d} 00000 n \n".encode()
    out += (
        f"trailer\n<< /Size {len(objects) + 1} /Root {catalog_id} 0 R "
        f"/Info {info_id} 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n"
    ).encode()
    OUT.write_bytes(out)
    return len(real_page_ids)


def main() -> int:
    if not TEX.is_file():
        print(f"error: missing {TEX}", file=sys.stderr)
        return 1
    tex = TEX.read_text(encoding="utf-8")
    abstract = _extract_abstract(tex)
    sections = _extract_sections(tex)
    claims = _extract_claims(tex)

    if build_with_reportlab(abstract, sections, claims):
        print(f"wrote {OUT} via reportlab")
        return 0
    pages = build_stdlib(abstract, sections, claims)
    print(f"wrote {OUT} via stdlib fallback ({pages} pages)")
    print("note: install reportlab or BasicTeX for a better build")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
