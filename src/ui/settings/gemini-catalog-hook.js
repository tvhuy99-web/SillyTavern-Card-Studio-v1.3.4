// Recovered from the application host. One owner; dependency getters preserve late binding.
export function createGeminiCatalogHook(dependencies = {}) {
var jl=e=>{let[t,n]=(0,dependencies.b.useState)(()=>{let t=dependencies.__stsCatalog.readGemini();return t.length?t:e}),[r,a]=(0,dependencies.b.useState)(!1);(0,dependencies.b.useEffect)(()=>{let t=dependencies.__stsCatalog.subscribeGemini(n),r=dependencies.__stsCatalog.readGemini();r.length&&n(r);return t},[]);return{models:t,isLoading:r,refetch:async e=>{a(!0);try{return await dependencies.__stsCatalog.loadGemini(e)}finally{a(!1)}}}};
return { useGeminiCatalog: jl };
}
