// Recovered from the application host. One owner; dependency getters preserve late binding.
export function createRelaxedJsonParser(dependencies = {}) {
function As(e){try{return dependencies.jt.default.parse(e)}catch(t){return console.warn("JSON5 parse failed, falling back to JSON.parse",t),JSON.parse(e)}}
return { parseRelaxedJson: As };
}
