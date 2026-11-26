import lodash from 'lodash';
export function createLodashRuntime() { return { lodash: { default: lodash } }; }
