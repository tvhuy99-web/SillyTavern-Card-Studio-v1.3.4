package com.tvhuy99.cardstudio;

/** Website selectors and JavaScript expressions, independent of Activity and bridge lifecycle. */
final class AiStudioPageScripts {
    static final String INSTALL_JS = """
        (function() {
          if (window.__STS_AI_TEXT_V2__?.version === 3) return "ready";
          const S = {
            version: 3, submitted: false, clicked: false, lastSubmitAt: 0,
            walk() {
              const out=[], todo=[document.documentElement], seen=new Set();
              let shadows=0, frames=0;
              while (todo.length && out.length < 3500) {
                const root=todo.shift();
                if (!root || seen.has(root)) continue;
                seen.add(root);
                if (root.nodeType===1) out.push(root);
                if (root.shadowRoot) {shadows++;todo.push(root.shadowRoot);}
                if (root.tagName==="IFRAME") {
                  try {if(root.contentDocument?.documentElement) {frames++;todo.push(root.contentDocument.documentElement);}} catch(e) {}
                }
                if (root.children) for(const ch of root.children) todo.push(ch);
              }
              return {elements:out, shadows, frames};
            },
            info(e) {
              return [
                e.getAttribute?.("aria-label")||"",
                e.getAttribute?.("title")||"",
                e.getAttribute?.("data-testid")||"",
                e.getAttribute?.("data-tooltip")||"",
                e.getAttribute?.("name")||"",
                e.querySelector?.("mat-icon")?.textContent||"",
                e.querySelector?.("[class*='icon']")?.textContent||"",
                (e.textContent||"").slice(0,55)
              ].join(" ").toLowerCase();
            },
            visible(e) {
              try {const r=e.getBoundingClientRect();return r.width>0&&r.height>0;} catch(e) {return false;}
            },
            editors(els) {
              return els.filter(e=>e.matches?.("textarea,input[type='text'],[contenteditable='true'],[role='textbox'],.ProseMirror,[data-placeholder]"));
            },
            buttons(els) {
              return els.filter(e=>e.matches?.("button,[role='button'],input[type='submit']"));
            },
            // Extract directly from AI Studio model turns, independently of
            // walk()'s 3500-element limit. AI Studio uses Angular components
            // ms-chat-turn / ms-cmark-node for assistant replies.
            output(_ignored) {
              const roots=[document], visited=new Set();
              let seenFrames=0, seenShadows=0, crossOriginFrames=0;
              for(let pos=0;pos<roots.length && pos<60;pos++){
                const root=roots[pos];
                if(!root||visited.has(root))continue;
                visited.add(root);
                try {
                  for(const frame of root.querySelectorAll('iframe')) {
                    try {
                      if(frame.contentDocument) {roots.push(frame.contentDocument);seenFrames++;}
                      else crossOriginFrames++;
                    }catch(e){crossOriginFrames++;}
                  }
                  // Open shadow roots only; never evade closed-root boundaries.
                  const hosts=root.querySelectorAll('*');
                  let limit=0;
                  for(const host of hosts){
                    if(host.shadowRoot){seenShadows++;roots.push(host.shadowRoot);}
                    if(++limit>=18000)break;
                  }
                }catch(e){}
              }
              const unique=roots.filter(r=>r && visited.has(r));
              const selectors=[
                'ms-chat-turn .chat-turn-container.model',
                'ms-chat-turn .chat-turn-container[class*="model"]',
                '.chat-turn-container.model',
                'ms-chat-turn .model-response',
                '[data-role="model"]',
                '[data-message-role="model"]',
                '[data-testid*="model-output"]',
                '[data-testid*="response"]'
              ];
              let modelTurns=0, cmarkNodes=0, rawNodes=0, fallbackNodes=0;
              let answer='', method='none', count=0;
              for(const root of unique){
                try{
                  modelTurns+=root.querySelectorAll('ms-chat-turn').length;
                  cmarkNodes+=root.querySelectorAll('ms-cmark-node').length;
                  rawNodes+=root.querySelectorAll('.chat-turn-container.model').length;
                  for(const selector of selectors){
                    const containers=Array.from(root.querySelectorAll(selector));
                    if(!containers.length)continue;
                    count+=containers.length;
                    const container=containers[containers.length-1];
                    const textNodes=container.querySelectorAll(
                      'ms-cmark-node.cmark-node,ms-cmark-node,[class*="cmark-node"],'+
                      'markdown-renderer,.markdown,.response-content'
                    );
                    const output=Array.from(textNodes)
                      .filter(e=>!e.parentElement?.closest('ms-cmark-node'))
                      .map(e=>String(e.innerText||e.textContent||'').trim()).filter(Boolean);
                    const value=(output.length?output.join('\\n'):String(container.innerText||container.textContent||'')).trim();
                    if(value && !answer){
                      answer=value;method=selector;
                    }
                  }
                  if(!answer){
                    // Some AI Studio versions render cmark nodes without the
                    // .model container class. Only accept model-associated turns.
                    const globalCmark=root.querySelectorAll('ms-cmark-node');
                    for(const node of globalCmark){
                      const turn=node.closest('ms-chat-turn');
                      if(!turn)continue;
                      const cls=String(turn.className||'')+' '+String(turn.querySelector('.chat-turn-container')?.className||'');
                      if(!/model/i.test(cls))continue;
                      const value=String(node.innerText||node.textContent||'').trim();
                      if(value){answer=value;method='ms-cmark-node/model-turn';fallbackNodes++;}
                    }
                  }
                }catch(e){}
              }
              // Only the thinking summary visibly rendered in the current
              // model turn can be read. Hidden chain-of-thought is never read.
              let thinkingSummary='';
              const thinkingSelectors=[
                'ms-thinking-content','[data-testid*="thinking-summary"]',
                '[data-testid*="thought-summary"]','[aria-label*="Thinking summary"]',
                '[class*="thinking-summary"]','[class*="thought-summary"]',
                'details[open][class*="think"]','details[open][class*="thought"]'
              ].join(',');
              for(const root of unique) {
                try {
                  const nodes=root.querySelectorAll(thinkingSelectors);
                  for(const node of nodes) {
                    if(!node.getClientRects().length)continue;
                    const turn=node.closest('ms-chat-turn');
                    if(turn) {
                      const cls=String(turn.className||'')+' '+
                        String(turn.querySelector('.chat-turn-container')?.className||'');
                      if(!/model/i.test(cls))continue;
                    }
                    const value=String(node.innerText||'').trim();
                    if(value.length<40||value===answer||answer.includes(value))continue;
                    thinkingSummary=value.slice(0,18000);
                  }
                }catch(e){}
              }
              return {text:answer,thinkingSummary,count:Math.max(count,fallbackNodes),
                method,modelTurns,cmarkNodes,rawNodes,
                shadowRoots:seenShadows,iframeRoots:seenFrames,crossOriginFrames};
            },
            stopGeneration() {
              if(!this.clicked)return {ok:false,reason:"not-submitted"};
              const controls=this.buttons(this.walk().elements).filter(e=>{
                if(!this.visible(e)||e.disabled||e.getAttribute?.("aria-disabled")==="true")return false;
                const labels=[e.getAttribute?.("aria-label"),e.getAttribute?.("title"),e.getAttribute?.("data-tooltip"),(e.textContent||"")];
                return labels.some(value=>/^(stop|stop generating|stop response|stop generation|dừng tạo phản hồi|dừng)$/i.test(String(value||"").trim()));
              });
              if(controls.length!==1)return {ok:false,reason:"ambiguous-or-missing-stop"};
              try{controls[0].click();return {ok:true};}catch(e){return {ok:false,reason:"click-failed"};}
            },
            snapshot(prefetched) {
              const a=this.walk(), ed=this.editors(a.elements), btn=this.buttons(a.elements), out=prefetched||this.output();
              const stop=btn.some(e=>this.visible(e)&&!e.disabled&&/(stop generating|stop response|stop|cancel)/i.test(this.info(e)));
              const loading=a.elements.filter(e=>this.visible(e)&&e.matches?.(
                '[role="progressbar"],[aria-busy="true"],mat-spinner,.mat-mdc-progress-spinner'
              )).length;
              const isGenerating=stop||loading>0;
              const login=/(accounts.google.com|signin|login)/i.test(location.hostname+location.pathname);
              return {
                path:location.pathname.slice(0,150), ready:document.readyState,
                editors:ed.length, visibleEditors:ed.filter(e=>this.visible(e)).length,
                buttons:btn.length, responseNodes:out.count, outputChars:out.text.length,
                modelTurns:out.modelTurns, cmarkNodes:out.cmarkNodes,
                rawModelNodes:out.rawNodes, responseMethod:out.method,
                responseIframes:out.iframeRoots, responseShadows:out.shadowRoots,
                inaccessibleFrames:out.crossOriginFrames,
                shadows:a.shadows, frames:a.frames, scanned:a.elements.length,
                busy:isGenerating, stopVisible:stop, loadingIndicators:loading,
                authGate:login, clicked:this.clicked,
                elapsedSinceClickMs:this.lastSubmitAt?Date.now()-this.lastSubmitAt:-1
              };
            },
            prepare(text) {
              const a=this.walk();
              const ed=this.editors(a.elements).filter(e=>this.visible(e)&&!e.disabled);
              const ranked=ed.map(e=>{
                const name=this.info(e);
                const score=/(prompt|message|type|chat|enter|nhập)/i.test(name)?12:0;
                return {e,score:score+(e.tagName==="TEXTAREA"?6:0)+(e.isContentEditable?4:0)};
              }).sort((x,y)=>y.score-x.score);
              if(!ranked.length)return {ok:false,error:"EDITOR_NOT_FOUND",snapshot:this.snapshot()};
              const el=ranked[0].e;
              const previous=this.output(a).text;
              try{
                el.focus();
                if(el.tagName==="TEXTAREA"||el.tagName==="INPUT"){
                  const proto=el.tagName==="TEXTAREA"?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
                  const setter=Object.getOwnPropertyDescriptor(proto,"value")?.set;
                  if(setter)setter.call(el,text);else el.value=text;
                } else {
                  if(el.isContentEditable) {el.textContent=text;}
                  else {el.setAttribute("data-unsupported-editor","true");return {ok:false,error:"EDITOR_TYPE_UNSUPPORTED",snapshot:this.snapshot()};}
                }
                el.dispatchEvent(new InputEvent("input",{bubbles:true,inputType:"insertText",data:null}));
                el.dispatchEvent(new Event("change",{bubbles:true}));
                this.submitted=false;this.clicked=false;this.lastSubmitAt=0;
                return {ok:true,before:previous,editorTag:el.tagName,editorEditable:el.isContentEditable,snapshot:this.snapshot()};
              }catch(e){return{ok:false,error:"EDITOR_INPUT_ERROR",errorName:String(e.name||"Error"),snapshot:this.snapshot()};}
            },
            submit() {
              const a=this.walk(), all=this.buttons(a.elements).filter(e=>this.visible(e)&&!e.disabled);
              const scored=all.map(e=>{
                const s=this.info(e);
                let score=0;
                if(/(^|[^a-z])(run|send|generate|submit|gửi|chạy)([^a-z]|$)/i.test(s))score+=20;
                if(/play_arrow|arrow_upward|send|run_prompt|sparkle/i.test(s))score+=15;
                if(/chat|prompt|model/i.test(s))score+=2;
                if(/stop|cancel|share|copy|save|delete|edit|settings|history/i.test(s))score-=50;
                return {e,score};
              }).filter(x=>x.score>=15).sort((x,y)=>y.score-x.score);
              if(!scored.length)return {ok:false,error:"SEND_BUTTON_NOT_FOUND",snapshot:this.snapshot()};
              try{
                const button=scored[0].e;
                button.click();
                this.submitted=true;this.clicked=true;this.lastSubmitAt=Date.now();
                return {ok:true,score:scored[0].score,candidates:scored.length,snapshot:this.snapshot()};
              }catch(e){return {ok:false,error:"SEND_CLICK_FAILED",snapshot:this.snapshot()};}
            },
            read() {
              const output=this.output();
              const snap=this.snapshot(output);
              return {text:output.text,thinkingSummary:output.thinkingSummary||"",...snap};
            }
          };
          window.__STS_AI_TEXT_V2__=S;
          return "installed";
        })()
        """;

