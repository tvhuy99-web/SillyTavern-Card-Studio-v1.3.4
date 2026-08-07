#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
EXECUTABLE_JS = [
    *sorted((ROOT / 'assets').glob('*.js')),
    ROOT / 'scripts/extensions/third-party/JS-Slash-Runner/dist/index.js',
]


def fail(message: str) -> None:
    raise AssertionError(message)


def check_js_syntax() -> None:
    for path in EXECUTABLE_JS:
        if not path.is_file():
            fail(f'Missing JavaScript file: {path.relative_to(ROOT)}')
        result = subprocess.run(['node', '--check', str(path)], capture_output=True, text=True)
        if result.returncode:
            fail(f'JavaScript syntax failed for {path.relative_to(ROOT)}:\n{result.stderr}')


def check_json() -> None:
    for path in ROOT.rglob('*.json'):
        json.loads(path.read_text(encoding='utf-8'))


def check_html_assets() -> None:
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    for attr, value in re.findall(r'\b(src|href)=["\']([^"\']+)["\']', html):
        parsed = urlsplit(value)
        if parsed.scheme or value.startswith(('data:', '#')):
            continue
        target = (ROOT / parsed.path.lstrip('./')).resolve()
        if ROOT.resolve() not in target.parents and target != ROOT.resolve():
            fail(f'HTML path escapes package: {value}')
        if not target.is_file():
            fail(f'Missing HTML {attr} target: {value}')


def check_relative_imports() -> None:
    missing: list[str] = []
    for path in EXECUTABLE_JS:
        text = path.read_text(encoding='utf-8')
        specs = re.findall(r'(?:from\s*|import\s*\(|import\s*)["\'](\.{1,2}/[^"\']+)["\']', text)
        for spec in specs:
            candidate = (path.parent / spec).resolve()
            options = [candidate, Path(str(candidate) + '.js'), candidate / 'index.js']
            if not any(option.is_file() for option in options):
                missing.append(f'{path.relative_to(ROOT)} -> {spec}')
    if missing:
        fail('Missing relative imports:\n' + '\n'.join(missing))



def check_embedded_runtime_syntax() -> None:
    overlay = (ROOT / 'patch-src/runtime-current-0.txt').read_text(encoding='utf-8').replace('${fp}', '[]')
    core = (ROOT / 'patch-src/runtime-current-1.txt').read_text(encoding='utf-8')
    core = core.replace('${t}', '{context:{compatibilityMode:"safe",engineMode:"compat",messageId:"test",chatId:"test"},catalog:{},characterCard:{},lorebookNames:[],storage:{local:{},session:{}}}')
    core = core.replace('${"4.8.19"}', '4.8.19').replace('${"1.18.0"}', '1.18.0').replace('${"4.8.19-compat.11"}', '4.8.19-compat.11').replace('${yp}', overlay)
    starter = (ROOT / 'patch-src/runtime-current-2.txt').read_text(encoding='utf-8').replace('${i}', '{}').replace('${r}', '""').replace('${a}', '[]')
    rendered = [core, starter]
    with tempfile.TemporaryDirectory() as directory:
        for index, text in enumerate(rendered):
            path = Path(directory) / f'runtime-{index}.js'
            path.write_text(text, encoding='utf-8')
            result = subprocess.run(['node', '--check', str(path)], capture_output=True, text=True)
            if result.returncode:
                fail(f'Embedded runtime syntax failed for template {index}:\n{result.stderr}')

def check_invariants() -> None:
    bundle = (ROOT / 'assets/index-11db71a5-modeltest-v2-htmlmodes-v1.js').read_text(encoding='utf-8')
    version = json.loads((ROOT / 'version.json').read_text(encoding='utf-8'))
    required = {
        'runtime version': '4.8.19-compat.11',
        'Worldbook array guard': 'replaceWorldbook expected WorldbookEntry[]; refusing to overwrite data with an invalid value',
        'honest extension error': 'is unavailable in a static Card Studio deployment',
        'model output validation': 'nội dung kiểm tra không hợp lệ',
        'local registered slash commands': 'const slashRegistry = new Map();',
        'IndexedDB localforage': 'indexedDB',
    }
    for label, marker in required.items():
        if marker not in bundle:
            fail(f'Missing invariant marker: {label}')
    if '4.8.19-compat.9' in bundle:
        fail('Old contradictory runtime version remains')
    if version.get('runtimeCompatibility') != '4.8.19-compat.11':
        fail('version.json runtime mismatch')
    if not (ROOT / 'assets/index-yS4Vru8B.js').is_file():
        fail('JSZip bridge is missing')
    if not (ROOT / 'scripts/extensions/third-party/JS-Slash-Runner/manifest.json').is_file():
        fail('TavernHelper manifest is missing')
    redirects = (ROOT / '_redirects').read_text(encoding='utf-8')
    if '/api/*  /api-unavailable.json  501' not in redirects:
        fail('Unsupported API fallback is not HTTP 501')


def main() -> int:
    check_js_syntax()
    check_json()
    check_html_assets()
    check_relative_imports()
    check_embedded_runtime_syntax()
    check_invariants()
    print('Static validation: PASS')
    print(f'JavaScript files checked: {len(EXECUTABLE_JS)}')
    print(f'JSON files checked: {sum(1 for _ in ROOT.rglob("*.json"))}')
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f'Static validation: FAIL\n{exc}', file=sys.stderr)
        raise SystemExit(1)
