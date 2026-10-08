let state = {
  scripts: [],
  activeId: null,
  vaultFilter: "all",
  docId: "intro",
  settings: {workspaceName:"RBXGarden", aiEndpoint:"", aiModel:"", aiFormat:"openai"},
  aiMessages: []
};

function loadState(){
  try{
    const raw = localStorage.getItem(KEY);
    if(raw) state = {...state,...JSON.parse(raw),settings:{...state.settings,...(JSON.parse(raw).settings||{})}};
  }catch(e){console.warn(e)}
  if(!state.scripts.length){
    state.scripts = [
      {id:uid(),name:"PlayerData_Starter",type:"system",description:"Base para PlayerAdded + dados de sessão.",tags:["player","data","starter"],favorite:true,code:DEFAULT_SCRIPT,updated:Date.now()},
      {id:uid(),name:"BuyButton",type:"snippet",description:"Exemplo simples de compra com validação local.",tags:["ui","shop","snippet"],favorite:false,code:`local button = script.Parent

button.Activated:Connect(function()
    local money = 150
    local price = 100

    if money >= price then
        print("Compra aprovada")
    else
        print("Dinheiro insuficiente")
    end
end)`,updated:Date.now()-8000}
    ];
  }
  saveState();
}
function saveState(){localStorage.setItem(KEY,JSON.stringify(state))}
function uid(){return "s_"+Date.now()+"_"+Math.random().toString(36).slice(2,7)}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function toast(msg){const t=qs("#toast");t.textContent=msg;t.classList.add("show");clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove("show"),2300)}
function showView(id){
  qsa(".view").forEach(v=>v.classList.toggle("active",v.id===id));
  qsa(".nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===id));
  window.scrollTo({top:0,behavior:"smooth"});
  if(id==="dashboard")renderDashboard();
  if(id==="vault")renderVault();
  if(id==="modules")renderModules();
  if(id==="docs")renderDocs();
  if(id==="settings")renderSettings();
}
function countTags(){return new Set(state.scripts.flatMap(s=>s.tags||[])).size}
function renderDashboard(){
  if(qs("#achievementStrip") && typeof updateAchievementStrip === "function") updateAchievementStrip();
  qs("#dashScripts").textContent=state.scripts.length;
  qs("#kpiScripts").textContent=state.scripts.length;
  qs("#dashTags").textContent=countTags();
  const recent=[...state.scripts].sort((a,b)=>b.updated-a.updated).slice(0,3);
  qs("#recentScripts").innerHTML=recent.length
    ? recent.map(scriptCardHTML).join("")
    : '<div class="card empty">Nenhum script ainda. Crie o primeiro no Script Vault.</div>';
  bindScriptCards(qs("#recentScripts"));
}
function scriptCardHTML(s){
  return `<article class="card script-card" data-script="${esc(s.id)}">
    <div class="card-row"><div class="badges">${(s.tags||[]).slice(0,3).map(t=>`<span class="badge">${esc(t)}</span>`).join("")}</div><button class="icon-btn fav" title="Favorito">${s.favorite?"★":"☆"}</button></div>
    <div class="card-title">${esc(s.name)}</div>
    <div class="card-desc">${esc(s.description||"Sem descrição.")}</div>
    <div class="card-foot"><span class="muted">${esc(s.type)}</span><button class="btn primary open-script">Abrir</button></div>
  </article>`;
}
function bindScriptCards(root){
  root.querySelectorAll("[data-script]").forEach(card=>{
    const id=card.dataset.script;
    card.querySelector(".open-script")?.addEventListener("click",()=>openEditor(id));
    card.querySelector(".fav")?.addEventListener("click",e=>{e.stopPropagation();toggleFavorite(id)});
    card.addEventListener("dblclick",()=>openEditor(id));
  });
}
function renderVault(){
  const q=(qs("#globalSearch").value||"").toLowerCase().trim();
  let arr=state.scripts;
  if(state.vaultFilter==="favorite")arr=arr.filter(s=>s.favorite);
  if(state.vaultFilter==="snippet")arr=arr.filter(s=>s.type==="snippet");
  if(state.vaultFilter==="system")arr=arr.filter(s=>s.type==="system"||s.type==="module");
  if(q)arr=arr.filter(s=>(s.name+" "+s.description+" "+(s.tags||[]).join(" ")).toLowerCase().includes(q));
  qs("#vaultGrid").innerHTML=arr.length?arr.map(s=>scriptCardHTML({...s})).join(""):`<div class="card empty">Nada encontrado. Experimente outra busca ou crie um script.</div>`;
  qsa("[data-vault-filter]").forEach(b=>b.classList.toggle("active",b.dataset.vaultFilter===state.vaultFilter));
  bindScriptCards(qs("#vaultGrid"));
}
function toggleFavorite(id){const s=state.scripts.find(x=>x.id===id);if(!s)return;s.favorite=!s.favorite;s.updated=Date.now();saveState();renderVault();renderDashboard();toast(s.favorite?"Adicionado aos favoritos":"Removido dos favoritos")}
function newScript(prefill={}){
  const s={id:uid(),name:prefill.name||"NovoScript",type:prefill.type||"module",description:prefill.description||"",tags:prefill.tags||["roblox","luau"],favorite:false,code:prefill.code||"--!strict\\n\\nlocal Module = {}\\n\\nreturn Module",updated:Date.now()};
  state.scripts.unshift(s);saveState();openEditor(s.id);
}
function openEditor(id){
  const s=state.scripts.find(x=>x.id===id);if(!s)return;
  state.activeId=id;saveState();
  qs("#editorTitle").value=s.name;qs("#editorDesc").value=s.description||"";qs("#editorType").value=s.type;qs("#codeEditor").value=s.code||"";renderEditorTags();updateLines();showView("editor");
}
function renderEditorTags(){
  const s=state.scripts.find(x=>x.id===state.activeId);if(!s)return;
  qs("#editorTags").innerHTML=(s.tags||[]).map((t,i)=>`<span class="badge" data-remove-tag="${i}">${esc(t)} ×</span>`).join("");
  qs("#editorTags").querySelectorAll("[data-remove-tag]").forEach(el=>el.onclick=()=>{s.tags.splice(Number(el.dataset.removeTag),1);saveState();renderEditorTags()});
}
function saveEditor(){
  const s=state.scripts.find(x=>x.id===state.activeId);if(!s)return;
  s.name=qs("#editorTitle").value.trim()||"SemNome";s.description=qs("#editorDesc").value;s.type=qs("#editorType").value;s.code=qs("#codeEditor").value;s.updated=Date.now();saveState();renderDashboard();toast("Script salvo automaticamente")}
function deleteScript(id){
  const idx=state.scripts.findIndex(x=>x.id===id);if(idx<0)return;
  state.scripts.splice(idx,1);if(state.activeId===id)state.activeId=null;saveState();renderVault();renderDashboard();toast("Script removido")}
function duplicateScript(id){
  const s=state.scripts.find(x=>x.id===id);if(!s)return;
  newScript({...s,id:null,name:s.name+" Copy",favorite:false});
}
function addEditorTag(){
  const val=qs("#newTag").value.trim().toLowerCase().replace(/\s+/g,"-");if(!val)return;
  const s=state.scripts.find(x=>x.id===state.activeId);if(!s)return;
  s.tags=s.tags||[];if(!s.tags.includes(val))s.tags.push(val);qs("#newTag").value="";saveState();renderEditorTags();
}
function updateLines(){
  const code=qs("#codeEditor").value||"";const count=Math.max(1,code.split("\\n").length);
  qs("#lineNumbers").textContent=Array.from({length:count},(_,i)=>i+1).join("\\n");
}
function renderModules(){
  const q=(qs("#moduleSearch").value||"").toLowerCase().trim(),cat=qs("#moduleCategory").value;
  let arr=MODULES.filter(m=>(cat==="all"||m.category===cat)&&(!q||(m.name+" "+m.desc+" "+m.tags.join(" ")).toLowerCase().includes(q)));
  qs("#moduleGrid").innerHTML=arr.map(m=>`<article class="card module-card">
    <div class="card-row"><div class="module-icon">${m.icon}</div><span class="badge blue">${esc(m.category)}</span></div>
    <div class="card-title">${esc(m.name)}</div>
    <div class="badges">${m.tags.slice(0,4).map(t=>`<span class="badge">${esc(t)}</span>`).join("")}</div>
    <div class="card-desc" style="margin-top:8px">${esc(m.desc)}</div>
    <div class="card-foot"><button class="btn green module-use" data-id="${m.id}">Usar no Vault</button><button class="btn ghost module-copy" data-id="${m.id}">Copiar</button></div>
  </article>`).join("") || `<div class="card empty">Nenhum módulo encontrado.</div>`;
  qsa(".module-use").forEach(b=>b.onclick=()=>useModule(b.dataset.id));
  qsa(".module-copy").forEach(b=>b.onclick=async()=>{const m=MODULES.find(x=>x.id===b.dataset.id);await navigator.clipboard.writeText(m.code);toast("Código copiado")});
}
function useModule(id){
  const m=MODULES.find(x=>x.id===id);if(!m)return;
  newScript({name:m.name,type:"module",description:m.desc,tags:m.tags.slice(0,5),code:m.code});
}
function renderDocs(){
  qs("#docNav").innerHTML=DOCS.map(d=>`<button class="doc-link ${d.id===state.docId?"active":""}" data-doc="${d.id}">${esc(d.title)}</button>`).join("");
  qs("#docContent").innerHTML=DOCS.find(d=>d.id===state.docId)?.html||"";
  qsa("[data-doc]").forEach(b=>b.onclick=()=>{state.docId=b.dataset.doc;saveState();renderDocs()});
}
function renderSettings(){
  qs("#workspaceName").value=state.settings.workspaceName||"RBXGarden";
  qs("#aiEndpoint").value=state.settings.aiEndpoint||"";
  qs("#aiModel").value=state.settings.aiModel||"";
  qs("#aiFormat").value=state.settings.aiFormat||"openai";
}
function addMessage(role,text){
  state.aiMessages.push({role,text,at:Date.now()});saveState();renderMessages();
}
function renderMessages(){
  const box=qs("#messages");box.innerHTML="";
  const msgs=state.aiMessages.length?state.aiMessages:[{role:"ai",text:"Olá! Sou o Code AI do RBXGarden. Posso revisar padrões de Luau/Roblox, explicar erros e sugerir arquitetura. Para uma IA generativa real, configure seu endpoint em Settings."}];
  msgs.forEach(m=>{box.innerHTML+=`<div class="msg ${m.role==="me"?"me":""}">${m.role!=="me"?'<div class="ai-avatar">✨</div>':""}<div class="bubble-msg">${esc(m.text).replace(/\n/g,"<br>")}</div></div>`});
  box.scrollTop=box.scrollHeight;
}
function localAnalyze(prompt,code){
  const lines=code.split("\\n");
  const notes=[];
  if(/GetAsync|SetAsync|UpdateAsync/.test(code)&&!/pcall/.test(code))notes.push("DataStore: há chamadas de persistência sem pcall; trate falhas/transientes.");
  if(code.includes("OnServerEvent")&&!/typeof|type\(|assert|~=|==/.test(code))notes.push("RemoteEvent: valide argumentos no servidor antes de executar uma ação.");
  if((code.match(/while true do/g)||[]).length)notes.push("Loop: 'while true do' sem pausa pode consumir recursos; considere task.wait() ou uma condição de saída.");
  if(/repeat\\s*$/m.test(code)&&!/until/.test(code))notes.push("Loop repeat: verifique se existe um 'until'.");
  if(/Players%.PlayerAdded/.test(code)&&!/PlayerRemoving/.test(code))notes.push("Ciclo de vida: considere tratar PlayerRemoving para limpar cache/conexões ou iniciar save.");
  if(/--!strict/.test(code))notes.push("Type checking: ótimo começo; adicione tipos de parâmetros/retornos onde isso deixar o contrato do módulo mais claro.");
  if(/GetChildren\(\)/.test(code)&&/for .* in .* do/.test(code))notes.push("Performance: em trechos quentes, evite repetir GetChildren/GetDescendants; cache referências quando fizer sentido.");
  if(!notes.length)notes.push("Não encontrei um padrão óbvio de problema no analisador local. Isso não substitui testes no Roblox Studio.");
  return "Análise local para seu pedido: "+prompt+"\\n\\n"+notes.map((n,i)=>(i+1)+". "+n).join("\\n");
}
async function sendAI(){
  const input=qs("#aiInput").value.trim();if(!input)return;
  addMessage("me",input);qs("#aiInput").value="";
  const s=state.scripts.find(x=>x.id===state.activeId);const code=s?.code||"";
  const endpoint=state.settings.aiEndpoint?.trim();
  const key=qs("#aiKey").value.trim();
  if(endpoint){
    try{
      const body=state.settings.aiFormat==="openai"?
        {model:state.settings.aiModel||undefined,messages:[
          {role:"system",content:"Você é um assistente especialista em Luau e Roblox Studio. Responda em português do Brasil, priorize código seguro no servidor e arquitetura modular."},
          {role:"user",content:input+"\\n\\nCódigo atual:\\n"+code}
        ]}: {prompt:input,code,model:state.settings.aiModel||undefined};
      const headers={"Content-Type":"application/json"};if(key)headers.Authorization="Bearer "+key;
      const res=await fetch(endpoint,{method:"POST",headers,body:JSON.stringify(body)});
      if(!res.ok)throw new Error("HTTP "+res.status);
      const data=await res.json();
      const answer=data.choices?.[0]?.message?.content||data.output_text||data.answer||JSON.stringify(data);
      addMessage("ai",answer);
    }catch(err){
      addMessage("ai","Não consegui chamar o endpoint externo ("+err.message+"). Vou continuar em modo local.\\n\\n"+localAnalyze(input,code));
    }
  }else{
    addMessage("ai",localAnalyze(input,code));
  }
}
function showModuleModal(name){
  const m=MODULES.find(x=>x.name===name);if(!m)return;
  openModal({name:m.name,type:"module",description:m.desc,tags:m.tags.join(", "),code:m.code});
}
function openModal(prefill={}){
  qs("#modalTitle").textContent=prefill.name?"Adicionar ao Vault":"Novo script";
  qs("#formName").value=prefill.name||"NovoScript";qs("#formType").value=prefill.type||"module";qs("#formDesc").value=prefill.description||"";qs("#formTags").value=(prefill.tags||[]).join(", ");qs("#formCode").value=prefill.code||"--!strict\\n\\n";
  qs("#modal").classList.add("show");
}
function closeModal(){qs("#modal").classList.remove("show")}
function createFromModal(){
  const name=qs("#formName").value.trim()||"NovoScript";
  const tags=qs("#formTags").value.split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
  newScript({name,type:qs("#formType").value,description:qs("#formDesc").value,tags,code:qs("#formCode").value});closeModal();
}
function exportVault(){
  const blob=new Blob([JSON.stringify({version:3,exportedAt:new Date().toISOString(),scripts:state.scripts},null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="rbxgarden-vault.json";a.click();URL.revokeObjectURL(a.href);toast("Vault exportado")}
function importVaultFile(file){
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const data=JSON.parse(reader.result);
      const imported=Array.isArray(data)?data:data.scripts;
      if(!Array.isArray(imported))throw new Error("Formato inválido");
      imported.forEach(s=>state.scripts.unshift({...s,id:uid(),updated:Date.now()}));saveState();renderVault();renderDashboard();toast(imported.length+" scripts importados");
    }catch(e){toast("Importação inválida")}
  };reader.readAsText(file);
}
function testAI(){
  const endpoint=qs("#aiEndpoint").value.trim();
  if(!endpoint){toast("Configure um endpoint primeiro");return}
  toast("Endpoint configurado. Envie uma mensagem para testar.");
}
function setup(){
  loadState();renderDashboard();renderMessages();renderDocs();renderSettings();
  qsa(".nav button").forEach(b=>b.onclick=()=>showView(b.dataset.view));
  qsa("[data-go]").forEach(b=>b.onclick=()=>showView(b.dataset.go));
  qs("#newScriptBtn").onclick=()=>openModal();
  qs("#newScriptBtnTop").onclick=()=>openModal();
  qs("#closeModal").onclick=closeModal;qs("#cancelModal").onclick=closeModal;qs("#confirmModal").onclick=createFromModal;
  qs("#exportBtn").onclick=exportVault;qs("#importBtn").onclick=()=>qs("#fileInput").click();qs("#fileInput").onchange=e=>e.target.files[0]&&importVaultFile(e.target.files[0]);
  qs("#saveEditor").onclick=saveEditor;qs("#copyEditor").onclick=async()=>{await navigator.clipboard.writeText(qs("#codeEditor").value);toast("Código copiado")};
  qs("#backVault").onclick=()=>showView("vault");qs("#addTag").onclick=addEditorTag;
  qs("#codeEditor").addEventListener("input",()=>{updateLines();clearTimeout(window.__save);window.__save=setTimeout(saveEditor,650)});
  qs("#codeEditor").addEventListener("scroll",()=>qs("#lineNumbers").scrollTop=qs("#codeEditor").scrollTop);
  qs("#editorTitle").addEventListener("input",()=>{clearTimeout(window.__save);window.__save=setTimeout(saveEditor,650)});
  qs("#editorDesc").addEventListener("input",()=>{clearTimeout(window.__save);window.__save=setTimeout(saveEditor,650)});
  qs("#editorType").addEventListener("change",saveEditor);qs("#newTag").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addEditorTag()}});
  qs("#moduleSearch").oninput=renderModules;qs("#moduleCategory").onchange=renderModules;
  qs("#globalSearch").oninput=()=>{
  if(qs("#vault").classList.contains("active"))renderVault();
  const q=qs("#globalSearch").value.toLowerCase().trim();
  if(q && qs("#modules").classList.contains("active"))renderModules();
  if(q && qs("#snippets").classList.contains("active")){qs("#snippetSearch").value=q;renderSnippets()}
};
  qs("#sendEditorAI").onclick=()=>{showView("ai");const s=state.scripts.find(x=>x.id===state.activeId);qs("#aiInput").value="Revise o script "+(s?.name||"atual")+" e encontre bugs, riscos e melhorias de arquitetura.";};
  qs("#aiFromCurrent").onclick=()=>{showView("editor");if(!state.activeId&&state.scripts[0])openEditor(state.scripts[0].id);};
  qs("#aiSend").onclick=sendAI;qs("#aiInput").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendAI()}});
  qsa(".prompt").forEach(p=>p.onclick=()=>{qs("#aiInput").value=p.textContent.replace(/^\S+\s/,"");qs("#aiInput").focus()});
  qs("#saveSettings").onclick=()=>{
    state.settings.workspaceName=qs("#workspaceName").value.trim()||"RBXGarden";
    state.settings.aiEndpoint=qs("#aiEndpoint").value.trim();state.settings.aiModel=qs("#aiModel").value.trim();state.settings.aiFormat=qs("#aiFormat").value;
    saveState();toast("Preferências salvas")
  };
  qs("#testAI").onclick=testAI;
  qs("#resetData").onclick=()=>{if(confirm("Apagar todos os scripts e preferências locais?")){localStorage.removeItem(KEY);location.reload()}};
  qsa("[data-open-module]").forEach(b=>b.onclick=()=>showModuleModal(b.dataset.openModule));
  qsa("[data-vault-filter]").forEach(b=>b.onclick=()=>{state.vaultFilter=b.dataset.vaultFilter;renderVault()});
  qs("#cmdBtn").onclick=openCmd;document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();openCmd()}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="s"){e.preventDefault();saveEditor()}if(e.key==="Escape"){qs("#cmd").classList.remove("show");closeModal()}});
  qs("#cmdInput").oninput=renderCmd;qs("#globalSearch").addEventListener("keydown",e=>{if(e.key==="Enter"){showView("vault");renderVault()}});
  qs("#cmd").addEventListener("click",e=>{if(e.target.id==="cmd")qs("#cmd").classList.remove("show")});
  bindScriptCards(qs("#recentScripts"));
}
function openCmd(){qs("#cmd").classList.add("show");qs("#cmdInput").value="";renderCmd();setTimeout(()=>qs("#cmdInput").focus(),30)}
function renderCmd(){
  const q=(qs("#cmdInput").value||"").toLowerCase(),items=[
    ["Abrir Dashboard","showView('dashboard')"],
    ["Novo script","openModal()"],
    ["Abrir Script Vault","showView('vault')"],
    ["Abrir Modules","setViewV4('modules')"],
    ["Abrir Projects","setViewV4('projects')"],
    ["Abrir Snippet Lab","setViewV4('snippets')"],
    ["Abrir Playground","setViewV4('playground')"],
    ["Abrir Code AI","setViewV4('ai')"],
    ["Abrir Luau Docs","setViewV4('docs')"],
    ["Abrir Focus","setViewV4('focus')"],
    ["Abrir Roadmap","setViewV4('roadmap')"],
    ["Configurações","setViewV4('settings')"],
    ["Exportar Vault","exportVault()"]
  ].filter(x=>x[0].toLowerCase().includes(q));
  qs("#cmdResults").innerHTML=items.map((x,i)=>`<div class="cmd-item" data-cmd="${i}"><b>${esc(x[0])}</b></div>`).join("");
  qsa("[data-cmd]").forEach(el=>el.onclick=()=>{eval(items[Number(el.dataset.cmd)][1]);qs("#cmd").classList.remove("show")});
}
setup();

