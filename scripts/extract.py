#!/usr/bin/env python3
"""Extract design values (text, colors, layout, type) from a Figma node JSON dump."""
import json
import sys
from collections import OrderedDict

path = sys.argv[1] if len(sys.argv) > 1 else "figma/node-d5.json"
doc = json.load(open(path))["nodes"]["27614:56562"]["document"]


def hexof(color, opacity=None):
    r = round(color.get("r", 0) * 255)
    g = round(color.get("g", 0) * 255)
    b = round(color.get("b", 0) * 255)
    a = color.get("a", 1)
    if opacity is not None:
        a = a * opacity
    if a >= 0.999:
        return f"#{r:02x}{g:02x}{b:02x}"
    return f"#{r:02x}{g:02x}{b:02x}{round(a*255):02x}"


def paint(p):
    if p.get("visible") is False:
        return None
    t = p.get("type")
    if t == "SOLID":
        return hexof(p["color"], p.get("opacity"))
    return t


texts = []          # (path, characters, style)
colors = OrderedDict()  # hex -> count
fonts = OrderedDict()


def walk(n, depth, trail):
    name = n.get("name", "")
    typ = n.get("type", "")
    here = trail + "/" + name

    # collect fills/strokes colors
    for key in ("fills", "strokes"):
        for p in n.get(key, []) or []:
            c = paint(p)
            if c:
                colors[c] = colors.get(c, 0) + 1

    if typ == "TEXT":
        st = n.get("style", {})
        sig = (
            st.get("fontFamily"),
            st.get("fontWeight"),
            round(st.get("fontSize", 0)),
            round(st.get("lineHeightPx", 0)),
        )
        fonts[sig] = fonts.get(sig, 0) + 1
        col = None
        for p in n.get("fills", []) or []:
            col = paint(p) or col
        texts.append((here, n.get("characters", ""), sig, col))

    for c in n.get("children", []) or []:
        walk(c, depth + 1, here)


walk(doc, 0, "")

print("=" * 70)
print("TEXT NODES (path | text | font wt size/lh | color)")
print("=" * 70)
seen = set()
for trail, chars, sig, col in texts:
    key = (chars, sig, col)
    label = trail.split("/")[-1]
    print(f"- [{label}] {chars!r}  {sig[0]} {sig[1]} {sig[2]}/{sig[3]}px  {col}")

print()
print("=" * 70)
print("COLORS (hex -> occurrences), sorted by frequency")
print("=" * 70)
for c, n in sorted(colors.items(), key=lambda kv: -kv[1]):
    print(f"  {c:12} x{n}")

print()
print("=" * 70)
print("TYPE STYLES (family, weight, size/lineheight) -> count")
print("=" * 70)
for sig, n in sorted(fonts.items(), key=lambda kv: -kv[1]):
    print(f"  {sig[0]:8} w{sig[1]} {sig[2]}/{sig[3]}px  x{n}")
