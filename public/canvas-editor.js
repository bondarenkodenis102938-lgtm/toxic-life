/* Flow-based study editor with live, animated vertical reordering. */
(() => {
  const $ = id => document.getElementById(id);
  const style = document.createElement('style');
  style.textContent = `
    .modal{width:min(1120px,100%);max-height:94vh;overflow:auto}
    .canvas-viewport{height:min(66vh,690px);min-height:420px;overflow:auto;background:#e9ece6;padding:22px;border-radius:0 0 10px 10px}
    .book-canvas{position:relative;width:1200px;min-height:820px;margin:0 auto;background:#fff radial-gradient(#dfe5dc .7px,transparent .7px);background-size:18px 18px;box-shadow:0 6px 24px #29372c15;border:1px solid #e2e6df}
    .canvas-hint{padding:7px 11px;color:#818a80;font-size:9px;background:#fff}
    .canvas-block{position:absolute;min-width:190px;min-height:110px;border:1px solid #dce3da;border-radius:10px;background:#fff;box-shadow:0 5px 16px #25352610;display:flex;flex-direction:column;overflow:visible}
    .canvas-block.is-active{outline:2px solid #78a085;z-index:2}
    .block-grip{height:25px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:0 8px;background:#f4f6f2;border-radius:9px 9px 0 0;color:#8b9488;font-size:9px;cursor:grab;user-select:none;touch-action:none}
    .block-grip:active{cursor:grabbing}.block-content{flex:1;min-height:0;overflow:auto;padding:10px 12px;outline:none;font-size:11px;line-height:1.65}
    .block-content p{margin:4px 0}.block-content h2,.block-content h3,.block-content h4{margin:8px 0 4px}.block-content .callout{margin:0}
    .resize-handle{position:absolute;width:16px;height:16px;right:1px;bottom:1px;cursor:nwse-resize;touch-action:none;background:linear-gradient(135deg,transparent 0 45%,#8ba18b 46% 56%,transparent 57% 67%,#8ba18b 68% 78%,transparent 79%);border-radius:0 0 9px 0}
    .block-delete{border:0;background:transparent;color:#929b90;font-size:14px;padding:0 2px}.block-delete:hover{color:#b64747}
    .detail-canvas{position:relative;min-height:450px;background:#fbfcfa radial-gradient(#e4e9e1 .7px,transparent .7px);background-size:18px 18px;border:1px solid #e4e8e1;border-radius:12px;overflow:hidden}
    .detail-canvas-block{position:absolute;overflow:auto;padding:12px 14px;border:1px solid #e2e6df;border-radius:10px;background:#fff;box-shadow:0 4px 14px #25352608;font-size:12px;line-height:1.7}.detail-canvas-block .callout{margin:0}
    .detail-body{max-width:100%;overflow:auto}.detail-panel{width:min(1000px,100%)}
    /* Editing is a vertical document flow; handles are editor-only controls. */
    .canvas-viewport{height:min(62vh,620px);min-height:360px;background:#f4f5f1;padding:12px}
    .book-canvas{width:auto!important;min-height:0!important;height:auto!important;margin:0;padding:16px 18px;background:#fff;border-radius:8px;box-shadow:none}
    .canvas-block{position:relative!important;left:auto!important;top:auto!important;width:auto!important;height:auto!important;min-width:0;min-height:0;margin:0 0 4px;border:0;border-bottom:1px dashed #eaede7;border-radius:0;background:transparent;box-shadow:none;display:grid;grid-template-columns:30px minmax(0,1fr);overflow:hidden}
    .canvas-block.is-active{outline:1px solid #9eb39d;z-index:auto}
    .block-grip{height:auto;min-height:46px;align-self:stretch;justify-content:center;padding:5px;background:transparent;border-radius:0;color:#a0a89e;cursor:grab;border-right:1px solid #f0f1ed}
    .block-grip span{display:none}.block-content{min-height:42px;max-height:none;overflow:visible;padding:10px 13px;font-size:12px}
    .resize-handle{display:none}.block-delete{position:absolute;right:7px;top:6px;z-index:1;width:23px;height:23px;border-radius:6px;background:#ffffffc9;opacity:0}.canvas-block:hover .block-delete,.canvas-block:focus-within .block-delete{opacity:1}
    .block-content .callout{max-width:100%}.detail-canvas,.detail-canvas-block{all:unset}
    .canvas-block.is-dragging{z-index:20;pointer-events:none;opacity:.94;box-shadow:0 18px 42px #2436292b;border:1px solid #c8d6c5;border-radius:10px;transform:scale(1.015) rotate(-.35deg);transition:box-shadow .18s,transform .18s}
    .drag-placeholder{height:60px;margin:0 0 4px;border:1px dashed #86a48a;border-radius:9px;background:linear-gradient(100deg,#e9f0e7,#f5f7f2,#e9f0e7);background-size:200% 100%;animation:placeholderFlow 1.1s ease-in-out infinite;transition:height .18s ease,border-radius .18s}
    @keyframes placeholderFlow{0%,100%{background-position:100% 0}50%{background-position:0 0}}
    .canvas-block{transition:background-color .2s,border-color .2s}
    @keyframes riseIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
    @keyframes veilIn{from{opacity:0}to{opacity:1}}
    @keyframes panelIn{from{opacity:0;transform:translateY(16px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
    .view.active{animation:riseIn .38s cubic-bezier(.2,.7,.25,1) both}
    .compact-card,.quick-card{transition:transform .22s cubic-bezier(.2,.7,.25,1),box-shadow .22s,border-color .22s}
    .compact-card:hover,.quick-card:hover{transform:translateY(-3px);box-shadow:0 10px 25px #28372c12;border-color:#cbd8c9}
    .cards>.compact-card{animation:riseIn .38s cubic-bezier(.2,.7,.25,1) both}
    .cards>.compact-card:nth-child(2){animation-delay:45ms}.cards>.compact-card:nth-child(3){animation-delay:90ms}.cards>.compact-card:nth-child(4){animation-delay:135ms}.cards>.compact-card:nth-child(5){animation-delay:180ms}.cards>.compact-card:nth-child(6){animation-delay:225ms}
    .modal-backdrop.open,.detail-backdrop.open{animation:veilIn .2s ease-out both}
    .modal-backdrop.open .modal,.detail-backdrop.open .detail-panel{animation:panelIn .34s cubic-bezier(.2,.75,.25,1) both}
    .canvas-block{animation:riseIn .28s cubic-bezier(.2,.7,.25,1) both}
    .canvas-block:nth-child(2){animation-delay:35ms}.canvas-block:nth-child(3){animation-delay:70ms}.canvas-block:nth-child(4){animation-delay:105ms}
    .callout{transition:filter .2s,transform .2s}.callout:hover{filter:saturate(1.04);transform:translateX(2px)}
    @media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
    @media(max-width:620px){.canvas-viewport{min-height:340px;height:58vh;padding:10px}.modal{padding:16px}.detail-canvas{min-width:760px}.detail-body{overflow-x:auto}}
  `;
  document.head.append(style);

  const dict = window.translations || (typeof translations !== 'undefined' ? translations : {});
  if (dict.uk) Object.assign(dict.uk, {addTextBlock:'＋ Текстовий блок',canvasHelp:'Перетягуйте частини за ручку, щоб змінити їхній порядок'});
  if (dict.en) Object.assign(dict.en, {addTextBlock:'＋ Text section',canvasHelp:'Drag sections by the handle to change their order'});

  const shell = document.querySelector('#contentEditor')?.closest('.editor-shell');
  if (!shell) return;
  shell.classList.add('canvas-shell');
  shell.innerHTML = `
    <div class="editor-toolbar" id="editorTools">
      <button class="tool-btn" type="button" data-command="bold" title="Bold"><b>B</b></button><button class="tool-btn" type="button" data-command="italic" title="Italic"><i>I</i></button><button class="tool-btn" type="button" data-command="underline" title="Underline"><u>U</u></button><button class="tool-btn" type="button" data-command="hiliteColor" data-value="#fff0a8" title="Highlight">▰</button><input class="color-input" id="textColor" type="color" value="#285b47" title="Text color"><span class="tool-sep"></span>
      <button class="tool-btn" type="button" data-command="insertUnorderedList">• ≡</button><button class="tool-btn" type="button" data-command="insertOrderedList">1. ≡</button><select class="tool-select" id="formatBlock"><option value="p">Текст</option><option value="h2">Заголовок</option><option value="h3">Підзаголовок</option><option value="blockquote">Цитата</option></select><span class="tool-sep"></span>
      <button class="tool-btn" type="button" id="addTextBlock" data-i18n="addTextBlock">＋ Текстовий блок</button><select class="tool-select" id="calloutPicker"><option value="">＋ Блок-помітка…</option></select><button class="tool-btn" type="button" id="newBlockButton" data-i18n="newBlock">＋ Свій блок</button><button class="tool-btn" type="button" data-command="removeFormat">Tx</button>
    </div>
    <div class="custom-block-maker" id="customBlockMaker"><div class="custom-row"><div><label for="customBlockLabel" data-i18n="customBlockTitle">Назва блоку</label><input id="customBlockLabel" placeholder="Моя підказка"></div><div><label for="customBlockIcon" data-i18n="customBlockIcon">Значок</label><input id="customBlockIcon" maxlength="4" value="✦"></div><div><label for="customBlockColor" data-i18n="customBlockColor">Тло</label><input id="customBlockColor" type="color" value="#dfeee2"></div><div><label for="customBlockAccent" data-i18n="customBlockAccent">Акцент</label><input id="customBlockAccent" type="color" value="#687f64"></div><button class="primary custom-last" type="button" id="createCustomBlock" data-i18n="createAndInsert">Створити й додати</button></div></div>
    <div class="canvas-hint" data-i18n="canvasHelp">Перетягуйте частини за ручку, щоб змінити їхній порядок</div><div class="canvas-viewport"><div id="bookCanvas" class="book-canvas"></div></div>`;

  let blocks = [], activeId = null, savedRange = null;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clean = html => typeof sanitizeRich === 'function' ? sanitizeRich(html) : html;
  const makeText = (html='<p><br></p>', x=42, y=42, w=520, h=190) => ({id:`b${Date.now()}${Math.random().toString(36).slice(2,6)}`,type:'text',html:clean(html),x,y,w,h});
  function normalize(item) {
    if (Array.isArray(item.blocks) && item.blocks.length) return item.blocks.slice().sort((a,b)=>(Number(a.y)||0)-(Number(b.y)||0)||(Number(a.x)||0)-(Number(b.x)||0)).map(b=>({id:b.id||`b${Math.random()}`,type:b.type==='callout'?'callout':'text',html:clean(b.html||'')}));
    const doc=new DOMParser().parseFromString(`<div>${item.contentHtml||''}</div>`,'text/html'), out=[];let group=[],y=38;
    const flush=()=>{if(!group.length)return;const html=group.map(n=>n.outerHTML||esc(n.textContent)).join('');out.push(makeText(html));group=[]};
    for(const n of [...doc.body.firstElementChild.children]){if(n.matches('aside.callout')){flush();out.push({id:`b${Math.random()}`,type:'callout',html:clean(n.outerHTML)});}else group.push(n)}flush();return out.length?out:[makeText()];
  }
  function ensureHeight(){const c=$('bookCanvas');c.style.height='auto';c.style.width='auto'}
  function render(){ $('bookCanvas').innerHTML=blocks.map(b=>`<article class="canvas-block ${activeId===b.id?'is-active':''}" data-block-id="${esc(b.id)}"><div class="block-grip" data-drag="${esc(b.id)}" draggable="true" title="Перетягніть угору або вниз">⠿</div><div class="block-content" contenteditable="true" data-edit-content="${esc(b.id)}">${clean(b.html)}</div><button class="block-delete" type="button" data-remove="${esc(b.id)}" title="Видалити частину">×</button></article>`).join('');ensureHeight(); }
  function readBlocks(){document.querySelectorAll('[data-edit-content]').forEach(el=>{const b=blocks.find(x=>x.id===el.dataset.editContent);if(b)b.html=clean(el.innerHTML)});return blocks.map(b=>({...b,html:clean(b.html)}));}
  function addText(){const index=blocks.findIndex(b=>b.id===activeId);blocks.splice(index<0?blocks.length:index+1,0,makeText('<p><br></p>'));activeId=blocks[index<0?blocks.length-1:index+1]?.id;render();document.querySelector(`[data-edit-content="${activeId}"]`)?.focus();}
  function picker(){const p=$('calloutPicker'),previous=p.value;p.innerHTML=`<option value="">＋ ${language==='uk'?'Блок-помітка…':'Callout…'}</option>${calloutTypes.map(x=>`<option value="${x.id}">${x.icon} ${standardBlockLabel(x.id)}</option>`).join('')}${customBlocks.map(x=>`<option value="custom:${esc(x.id)}">${esc(x.icon)} ${esc(x.label)}</option>`).join('')}`;if([...p.options].some(o=>o.value===previous))p.value=previous;}
  function insertCallout(value){if(!value)return;const item=value.startsWith('custom:')?customBlocks.find(x=>x.id===value.slice(7)):calloutTypes.find(x=>x.id===value);if(item){const label=value.startsWith('custom:')?item.label:standardBlockLabel(item.id),html=`<aside class="callout" data-callout="${value.startsWith('custom:')?'custom':item.id}" style="--callout-bg:${item.color||item.bg};--callout-accent:${item.accent||'#6f896e'}"><div class="callout-title">${esc(item.icon||'✦')} ${esc(label)}</div><p>${language==='uk'?'Текст помітки…':'Callout text…'}</p></aside>`,index=blocks.findIndex(b=>b.id===activeId);blocks.splice(index<0?blocks.length:index+1,0,{id:`b${Math.random()}`,type:'callout',html});activeId=blocks[index<0?blocks.length-1:index+1]?.id;render();} $('calloutPicker').value='';}
  function saveSelection(){const sel=getSelection(),el=sel?.anchorNode?.parentElement?.closest('[data-edit-content]');if(sel?.rangeCount&&el)savedRange=sel.getRangeAt(0).cloneRange();}
  function command(name,value=null){if(!savedRange)return;const node=savedRange.commonAncestorContainer,el=(node.nodeType===1?node:node.parentElement)?.closest('[data-edit-content]');if(!el)return;const sel=getSelection();sel.removeAllRanges();sel.addRange(savedRange);el.focus();document.execCommand(name,false,value);saveSelection();}
  function createCustom(){const label=$('customBlockLabel').value.trim();if(!label){$('customBlockLabel').focus();return}const id=`custom-${Date.now()}`,item={id,label,icon:$('customBlockIcon').value.trim()||'✦',color:$('customBlockColor').value,accent:$('customBlockAccent').value};customBlocks.push(item);save();picker();insertCallout(`custom:${id}`);$('customBlockMaker').classList.remove('open');$('customBlockLabel').value='';}
  function detailCanvas(item){return clean(item.contentHtml||normalize(item).map(b=>b.html).join(''));}

  openEditor = function(kind,id=null){editing=id?{kind,id}:null;$('entryForm').reset();$('customBlockMaker').classList.remove('open');$('wordFields').hidden=kind!=='word';$('ruleFields').hidden=kind!=='rule';$('wordText').required=kind==='word';$('wordTranslation').required=kind==='word';$('ruleTitleInput').required=kind==='rule';$('deleteEntry').hidden=!id;$('modalTitle').textContent=id?t(kind==='word'?'wordEdit':'ruleEdit'):t(kind==='word'?'wordCreate':'ruleCreate');$('modalIntro').textContent=t(kind==='word'?'wordIntro':'ruleIntro');blocks=[];if(id){const item=(kind==='word'?words:rules).find(x=>x.id===id);if(!item)return;if(kind==='word'){$('wordText').value=item.word||'';$('wordTranslation').value=item.translation||'';$('wordFamily').value=item.family||'';$('wordFamilyNote').value=item.familyNote||'';$('wordSummary').value=item.summary||''}else{$('ruleTitleInput').value=item.title||'';$('ruleSummaryInput').value=item.summary||''}blocks=normalize(item)}else blocks=[makeText()];$('editorModal').classList.add('open');picker();render();setTimeout(()=>$('bookCanvas [contenteditable="true"]')?.focus(),0);};
  const persistEntry=e=>{e.preventDefault();e.stopImmediatePropagation();const kind=editing?.kind||($('ruleFields').hidden?'word':'rule'),id=editing?.id||`${kind==='word'?'w':'r'}${Date.now()}`,blocksNow=readBlocks(),contentHtml=blocksNow.map(b=>b.html).join('');if(kind==='word'){const family=$('wordFamily').value.trim(),item={id,word:$('wordText').value.trim(),translation:$('wordTranslation').value.trim(),family,familyNote:$('wordFamilyNote').value.trim()||words.find(x=>x.family===family)?.familyNote||'',summary:$('wordSummary').value.trim(),contentHtml};if(editing)words=words.map(x=>x.id===id?item:x);else words.unshift(item)}else{const item={id,title:$('ruleTitleInput').value.trim(),summary:$('ruleSummaryInput').value.trim(),contentHtml};if(editing)rules=rules.map(x=>x.id===id?item:x);else rules.unshift(item)}save();closeEditor();render();};
  detail = function(kind,id){activeDetail={kind,id};if(kind==='group'){const list=words.filter(x=>x.family?.trim()===id);$('detailEyebrow').textContent=t('groupTag');$('detailTitle').textContent=id;$('detailSummary').textContent=list.find(x=>x.familyNote)?.familyNote||'';$('detailEdit').hidden=true;$('detailTrain').hidden=false;$('detailBody').innerHTML=list.map(x=>`<section style="padding:12px 0;border-top:1px solid #eef0eb"><h2>${esc(x.word)}</h2><p>${esc(x.translation)}</p>${detailCanvas(x)}</section>`).join('');return;}const item=(kind==='word'?words:rules).find(x=>x.id===id);if(!item)return;$('detailEyebrow').textContent=t(kind==='word'?'wordTag':'ruleTag');$('detailTitle').textContent=kind==='word'?item.word:item.title;$('detailSummary').textContent=kind==='word'?item.translation:item.summary;$('detailEdit').hidden=false;$('detailTrain').hidden=true;$('detailBody').innerHTML=detailCanvas(item);};

  document.addEventListener('click', e=>{if(!e.target.closest('[data-detail]'))return;queueMicrotask(()=>{const d=activeDetail;if(!d)return;if(d.kind==='group'){const group=words.filter(x=>x.family?.trim()===d.id);$('detailBody').innerHTML=group.map(x=>`<section style="padding:12px 0;border-top:1px solid #eef0eb"><h2>${esc(x.word)}</h2><p>${esc(x.translation)}</p>${detailCanvas(x)}</section>`).join('');}else{const item=(d.kind==='word'?words:rules).find(x=>x.id===d.id);if(item)$('detailBody').innerHTML=detailCanvas(item);}});},true);

  // Recreate the form to remove the old single-field editor's submit handler.
  const oldForm=$('entryForm'), form=oldForm.cloneNode(true);oldForm.replaceWith(form);
  form.addEventListener('submit',persistEntry,true);$('cancelModal').addEventListener('click',closeEditor);$('deleteEntry').addEventListener('click',()=>{if(!editing)return;const list=editing.kind==='word'?words:rules,item=list.find(x=>x.id===editing.id);if(!item)return;const label=editing.kind==='word'?item.word:item.title;if(!confirm(`${t('delete')} “${label}”?`))return;if(editing.kind==='word')words=words.filter(x=>x.id!==editing.id);else rules=rules.filter(x=>x.id!==editing.id);save();closeEditor();$('detailBackdrop').classList.remove('open');render();});
  $('addTextBlock').addEventListener('click',addText);$('calloutPicker').addEventListener('change',e=>insertCallout(e.target.value));$('newBlockButton').addEventListener('click',()=>$('customBlockMaker').classList.toggle('open'));$('createCustomBlock').addEventListener('click',createCustom);
  $('editorTools').addEventListener('mousedown',e=>{if(e.target.closest('button'))e.preventDefault()});$('editorTools').addEventListener('click',e=>{const b=e.target.closest('[data-command]');if(b)command(b.dataset.command,b.dataset.value||null)});$('textColor').addEventListener('input',e=>command('foreColor',e.target.value));$('formatBlock').addEventListener('change',e=>command('formatBlock',e.target.value));
  $('bookCanvas').addEventListener('keyup',saveSelection);$('bookCanvas').addEventListener('mouseup',saveSelection);$('bookCanvas').addEventListener('focusin',e=>{const el=e.target.closest('.canvas-block');if(el){activeId=el.dataset.blockId;document.querySelectorAll('.canvas-block').forEach(x=>x.classList.toggle('is-active',x===el));saveSelection();}});$('bookCanvas').addEventListener('input',e=>{const b=blocks.find(x=>x.id===e.target.dataset.editContent);if(b)b.html=clean(e.target.innerHTML)});
  $('bookCanvas').addEventListener('click',e=>{const btn=e.target.closest('[data-remove]');if(btn){blocks=blocks.filter(b=>b.id!==btn.dataset.remove);render();}});
  let nativeDrag=null;
  const animateFlow=mutate=>{const old=new Map([...$('bookCanvas').querySelectorAll('.canvas-block:not(.is-dragging)')].map(el=>[el,el.getBoundingClientRect().top]));mutate();for(const [el,top] of old){const dy=top-el.getBoundingClientRect().top;if(Math.abs(dy)>1)el.animate([{transform:`translateY(${dy}px)`},{transform:'translateY(0)'}],{duration:300,easing:'cubic-bezier(.22,.75,.25,1)'})}};
  const finishNativeDrag=()=>{if(!nativeDrag)return;const {source,placeholder}=nativeDrag;nativeDrag=null;if(!placeholder.isConnected)return;placeholder.replaceWith(source);source.classList.remove('is-dragging');source.style.display='';const ids=[...$('bookCanvas').querySelectorAll('.canvas-block')].map(el=>el.dataset.blockId);blocks=ids.map(id=>blocks.find(b=>b.id===id)).filter(Boolean);activeId=source.dataset.blockId;};
  $('bookCanvas').addEventListener('dragstart',e=>{const grip=e.target.closest('[data-drag]'),source=grip?.closest('.canvas-block');if(!source)return;const r=source.getBoundingClientRect(),placeholder=document.createElement('div');placeholder.className='drag-placeholder';placeholder.style.height=`${r.height}px`;source.after(placeholder);source.classList.add('is-dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',source.dataset.blockId);e.dataTransfer.setDragImage(source,Math.min(70,r.width/2),22);source.style.display='none';nativeDrag={source,placeholder};});
  $('bookCanvas').addEventListener('dragover',e=>{if(!nativeDrag)return;e.preventDefault();const {placeholder}=nativeDrag,items=[...$('bookCanvas').querySelectorAll('.canvas-block:not(.is-dragging)')],target=items.find(el=>e.clientY<el.getBoundingClientRect().top+el.getBoundingClientRect().height/2)||null;if(target?placeholder.nextElementSibling!==target:placeholder!==$('bookCanvas').lastElementChild)animateFlow(()=>$('bookCanvas').insertBefore(placeholder,target));});
  $('bookCanvas').addEventListener('drop',e=>{if(!nativeDrag)return;e.preventDefault();finishNativeDrag();});$('bookCanvas').addEventListener('dragend',finishNativeDrag);
  $('bookCanvas').addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse')return;
    const grip=e.target.closest('[data-drag]');if(!grip)return;
    const source=grip.closest('.canvas-block');if(!source)return;
    e.preventDefault();activeId=source.dataset.blockId;
    const start=source.getBoundingClientRect(),grabX=e.clientX-start.left,grabY=e.clientY-start.top;
    const placeholder=document.createElement('div');placeholder.className='drag-placeholder';placeholder.style.height=`${start.height}px`;source.after(placeholder);
    source.classList.add('is-dragging');Object.assign(source.style,{position:'fixed',left:`${start.left}px`,top:`${start.top}px`,width:`${start.width}px`,height:`${start.height}px`,margin:'0',zIndex:'20',pointerEvents:'none'});
    let lastTarget=null;
    const flip=mutate=>{const before=new Map([...$('bookCanvas').querySelectorAll('.canvas-block:not(.is-dragging)')].map(el=>[el,el.getBoundingClientRect().top]));mutate();for(const [el,top] of before){const delta=top-el.getBoundingClientRect().top;if(Math.abs(delta)>1)el.animate([{transform:`translateY(${delta}px)`},{transform:'translateY(0)'}],{duration:260,easing:'cubic-bezier(.22,.75,.25,1)'})}};
    const move=ev=>{
      source.style.left=`${ev.clientX-grabX}px`;source.style.top=`${ev.clientY-grabY}px`;
      const others=[...$('bookCanvas').querySelectorAll('.canvas-block:not(.is-dragging)')];
      const target=others.find(el=>ev.clientY<el.getBoundingClientRect().top+el.getBoundingClientRect().height/2)||null;
      if(target===lastTarget)return;lastTarget=target;
      const already=target?placeholder.nextElementSibling===target:placeholder=== $('bookCanvas').lastElementChild;
      if(!already)flip(()=>$('bookCanvas').insertBefore(placeholder,target));
    };
    let ended=false;
    const finish=ev=>{
      if(ended)return;ended=true;
      window.removeEventListener('pointermove',move);window.removeEventListener('mousemove',move);window.removeEventListener('pointerup',finish);window.removeEventListener('mouseup',finish);window.removeEventListener('pointercancel',finish);
      const others=[...$('bookCanvas').querySelectorAll('.canvas-block:not(.is-dragging)')],target=others.find(el=>ev.clientY<el.getBoundingClientRect().top+el.getBoundingClientRect().height/2)||null;
      if(target?placeholder.nextElementSibling!==target:placeholder!==$('bookCanvas').lastElementChild)flip(()=>$('bookCanvas').insertBefore(placeholder,target));
      const from=source.getBoundingClientRect();
      placeholder.replaceWith(source);source.classList.remove('is-dragging');source.removeAttribute('style');
      const to=source.getBoundingClientRect(),dx=from.left-to.left,dy=from.top-to.top;
      if(Math.abs(dx)+Math.abs(dy)>1)source.animate([{transform:`translate(${dx}px,${dy}px) scale(1.015) rotate(-.35deg)`},{transform:'translate(0,0) scale(1) rotate(0)'}],{duration:340,easing:'cubic-bezier(.2,.8,.25,1)'});
      const order=[...$('bookCanvas').querySelectorAll('.canvas-block')].map(el=>el.dataset.blockId);blocks=order.map(id=>blocks.find(b=>b.id===id)).filter(Boolean);activeId=source.dataset.blockId;
    };
    window.addEventListener('pointermove',move);window.addEventListener('mousemove',move);window.addEventListener('pointerup',finish,{once:true});window.addEventListener('mouseup',finish,{once:true});window.addEventListener('pointercancel',finish,{once:true});
  });
  document.querySelectorAll('[data-i18n="addTextBlock"],[data-i18n="canvasHelp"]').forEach(el=>el.textContent=t(el.dataset.i18n));
  $('languageToggle').addEventListener('click',()=>{const english=language==='en';document.querySelectorAll('.block-grip span').forEach(el=>{const callout=/БЛОК-ПОМІТКА|CALLOUT/.test(el.textContent);el.textContent=`⠿   ${callout?(english?'CALLOUT':'БЛОК-ПОМІТКА'):(english?'TEXT':'ТЕКСТ')}`;});});
})();
