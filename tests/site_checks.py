"""Dependency-free structural checks for the static portfolio site."""

from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import urlparse
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]


class SiteParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.hrefs = []
        self.asset_paths = []
        self.meta = {}
        self.scripts = []
        self.dialogs = []
        self.buttons = []
        self.canvases = []
        self._current_canvas = None
        self._json_ld = False
        self.json_ld_text = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)

        if values.get("id"):
            self.ids.append(values["id"])

        if tag == "a" and values.get("href"):
            self.hrefs.append(values["href"])

        if tag in {"img", "script", "link"}:
            source = values.get("src") or values.get("href")
            if source:
                self.asset_paths.append(source)

        if tag == "img" and values.get("srcset"):
            self.asset_paths.extend(
                candidate.strip().split()[0]
                for candidate in values["srcset"].split(",")
            )

        if tag == "meta":
            key = values.get("name") or values.get("property")
            if key:
                self.meta[key] = values.get("content", "")

        if tag == "script":
            self.scripts.append(values)
            self._json_ld = values.get("type") == "application/ld+json"

        if tag == "div" and values.get("role") == "dialog":
            self.dialogs.append(values)

        if tag == "button":
            self.buttons.append(values)

        if tag == "canvas":
            self._current_canvas = {"attributes": values, "fallback_text": []}
            self.canvases.append(self._current_canvas)

    def handle_endtag(self, tag):
        if tag == "script":
            self._json_ld = False

        if tag == "canvas":
            self._current_canvas = None

    def handle_data(self, data):
        if self._json_ld:
            self.json_ld_text.append(data)

        if self._current_canvas is not None:
            self._current_canvas["fallback_text"].append(data)


def local_asset_path(asset):
    parsed = urlparse(asset)
    if parsed.scheme or parsed.netloc or asset.startswith(("#", "mailto:")):
        return None
    return ROOT / parsed.path.lstrip("/")


def check(condition, message, failures):
    if not condition:
        failures.append(message)


