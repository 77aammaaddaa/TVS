import unittest
from pathlib import Path

from tools.debug_agent import DebugAgent


class DebugAgentTests(unittest.TestCase):
    def test_parse_error_text_detects_file_and_line(self) -> None:
        workspace = Path(__file__).resolve().parents[1]
        agent = DebugAgent(workspace)
        error_text = "ReferenceError: foo is not defined at ecofine/app.js:24:10"
        findings = agent.parse_error_text(error_text)
        self.assertTrue(any(item.get("file") and "ecofine/app.js" in str(item.get("file")) for item in findings))

    def test_build_report_returns_summary(self) -> None:
        workspace = Path(__file__).resolve().parents[1]
        agent = DebugAgent(workspace)
        report = agent.build_report(workspace, "TypeError: Cannot read properties of undefined")
        self.assertIn("issue", report["summary"].lower())


if __name__ == "__main__":
    unittest.main()