    static final String THINKING_OPEN_JS = """
        JSON.stringify((function(){
          try{
            for(var el of document.querySelectorAll('button,[role="combobox"],mat-select,[role="button"],label,[aria-label]')){
              var name=[el.getAttribute('aria-label')||'',el.getAttribute('title')||'',
                (el.textContent||'').trim().slice(0,85)].join(' ').toLowerCase();
              if((name.includes('thinking level')||name.includes('thinking mode')||
                  name.includes('thinking budget')||name.includes('reasoning effort')||
                  name.includes('mức suy nghĩ'))
                &&el.getClientRects().length){
                var b=el.matches('button,[role="combobox"],mat-select,[role="button"]')?el:
                  (el.querySelector('button,[role="combobox"],mat-select,[role="button"]')||el);
                b.click();return {ok:true,label:name.slice(0,90)};
              }
            }
            return {ok:false,reason:'thinking-control-not-visible'};
          }catch(e){return {ok:false,reason:String(e.name||'exception')};}
        })())
        """;

    static final String THINKING_SELECT_JS = """
        JSON.stringify((function(level){
          try{
            var names={minimal:['minimal','tối thiểu'],low:['low','thấp'],
              medium:['medium','trung bình'],high:['high','cao']}[level];
            if(!names)return {ok:false};
            for(var el of document.querySelectorAll('[role="option"],mat-option,[role="menuitem"],[role="menuitemradio"],[role="radio"],button')){
              if(!el.getClientRects().length)continue;
              var text=(el.getAttribute('aria-label')||el.textContent||'').trim().toLowerCase();
              if(names.some(n=>text===n||text.startsWith(n+' ')||text.startsWith(n+'('))){
                el.click();return {ok:true,choice:text.slice(0,90)};
              }
            }
            return {ok:false};
          }catch(e){return {ok:false};}
        })(__STS_LEVEL__))
        """;