def main():
    failures = []
    parser = SiteParser()
    parser.feed((ROOT / "index.html").read_text(encoding="utf-8"))
    styles = (ROOT / "styles.css").read_text(encoding="utf-8")
    script = (ROOT / "script.js").read_text(encoding="utf-8")

    check(
        not re.search(r"(?ms)^html\s*\{[^}]*scroll-behavior\s*:\s*smooth", styles),
        "Global smooth scrolling delays or blocks wheel input",
        failures,
    )
    check(
        "function setupAnchorScrolling()" in script
        and "setupAnchorScrolling();" in script
        and "scrollIntoView" in script,
        "Intentional in-page links must retain scoped smooth scrolling",
        failures,
    )

    check(len(parser.ids) == len(set(parser.ids)), "HTML contains duplicate IDs", failures)

    for href in parser.hrefs:
        if href.startswith("#"):
            check(href[1:] in parser.ids, f"Missing anchor target: {href}", failures)

    for asset in parser.asset_paths:
        path = local_asset_path(asset)
        if path:
            check(path.exists(), f"Missing local asset: {asset}", failures)

    for required_meta in ("description", "viewport", "og:title", "og:description", "og:url"):
        check(bool(parser.meta.get(required_meta)), f"Missing metadata: {required_meta}", failures)

    viewport = parser.meta.get("viewport", "").lower()
    check("user-scalable=no" not in viewport, "Viewport disables browser zoom", failures)

    local_scripts = [script for script in parser.scripts if script.get("src") == "script.js"]
    check(len(local_scripts) == 1 and "defer" in local_scripts[0], "script.js must load once with defer", failures)

    check(
        len(parser.dialogs) == 1 and parser.dialogs[0].get("aria-modal") == "true",
        "Tetris must be exposed as one modal dialog",
        failures,
    )
    check(
        re.search(
            r"(?ms)^\.tetris-container\s*\{[^}]*overflow-x\s*:\s*hidden\s*;[^}]*overflow-y\s*:\s*auto\s*;",
            styles,
        ),
        "Tetris container must prevent horizontal overflow while retaining vertical scrolling",
        failures,
    )
    compact_tetris = re.search(
        r"(?ms)@media\s*\(max-width:\s*768px\),\s*\(pointer:\s*coarse\)\s*\{(.*?)^\}",
        styles,
    )
    check(bool(compact_tetris), "Tetris needs a compact narrow/coarse-pointer layout", failures)
    if compact_tetris:
        compact_styles = compact_tetris.group(1)
        compact_board = re.search(r"(?ms)^\s*\.tetris-board\s*\{(.*?)^\s*\}", compact_styles)
        compact_info = re.search(r"(?ms)^\s*\.tetris-info\s*\{(.*?)^\s*\}", compact_styles)
        compact_controls = re.search(r"(?ms)^\s*\.tetris-touch-controls\s*\{(.*?)^\s*\}", compact_styles)
        check(
            compact_board and re.search(r"height\s*:\s*min\(42svh,\s*360px\)", compact_board.group(1)),
            "Compact Tetris board must use the viewport-relative height cap",
            failures,
        )
        check(
            compact_board and re.search(r"width\s*:\s*auto\s*;", compact_board.group(1)),
            "Compact Tetris board must retain its proportional width",
            failures,
        )
        check(
            compact_board and re.search(r"max-width\s*:\s*100%\s*;", compact_board.group(1)),
            "Compact Tetris board must not exceed the available width",
            failures,
        )
        check(
            compact_info and re.search(r"grid-template-columns\s*:\s*repeat\(3,\s*1fr\)\s*;", compact_info.group(1)),
            "Compact Tetris score row must retain three columns",
            failures,
        )
        check(
            re.search(r"\.info-panel:last-child\s*\{[^}]*display\s*:\s*none\s*;", compact_styles),
            "Compact Tetris layout must hide the keyboard-controls panel",
            failures,
        )
        check(
            compact_controls and re.search(r"display\s*:\s*grid\s*;", compact_controls.group(1)),
            "Compact Tetris layout must display touch controls as a grid",
            failures,
        )
    touch_buttons = re.search(r"(?ms)^\.tetris-touch-controls\s+button\s*\{(.*?)^\}", styles)
    touch_min_height = (
        re.search(r"min-height\s*:\s*([0-9]+(?:\.[0-9]+)?)px\s*;", touch_buttons.group(1))
        if touch_buttons
        else None
    )
    check(
        touch_min_height and float(touch_min_height.group(1)) >= 44,
        "Tetris touch buttons must be at least 44px tall",
        failures,
    )
    check(
        any(button.get("id") == "closeTetris" and button.get("aria-label") for button in parser.buttons),
        "Tetris close button needs an accessible name",
        failures,
    )
    touch_trigger = next((button for button in parser.buttons if button.get("id") == "openTetris"), None)
    check(
        touch_trigger
        and touch_trigger.get("type") == "button"
        and touch_trigger.get("aria-label") == "Open secret Tetris game",
        "Tetris needs an accessible external touch trigger",
        failures,
    )
    footer = re.search(r"(?ms)<footer\b[^>]*>.*?</footer>", (ROOT / "index.html").read_text(encoding="utf-8"))
    check(
        footer and 'id="openTetris"' in footer.group(0),
        "The external Tetris trigger must be discoverable in the footer",
        failures,
    )
    check(
        "document.getElementById('openTetris').addEventListener('click', showTetris);" in script,
        "The external Tetris trigger must open the game",
        failures,
    )
    check(
        ".filter(element => element.getClientRects().length > 0)" in script,
        "Modal focus trapping must ignore CSS-hidden controls",
        failures,
    )
    restart_button = next(
        (button for button in parser.buttons if button.get("data-tetris-action") == "restart"),
        None,
    )
    check(
        restart_button
        and restart_button.get("aria-label") == "Restart game"
        and "hidden" in restart_button,
        "Tetris touch Restart must be hidden until game over",
        failures,
    )
    check(
        re.search(
            r"(?ms)gameOver\(\)\s*\{.*?restartButton\.hidden\s*=\s*false\s*;",
            script,
        ),
        "Game over must reveal the touch Restart button",
        failures,
    )
    check(
        re.search(r"(?ms)restart\(\)\s*\{.*?restartButton\.hidden\s*=\s*true\s*;", script),
        "Restarting must hide the touch Restart button again",
        failures,
    )
    check(
        re.search(
            r"(?ms)case 'restart':\s*if\s*\(!tetrisGame\.gameRunning\)\s*\{\s*tetrisGame\.restart\(\);\s*\}\s*return\s*;",
            script,
        ),
        "Touch Restart must be a no-op while a game is active",
        failures,
    )
    check(
        re.search(
            r"(?ms)this\.drop\(\);\s*this\.lastTime\s*=\s*time\s*;\s*}\s*if\s*\(this\.gameRunning\)\s*\{\s*this\.draw\(\);\s*requestAnimationFrame",
            script,
        ),
        "Tetris update must not redraw after a drop ends the game",
        failures,
    )
    check(
        re.search(
            r"(?ms)function runTetrisAction\(action\)\s*\{.*?switch\s*\(action\).*?}\s*if\s*\(tetrisGame\.gameRunning\)\s*\{\s*tetrisGame\.draw\(\);\s*}",
            script,
        ),
        "Tetris touch actions must not redraw after an action ends the game",
        failures,
    )
    check(
        compact_controls and re.search(r"grid-template-columns\s*:\s*repeat\(4,\s*1fr\)\s*;", compact_controls.group(1)),
        "Compact Tetris controls must use four columns",
        failures,
    )
    check(
        re.search(r"\.tetris-touch-controls\s+\[data-tetris-action=\"restart\"\]\s*\{[^}]*grid-column\s*:\s*span\s+2\s*;", styles),
        "Compact Tetris Restart must span two columns in its second control row",
        failures,
    )
    check(
        re.search(
            r"this\.pieces\s*=\s*\[\s*\[\s*\[\s*\[1\s*,\s*1\s*,\s*1\s*,\s*1\]\s*\]\s*,\s*\[\s*\[1\]\s*,\s*\[1\]\s*,\s*\[1\]\s*,\s*\[1\]\s*\]\s*\]",
            script,
        ),
        "The I tetromino must define horizontal and vertical rotation states",
        failures,
    )
    tetris_canvases = [
        canvas for canvas in parser.canvases if canvas["attributes"].get("id") == "tetrisBoard"
    ]
    check(len(tetris_canvases) == 1, "Tetris must include one game board canvas", failures)
    if len(tetris_canvases) == 1:
        tetris_canvas = tetris_canvases[0]
        attributes = tetris_canvas["attributes"]
        fallback_text = "".join(tetris_canvas["fallback_text"])
        check(attributes.get("role") == "img", "Tetris board canvas must have image semantics", failures)
        check(bool(attributes.get("aria-label", "").strip()), "Tetris board canvas needs an accessible name", failures)
        check("does not support" not in fallback_text.lower(), "Tetris board fallback must not claim canvas is unsupported", failures)

    try:
        json.loads("".join(parser.json_ld_text))
    except json.JSONDecodeError as error:
        failures.append(f"Invalid JSON-LD: {error}")

    try:
        json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        failures.append(f"Invalid manifest.json: {error}")

    try:
        ET.parse(ROOT / "sitemap.xml")
    except ET.ParseError as error:
        failures.append(f"Invalid sitemap.xml: {error}")

    if failures:
        for failure in failures:
            print(f"FAIL: {failure}")
        raise SystemExit(1)

    print("All site checks passed.")


if __name__ == "__main__":
    main()
