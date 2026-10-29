"""Structure the styling depends on.

The pages are styled with utility classes from utilities.css and nothing else.
These checks keep that true: every utility is used, every class written in
markup exists, the stylesheet holds no rule other than utilities and the base,
and the ids the scripts and ARIA attributes point at are there.

Classes assembled at runtime (a hue's step, a selected tab) cannot be checked
from the source; the hue and state tables spell each one out, which is what lets
the unused-utility check see them.
"""

import re
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parent.parent
CSS = ROOT / "utilities.css"
# A one-off report with its own embedded styles, deliberately left as it is.
EXCLUDED_PAGES = {"technology-comparison.html"}


def pages():
    return sorted(p for p in ROOT.glob("*.html") if p.name not in EXCLUDED_PAGES)


def scripts():
    return sorted(ROOT.glob("*.js"))


def strip_css_comments(text):
    return re.sub(r"/\*.*?\*/", "", text, flags=re.S)


def defined_classes(css):
    """Class names from every selector, unescaped (`md\\:w-60` -> `md:w-60`)."""
    names = set()
    for selector in re.findall(r"([^{}]+)\{", strip_css_comments(css)):
        for match in re.finditer(r"\.((?:\\.|[A-Za-z0-9_-])+)", selector):
            name = re.sub(r"\\(.)", r"\1", match.group(1))
            if not name[0].isdigit():  # `.5rem` inside a value, not a class
                names.add(name)
    return names


def static_class_tokens(text):
    """Tokens of class attributes that contain no template interpolation."""
    tokens = set()
    for value in re.findall(r'class="([^"]*)"', text):
        if "${" not in value:
            tokens.update(value.split())
    return tokens


class StylesheetTests(unittest.TestCase):
    def setUp(self):
        self.css = CSS.read_text()
        self.classes = defined_classes(self.css)
        self.sources = "\n".join(p.read_text() for p in pages() + scripts())

    def test_every_utility_is_used(self):
        unused = sorted(
            name for name in self.classes
            if not re.search(rf"(?<![\w:-]){re.escape(name)}(?![\w-])", self.sources))
        self.assertEqual(unused, [], "utilities.css defines classes nothing uses")

    def test_every_custom_property_is_used(self):
        defined = set(re.findall(r"(--[\w-]+)\s*:", self.css))
        used = set(re.findall(r"var\((--[\w-]+)", self.css))
        self.assertEqual(sorted(defined - used), [], "custom properties nothing reads")
        self.assertEqual(sorted(used - defined), [], "custom properties read but never set")

    def test_only_utilities_and_the_base_are_rules(self):
        # Top-level rules: utilities, the html base, [hidden], keyframes and the
        # at-rules that hold variants. No element rules, no component classes.
        css = strip_css_comments(self.css)
        allowed = re.compile(r"^(\.|html$|\[hidden\]|@keyframes |@media |@starting-style)")
        depth, start, offenders = 0, 0, []
        for i, ch in enumerate(css):
            if ch == "{":
                if depth == 0:
                    selector = css[start:i].strip()
                    if not allowed.match(selector):
                        offenders.append(selector)
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    start = i + 1
        self.assertEqual(offenders, [])

    def test_no_heading_is_bold(self):
        # Headings are Regular, as on mcp.vaadin.com; Bold is for figures and
        # names in tables, never a heading.
        for path in pages() + scripts():
            with self.subTest(path.name):
                bold = re.findall(r'<h[1-6]\b[^>]*class="[^"]*\bfont-bold\b', path.read_text())
                self.assertEqual(bold, [])

    def test_static_classes_are_defined(self):
        # `group` is a marker for group-* variants, which name it in selectors.
        for path in pages() + scripts():
            with self.subTest(path.name):
                missing = sorted(static_class_tokens(path.read_text()) - self.classes)
                self.assertEqual(missing, [])


class PageTests(unittest.TestCase):
    def test_pages_link_only_the_utilities_stylesheet(self):
        for page in pages():
            with self.subTest(page.name):
                html = page.read_text()
                sheets = re.findall(r'<link rel="stylesheet" href="([^"]+)"', html)
                self.assertEqual([s.split("?")[0] for s in sheets], ["utilities.css"])
                self.assertNotIn("<style", html)
                self.assertNotIn(" style=", html)

    def test_ids_are_unique(self):
        for page in pages():
            with self.subTest(page.name):
                ids = re.findall(r'\bid="([^"]+)"', page.read_text())
                self.assertEqual(sorted({i for i in ids if ids.count(i) > 1}), [])

    def test_referenced_ids_exist(self):
        # ARIA references in the page, and every element its own script looks up
        # by id. common.js is left out: its lookups are guarded, because not every
        # page has every slot.
        for page in pages():
            with self.subTest(page.name):
                html = page.read_text()
                ids = set(re.findall(r'\bid="([^"]+)"', html))
                wanted = set()
                for attr in ("aria-describedby", "aria-labelledby", "aria-controls", "data-controls", "for"):
                    for value in re.findall(rf'\b{attr}="([^"]+)"', html):
                        wanted.update(value.split())
                for src in re.findall(r'<script src="([^"?]+)', html):
                    if src != "common.js":
                        wanted.update(re.findall(r'getElementById\("([^"]+)"\)', (ROOT / src).read_text()))
                self.assertEqual(sorted(wanted - ids), [])


if __name__ == "__main__":
    unittest.main()
