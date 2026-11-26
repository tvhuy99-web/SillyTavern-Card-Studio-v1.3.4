// Recovered from the application host. One owner; dependency getters preserve late binding.
export function createRelaxedJsonParser(dependencies = {}) {
function parseRelaxedJson(text) {
  try {
    return dependencies.relaxedJson.default.parse(text);
  } catch (error) {
    console.warn("JSON5 parse failed, falling back to JSON.parse", error);
    return JSON.parse(text);
  }
}
return { parseRelaxedJson };
}