/* ===== V4 DATA + PRODUCTIVITY SYSTEMS ===== */
state.projects = state.projects || [
  {id:uid(),name:"Meu próximo jogo",desc:"Workspace padrão para um novo projeto Roblox.",emoji:"🌊",color:"aqua",progress:15},
  {id:uid(),name:"Sistema de combate",desc:"Skills, combos, cooldowns e efeitos.",emoji:"⚔️",color:"green",progress:42},
  {id:uid(),name:"Incremental",desc:"Economia, rebirths, pets, upgrades e DataStore.",emoji:"💎",color:"lime",progress:68}
];
state.tasks = state.tasks || {
  ideas:[{text:"Criar sistema de quests"}],
  doing:[{text:"Refatorar PlayerData"}],
  done:[{text:"Criar RemoteBridge"}]
};
state.snippets = state.snippets || [
  {id:uid(),name:"PlayerAdded",tags:["player","events"],code:`local Players = game:GetService("Players")

Players.PlayerAdded:Connect(function(player)
    print("Entrou:", player.Name)
end)`},
  {id:uid(),name:"SafeRemote",tags:["remote","security"],code:`Remote.OnServerEvent:Connect(function(player, itemId)
    if type(itemId) ~= "string" then
        return
    end

    -- valide preço, permissões e estado no servidor
end)`},
  {id:uid(),name:"Debounce",tags:["cooldown","input"],code:`local busy = false

if busy then
    return
end

busy = true
task.delay(1, function()
    busy = false
end)`},
  {id:uid(),name:"Typed Dictionary",tags:["strict","types"],code:`type PlayerData = {
    Coins: number,
    Level: number,
    Inventory: {string},
}

local data: PlayerData = {
    Coins = 0,
    Level = 1,
    Inventory = {},
}`}
];
state.roadmap = state.roadmap || [
  ["1","Fundamentos","Variáveis, tipos básicos, operadores e print.",true],
  ["2","Controle","if, loops, funções e escopo.",true],
  ["3","Tables","Listas, dicionários e estruturas de dados.",state.scripts.length>=3],
  ["4","Roblox API","Services, Instances, Properties e Events.",state.scripts.length>=4],
  ["5","Cliente/Servidor","RemoteEvent, validação e arquitetura.",state.scripts.some(s=>(s.tags||[]).includes("remote"))],
  ["6","ModuleScripts","require, serviços, configuração e dependências.",state.scripts.some(s=>s.type==="module")],
  ["7","Persistência","DataStore, cache, schema e retries.",MODULES.some(m=>m.category==="Data")],
  ["8","Sistemas grandes","tipagem, testes, cleanup, performance e arquitetura.",state.scripts.length>=8]
];
state.focus = state.focus || {remaining:1500,running:false,last:0,mode:"25/5"};
saveState();

