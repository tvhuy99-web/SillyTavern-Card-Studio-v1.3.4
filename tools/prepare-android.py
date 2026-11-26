#!/usr/bin/env python3
"""Install the versioned native overlay into an already generated Capacitor app.
No SDK needed for preparation. Signing remains a separate CI concern."""
import argparse
import json
from pathlib import Path
import shutil
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
NS = "http://schemas.android.com/apk/res/android"
ET.register_namespace("android", NS)
def attr(name): return f"{{{NS}}}{name}"
PERMISSIONS = ("FOREGROUND_SERVICE", "FOREGROUND_SERVICE_DATA_SYNC", "WAKE_LOCK", "POST_NOTIFICATIONS")
LIBRARIES = ("libOpenCL.so", "libvndksupport.so")

def configure(project):
    config = json.loads((ROOT / "capacitor.config.json").read_text())
    package = config["appId"]
    app = project / "app"
    source = app / "src/main/java" / Path(*package.split('.'))
    manifest = app / "src/main/AndroidManifest.xml"
    gradle = app / "build.gradle"
    if not manifest.is_file() or not gradle.is_file():
        raise ValueError("Generate/sync the Capacitor Android project before applying the native overlay")
    tree = ET.parse(manifest)
    root = tree.getroot()
    application = root.find("application")
    if application is None: raise ValueError("Android manifest has no application")
    for name in PERMISSIONS:
        value = "android.permission." + name
        if not any(e.get(attr("name")) == value for e in root.findall("uses-permission")):
            root.insert(list(root).index(application), ET.Element("uses-permission", {attr("name"):value}))
    def ensure(tag, name, attributes):
        items = [item for item in application.findall(tag) if item.get(attr("name")) == name]
        if len(items) > 1: raise ValueError(f"Duplicate manifest element: {name}")
        item = items[0] if items else ET.SubElement(application, tag, {attr("name"): name})
        for key, value in attributes.items(): item.set(attr(key), value)
    ensure("service", ".AiStudioGenerationService", {"exported":"false", "stopWithTask":"false", "foregroundServiceType":"dataSync"})
    for library in LIBRARIES: ensure("uses-native-library", library, {"required":"false"})
    ET.indent(tree, space="    ")
    tree.write(manifest, encoding="utf-8", xml_declaration=True)
    source.mkdir(parents=True, exist_ok=True)
    java = sorted((ROOT / "android-native").glob("*.java"))
    for path in java: shutil.copyfile(path, source / path.name)
    shutil.copyfile(ROOT / "android-native/config/native-dependencies.gradle", app / "cardstudio-native.gradle")
    directive = "apply from: 'cardstudio-native.gradle'"
    text = gradle.read_text()
    if directive not in text: gradle.write_text(text.rstrip() + "\n\n" + directive + "\n")
    print(f"Native overlay applied: {len(java)} Java files, manifest, dependency configuration")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project", type=Path, nargs="?", default=ROOT / "android")
    configure(parser.parse_args().project.resolve())
