import { CHAT_RPC_METHODS, CHAT_SESSION_RPC_METHODS } from '../../../../m4/runtime/card-runtime/host/chat-rpc.js';
import { CATALOG_RPC_METHODS } from '../../../../m4/runtime/card-runtime/host/catalog-rpc.js';
import { STATE_RPC_METHODS, EXTENSION_LIFECYCLE_RPC_METHODS } from '../../../../m4/runtime/card-runtime/host/state-rpc.js';
import { LOREBOOK_RPC_METHODS } from '../../../../m4/runtime/card-runtime/host/lorebook-rpc.js';
import { UTILITY_RPC_METHODS } from '../../../../m4/runtime/card-runtime/host/utility-rpc.js';

const groups = Object.freeze({
  chat: [...CHAT_RPC_METHODS, ...CHAT_SESSION_RPC_METHODS],
  catalog: CATALOG_RPC_METHODS,
  state: [...STATE_RPC_METHODS, ...EXTENSION_LIFECYCLE_RPC_METHODS, 'raw.import.regex'],
  lorebook: LOREBOOK_RPC_METHODS,
  utility: UTILITY_RPC_METHODS,
  generation: ['generation.generate', 'generation.stop', 'generation.stopAll'],
});
export const HOST_RPC_METHODS = Object.freeze(Object.values(groups).flat());
if (new Set(HOST_RPC_METHODS).size !== HOST_RPC_METHODS.length) throw Error('Duplicate host RPC registration');

/** Route canonical method names without duplicating the domain API inventory. */
export function createHostMethodRouter({ chat, catalog, state, lorebook, utility, generate, tasks, emit }) {
  const handlers = new Map();
  for (const [group, handler] of Object.entries({ chat, catalog, state, lorebook, utility })) {
    for (const method of groups[group]) handlers.set(method, (args, source, lease) => handler(method, args, lease));
  }
  handlers.set('generation.generate', (args, source, lease) => generate(source, !!args.raw, args.options || {}, lease));
  handlers.set('generation.stop', (args, source) => {
    const stopped = tasks.stop(source, String(args.generationId));
    emit(source, 'generation_stopped');
    return stopped;
  });
  handlers.set('generation.stopAll', (args, source) => {
    tasks.stopAll(source);
    emit(source, 'generation_stopped');
    return true;
  });
  return async function execute(request, source, lease) {
    const handler = handlers.get(request.method);
    if (!handler) throw Error(`Unsupported card runtime method: ${request.method}`);
    lease.assertCurrent();
    return handler(request.args || {}, source, lease);
  };
}
