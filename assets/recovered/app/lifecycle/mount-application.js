export function mountApplication({ react, jsxRuntime, reactDom, ErrorBoundary, InitialLoader, ToastProvider, SpeechProvider, CardPopupProvider, Shell, document = globalThis.document }) {
    const rootElement = document.getElementById('root');
    if (!rootElement) throw Error('Could not find root element to mount to');

    function Application() {
        return jsxRuntime.jsxs(ErrorBoundary, {
            children: [
                jsxRuntime.jsx(InitialLoader, {}),
                jsxRuntime.jsx(ToastProvider, {
                    children: jsxRuntime.jsx(SpeechProvider, {
                        children: jsxRuntime.jsx(CardPopupProvider, {
                            children: jsxRuntime.jsx(Shell, {})
                        })
                    })
                })
            ]
        });
    }
    reactDom.createRoot(rootElement).render(jsxRuntime.jsx(react.StrictMode, {
        children: jsxRuntime.jsx(Application, {})
    }));
}