function updateAchievementStrip(){
  const ach = [
    ["📚",state.scripts.length,"Scripts"],
    ["🏷️",countTags(),"Tags únicas"],
    ["🧩",MODULES.length,"Módulos"],
    ["📖",DOCS.length,"Capítulos"],
    ["⭐",state.scripts.filter(s=>s.favorite).length,"Favoritos"]
  ];
  qs("#achievementStrip").innerHTML = ach.map(x=>`<div class="stat-tile"><b>${x[0]} ${x[1]}</b><small>${x[2]}</small></div>`).join("");
}
function renderProjects(){
  qs("#projectGrid").innerHTML = state.projects.map(p=>`<article class="card workspace-card fade-in">
    <div class="card-row"><div class="project-orb">${p.emoji}</div><span class="badge">${p.progress}%</span></div>
    <div class="card-title">${esc(p.name)}</div><div class="card-desc">${esc(p.desc)}</div>
    <div class="progress-line" style="margin-top:10px"><i style="width:${Math.max(0,Math.min(100,p.progress))}%"></i></div>
    <div class="card-foot"><span class="muted">workspace</span><div class="toolbar"><button class="btn ghost project-inc" data-id="${p.id}">+10%</button><button class="btn danger project-del" data-id="${p.id}">×</button></div></div>
  </article>`).join("");
  qs("#projectGrid").querySelectorAll(".project-inc").forEach(b=>b.onclick=()=>{const p=state.projects.find(x=>x.id===b.dataset.id);p.progress=Math.min(100,p.progress+10);saveState();renderProjects();updateAchievementStrip()});
  qs("#projectGrid").querySelectorAll(".project-del").forEach(b=>b.onclick=()=>{state.projects=state.projects.filter(x=>x.id!==b.dataset.id);saveState();renderProjects();updateAchievementStrip()});
}
function renderTasks(){
  const map={ideas:"#taskIdeas",doing:"#taskDoing",done:"#taskDone"};
  Object.keys(map).forEach(k=>qs(map[k]).innerHTML=(state.tasks[k]||[]).map((t,i)=>`<div class="task">${esc(t.text)} <button style="float:right;background:transparent;color:#76909a;font-weight:900" data-task-del="${k}:${i}">×</button></div>`).join(""));
  qsa("[data-task-del]").forEach(b=>b.onclick=()=>{const [k,i]=b.dataset.taskDel.split(":");state.tasks[k].splice(Number(i),1);saveState();renderTasks()});
}
function renderSnippets(){
  const q=(qs("#snippetSearch").value||"").toLowerCase().trim();
  const arr=state.snippets.filter(s=>(s.name+" "+s.tags.join(" ")+s.code).toLowerCase().includes(q));
  qs("#snippetGrid").innerHTML=arr.map(s=>`<article class="card snippet-card">
    <div class="card-row"><div class="card-title" style="margin:0">${esc(s.name)}</div><button class="btn ghost snippet-copy" data-id="${s.id}">Copiar</button></div>
    <div class="badges" style="margin:8px 0">${s.tags.map(t=>`<span class="badge">${esc(t)}</span>`).join("")}</div>
    <div class="snippet-code"><pre>${esc(s.code)}</pre></div>
    <div class="card-foot"><button class="btn green snippet-use" data-id="${s.id}">Abrir no editor</button><span class="muted">snippet</span></div>
  </article>`).join("") || `<div class="card empty">Nenhum snippet encontrado.</div>`;
  qs("#snippetGrid").querySelectorAll(".snippet-copy").forEach(b=>b.onclick=async()=>{const s=state.snippets.find(x=>x.id===b.dataset.id);await navigator.clipboard.writeText(s.code);toast("Snippet copiado")});
  qs("#snippetGrid").querySelectorAll(".snippet-use").forEach(b=>b.onclick=()=>{const s=state.snippets.find(x=>x.id===b.dataset.id);newScript({name:s.name,type:"snippet",description:"Criado a partir do Snippet Lab.",tags:s.tags,code:s.code})});
}
function renderRoadmap(){
  qs("#roadmapList").innerHTML=state.roadmap.map(r=>`<div class="card road-step ${r[3]?"done":"locked"}">
    <div class="road-dot">${r[3]?"✓":r[0]}</div><div><div class="card-title" style="margin:0">${esc(r[1])}</div><div class="card-desc">${esc(r[2])}</div></div><span class="badge">${r[3]?"Concluído":"Próximo"}</span>
  </div>`).join("");
}
function renderPlayConsole(lines){qs("#playConsole").innerHTML=lines.map(x=>`<div class="line ${x.type||""}">${esc(x.text)}</div>`).join("")}
function simulateLuau(){
  const code=qs("#playCode").value;const lines=[];
  lines.push({text:"$ RBXGarden simulate --luau"});
  if(/while true do/.test(code)&&!/(task\.wait|wait\s*\()/i.test(code))lines.push({text:"possible infinite loop without yield",type:"warn"});
  if(/GetAsync|SetAsync|UpdateAsync/.test(code)&&!/pcall/.test(code))lines.push({text:"warning: DataStore call without pcall",type:"warn"});
  if(/OnServerEvent/.test(code)&&!/type\(|typeof\(|~=/ .test(code))lines.push({text:"warning: validate RemoteEvent arguments",type:"warn"});
  const printRegex=/\\b(print|warn)\\s*\\(([^\\n]*)\\)/g;let match,count=0;
  while((match=printRegex.exec(code))&&count<15){
    let arg=match[2].replace(/[`']/g,"").replace(/\{[^}]+\}/g,"<valor>");
    lines.push({text:(match[1]==="warn"?"WARN: ":"")+arg,type:match[1]==="warn"?"warn":""});count++;
  }
  if(!count)lines.push({text:"(nenhum print/warn detectado para simulação)"});
  if(/--!strict/.test(code))lines.push({text:"type mode: strict",type:""});
  lines.push({text:"simulation finished — nenhum código Luau real foi executado."});
  renderPlayConsole(lines);
}
function analyzePlayground(){
  const fake={id:"play",name:"Playground",code:qs("#playCode").value,tags:[]};
  const result=localAnalyze("análise geral do playground",fake.code);
  renderPlayConsole(result.split("\\n").map(t=>({text:t})));
}
function formatPlayground(){
  let code=qs("#playCode").value.replace(/[ \\t]+$/gm,"");
  code=code.replace(/\bthen\s+/g,"then\n    ");
  qs("#playCode").value=code;toast("Formatação leve aplicada")}
function setViewV4(id){
  showView(id);
  if(id==="projects"){renderProjects();renderTasks()}
  if(id==="snippets")renderSnippets();
  if(id==="roadmap")renderRoadmap();
  if(id==="dashboard"){renderDashboard();updateAchievementStrip()}
}
function hydrateV4(){
  updateAchievementStrip();renderProjects();renderTasks();renderSnippets();renderRoadmap();renderPlayConsole([{text:"RBXGarden virtual console ready."},{text:"Este playground simula padrões básicos; não executa Luau real."}]);
  qsa(".nav button").forEach(b=>{
    const old=b.onclick;
    b.onclick=()=>setViewV4(b.dataset.view);
  });
  qsa("[data-go]").forEach(b=>b.onclick=()=>setViewV4(b.dataset.go));
  qs("#newProjectBtn").onclick=()=>{
    const name=prompt("Nome do projeto:","Novo projeto Roblox"); if(!name)return;
    state.projects.push({id:uid(),name,desc:"Novo workspace criado pelo RBXGarden.",emoji:"🌱",color:"aqua",progress:0});saveState();renderProjects();updateAchievementStrip();toast("Projeto criado");
  };
  qsa("[data-task-column]").forEach(b=>b.onclick=()=>{
    const text=prompt("Nome da tarefa:");if(!text)return;
    state.tasks[b.dataset.taskColumn].push({text});saveState();renderTasks();
  });
  qs("#snippetSearch").oninput=renderSnippets;
  qs("#saveSnippetBtn").onclick=()=>{
    const s=state.scripts.find(x=>x.id===state.activeId);
    if(!s){toast("Abra um script primeiro");return}
    state.snippets.unshift({id:uid(),name:s.name,tags:s.tags||[],code:s.code||""});saveState();renderSnippets();toast("Snippet salvo");
  };
  qs("#playRun").onclick=simulateLuau;qs("#playAnalyze").onclick=analyzePlayground;qs("#playFormat").onclick=formatPlayground;
  qs("#clearConsole").onclick=()=>renderPlayConsole([]);
  qs("#motionToggle").onclick=()=>{
    document.documentElement.classList.toggle("motion-off");
    qs("#motionToggle").classList.toggle("active");
    localStorage.setItem("rbxgarden_motion",document.documentElement.classList.contains("motion-off")?"off":"on");
  };
  qs("#densityToggle").onclick=()=>{document.body.classList.toggle("compact");qs("#densityToggle").classList.toggle("active");toast("Modo de densidade alternado")};
}
document.addEventListener("DOMContentLoaded",hydrateV4);

/* Focus timer */
let focusTimer=null;
function fmtFocus(sec){sec=Math.max(0,Math.floor(sec));return String(Math.floor(sec/60)).padStart(2,"0")+":"+String(sec%60).padStart(2,"0")}
function renderFocus(){
  qs("#focusTime").textContent=fmtFocus(state.focus.remaining);
  qs("#focusState").textContent=state.focus.running?"Em foco":"Pausado";
  const pct=100-(state.focus.remaining/1500*100);
  qs("#focusRing").style.setProperty("--p",Math.max(0,Math.min(100,pct))+"%");
}
function startFocus(){
  if(state.focus.running)return;state.focus.running=true;renderFocus();
  focusTimer=setInterval(()=>{
    if(state.focus.remaining<=0){stopFocus();toast("Sessão concluída! 🌿");return}
    state.focus.remaining--;renderFocus()
  },1000);
}
function stopFocus(){state.focus.running=false;clearInterval(focusTimer);focusTimer=null;saveState();renderFocus()}
function resetFocus(){stopFocus();state.focus.remaining=1500;renderFocus()}
setTimeout(()=>{
  if(!qs("#focusStart"))return;
  renderFocus();
  qs("#focusStart").onclick=startFocus;qs("#focusPause").onclick=stopFocus;qs("#focusReset").onclick=resetFocus;
},100);

(function restoreMotion(){if(localStorage.getItem("rbxgarden_motion")==="off"){document.documentElement.classList.add("motion-off");setTimeout(()=>qs("#motionToggle")?.classList.remove("active"),150)}})();

/* subtle 3D tilt, disabled on touch */
if(matchMedia("(pointer:fine)").matches){
  document.addEventListener("pointermove",e=>{
    const card=e.target.closest(".hero-main");
    if(!card)return;
    const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
    card.style.transform=`rotateX(${-y*2.4}deg) rotateY(${x*2.8}deg)`;
  });
  document.addEventListener("pointerleave",e=>{if(e.target.classList?.contains("hero-main"))e.target.style.transform=""},true);
}
