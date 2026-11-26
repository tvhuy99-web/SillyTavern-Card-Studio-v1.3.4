"""Apply the native overlay twice to a disposable generated-project fixture."""
from pathlib import Path
from tempfile import TemporaryDirectory
import subprocess
import sys
import xml.etree.ElementTree as ET
ROOT = Path(__file__).resolve().parents[2]
NS = '{http://schemas.android.com/apk/res/android}'
with TemporaryDirectory() as temporary:
    android = Path(temporary)
    app = android / 'app'
    manifest = app / 'src/main/AndroidManifest.xml'
    manifest.parent.mkdir(parents=True)
    manifest.write_text('''<manifest xmlns:android="http://schemas.android.com/apk/res/android"><uses-permission android:name="android.permission.INTERNET"/><application android:label="fixture"><activity android:name=".MainActivity"/><service android:name=".AiStudioGenerationService" android:exported="true"/></application></manifest>''')
    gradle = app / 'build.gradle'
    gradle.write_text("plugins { id 'com.android.application' }\n")
    def apply(): subprocess.run([sys.executable, str(ROOT / 'tools/prepare-android.py'), str(android)], check=True)
    apply(); before = (manifest.read_bytes(), gradle.read_bytes()); apply()
    assert before == (manifest.read_bytes(), gradle.read_bytes()), 'overlay must be idempotent'
    xml = ET.parse(manifest).getroot()
    permissions = [e.get(NS+'name') for e in xml.findall('uses-permission')]
    assert set(permissions) == {'android.permission.'+p for p in ['INTERNET','FOREGROUND_SERVICE','FOREGROUND_SERVICE_DATA_SYNC','WAKE_LOCK','POST_NOTIFICATIONS']}
    assert len(permissions) == len(set(permissions))
    services = xml.findall('application/service'); assert len(services)==1
    assert services[0].get(NS+'exported')=='false' and services[0].get(NS+'foregroundServiceType')=='dataSync' and services[0].get(NS+'stopWithTask')=='false'
    libraries = xml.findall('application/uses-native-library'); assert len(libraries)==2 and all(e.get(NS+'required')=='false' for e in libraries)
    assert xml.find('application/activity').get(NS+'name')=='.MainActivity'
    target = app/'src/main/java/com/tvhuy99/cardstudio'
    java = list((ROOT/'android-native').glob('*.java'))
    assert len(list(target.glob('*.java')))==len(java)
    for source in java: assert (target/source.name).read_bytes()==source.read_bytes()
    activity = (target/'MainActivity.java').read_text()
    plugins = ['AiStudioTextPlugin', 'WorldInfoEmbeddingNativePlugin', 'EmbeddingGemma2LiteRTPlugin', 'AndroidExportFilePlugin']
    assert activity.count('registerPlugin(') == len(plugins)
    for plugin in plugins: assert 'registerPlugin('+plugin+'.class)' in activity
    assert activity.index('registerPlugin(') < activity.index('super.onCreate(')
    assert gradle.read_text().count("apply from: 'cardstudio-native.gradle'")==1
    assert (app/'cardstudio-native.gradle').read_bytes()==(ROOT/'android-native/config/native-dependencies.gradle').read_bytes()
print('Android overlay fixture: manifest, permissions, 4 plugin registrations, file parity and idempotence PASS')
