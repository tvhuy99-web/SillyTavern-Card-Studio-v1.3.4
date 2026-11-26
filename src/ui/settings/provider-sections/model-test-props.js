export const modelTestProps = (modelTest, provider, model) => {
    const button = modelTest?.(provider, model);
    return button ? { testButton: button } : {};
};
