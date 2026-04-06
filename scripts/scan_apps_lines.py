from __future__ import annotations

import argparse
import json
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import TypedDict

REPO_ROOT = Path(__file__).resolve().parents[1]
APPS_DIR = REPO_ROOT / "apps"


@dataclass(slots=True)
class FileStat:
    path: str
    app: str
    lines: int


class FileStatPayload(TypedDict):
    path: str
    app: str
    lines: int


class AppSummary(TypedDict):
    files: int
    lines: int


class SummaryPayload(TypedDict):
    scope: str
    min_lines: int
    scanned_text_files: int
    matched_files: int
    matched_lines: int
    skipped_binary_files: list[str]
    apps: dict[str, AppSummary]
    top_files: list[FileStatPayload]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="扫描 apps 目录下各文件的行数（基于 Git 索引）。")
    parser.add_argument(
        "--min-lines",
        type=int,
        default=401,
        help="统计行数大于等于此值的文件，默认 401。",
    )
    parser.add_argument(
        "--top",
        type=int,
        default=20,
        help="展示行数排名前 N 的统计结果，默认 20。",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="以 JSON 格式输出统计结果。",
    )
    return parser.parse_args()


def list_git_visible_files() -> list[Path]:
    try:
        result = subprocess.run(
            [
                "git",
                "ls-files",
                "--cached",
                "--others",
                "--exclude-standard",
                "--",
                "apps",
            ],
            cwd=REPO_ROOT,
            check=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
    except FileNotFoundError as exc:
        raise RuntimeError("未在系统路径中找到 git，请确保已安装 Git。") from exc
    except subprocess.CalledProcessError as exc:
        stderr = exc.stderr.strip() or "未知错误"
        raise RuntimeError(f"执行 git ls-files 失败: {stderr}") from exc

    paths: list[Path] = []
    for raw_path in result.stdout.splitlines():
        if not raw_path:
            continue
        file_path = REPO_ROOT / raw_path
        if file_path.is_file():
            paths.append(file_path)
    return paths


def is_binary_file(path: Path) -> bool:
    with path.open("rb") as handle:
        chunk = handle.read(8192)
    return b"\x00" in chunk


def count_lines(path: Path) -> int:
    line_count = 0
    last_byte = b""

    with path.open("rb") as handle:
        while chunk := handle.read(1024 * 1024):
            line_count += chunk.count(b"\n")
            last_byte = chunk[-1:]

    if last_byte and last_byte != b"\n":
        line_count += 1

    return line_count


def collect_stats(paths: list[Path]) -> tuple[list[FileStat], list[str]]:
    stats: list[FileStat] = []
    skipped: list[str] = []

    for path in paths:
        relative_path = path.relative_to(REPO_ROOT)
        if is_binary_file(path):
            skipped.append(relative_path.as_posix())
            continue

        parts = relative_path.parts
        app_name = parts[1] if len(parts) > 1 else "unknown"
        stats.append(
            FileStat(
                path=relative_path.as_posix(),
                app=app_name,
                lines=count_lines(path),
            )
        )

    stats.sort(key=lambda item: (-item.lines, item.path))
    return stats, skipped


def build_summary(
    all_stats: list[FileStat],
    filtered_stats: list[FileStat],
    skipped: list[str],
    top_n: int,
    min_lines: int,
) -> SummaryPayload:
    apps_summary: dict[str, AppSummary] = {}
    for item in filtered_stats:
        summary = apps_summary.setdefault(item.app, {"files": 0, "lines": 0})
        summary["files"] += 1
        summary["lines"] += item.lines

    ordered_apps = dict(
        sorted(
            apps_summary.items(),
            key=lambda item: (-item[1]["lines"], item[0]),
        )
    )

    top_files: list[FileStatPayload] = [
        {
            "path": item.path,
            "app": item.app,
            "lines": item.lines,
        }
        for item in filtered_stats[:top_n]
    ]

    return {
        "scope": str(APPS_DIR.relative_to(REPO_ROOT)),
        "min_lines": min_lines,
        "scanned_text_files": len(all_stats),
        "matched_files": len(filtered_stats),
        "matched_lines": sum(item.lines for item in filtered_stats),
        "skipped_binary_files": skipped,
        "apps": ordered_apps,
        "top_files": top_files,
    }


def print_table(summary: SummaryPayload, top_n: int) -> None:
    apps = summary["apps"]
    top_files = summary["top_files"]
    skipped = summary["skipped_binary_files"]

    print("apps 目录文件行数统计")
    print(f"统计范围: {summary['scope']}")
    print(f"筛选条件: 行数 >= {summary['min_lines']}")
    print(f"扫描文本文件: {summary['scanned_text_files']}")
    print(f"符合条件文件: {summary['matched_files']}")
    print(f"符合条件总行数: {summary['matched_lines']}")
    print(f"跳过二进制文件: {len(skipped)}")

    if apps:
        print("\n按应用汇总:")
        for app_name, item in apps.items():
            print(f"- {app_name}: {item['files']} 个文件, {item['lines']} 行")

    if top_files:
        print(f"\nTop {min(top_n, len(top_files))} 文件:")
        width = max(len(str(item["lines"])) for item in top_files)
        for item in top_files:
            print(f"- {item['lines']:>{width}} 行  {item['path']}")

    if skipped:
        print("\n跳过（疑似二进制或编码错误）的文件:")
        for path in skipped:
            print(f"- {path}")


def main() -> int:
    args = parse_args()

    if not APPS_DIR.exists():
        print("未找到 apps 目录。", file=sys.stderr)
        return 1

    try:
        paths = list_git_visible_files()
        all_stats, skipped = collect_stats(paths)
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    filtered_stats = [item for item in all_stats if item.lines >= args.min_lines]
    summary = build_summary(
        all_stats=all_stats,
        filtered_stats=filtered_stats,
        skipped=skipped,
        top_n=args.top,
        min_lines=args.min_lines,
    )

    if args.json:
        print(json.dumps(summary, ensure_ascii=False, indent=2))
        return 0

    print_table(summary, args.top)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
