#!/usr/bin/env python3
"""Extract recurring equipment-system patterns from the local project archive.

The archive contains Numbers, PDF, XLSX and legacy XLS files.  Numbers cell
strings remain embedded in the IWA package, so they can be inspected without
opening or modifying the source document.  Same-directory files with the same
stem are treated as alternate exports of one list and counted once.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import zipfile
from collections import Counter
from itertools import combinations
from pathlib import Path

import pandas as pd
from pypdf import PdfReader


ARCHIVE: Path
OUTPUT = Path(__file__).resolve().parents[1] / "app" / "equipment-history-analysis.generated.json"
NAME_PATTERN = re.compile(r"器材|设备|equipment", re.I)
SUPPORTED = {".numbers", ".pdf", ".xlsx", ".xls"}
PREFERENCE = {".xlsx": 0, ".pdf": 1, ".numbers": 2, ".xls": 3}

SYSTEM_PATTERNS: dict[str, tuple[str, str]] = {
    "cinema_camera": ("电影机机身", r"alexa|arri\s*35|mini\s*lf|venice|burano|v-?raptor|komodo|red\b"),
    "light_camera": ("轻量机身", r"fx\s*3|fx\s*6|a7s|bmpcc|blackmagic|ronin\s*4d"),
    "arri_camera": ("ARRI 机身", r"alexa|arri\s*35|mini\s*lf"),
    "sony_camera": ("Sony 机身", r"fx\s*3|fx\s*6|burano|venice|a7s"),
    "ronin4d": ("Ronin 4D 系统", r"ronin\s*4d|如影4d"),
    "cinema_prime": ("电影定焦镜头组", r"supreme|super\s*speed|master\s*prime|ultra\s*prime|cooke|atlas|mercury|hawk|arri\s*signature|定焦镜头"),
    "photo_zoom": ("轻量大三元变焦", r"16\s*[-–~]\s*35|24\s*[-–~]\s*70|70\s*[-–~]\s*200"),
    "cinema_zoom": ("电影变焦镜头", r"angenieux|安琴|ez\s*[-]?\s*[12]|optimo|fujinon|premista|cabio|cabrio"),
    "macro_probe": ("微距/探针镜头", r"macro|微距|探针|x-?tract|gnosis|laowa|probe"),
    "mattebox": ("遮光斗", r"lmb\s*[-]?\s*25|遮光斗|matte\s*box|mb\s*[-]?\s*1[49]"),
    "follow_focus": ("无线跟焦", r"wcu\s*[-]?\s*4|跟焦|焦点控制|focus\s*pro|nucleus|hi-?5"),
    "wireless_video": ("无线图传", r"图传|vaxis|teradek|transmission|bolt\s*[456]|cosmo|mars\s*[34]"),
    "onboard_monitor": ("机头/焦点监看", r"smallhd|702|703|503|cine\s*7|机头监|跟焦监"),
    "client_monitor": ("导演/客户监看", r"dm\s*[-]?\s*240|bm\s*[-]?\s*240|x\s*[-]?\s*2400|17寸|21寸|24寸|导演监|客户监"),
    "tripod": ("三脚架/液压云台", r"脚架|三脚架|云台|oconnor|sachtler|ronford|2575|2065"),
    "gimbal": ("稳定器", r"ronin\s*2|rs\s*[234]|rs\s*4\s*pro|稳定器|如影\s*[234]"),
    "slider": ("滑轨", r"滑轨|slider|shark\s*slider"),
    "dolly": ("轨道车", r"轨道车|dolly|威尔顿车|panther|fisher"),
    "track": ("轨道", r"直轨|弯轨|轨道|track"),
    "jib": ("摇臂/伸缩炮", r"摇臂|伸缩炮|jib|howmoco|scorpio|technocrane"),
    "filters": ("滤镜系统", r"black\s*pro\s*mist|bpm|柔光镜|nd\b|减光镜|cpl|偏振镜|glimmer"),
    "power": ("供电系统", r"电池|充电器|v\s*口|v-?mount|gold\s*mount|tb\s*50|bebob|hawk-?woods"),
    "media": ("存储/读卡", r"prossd|cfexpress|codex|cfast|ssd|存储|储存|读卡器|高速卡"),
    "timecode": ("时码同步", r"时码|timecode|tentacle|ultrasync|lockit|genlock|锁相"),
}


def printable_strings(payload: bytes) -> str:
    decoded = payload.decode("utf-8", errors="ignore")
    chunks = re.findall(r"[A-Za-z0-9\u4e00-\u9fff][A-Za-z0-9\u4e00-\u9fff\s+./()（）×xX:_\-~–]{1,100}", decoded)
    return "\n".join(chunk.strip() for chunk in chunks if chunk.strip())


def extract_text(path: Path) -> str:
    suffix = path.suffix.lower()
    try:
        if suffix == ".pdf":
            return "\n".join(page.extract_text() or "" for page in PdfReader(path).pages)
        if suffix == ".xlsx":
            workbook = pd.read_excel(path, sheet_name=None, header=None, dtype=str)
            return "\n".join(" ".join(frame.fillna("").astype(str).to_numpy().ravel()) for frame in workbook.values())
        if suffix == ".numbers":
            with zipfile.ZipFile(path) as archive:
                return "\n".join(
                    printable_strings(archive.read(name))
                    for name in archive.namelist()
                    if name.endswith(".iwa") and ("Tables/" in name or "Document" in name)
                )
        if suffix == ".xls":
            return printable_strings(path.read_bytes())
    except Exception as exc:  # keep the audit running and report unreadable files
        print(f"WARN {path}: {exc}", file=sys.stderr)
    return ""


def choose_documents() -> list[Path]:
    candidates = [
        path for path in ARCHIVE.rglob("*")
        if path.is_file() and path.suffix.lower() in SUPPORTED and NAME_PATTERN.search(path.name)
    ]
    grouped: dict[tuple[Path, str], list[Path]] = {}
    for path in candidates:
        grouped.setdefault((path.parent, path.stem.casefold()), []).append(path)
    return [sorted(paths, key=lambda path: PREFERENCE[path.suffix.lower()])[0] for paths in grouped.values()]


def main() -> None:
    global ARCHIVE
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path, help="Explicit local archive directory; source files are not included")
    args = parser.parse_args()
    ARCHIVE = args.archive.expanduser().resolve()
    if not ARCHIVE.is_dir():
        parser.error("archive must be an existing directory")
    documents = choose_documents()
    baskets: list[dict[str, object]] = []
    seen_content: set[str] = set()
    for path in documents:
        text = extract_text(path)
        normalized = re.sub(r"\s+", "", text).casefold()
        if len(normalized) < 20:
            continue
        digest = hashlib.sha1(normalized.encode()).hexdigest()
        if digest in seen_content:
            continue
        seen_content.add(digest)
        tags = sorted(key for key, (_, pattern) in SYSTEM_PATTERNS.items() if re.search(pattern, text, re.I))
        baskets.append({"path": str(path.relative_to(ARCHIVE)), "tags": tags})

    singles = Counter(tag for basket in baskets for tag in basket["tags"])
    pairs = Counter(pair for basket in baskets for pair in combinations(basket["tags"], 2))
    pair_rows = []
    for (left, right), count in pairs.most_common():
        denominator = min(singles[left], singles[right])
        confidence = round(count / denominator, 2) if denominator else 0
        if count >= 3 and confidence >= 0.45:
            pair_rows.append({"left": left, "right": right, "count": count, "confidence": confidence})

    result = {
        "generatedFrom": "user-supplied-local-archive",
        "sourceFiles": len(documents),
        "readableUniqueLists": len(baskets),
        "formats": dict(Counter(path.suffix.lower().lstrip(".") for path in documents)),
        "tags": {
            key: {"label": label, "documents": singles[key]}
            for key, (label, _) in SYSTEM_PATTERNS.items()
            if singles[key]
        },
        "strongPairs": pair_rows,
    }
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: result[key] for key in ("sourceFiles", "readableUniqueLists", "formats")}, ensure_ascii=False))
    for row in pair_rows[:30]:
        print(row)


if __name__ == "__main__":
    main()
