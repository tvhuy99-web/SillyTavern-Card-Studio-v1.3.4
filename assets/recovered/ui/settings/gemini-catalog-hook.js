// Recovered from the application host. One owner; dependency getters preserve late binding.
export function createGeminiCatalogHook(dependencies = {}) {
var useGeminiCatalog = defaultModels => {
  let [models, setModels] = (0,dependencies.react.useState)(() => {
    let cachedModels = dependencies.__stsCatalog.readGemini();
    return cachedModels.length ? cachedModels : defaultModels;
  });
  let [isLoading, setIsLoading] = (0,dependencies.react.useState)(false);
  (0,dependencies.react.useEffect)(() => {
    let unsubscribe = dependencies.__stsCatalog.subscribeGemini(setModels);
    let cachedModels = dependencies.__stsCatalog.readGemini();
    if (cachedModels.length) setModels(cachedModels);
    return unsubscribe;
  }, []);
  return {
    models: models,
    isLoading: isLoading,
    refetch: async apiKey => {
      setIsLoading(true);
      try {
        return await dependencies.__stsCatalog.loadGemini(apiKey);
      } finally {
        setIsLoading(false);
      }
    }
  };
};
return { useGeminiCatalog };
}
