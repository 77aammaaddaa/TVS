#!/usr/bin/env python3
"""A lightweight debugging agent for local codebases.

It can inspect a target path or analyze an error/output snippet and produce a
practical debugging report with likely causes and suggested fixes.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

CODE_EXTENSIONS = {".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".py"}


class DebugAgent:
    def __init__(self, workspace_root: Path):
        self.workspace_root = workspace_root.resolve()

    def collect_code_files(self, target: Path) -> List[Path]:
        if not target.exists():
            return []
        if target.is_file() and target.suffix.lower() in CODE_EXTENSIONS:
            return [target]
        files: List[Path] = []
        for path in target.rglob("*"):
            if path.is_file() and path.suffix.lower() in CODE_EXTENSIONS:
                files.append(path)
        return sorted(files)

    def check_syntax(self, file_path: Path) -> Dict[str, Any]:
        if file_path.suffix.lower() == ".py":
            command = [sys.executable, "-m", "py_compile", str(file_path)]
        elif file_path.suffix.lower() in {".js", ".mjs", ".cjs"}:
            command = ["node", "--check", str(file_path)]
        elif file_path.suffix.lower() in {".ts", ".tsx"}:
            return {
                "file": str(file_path),
                "kind": "typescript",
                "status": "skipped",
                "message": "TypeScript syntax check was not run because no compiler was configured.",
            }
        else:
            return {
                "file": str(file_path),
                "kind": "unsupported",
                "status": "skipped",
                "message": "Unsupported file extension.",
            }

        completed = subprocess.run(command, capture_output=True, text=True)
        if completed.returncode == 0:
            return {
                "file": str(file_path),
                "kind": "syntax",
                "status": "ok",
                "message": "Syntax check passed.",
            }
        output = (completed.stderr or completed.stdout).strip()
        return {
            "file": str(file_path),
            "kind": "syntax",
            "status": "error",
            "message": output or "Syntax check failed.",
        }

    def probe_common_issues(self, file_path: Path) -> List[Dict[str, Any]]:
        issues: List[Dict[str, Any]] = []
        if file_path.suffix.lower() == ".py":
            try:
                text = file_path.read_text(encoding="utf-8")
            except Exception:
                return issues
            if "import os" in text and "os.getenv" not in text:
                issues.append({
                    "type": "missing-env-usage",
                    "message": "This Python file may be missing environment variable handling.",
                    "suggestion": "Check whether required secrets or configuration values are loaded from environment variables.",
                })
        if file_path.suffix.lower() in {".js", ".ts", ".jsx", ".tsx"}:
            try:
                text = file_path.read_text(encoding="utf-8")
            except Exception:
                return issues
            if "console.log" in text:
                issues.append({
                    "type": "debug-logging",
                    "message": "Verbose logging is present; it may help local debugging but should be removed or gated in production.",
                    "suggestion": "Temporarily keep logs while debugging, then replace them with structured logging.",
                })
            if "TODO" in text.upper() or "FIXME" in text.upper():
                issues.append({
                    "type": "todo-marker",
                    "message": "The file contains TODO/FIXME markers that may point to unfinished logic.",
                    "suggestion": "Inspect those markers before shipping a fix.",
                })
        return issues

    def display_path(self, path: Path) -> str:
        try:
            return str(path.relative_to(self.workspace_root))
        except ValueError:
            return str(path)

    def parse_error_text(self, error_text: str) -> List[Dict[str, Any]]:
        findings: List[Dict[str, Any]] = []
        if not error_text:
            return findings

        patterns = [
            r"([A-Za-z0-9_./\\-]+\.(?:js|jsx|ts|tsx|mjs|cjs|py)):(\d+)(?::(\d+))?",
            r"(?:at|in)\s+([A-Za-z0-9_./\\-]+\.(?:js|jsx|ts|tsx|mjs|cjs|py))",
        ]
        for pattern in patterns:
            for match in re.finditer(pattern, error_text):
                file_name = match.group(1)
                line_number = None
                if len(match.groups()) >= 2 and match.group(2):
                    line_number = int(match.group(2))
                resolved_path = self.resolve_path(file_name)
                if resolved_path:
                    findings.append({
                        "file": self.display_path(resolved_path),
                        "line": line_number,
                        "message": error_text.strip(),
                    })
                    break

        lower_error = error_text.lower()
        if "syntaxerror" in lower_error:
            findings.append({
                "file": None,
                "line": None,
                "message": "The error looks like a parsing issue.",
                "likely_cause": "A syntax mistake or malformed expression is likely present.",
                "suggestion": "Review the nearest block of code and verify brackets, quotes, and indentation.",
            })
        elif "referenceerror" in lower_error:
            findings.append({
                "file": None,
                "line": None,
                "message": "The error looks like an undefined variable or symbol.",
                "likely_cause": "A variable, import, or function name is being referenced before it exists.",
                "suggestion": "Check the scope, imports, and initialization order.",
            })
        elif "typeerror" in lower_error or "cannot read properties" in lower_error:
            findings.append({
                "file": None,
                "line": None,
                "message": "The error looks like a type or null/undefined issue.",
                "likely_cause": "A value may be missing or of the wrong shape.",
                "suggestion": "Add defensive checks and log the variable's value before the failing line.",
            })

        return findings

    def resolve_path(self, file_name: str) -> Optional[Path]:
        candidate = Path(file_name)
        normalized = file_name.replace("\\", "/")
        if candidate.is_absolute():
            return candidate if candidate.exists() else None
        for base in [self.workspace_root, Path.cwd()]:
            resolved = (base / normalized).resolve()
            if resolved.exists():
                return resolved
            for path in base.rglob("*"):
                if path.is_file() and path.name == Path(normalized).name:
                    return path
        return None

    def build_report(self, target: Path, error_text: Optional[str] = None) -> Dict[str, Any]:
        files = self.collect_code_files(target)
        syntax_results = [self.check_syntax(file_path) for file_path in files]
        issues: List[Dict[str, Any]] = []
        for result in syntax_results:
            if result["status"] == "error":
                issues.append({
                    "type": "syntax",
                    "file": result["file"],
                    "message": result["message"],
                    "suggestion": "Fix the reported syntax issue first and rerun the agent.",
                })
            elif result["status"] == "ok":
                continue
            else:
                continue

        if error_text:
            parsed = self.parse_error_text(error_text)
            issues.extend(parsed)

        if not issues:
            return {
                "summary": "No obvious issues were detected.",
                "target": str(target),
                "issues": [],
            }

        return {
            "summary": f"Detected {len(issues)} issue(s) that are worth investigating.",
            "target": str(target),
            "issues": issues,
        }


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the local debugging agent")
    parser.add_argument("--path", default=".", help="Path to scan for code files")
    parser.add_argument("--error", default=None, help="Optional error/output snippet to analyze")
    parser.add_argument("--json", action="store_true", help="Emit the report as JSON")
    args = parser.parse_args()

    root = Path(args.path).resolve()
    agent = DebugAgent(root if root.exists() else Path.cwd())
    report = agent.build_report(root, args.error)
    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print(report["summary"])
        print(f"Target: {report['target']}")
        for idx, item in enumerate(report["issues"], start=1):
            file_hint = item.get("file") or "(no file identified)"
            line_hint = f":{item.get('line')}" if item.get("line") else ""
            print(f"{idx}. {file_hint}{line_hint} -> {item.get('message', 'No message')}")
            if item.get("likely_cause"):
                print(f"   Likely cause: {item['likely_cause']}")
            if item.get("suggestion"):
                print(f"   Suggested fix: {item['suggestion']}")
    return 0 if report["issues"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
