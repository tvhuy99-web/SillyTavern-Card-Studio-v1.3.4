// Transitional adapter: keep the recovered host ABI while using public package APIs.
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import * as jsxRuntime from 'react/jsx-runtime';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import JSON5 from 'json5';
import { wrapModule, commonJsFactory, unsupportedRequire } from './module-interop.js';
export const b = React, v = ReactDOM, wt = jsxRuntime;
export const At = create, It = immer, jt = { default: JSON5, parse: JSON5.parse, stringify: JSON5.stringify };
export const l = wrapModule, o = commonJsFactory, c = unsupportedRequire;
export { enableMapSet };
