import { webcrypto } from 'node:crypto';
import { File as NodeFile } from 'node:buffer';

if (typeof globalThis.crypto === 'undefined') {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
    enumerable: false,
    writable: true,
  });
}

if (typeof globalThis.File === 'undefined' && typeof NodeFile === 'function') {
  Object.defineProperty(globalThis, 'File', {
    value: NodeFile,
    configurable: true,
    enumerable: false,
    writable: true,
  });
}

if (typeof globalThis.CustomEvent === 'undefined' && typeof globalThis.Event === 'function') {
  class NodeCustomEvent extends globalThis.Event {
    constructor(type, eventInitDict = {}) {
      super(type, eventInitDict);
      this.detail = eventInitDict && 'detail' in eventInitDict ? eventInitDict.detail : null;
    }
  }
  Object.defineProperty(globalThis, 'CustomEvent', {
    value: NodeCustomEvent,
    configurable: true,
    enumerable: false,
    writable: true,
  });
}
