from pathlib import Path
import re


class ContextLoader:
    def __init__(self, pages_dir: Path) -> None:
        self.pages_dir = pages_dir

    def load_adrian_context(self) -> str:
        context = ["CONTEXT ABOUT ADRIAN LATORRE:\n"]

        page_sections = [
            ("DashboardPage.vue", "PROFESSIONAL BACKGROUND:"),
            ("MediaPage.vue", "PERSONAL PROJECTS & INTERESTS:"),
        ]

        for filename, heading in page_sections:
            page_path = self.pages_dir / filename
            if not page_path.exists():
                continue

            context.append(heading)
            context.append(self._extract_relevant_content(page_path.read_text()))
            context.append("")

        return "\n".join(context)

    def build_enhanced_system_prompt(self, base_prompt: str) -> str:
        return f"""{base_prompt}

{self.load_adrian_context()}

Use this context to answer questions authentically as Adrian. Don't mention that you have this context - just naturally incorporate the information into your responses."""

    @staticmethod
    def _extract_relevant_content(content: str) -> str:
        content = re.sub(r"<script[\s\S]*?</script>", "", content)
        content = re.sub(r"<style[\s\S]*?</style>", "", content)

        clean_lines: list[str] = []
        for raw_line in content.splitlines():
            line = raw_line.strip()
            if not line or line.startswith(("<template", "</template", "<!--")):
                continue

            line = re.sub(r"<[^>]+>", " ", line)
            line = re.sub(r"\s+", " ", line).strip()
            if line and not line.startswith(("<", ">")):
                clean_lines.append(line)

        return "\n".join(clean_lines)