    static final String THINKING_VERIFY_JS = """
        JSON.stringify((function(level){
          try{
            const words={minimal:['minimal','tối thiểu'],low:['low','thấp'],
              medium:['medium','trung bình'],high:['high','cao']}[level]||[];
            let candidates=0;
            for(const el of document.querySelectorAll('[role="option"],[role="radio"],[role="menuitemradio"],[aria-selected],[aria-checked],button,[role="combobox"],mat-select')){
              if(!el.getClientRects().length)continue;
              const name=[el.getAttribute('aria-label')||'',el.getAttribute('title')||'',
                (el.textContent||'').slice(0,120)].join(' ').trim().toLowerCase();
              if(!words.some(w=>name===w||name.startsWith(w+' ')||name.endsWith(' '+w)||
                  (name.includes('thinking')&&name.includes(w))))continue;
              candidates++;
              if(el.getAttribute('aria-selected')==='true'||el.getAttribute('aria-checked')==='true'||
                  el.getAttribute('aria-pressed')==='true'||el.getAttribute('data-state')==='checked')
                return {ok:true,evidence:'selected-control',candidates:candidates};
              if((el.matches('[role="combobox"],mat-select')||name.includes('thinking level')||
                  name.includes('thinking mode'))&&words.some(w=>name.includes(w)))
                return {ok:true,evidence:'thinking-summary',candidates:candidates};
            }
            return {ok:false,reason:'no-selected-state',candidates:candidates};
          }catch(e){return {ok:false,reason:String(e.name||'exception')};}
        })(__STS_LEVEL__))
        """;

    static final String NEW_CHAT_READINESS_JS = """
        JSON.stringify((function(){
          try{
            var h=location.hostname;
            var p=location.pathname;
            var n=document.querySelectorAll('textarea,[contenteditable="true"],[role="textbox"]');
            var turns=document.querySelectorAll('ms-chat-turn .chat-turn-container.model,.chat-turn-container.model').length;
            return {
              ok:h==='aistudio.google.com'&&(p.indexOf('/prompts/new_chat')===0||/^\\/u\\/\\d+\\/prompts\\/new_chat/.test(p))&&n.length>0&&turns===0,
              host:h,path:p,editors:n.length,oldModelTurns:turns,ready:document.readyState
            };
          }catch(e){return {ok:false,errorName:String(e.name)}}
        })())
        """;

    static final String RUN_SETTINGS_EXPAND_JS = """
        JSON.stringify((function(){
          for(const b of document.querySelectorAll('button,[role=button],[aria-expanded]')){
            const s=((b.getAttribute('aria-label')||'')+' '+(b.textContent||'')).toLowerCase();
            if(/run settings|advanced settings|generation settings/.test(s)&&b.getClientRects().length){
              b.click();return {ok:true};
            }
          }
          return {ok:false};
        })())
        """;
}
