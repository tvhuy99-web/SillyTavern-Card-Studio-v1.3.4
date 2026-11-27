export async function loadOptionalModule(load, host = globalThis) {
  try { return await load(); }
  catch (error) {
    const event = new Event('vite:preloadError', { cancelable: true });
    event.payload = error;
    host.window?.dispatchEvent(event);
    if (!event.defaultPrevented) throw error;
    return undefined;
  }
}
