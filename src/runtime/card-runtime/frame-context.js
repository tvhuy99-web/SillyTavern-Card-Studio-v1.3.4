// Recovered from the application host. One owner; dependency getters preserve late binding.
export function createFrameContext(dependencies = {}) {
  var baseFrameImportMap = Object.freeze({
    vue: "https://esm.sh/vue@3.5.40",
    pinia: "https://esm.sh/pinia@3.0.4?external=vue",
    "vue-router": "https://esm.sh/vue-router@5.2.0?external=vue",
    "@vueuse/core": "https://esm.sh/@vueuse/core@14.3.0?external=vue",
    "@vueuse/shared": "https://esm.sh/@vueuse/shared@14.3.0?external=vue",
    axios: "https://esm.sh/axios@1.18.1",
    zod: "https://esm.sh/zod@4.4.3",
    lodash: "https://esm.sh/lodash@4.17.21",
    "lodash-es": "https://esm.sh/lodash-es@4.17.21",
    ejs: "https://esm.sh/ejs@3.1.9",
    yaml: "https://esm.sh/yaml@2.9.0",
    marked: "https://esm.sh/marked@13.0.3",
    dompurify: "https://esm.sh/dompurify@3.4.2",
    dayjs: "https://esm.sh/dayjs@1.11.13",
    jszip: "https://esm.sh/jszip@3.10.1",
    "lz-string": "https://esm.sh/lz-string@1.5.0",
    sortablejs: "https://esm.sh/sortablejs@1.15.6",
    "pixi.js": "https://esm.sh/pixi.js@7.4.3",
    "@adobe/css-tools": "https://esm.sh/@adobe/css-tools@4.4.4",
    "@iconfu/svg-inject": "https://esm.sh/@iconfu/svg-inject@1.2.3",
    "@mozilla/readability": "https://esm.sh/@mozilla/readability@0.6.0",
    chalk: "https://esm.sh/chalk@5.6.0",
    chevrotain: "https://esm.sh/chevrotain@11.2.0",
    droll: "https://esm.sh/droll@0.2.1",
    fflate: "https://esm.sh/fflate@0.8.2",
    "js-sha256": "https://esm.sh/js-sha256@0.11.1",
    slidetoggle: "https://esm.sh/slidetoggle@4.0.0"
  });
  var updatedFrameImportMap = Object.freeze({
    ...baseFrameImportMap,
    lodash: "https://esm.sh/lodash@4.18.1",
    "lodash-es": "https://esm.sh/lodash-es@4.18.1",
    yaml: "https://esm.sh/yaml@2.8.3"
  });
  var baseFrameLibrariesHtml = [
    '<script async src="https://ga.jspm.io/npm:es-module-shims@1.10.0/dist/es-module-shims.js"><\/script>',
    '<script src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js" crossorigin="anonymous" data-runtime-dependency="lodash"><\/script>',
    '<script src="https://unpkg.com/vue@3.5.40/dist/vue.global.prod.js" crossorigin="anonymous" data-runtime-dependency="Vue"><\/script>',
    '<script src="https://cdn.jsdelivr.net/npm/pinia@3.0.4/dist/pinia.iife.prod.js" crossorigin="anonymous" data-runtime-dependency="Pinia"><\/script>',
    '<script src="https://unpkg.com/vue-router@5.1.0/dist/vue-router.global.js" crossorigin="anonymous" data-runtime-dependency="VueRouter"><\/script>',
    '<script src="https://code.jquery.com/jquery-3.7.1.min.js" crossorigin="anonymous" onerror="this.onerror=null;this.src=\'https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js\'"><\/script>',
    '<link rel="stylesheet" href="https://code.jquery.com/ui/1.14.1/themes/base/jquery-ui.css">',
    '<script src="https://code.jquery.com/ui/1.14.1/jquery-ui.min.js" crossorigin="anonymous"><\/script>',
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/jqueryui-touch-punch/0.2.3/jquery.ui.touch-punch.min.js" crossorigin="anonymous"><\/script>',
    '<script src="https://cdn.jsdelivr.net/npm/pixi.js@7.4.3/dist/pixi.min.js" crossorigin="anonymous" data-runtime-dependency="PIXI"><\/script>',
    '<script src="https://cdn.jsdelivr.net/npm/ejs@3.1.9/ejs.min.js" crossorigin="anonymous" data-runtime-dependency="EJS"><\/script>',
    '<script src="https://cdn.jsdelivr.net/npm/axios@1.18.1/dist/axios.min.js" crossorigin="anonymous"><\/script>',
    '<script src="https://cdn.jsdelivr.net/npm/dompurify@3.4.2/dist/purify.min.js" crossorigin="anonymous"><\/script>',
    '<script src="https://cdn.jsdelivr.net/npm/handlebars@4.7.9/dist/handlebars.min.js" crossorigin="anonymous"><\/script>',
    '<script src="https://cdn.jsdelivr.net/npm/fuse.js@7.1.0/dist/fuse.min.js" crossorigin="anonymous"><\/script>',
    '<script src="https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js" crossorigin="anonymous"><\/script>',
    '<script>(function(){ function importWithFallback(primary, fallback){ return import(primary).catch(function(){ return import(fallback); }); } window.__cardRuntimeCoreLibrariesReady = Promise.all([ importWithFallback("https://esm.sh/zod@4.4.3?bundle", "https://cdn.jsdelivr.net/npm/zod@4.4.3/+esm"), importWithFallback("https://esm.sh/yaml@2.9.0?bundle", "https://cdn.jsdelivr.net/npm/yaml@2.9.0/+esm").catch(function(error){ if (window.jsyaml) return { parse: window.jsyaml.load, stringify: function(value, options){ return window.jsyaml.dump(value, Object.assign({ noRefs: true, lineWidth: -1 }, options || {})); }, load: window.jsyaml.load, dump: window.jsyaml.dump }; throw error; }) ]).then(function(modules){ window.z = modules[0]; window.Zod = modules[0]; window.YAML = modules[1]; return { zod: modules[0], yaml: modules[1] }; }).catch(function(error){ window.__cardRuntimeCoreLibrariesError = error; return { zod: null, yaml: window.YAML || window.jsyaml || null, error: error }; }); })();<\/script>',
    '<script>(function(){ var coreReady = window.__cardRuntimeCoreLibrariesReady || Promise.resolve({}); function optionalImport(url){ return import(url).catch(function(error){ return { __loadError: error }; }); } var officialReady = Promise.all([ optionalImport("https://esm.sh/@adobe/css-tools@4.4.4"), optionalImport("https://esm.sh/@iconfu/svg-inject@1.2.3"), optionalImport("https://esm.sh/@mozilla/readability@0.6.0"), optionalImport("https://esm.sh/chalk@5.6.0"), optionalImport("https://esm.sh/chevrotain@11.2.0"), optionalImport("https://esm.sh/droll@0.2.1"), optionalImport("https://esm.sh/fflate@0.8.2"), optionalImport("https://esm.sh/js-sha256@0.11.1"), optionalImport("https://esm.sh/slidetoggle@4.0.0") ]).then(function(modules){ var cssTools=modules[0], svgInject=modules[1], readability=modules[2], chalkModule=modules[3], chevrotainModule=modules[4], drollModule=modules[5], fflateModule=modules[6], shaModule=modules[7], slideModule=modules[8]; var libs = window.__ST_OFFICIAL_LIBS = window.__ST_OFFICIAL_LIBS || {}; libs.css = cssTools; libs.SVGInject = svgInject.SVGInject || svgInject.default; libs.Readability = readability.Readability; libs.isProbablyReaderable = readability.isProbablyReaderable; libs.chalk = chalkModule.default || chalkModule; libs.chevrotain = chevrotainModule; libs.droll = drollModule.default || drollModule; libs.gzipSync = fflateModule.gzipSync; libs.gzip = fflateModule.gzip; libs.sha256 = shaModule.sha256 || shaModule.default; libs.slideToggle = slideModule.slideToggle || slideModule.default; window.css = window.css || libs.css; window.SVGInject = window.SVGInject || libs.SVGInject; window.Readability = window.Readability || libs.Readability; window.isProbablyReaderable = window.isProbablyReaderable || libs.isProbablyReaderable; window.chalk = window.chalk || libs.chalk; window.chevrotain = window.chevrotain || libs.chevrotain; window.droll = window.droll || libs.droll; window.gzipSync = window.gzipSync || libs.gzipSync; window.gzip = window.gzip || libs.gzip; window.sha256 = window.sha256 || libs.sha256; window.slideToggle = window.slideToggle || libs.slideToggle; return libs; }); window.__cardRuntimeOfficialLibrariesReady = officialReady; window.__cardRuntimeCoreLibrariesReady = Promise.all([coreReady, officialReady]).then(function(results){ return Object.assign({}, results[0] || {}, results[1] || {}); }); })();<\/script>',
    '<script src="https://cdn.jsdelivr.net/npm/lz-string@1.5.0/libs/lz-string.min.js" crossorigin="anonymous"><\/script>',
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/showdown/2.1.0/showdown.min.js" crossorigin="anonymous"><\/script>',
    '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/toastr.js/2.1.4/toastr.min.css" crossorigin="anonymous">',
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/toastr.js/2.1.4/toastr.min.js" crossorigin="anonymous" data-runtime-dependency="toastr"><\/script>',
    '<script src="https://cdn.jsdelivr.net/npm/marked@13.0.3/lib/marked.umd.js" crossorigin="anonymous"><\/script>',
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/localforage/1.10.0/localforage.min.js" crossorigin="anonymous"><\/script>',
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.30.1/moment.min.js" crossorigin="anonymous"><\/script>',
    '<script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.13/dayjs.min.js" crossorigin="anonymous"><\/script>',
    '<script src="https://cdn.jsdelivr.net/npm/seedrandom@3.0.5/seedrandom.min.js" crossorigin="anonymous"><\/script>',
    '<script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.11.8/dist/umd/popper.min.js" crossorigin="anonymous"><\/script>',
    '<script src="https://cdn.jsdelivr.net/npm/bowser@2.12.1/es5.js" crossorigin="anonymous"><\/script>',
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/diff_match_patch/20121119/diff_match_patch.js" crossorigin="anonymous"><\/script>',
    '<script src="https://cdn.jsdelivr.net/npm/morphdom@2.7.7/dist/morphdom-umd.min.js" crossorigin="anonymous"><\/script>',
    '<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"><\/script>',
    '<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.3.3/dist/index.global.js" crossorigin="anonymous" data-runtime-dependency="TailwindCSS"><\/script>',
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/howler/2.2.4/howler.min.js" crossorigin="anonymous"><\/script>',
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.2/anime.min.js" crossorigin="anonymous"><\/script>',
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.6/Sortable.min.js" crossorigin="anonymous"><\/script>',
    '<script src="https://cdn.jsdelivr.net/npm/interactjs/dist/interact.min.js" crossorigin="anonymous"><\/script>',
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js" crossorigin="anonymous"><\/script>',
    '<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.8/dist/chart.umd.min.js" crossorigin="anonymous"><\/script>',
    '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" crossorigin="anonymous">',
    '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css" crossorigin="anonymous">',
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js" crossorigin="anonymous"><\/script>'
  ].join("");
  var updatedFrameLibrariesHtml = baseFrameLibrariesHtml.replaceAll("lodash@4.17.21", "lodash@4.18.1").replaceAll("yaml@2.9.0", "yaml@2.8.3").replace('<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.3.3/dist/index.global.js" crossorigin="anonymous" data-runtime-dependency="TailwindCSS"><\/script>', '<script src="/scripts/extensions/third-party/JS-Slash-Runner/lib/tailwindcss.min.js" data-runtime-dependency="TailwindCSS"><\/script>');
  var serializeInlineJson = value => JSON.stringify(value).replace(/<\/script/gi, "<\\/script");
  var serializeElementAttributes = element => Array.from(element.attributes)
    .filter(attribute => !/^on/i.test(attribute.name))
    .map(attribute => ` ${attribute.name}="${escapeHtmlAttribute(attribute.value)}"`).join("");
  var escapeHtmlAttribute = value => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  var replaceFrameTemplates = (html, replacements) => Object.entries(replacements)
    .sort(([firstKey], [secondKey]) => secondKey.length - firstKey.length)
    .reduce((output, [key, value]) => output.split(key).join(value), html);
  var buildFrameSmartStateBlock = (variables, card, messages, messageIndex) => (0, dependencies.__stsBuildSmartStateBlock)({
    variables: variables,
    card: card,
    messages: messages.slice(0, Math.max(0, messageIndex))
  }).smartStateBlock;
  var readVariableScope = (scope, context) => {
    if (typeof window > "u") return {};
    let storageKey = (0, dependencies.Ah)(scope, context);
    return storageKey ? (0, dependencies.jh)(window.localStorage, storageKey) : {};
  };
  var buildVariableScopes = (variables, messages, context, scripts, card, openingIndex) => {
    let openingText = (0, dependencies.__stsSelectInitialVariableOpening)(card, messages, openingIndex).text;
    let chatVariables = variables && Object.keys(variables).length ? variables
      : (0, dependencies.__stsSeedInitialVariablesFromCard)({}, card, openingText, text => dependencies.jt.default.parse(text)).variables;
    let messageIndex = Math.max(0, Math.min(messages.length - 1, context.messageId || 0));
    let messageVariables = messages[messageIndex]?.contextState || readVariableScope({
      type: "message",
      message_id: messageIndex
    }, context);
    let selectedMessageVariables = messageVariables && Object.keys(messageVariables).length ? messageVariables
      : variables && Object.keys(variables).length ? messageVariables : chatVariables;
    let scopes = {
      chat: chatVariables,
      global: readVariableScope({type: "global"}, context),
      preset: readVariableScope({type: "preset"}, context),
      character: readVariableScope({type: "character"}, context),
      [`message:${messageIndex}`]: selectedMessageVariables,
      "script:default": readVariableScope({type: "script", script_id: "default"}, context),
      "extension:third-party/JS-Slash-Runner": readVariableScope({
        type: "extension",
        extension_id: "third-party/JS-Slash-Runner"
      }, context)
    };
    messages.forEach((message, index) => {
      let messageState = message.contextState;
      if (messageState && Object.keys(messageState).length) {
        scopes[`message:${index}`] = messageState;
      } else {
        `message:${index}` in scopes || (scopes[`message:${index}`] = {});
      }
    });
    scripts.forEach(script => {
      let scriptId = script.value?.id || "default";
      scopes[`script:${scriptId}`] = readVariableScope({type: "script", script_id: scriptId}, {...context, scriptId: scriptId});
    });
    return scopes;
  };
  var readScopedFrameStorage = (storageType, context) => {
    if (typeof window > "u") return {};
    let record = (0, dependencies.jh)("local" === storageType ? window.localStorage : window.sessionStorage, (0, dependencies.Ih)(storageType, context));
    return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, String(value)]));
  };
  return {
    bp: baseFrameImportMap,
    vp: updatedFrameImportMap,
    _p: baseFrameLibrariesHtml,
    wp: updatedFrameLibrariesHtml,
    kp: serializeInlineJson,
    Sp: serializeElementAttributes,
    Cp: escapeHtmlAttribute,
    Ep: replaceFrameTemplates,
    Np: buildFrameSmartStateBlock,
    Ap: buildVariableScopes,
    Ip: readScopedFrameStorage
  };
}