import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
const root = fileURLToPath(new URL('../', import.meta.url));
const temp = await mkdtemp(join(tmpdir(), 'cardstudio-native-'));
function run(command, args) {
  const result = spawnSync(command, args, {cwd: root, stdio:'inherit'});
  if (result.status !== 0) throw new Error(`${command} failed: ${result.error || result.signal || result.status}`);
}
try {
  const helpers = ['NativeSerialWorker','NativeExportSession','NativeGenerationLease','NativeModelFiles','NativeOnnxModelSet','NativeExportJournal','NativeRequestLedger','AiStudioOrigin','AiStudioCompletionPolicy','AiStudioPageScripts'];
  run('javac', ['--release','21','-d',temp,...helpers.map(name=>`android-native/${name}.java`),'tests/native/NativeArchitectureTest.java']);
  run('java',['-cp',temp,'com.tvhuy99.cardstudio.NativeArchitectureTest',join(root,'android-native'),temp]);
  for (const name of ['install','thinking-open','thinking-select','thinking-verify']) {
    const code = await readFile(join(temp,name+'.js'),'utf8');
    new vm.Script(code);
    new vm.Script(`(location.origin === 'https://aistudio.google.com' ? (${code}) : null)`);
  }
  console.log('JVM-compiled WebView expressions (including origin guard): 4/4 syntax PASS');
} finally { await rm(temp,{recursive:true,force:true}); }
