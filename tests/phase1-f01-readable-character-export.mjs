import assert from 'node:assert/strict';
import { createCharacterExport } from '../src/features/catalog/character-export.js';
const exporter=createCharacterExport();
assert.equal(exporter.encodeBase64Utf8('Việt Nam'),Buffer.from('Việt Nam').toString('base64'));
assert.equal(exporter.isPngBytes(new Uint8Array([137,80,78,71,13,10,26,10])),true);
const chunk=exporter.createPngTextChunk('chara','abc');
const view=new DataView(chunk.buffer,chunk.byteOffset,chunk.byteLength);
assert.equal(view.getUint32(0),9);
assert.equal(new TextDecoder().decode(chunk.slice(4,-4)),'tEXtchara\0abc');
let crc=-1;
for(const byte of chunk.slice(4,-4)){
  crc^=byte;
  for(let bit=0;bit<8;bit++)crc=crc&1?0xedb88320^(crc>>>1):crc>>>1;
}
assert.equal(view.getUint32(chunk.length-4),(-1^crc)>>>0);
const card={spec:'chara_card_v3',spec_version:'3.1',name:'Hero',personality:'Bold',first_mes:'Hello',char_book:{entries:[]},__private:'x',extensions:{TavernHelper_scripts:[{type:'script',value:{id:'one',buttons:['Run'],content:'script'}}]}};
const v3=exporter.buildExportCard(card,'auto');
assert.equal(v3.spec_version,'3.1');assert.deepEqual(v3.data.character_book,{entries:[]});
assert.equal('__private' in v3.data,false);assert.equal(v3.data.extensions.tavern_helper[0][1][0].id,'one');
assert.deepEqual(v3.data.extensions.tavern_helper[0][1][0].button.buttons,['Run']);
const v1=exporter.buildExportCard(card,'v1');assert.equal(v1.char_name,'Hero');assert.equal(v1.char_greeting,'Hello');assert.deepEqual(v1.char_book,{entries:[]});
assert.equal(card.__private,'x');assert.equal(card.char_book.entries.length,0);
console.log('F01 character export names: PNG CRC, v1/v3 and script compatibility OK');
