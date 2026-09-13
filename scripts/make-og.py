#!/usr/bin/env python3
"""Minimal 1200x630 OG plate — no third-party deps."""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

W, H = 1200, 630
PAPER = (243, 234, 220)
INK = (42, 61, 80)
GRID = (214, 204, 186)
SOFT = (77, 106, 130)


def chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def line(px: list[list[tuple[int, int, int]]], x0: int, y0: int, x1: int, y1: int, color=INK) -> None:
    steps = max(abs(x1 - x0), abs(y1 - y0), 1)
    for i in range(steps + 1):
        t = i / steps
        x = int(round(x0 + (x1 - x0) * t))
        y = int(round(y0 + (y1 - y0) * t))
        if 0 <= x < W and 0 <= y < H:
            px[y][x] = color
            if x + 1 < W:
                px[y][x + 1] = color


def main() -> None:
    px = [[PAPER for _ in range(W)] for _ in range(H)]
    for y in range(0, H, 30):
        for x in range(W):
            px[y][x] = GRID
    for x in range(0, W, 30):
        for y in range(H):
            px[y][x] = GRID

    for ox, oy, dx, dy in (
        (40, 40, 40, 0),
        (40, 40, 0, 40),
        (1160, 40, -40, 0),
        (1160, 40, 0, 40),
        (40, 590, 40, 0),
        (40, 590, 0, -40),
        (1160, 590, -40, 0),
        (1160, 590, 0, -40),
    ):
        line(px, ox, oy, ox + dx, oy + dy)

    ridge = [
        (60, 500),
        (180, 430),
        (300, 460),
        (420, 320),
        (560, 390),
        (700, 280),
        (840, 360),
        (980, 250),
        (1140, 330),
    ]
    for (x0, y0), (x1, y1) in zip(ridge, ridge[1:]):
        line(px, x0, y0, x1, y1)
        line(px, x0, y0 + 1, x1, y1 + 1)

    raw = bytearray()
    for row in px:
        raw.append(0)
        for r, g, b in row:
            raw.extend((r, g, b))

    png = b"".join(
        [
            b"\x89PNG\r\n\x1a\n",
            chunk(b"IHDR", struct.pack(">IIBBBBB", W, H, 8, 2, 0, 0, 0)),
            chunk(b"IDAT", zlib.compress(bytes(raw), 9)),
            chunk(b"IEND", b""),
        ]
    )
    out = Path(__file__).resolve().parents[1] / "public" / "og.png"
    out.write_bytes(png)
    print(f"wrote {out} ({len(png)} bytes)")


if __name__ == "__main__":
    main()
