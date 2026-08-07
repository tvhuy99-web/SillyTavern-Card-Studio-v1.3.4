import JSZip from '../assets/jszip.min-CF4xG0Dr.js';

const archive = new JSZip();
archive.file('hello.txt', 'hello');
const bytes = await archive.generateAsync({ type: 'uint8array' });
const loaded = await JSZip.loadAsync(bytes);
const text = await loaded.file('hello.txt').async('string');
if (text !== 'hello') throw new Error(`Unexpected JSZip round-trip value: ${text}`);
console.log(`JSZip round-trip: PASS (${bytes.byteLength} bytes)`);
