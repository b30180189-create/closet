(function(){
  const LS_USER_KEY = "vc_demo_user";
  const LS_WARDROBE_KEY = "vc_demo_wardrobe";
  const LS_OUTFITS_KEY = "vc_demo_outfits";
  const LS_RECENT_KEY = "vc_demo_recent";
  const LS_SETTINGS_KEY = "vc_demo_settings"; // Stores user-supplied Perplexity API key
  const LS_AUTH_SESSION_KEY = "vc_auth_session";

  const loginEmailInput = document.getElementById("loginEmailInput");
  const loginPasswordInput = document.getElementById("loginPasswordInput");
  const signupEmailInput = document.getElementById("signupEmailInput");
  const signupPasswordInput = document.getElementById("signupPasswordInput");
  const loginSubmit = document.getElementById("loginSubmit");
  const signupSubmit = document.getElementById("signupSubmit");
  const authToggleButtons = document.querySelectorAll(".auth-toggle-btn");
  const loginView = document.getElementById("loginView");
  const signupView = document.getElementById("signupView");
  const authScreen = document.getElementById("authScreen");
  const appContainer = document.getElementById("appContainer");
  const globalStatus = document.getElementById("globalStatus");

  const headerTitle = document.getElementById("headerTitle");
  const headerSubtitle = document.getElementById("headerSubtitle");

  const wardrobeGreeting = document.getElementById("wardrobeGreeting");
  const wardrobeGrid = document.getElementById("wardrobeGrid");
  const wardrobeEmpty = document.getElementById("wardrobeEmpty");
  const wardrobeSearch = document.getElementById("wardrobeSearch");
  const categoryFilter = document.getElementById("categoryFilter");
  const wardrobeListView = document.getElementById("wardrobeListView");
  const wardrobeDetailView = document.getElementById("wardrobeDetailView");
  const detailCard = document.getElementById("detailCard");
  const backToGrid = document.getElementById("backToGrid");

  const capturePhotoBtn = document.getElementById("capturePhotoBtn");
  const captureInput = document.getElementById("captureInput");
  const scanStatus = document.getElementById("scanStatus");
  const uploadInput = document.getElementById("uploadInput");
  const aiUploadPreview = document.getElementById("aiUploadPreview");
  const aiScanResults = document.getElementById("aiScanResults");
  const recentlyAddedWrap = document.getElementById("recentlyAdded");
  const recentEmpty = document.getElementById("recentEmpty");

  const regenOutfitsBtn = document.getElementById("regenOutfitsBtn");
  const outfitSuggestions = document.getElementById("outfitSuggestions");
  const outfitSuggestionsWrap = document.getElementById("outfitSuggestionsWrap");
  const scrollToCreateBtn = document.getElementById("scrollToCreateBtn");

  const createOutfitCard = document.getElementById("createOutfitCard");
  const createOutfitNotice = document.getElementById("createOutfitNotice");
  const createOutfitError = document.getElementById("createOutfitError");
  const newOutfitName = document.getElementById("newOutfitName");
  const newOutfitOccasion = document.getElementById("newOutfitOccasion");
  const newOutfitTop = document.getElementById("newOutfitTop");
  const newOutfitBottom = document.getElementById("newOutfitBottom");
  const newOutfitShoes = document.getElementById("newOutfitShoes");
  const saveNewOutfit = document.getElementById("saveNewOutfit");
  const cancelCreateOutfit = document.getElementById("cancelCreateOutfit");

  const savedOutfitsWrap = document.getElementById("savedOutfits");
  const savedOutfitsEmpty = document.getElementById("savedOutfitsEmpty");

  const profileEmailEl = document.getElementById("profileEmail");
  const profileLastLogin = document.getElementById("profileLastLogin");
  const statWardrobeCount = document.getElementById("statWardrobeCount");
  const statOutfitCount = document.getElementById("statOutfitCount");
  const profileLocalNote = document.getElementById("profileLocalNote");
  const logoutBtn = document.getElementById("logoutBtn");

  const pplxKeyInput = document.getElementById("pplxKeyInput");
  const pplxToggleKeyVis = document.getElementById("pplxToggleKeyVis");
  const settingsSaveBtn = document.getElementById("settingsSaveBtn");
  const pplxClearBtn = document.getElementById("pplxClearBtn");
  const pplxStatusEl = document.getElementById("pplxStatus");

  const navItems = document.querySelectorAll(".nav-item");
  const tabs = {
    wardrobe: document.getElementById("tab-wardrobe"),
    scan: document.getElementById("tab-scan"),
    outfits: document.getElementById("tab-outfits"),
    profile: document.getElementById("tab-profile")
  };

  let currentUser = null;
  let wardrobeItems = [];
  let outfits = [];
  let recentItems = [];
  let currentDetailIndex = 0;
  let deleteConfirmId = null;
  let pendingUploadFile = null;
  let lastScanImageDataUrl = "";

  // Settings state
  let settings = loadLS(LS_SETTINGS_KEY, {
    pplxKey: ""
  });
  let authSession = loadLS(LS_AUTH_SESSION_KEY, null);

  /* ---------- Utilities ---------- */
  function saveLS(key,val){localStorage.setItem(key,JSON.stringify(val));}
  function loadLS(key,def){
    try{
      const v = localStorage.getItem(key);
      return v?JSON.parse(v):def;
    }catch(e){return def;}
  }

  function saveAuthSession(session){
    authSession = session;
    saveLS(LS_AUTH_SESSION_KEY, session);
  }
  function clearAuthSession(){
    authSession = null;
    localStorage.removeItem(LS_AUTH_SESSION_KEY);
  }
  function getAuthToken(){
    return authSession?.token || "";
  }

  function getPplxKey(){
    return settings.pplxKey || "";
  }
  function setPplxKey(val){
    settings = { pplxKey: val ? val.trim() : "" };
    saveLS(LS_SETTINGS_KEY, settings);
  }

  function showStatus(msg,type="success",timeout=2200){
    if(!msg){
      globalStatus.classList.remove("show");
      return;
    }
    globalStatus.textContent = msg;
    globalStatus.style.background = type==="success" ? "#e8faf2" : "#ffe5ea";
    globalStatus.style.color = type==="success" ? "#16754f" : "#a11830";
    globalStatus.classList.add("show");
    if(timeout){
      setTimeout(()=>globalStatus.classList.remove("show"),timeout);
    }
  }

  function timeGreeting(){
    const h = new Date().getHours();
    if(h<12) return "Good morning";
    if(h<18) return "Good afternoon";
    return "Good evening";
  }

  function deriveOccasionFromItems(top,bottom,shoes){
    const names = [top.name,bottom.name,shoes.name].join(" ").toLowerCase();
    if(names.includes("blazer")||names.includes("dress")||names.includes("oxford")) return "Formal";
    if(names.includes("hoodie")||names.includes("sneaker")) return "Casual";
    if(names.includes("sport")||names.includes("running")) return "Sport";
    if(names.includes("shirt")||names.includes("chinos")) return "Professional";
    return "Casual";
  }

  function escapeHtml(str){
    return String(str||"")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function getItemIconMarkup(item){
    if(item.photoDataUrl){
      const safeAlt = escapeHtml(item.name || "Item");
      return `<img src="${item.photoDataUrl}" alt="${safeAlt} photo">`;
    }
    return escapeHtml(item.icon || "👕");
  }

  function normalizeAiItemName(name){
    const base = (name || "AI Item").trim();
    if(base.length <= 15) return base;
    return base.slice(0, 15).trimEnd() + "…";
  }

  function normalizeEmail(email){
    return (email || "").trim().toLowerCase();
  }

  function withNgrokHeaders(headers = {}){
    return { "ngrok-skip-browser-warning": "true", ...headers };
  }

  let activeAuthView = "login";
function setAuthView(view){
  activeAuthView = view === "signup" ? "signup" : "login";
  loginView.classList.toggle("active", activeAuthView === "login");
  signupView.classList.toggle("active", activeAuthView === "signup");
  authToggleButtons.forEach(btn=>{
    btn.classList.toggle("active", btn.dataset.view === activeAuthView);
  });
}
setAuthView("login");

  function updatePplxStatus(kind,detail){
    pplxStatusEl.classList.remove("pplx-status-ok","pplx-status-warn","pplx-status-off");
    const hasKey = !!getPplxKey();

    if(!hasKey){
      pplxStatusEl.textContent = "Add your Perplexity key to run AI scans.";
      pplxStatusEl.classList.add("pplx-status-off");
      return;
    }

    if(kind === "error"){
      pplxStatusEl.textContent =
        "Key saved, but last AI call failed: " + (detail || "check your Perplexity key.");
      pplxStatusEl.classList.add("pplx-status-warn");
      return;
    }

    pplxStatusEl.textContent =
      "Perplexity key stored locally. AI scans will use it via this backend.";
    pplxStatusEl.classList.add("pplx-status-ok");
  }

  function createDefaultWardrobe(){
    return [
      {id:"blue-tee",name:"Blue T-Shirt",category:"Tops",color:"Blue",description:"Comfortable cotton tee, perfect for casual days.",icon:"👕"},
      {id:"black-jeans",name:"Black Jeans",category:"Bottoms",color:"Black",description:"Classic black denim, versatile for any outfit.",icon:"👖"},
      {id:"red-dress",name:"Red Dress",category:"Dresses",color:"Red",description:"Bold choice for events.",icon:"👗"},
      {id:"white-sneakers",name:"White Sneakers",category:"Shoes",color:"White",description:"Clean sneakers that go with everything.",icon:"👟"},
      {id:"gray-hoodie",name:"Gray Hoodie",category:"Outerwear",color:"Gray",description:"Cozy layer for chilly days.",icon:"🧥"},
      {id:"striped-shirt",name:"Striped Button-Up",category:"Tops",color:"Blue/Orange",description:"Smart-casual staple for meetings.",icon:"👔"},
      {id:"khaki-chinos",name:"Khaki Chinos",category:"Bottoms",color:"Khaki",description:"Relaxed yet polished.",icon:"👖"},
      {id:"black-blazer",name:"Black Blazer",category:"Outerwear",color:"Black",description:"Instantly elevates your look.",icon:"🥼"},
      {id:"gold-earrings",name:"Gold Earrings",category:"Accessories",color:"Gold",description:"Minimal shiny finish.",icon:"✨"},
      {id:"brown-boots",name:"Brown Leather Boots",category:"Shoes",color:"Brown",description:"Rugged and refined.",icon:"🥾"}
    ];
  }

  function ensureDemoData(){
    wardrobeItems = loadLS(LS_WARDROBE_KEY,null);
    if(!wardrobeItems || !Array.isArray(wardrobeItems) || wardrobeItems.length===0){
      wardrobeItems = createDefaultWardrobe();
      saveLS(LS_WARDROBE_KEY,wardrobeItems);
    }
    outfits = loadLS(LS_OUTFITS_KEY,[]);
    recentItems = loadLS(LS_RECENT_KEY,[]);
  }

  function updateProfileStats(){
    statWardrobeCount.textContent = wardrobeItems.length;
    statOutfitCount.textContent = outfits.length;
    profileLocalNote.textContent =
      "Wardrobe, outfits & your Perplexity key are stored locally in this browser for this preview.";
  }

  /* ---------- Auth ---------- */
  function completeLogin(user, token){
    currentUser = user?.email || "";
    if(!currentUser){
      showStatus("Missing user details from server response.","error");
      return;
    }
    saveAuthSession({ token, user });
    saveLS(LS_USER_KEY,{email:currentUser,lastLogin:new Date().toISOString()});
    profileEmailEl.textContent = currentUser;
    profileLastLogin.textContent = "Today";
    ensureDemoData();
    renderAll();
    authScreen.style.display="none";
    appContainer.style.display="flex";
    showStatus("Signed in as "+currentUser.split("@")[0]);
  }

  function getAuthInputs(intent){
    if(intent === "signup"){
      return { emailEl: signupEmailInput, passwordEl: signupPasswordInput };
    }
    return { emailEl: loginEmailInput, passwordEl: loginPasswordInput };
  }

  async function handleAuthIntent(intent){
    const { emailEl, passwordEl } = getAuthInputs(intent);
    const email = normalizeEmail(emailEl.value);
    const password = passwordEl.value;

    if(!email || !password){
      showStatus("Email and password are required.","error",2500);
      return;
    }

    try{
      if(intent === "signup"){
        await authRequest("signup",{ email, password });
        emailEl.value = "";
        passwordEl.value = "";
        loginEmailInput.value = "";
        loginPasswordInput.value = "";
        setAuthView("login");
        showStatus("Account created. Please log in.", "success", 2000);
        return;
      }
      const session = await authRequest("login",{ email, password });
      passwordEl.value = "";
      completeLogin(session.user, session.token);
    }catch(err){
      showStatus(err.message || "Authentication failed.", "error", 3200);
    }
  }

  authToggleButtons.forEach(btn=>{
    btn.addEventListener("click",()=>setAuthView(btn.dataset.view || "login"));
  });

  loginSubmit.addEventListener("click",()=>handleAuthIntent("login"));
  signupSubmit.addEventListener("click",()=>handleAuthIntent("signup"));
  loginPasswordInput.addEventListener("keydown",e=>{
    if(e.key==="Enter") handleAuthIntent("login");
  });
  signupPasswordInput.addEventListener("keydown",e=>{
    if(e.key==="Enter") handleAuthIntent("signup");
  });

  logoutBtn.addEventListener("click",()=>{
    clearAuthSession();
    currentUser = null;
    showStatus("Signed out.");
    appContainer.style.display="none";
    authScreen.style.display="flex";
    loginEmailInput.value="";
    loginPasswordInput.value="";
    signupEmailInput.value="";
    signupPasswordInput.value="";
    setAuthView("login");
  });

  (function autoLoginIfAny(){
    ensureDemoData();
    const savedUser = authSession?.user || loadLS(LS_USER_KEY,null);
    if(authSession && savedUser?.email){
      currentUser = savedUser.email;
      renderAll();
      authScreen.style.display="none";
      appContainer.style.display="flex";
      profileEmailEl.textContent = currentUser;
      profileLastLogin.textContent = "Today";
      showStatus("Welcome back, "+currentUser.split("@")[0]+"!", "success",2000);
    }else{
      setAuthView("login");
      loginEmailInput.value = "";
      loginPasswordInput.value = "";
      renderAll();
    }
  })();

  /* ---------- Wardrobe ---------- */
  function getFilteredWardrobe(){
    const term = wardrobeSearch.value.trim().toLowerCase();
    const cat = categoryFilter.value;
    return wardrobeItems.filter(it=>{
      if(cat!=="all" && it.category!==cat) return false;
      if(!term) return true;
      return it.name.toLowerCase().includes(term) ||
        (it.description||"").toLowerCase().includes(term);
    });
  }

  function renderWardrobeGrid(){
    const items = getFilteredWardrobe();
    wardrobeGrid.innerHTML="";
    if(items.length===0){
      wardrobeEmpty.style.display="block";
    }else{
      wardrobeEmpty.style.display="none";
      items.forEach(it=>{
        const div = document.createElement("div");
        div.className="item-card";
        div.dataset.id = it.id;
        div.innerHTML = `<span class="icon">${getItemIconMarkup(it)}</span><div>${escapeHtml(it.name)}</div>`;
        div.addEventListener("click",()=>openDetailById(it.id));
        wardrobeGrid.appendChild(div);
      });
    }
  }

  function openDetailById(id){
    const index = wardrobeItems.findIndex(i=>i.id===id);
    if(index===-1) return;
    currentDetailIndex = index;
    renderDetail();
    wardrobeListView.style.display="none";
    wardrobeDetailView.style.display="block";
  }

  function renderDetail(){
    const it = wardrobeItems[currentDetailIndex];
    if(!it) return;
    detailCard.innerHTML = `
      <div class="detail-icon">${getItemIconMarkup(it)}</div>
      <div class="detail-name">${escapeHtml(it.name)}</div>
      <div class="badge">${escapeHtml(it.category)}</div>
      <div class="detail-desc">${escapeHtml(it.description||"")}</div>
      <div class="detail-color">Color: <strong>${escapeHtml(it.color||"—")}</strong></div>
      <div class="detail-nav">
          <button id="prevItemBtn">← Previous</button>
          <div>${currentDetailIndex+1} of ${wardrobeItems.length}</div>
          <button id="nextItemBtn">Next →</button>
      </div>
      <button id="deleteItemBtn" class="delete-btn">Delete item</button>
    `;
    document.getElementById("prevItemBtn").onclick = ()=>{
      currentDetailIndex = (currentDetailIndex-1+wardrobeItems.length)%wardrobeItems.length;
      renderDetail();
    };
    document.getElementById("nextItemBtn").onclick = ()=>{
      currentDetailIndex = (currentDetailIndex+1)%wardrobeItems.length;
      renderDetail();
    };
    const deleteBtn = document.getElementById("deleteItemBtn");
    deleteBtn.onclick = ()=>{
      const id = it.id;
      if(deleteConfirmId===id){
        wardrobeItems = wardrobeItems.filter(x=>x.id!==id);
        saveLS(LS_WARDROBE_KEY,wardrobeItems);
        deleteConfirmId=null;
        showStatus("Item deleted from your wardrobe.","success");
        wardrobeDetailView.style.display="none";
        wardrobeListView.style.display="block";
        renderWardrobeGrid();
        syncAfterDataChange();
      }else{
        deleteConfirmId=id;
        deleteBtn.textContent="Click again to confirm";
        deleteBtn.classList.add("confirming");
        setTimeout(()=>{
          if(deleteConfirmId===id){
            deleteConfirmId=null;
            deleteBtn.textContent="Delete item";
            deleteBtn.classList.remove("confirming");
          }
        },1800);
      }
    };
  }

  backToGrid.addEventListener("click",()=>{
    wardrobeDetailView.style.display="none";
    wardrobeListView.style.display="block";
    deleteConfirmId=null;
  });

  wardrobeSearch.addEventListener("input",renderWardrobeGrid);
  categoryFilter.addEventListener("change",renderWardrobeGrid);

  function renderWardrobeGreeting(){
    const name = currentUser ? currentUser.split("@")[0] : "styler";
    const msg = outfits.length
      ? `You’ve got ${outfits.length} saved outfit${outfits.length>1?"s":""} ready.`
      : "Generate a look in one tap below.";
    wardrobeGreeting.textContent = `${timeGreeting()}, ${name}. ${msg}`;
  }


  /* ---------- Scan: Capture & Upload ---------- */
  function preparePendingFile(file){
    aiScanResults.innerHTML = "";
    if (!file){
      pendingUploadFile = null;
      aiUploadPreview.textContent = "";
      return;
    }
    pendingUploadFile = file;
    const kb = Math.max(1, Math.round(file.size / 1024));
    const filename = file.name || "Camera capture";
    aiUploadPreview.innerHTML = `
      <strong>${escapeHtml(filename)}</strong> (${kb} KB)
      <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;">
        <button id="confirmAiAnalyzeBtn"
          class="api-btn-small-primary" type="button">
          Analyze with AI
        </button>
        <button id="cancelAiAnalyzeBtn"
          class="api-btn-small" type="button">
          Change photo
        </button>
      </div>
    `;
    document.getElementById("confirmAiAnalyzeBtn").onclick = ()=>{
      if(!pendingUploadFile) return;
      runAIScanOnPendingFile();
    };
    document.getElementById("cancelAiAnalyzeBtn").onclick = ()=>{
      pendingUploadFile = null;
      aiUploadPreview.textContent = "";
      aiScanResults.innerHTML = "";
      if (captureInput) captureInput.value = "";
      if (uploadInput) uploadInput.value = "";
      scanStatus.textContent = "Capture cleared.";
      scanStatus.style.color = "#7a8699";
    };
  }

  capturePhotoBtn.addEventListener("click",()=>{
    if(captureInput){
      captureInput.value = "";
      captureInput.click();
    }
  });

  captureInput.addEventListener("change", ()=>{
    const file = captureInput.files?.[0];
    if(file){
      preparePendingFile(file);
    }
  });

  uploadInput.addEventListener("change", () => {
    const file = uploadInput.files?.[0];
    if(file){
      preparePendingFile(file);
    }else{
      pendingUploadFile = null;
      aiUploadPreview.textContent = "";
    }
  });

  async function runAIScanOnPendingFile(){
    if (!pendingUploadFile) return;
    aiScanResults.innerHTML = "";
    scanStatus.textContent = "Analyzing outfit…";
    scanStatus.style.color = "#7a8699";
    const prevHTML = aiUploadPreview.innerHTML;
    aiUploadPreview.innerHTML = prevHTML + `
      <div class="mini-muted" style="margin-top:4px;">Sending to AI stylist…</div>
    `;
    try{
      const base64 = await fileToBase64(pendingUploadFile);
      lastScanImageDataUrl = base64;
      const aiData = await callAIClothingScan(base64);
      if (!aiData || !Array.isArray(aiData.items)) {
        throw new Error("Invalid AI response");
      }
      aiData.__sourceImage = lastScanImageDataUrl;
      if (aiData.items.length === 0) {
      aiScanResults.innerHTML = "";
        scanStatus.textContent = "No items detected.";
        scanStatus.style.color = "#b01331";
      } else {
        displayAIScanPreview(aiData);
        scanStatus.textContent = "Review detected looks.";
        scanStatus.style.color = "#16754f";
      }
      updatePplxStatus("ok");
    }catch(err){
      console.error(err);
      aiScanResults.innerHTML = "";
      scanStatus.textContent = "Scan failed.";
      scanStatus.style.color = "#b01331";
      updatePplxStatus("error", err.message);
    }finally{
      pendingUploadFile = null;
      if (uploadInput) uploadInput.value = "";
      if (captureInput) captureInput.value = "";
      aiUploadPreview.innerHTML = prevHTML.replace("Sending to AI stylist…","");
    }
  }

  function fileToBase64(file){
    return new Promise((resolve,reject)=>{
      const reader = new FileReader();
      reader.onload = ()=>resolve(reader.result);
      reader.onerror = ()=>reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  async function authRequest(endpoint, payload){
    const res = await fetch(`/api/auth/${endpoint}`, {
      method: "POST",
      headers: withNgrokHeaders({ "Content-Type":"application/json" }),
      body: JSON.stringify(payload)
    });
    let data;
    try{
      data = await res.json();
    }catch{
      throw new Error("Server returned an invalid response.");
    }
    if(!res.ok){
      throw new Error(data.error || "Authentication failed.");
    }
    return data;
  }

  // Core: always call backend with the locally stored Perplexity key
  async function callAIClothingScan(base64DataUrl){
    const apiKey = getPplxKey().trim();
    if(!apiKey){
      throw new Error("Add your Perplexity API key in Settings before running AI scans.");
    }

    const match = String(base64DataUrl).match(/^data:(.*?);base64,(.*)$/);
    if(!match) throw new Error("Invalid image format.");
    const mime = match[1] || "image/jpeg";
    const base64 = match[2];

    const res = await fetch("/api/scan-outfit", {
      method: "POST",
      headers: withNgrokHeaders({"Content-Type":"application/json"}),
      body: JSON.stringify({ imageBase64: base64, mime, apiKey })
    });

    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch(e){
      throw new Error("Backend returned non-JSON response.");
    }
    if(!res.ok){
      throw new Error(json.error || ("Backend error " + res.status));
    }
    return json;
  }

  function pickIconFromCategory(cat){
    switch(cat){
      case "Tops": return "👕";
      case "Bottoms": return "👖";
      case "Dresses": return "👗";
      case "Outerwear": return "🧥";
      case "Shoes": return "👟";
      case "Accessories": return "✨";
      default: return "👕";
    }
  }

  function displayAIScanPreview(aiData){
    const items = aiData.items || [];
    const summary = aiData.outfit_summary || {};
    if(!items.length){
      aiScanResults.innerHTML = `
        <div class="mini-muted">
          No clear clothing detected. Try a clearer full-body photo.
        </div>
      `;
      return;
    }

    const shouldShowPhoto = items.length === 1 && aiData.__sourceImage;

    const listHtml = items.map((it,idx)=>{
      const icon =
        shouldShowPhoto && idx === 0
          ? `<img src="${aiData.__sourceImage}" alt="${escapeHtml(it.name || "Detected item")} photo">`
          : escapeHtml(it.icon_hint || pickIconFromCategory(it.category));
      const name = escapeHtml(normalizeAiItemName(it.name || "Item"));
      const category = escapeHtml(it.category || "Unknown");
      const color = escapeHtml(it.color || "Unknown");
      const metaBits = [];
      if(it.formality) metaBits.push(it.formality);
      if(it.layer) metaBits.push(`${it.layer} layer`);
      if(it.position) metaBits.push(it.position);
      if(Array.isArray(it.patterns) && it.patterns.length){
        metaBits.push(`Patterns: ${it.patterns.join(", ")}`);
      }
      const meta = metaBits.map(part=>escapeHtml(part)).join(" • ");
      const notes = it.notes ? escapeHtml(it.notes) : "";

      return `
        <div class="ai-item-card">
          <div class="ai-item-header">
            <div class="ai-item-main">
              <div class="ai-item-icon">${icon}</div>
              <div>
                <div class="ai-item-name">${name}</div>
                <div class="ai-item-sub">${category} • ${color}</div>
              </div>
            </div>
            <label class="ai-item-checkbox">
              <input type="checkbox" data-idx="${idx}" checked>
              Keep
            </label>
          </div>
          ${meta ? `<div class="ai-item-meta">${meta}</div>` : ""}
          ${notes ? `<div class="ai-item-notes">${notes}</div>` : ""}
        </div>
      `;
    }).join("");

    const occasion = summary.primary_occasion || "Casual";
    const comment = summary.comment || "AI-generated outfit suggestion from this look.";

    aiScanResults.innerHTML = `
      <div class="section-title">Detected from your photo</div>
      <div class="mini-muted" style="margin-bottom:4px;">
        Keep or deselect items before saving.
      </div>
      <div id="aiScanItemsWrap" class="ai-detected-list">${listHtml}</div>
      <div class="mini-muted" style="margin:4px 0 6px;">
        Suggested occasion: <strong>${escapeHtml(occasion)}</strong>.
        ${escapeHtml(comment)}
      </div>
      <button id="aiScanApplyBtn"
        style="margin-top:4px;padding:8px 10px;border-radius:8px;background:#197c8a;color:#fff;font-size:11px;font-weight:600;width:100%;">
        Add selected items to my wardrobe
      </button>
    `;

    document.getElementById("aiScanApplyBtn").onclick = () => applyAIScanSelections(aiData);
  }

  function applyAIScanSelections(aiData){
    const checkboxes = aiScanResults.querySelectorAll("input[type='checkbox'][data-idx]");
    const selected = [];
    checkboxes.forEach(cb=>{
      if(cb.checked){
        const idx = parseInt(cb.dataset.idx,10);
        if(!isNaN(idx) && aiData.items[idx]) selected.push(aiData.items[idx]);
      }
    });
    if(!selected.length){
      showStatus("No items selected from AI scan.","error",1800);
      return;
    }

    const newIds = [];
    const shouldAttachPhoto = (aiData?.items?.length === 1) && !!aiData.__sourceImage;
    selected.forEach((it,i)=>{
      const id = "ai-"+Date.now()+"-"+i+"-"+Math.random().toString(16).slice(2,6);
      const icon = it.icon_hint || pickIconFromCategory(it.category);
      const appItem = {
        id,
        name: normalizeAiItemName(it.name),
        category: it.category || "Tops",
        color: it.color || "Unknown",
        description: it.notes || "Detected via AI wardrobe scan preview.",
        icon,
        photoDataUrl: shouldAttachPhoto ? aiData.__sourceImage : null
      };
      wardrobeItems.push(appItem);
      newIds.push(id);
      recentItems.unshift({
        id: appItem.id,
        name: appItem.name,
        icon: appItem.icon,
        photoDataUrl: appItem.photoDataUrl
      });
    });
    recentItems = recentItems.slice(0,5);
    saveLS(LS_WARDROBE_KEY,wardrobeItems);
    saveLS(LS_RECENT_KEY,recentItems);
    renderWardrobeGrid();
    renderRecentlyAdded();

    if(newIds.length>=2){
      const outfit = {
        id:"ai-outfit-"+Date.now(),
        name:"Look from AI Scan",
        occasion: aiData.outfit_summary?.primary_occasion || "Casual",
        items:newIds.slice(0,3),
        createdAt:Date.now()
      };
      outfits.push(outfit);
      saveLS(LS_OUTFITS_KEY,outfits);
      renderSavedOutfits(outfit.id);
    }
    syncAfterDataChange();
    aiScanResults.innerHTML = `
      <div class="mini-muted" style="color:#16754f;">
        Added ${selected.length} item(s) to your wardrobe from the AI scan.
      </div>
    `;
    showStatus("AI scan imported into your wardrobe.","success");
  }

  function renderRecentlyAdded(){
    recentlyAddedWrap.innerHTML="";
    if(!recentItems.length){
      recentEmpty.style.display="block";
      return;
    }
    recentEmpty.style.display="none";
    recentItems.forEach(it=>{
      const div = document.createElement("div");
      div.className="recent-item";
      const iconMarkup = it.photoDataUrl
        ? `<img src="${it.photoDataUrl}" alt="${escapeHtml(it.name)} photo">`
        : escapeHtml(it.icon || "👕");
      div.innerHTML = `<span class="icon">${iconMarkup}</span><div>${escapeHtml(it.name)}</div>`;
      recentlyAddedWrap.appendChild(div);
    });
  }

  /* ---------- Outfits ---------- */
  function randomFrom(arr){return arr[Math.floor(Math.random()*arr.length)];}

  function generateOutfitSuggestions(){
    outfitSuggestions.innerHTML = "";
    const tops = wardrobeItems.filter(x=>x.category==="Tops");
    const bottoms = wardrobeItems.filter(x=>x.category==="Bottoms");
    const shoes = wardrobeItems.filter(x=>x.category==="Shoes");
    if(!tops.length || !bottoms.length || !shoes.length){
      outfitSuggestionsWrap.style.display="none";
      return;
    }
    outfitSuggestionsWrap.style.display="block";
    for(let i=0;i<2;i++){
      const top=randomFrom(tops);
      const bottom=randomFrom(bottoms);
      const shoe=randomFrom(shoes);
      const occ = deriveOccasionFromItems(top,bottom,shoe);
      const card = document.createElement("div");
      card.className="outfit-card";
      card.innerHTML = `
        <div><strong>Curated Look</strong></div>
        <div class="outfit-items">
          <div><span class="icon">${getItemIconMarkup(top)}</span><div class="outfit-label">${escapeHtml(top.name)}</div></div>
          <div><span class="icon">${getItemIconMarkup(bottom)}</span><div class="outfit-label">${escapeHtml(bottom.name)}</div></div>
          <div><span class="icon">${getItemIconMarkup(shoe)}</span><div class="outfit-label">${escapeHtml(shoe.name)}</div></div>
        </div>
        <div>A great ${escapeHtml(occ.toLowerCase())} option.</div>
        <div class="tag">${escapeHtml(occ)}</div>
        <div class="outfit-actions">
          <button class="btn-save-outfit">💾 Save Outfit</button>
        </div>
      `;
      const saveBtn = card.querySelector(".btn-save-outfit");
      saveBtn.addEventListener("click",()=>{
        const outfit = {
          id:"o-"+Date.now()+"-"+Math.random().toString(16).slice(2),
          name:`${occ} Look`,
          occasion:occ,
          items:[top.id,bottom.id,shoe.id],
          createdAt:Date.now()
        };
        outfits.push(outfit);
        saveLS(LS_OUTFITS_KEY,outfits);
        renderSavedOutfits(outfit.id);
        syncAfterDataChange();
        saveBtn.classList.add("saved");
        saveBtn.textContent="Saved ✓";
        showStatus("Outfit saved.");
      });
      outfitSuggestions.appendChild(card);
    }
  }

  regenOutfitsBtn.addEventListener("click",()=>{
    generateOutfitSuggestions();
    showStatus("Regenerated curated looks.","success",1500);
  });

  function renderSavedOutfits(highlightId=null){
    savedOutfitsWrap.innerHTML="";
    if(!outfits.length){
      savedOutfitsEmpty.style.display="block";
      return;
    }
    savedOutfitsEmpty.style.display="none";
    outfits.slice().sort((a,b)=>b.createdAt-a.createdAt).forEach(of=>{
      const [topId,bottomId,shoeId] = of.items;
      const top = wardrobeItems.find(i=>i.id===topId);
      const bottom = wardrobeItems.find(i=>i.id===bottomId);
      const shoe = wardrobeItems.find(i=>i.id===shoeId);
      const card = document.createElement("div");
      card.className="outfit-card";
      if(of.id===highlightId) card.classList.add("pulse");
      card.innerHTML = `
        <div><strong>${escapeHtml(of.name||"Saved Look")}</strong></div>
        <div class="outfit-items">
          <div><span class="icon">${top?getItemIconMarkup(top):"❔"}</span><div class="outfit-label">${escapeHtml(top?top.name:"Top missing")}</div></div>
          <div><span class="icon">${bottom?getItemIconMarkup(bottom):"❔"}</span><div class="outfit-label">${escapeHtml(bottom?bottom.name:"Bottom missing")}</div></div>
          <div><span class="icon">${shoe?getItemIconMarkup(shoe):"❔"}</span><div class="outfit-label">${escapeHtml(shoe?shoe.name:"Shoes missing")}</div></div>
        </div>
        <div class="tag">${escapeHtml(of.occasion||"Custom")}</div>
        <div class="outfit-actions">
          <button class="btn-save-outfit saved" disabled>Saved</button>
          <div class="delete-outfit" title="Remove outfit">🗑</div>
        </div>
      `;
      card.querySelector(".delete-outfit").addEventListener("click",()=>{
        outfits = outfits.filter(x=>x.id!==of.id);
        saveLS(LS_OUTFITS_KEY,outfits);
        renderSavedOutfits();
        syncAfterDataChange();
        showStatus("Removed outfit.","success",1500);
      });
      savedOutfitsWrap.appendChild(card);
    });
  }

  function updateCreateOutfitOptions(){
    const tops = wardrobeItems.filter(x=>x.category==="Tops");
    const bottoms = wardrobeItems.filter(x=>x.category==="Bottoms");
    const shoes = wardrobeItems.filter(x=>x.category==="Shoes");
    function fillSelect(sel,items,placeholder){
      sel.innerHTML="";
      if(!items.length){
        const opt = document.createElement("option");
        opt.textContent = `No ${placeholder} yet`;
        opt.value="";
        sel.appendChild(opt);
        sel.disabled=true;
      }else{
        sel.disabled=false;
        sel.appendChild(new Option(`Choose ${placeholder}...`,""));
        items.forEach(i=>sel.appendChild(new Option(i.name,i.id)));
      }
    }
    fillSelect(newOutfitTop,tops,"top");
    fillSelect(newOutfitBottom,bottoms,"bottoms");
    fillSelect(newOutfitShoes,shoes,"shoes");
    if(!tops.length || !bottoms.length || !shoes.length){
      createOutfitNotice.style.display="block";
      createOutfitNotice.textContent =
        "Add at least one top, bottom and pair of shoes to build a full outfit in this preview.";
    }else{
      createOutfitNotice.style.display="none";
    }
  }

  saveNewOutfit.addEventListener("click",()=>{
    createOutfitError.style.display="none";
    const name = newOutfitName.value.trim() || "Custom Look";
    const occ = newOutfitOccasion.value || "Casual";
    const topId = newOutfitTop.value;
    const bottomId = newOutfitBottom.value;
    const shoesId = newOutfitShoes.value;
    if(!topId || !bottomId || !shoesId){
      createOutfitError.textContent = "Pick a top, bottoms and shoes to save this outfit.";
      createOutfitError.style.display="block";
      return;
    }
    const newOutfit = {
      id:"c-"+Date.now()+"-"+Math.random().toString(16).slice(2),
      name,
      occasion:occ,
      items:[topId,bottomId,shoesId],
      createdAt:Date.now()
    };
    outfits.push(newOutfit);
    saveLS(LS_OUTFITS_KEY,outfits);
    renderSavedOutfits(newOutfit.id);
    syncAfterDataChange();
    newOutfitName.value="";
    newOutfitTop.value="";
    newOutfitBottom.value="";
    newOutfitShoes.value="";
    createOutfitError.style.display="none";
    showStatus("Custom outfit saved.","success");
  });

  cancelCreateOutfit.addEventListener("click",()=>{
    newOutfitName.value="";
    newOutfitTop.value="";
    newOutfitBottom.value="";
    newOutfitShoes.value="";
    createOutfitError.style.display="none";
  });

  scrollToCreateBtn.addEventListener("click",()=>{
    tabs.outfits.scrollTo({top:createOutfitCard.offsetTop-40,behavior:"smooth"});
    createOutfitCard.classList.add("pulse");
    setTimeout(()=>createOutfitCard.classList.remove("pulse"),700);
  });

  /* ---------- Settings UI wiring ---------- */
  function syncSettingsForm(){
    pplxKeyInput.value = "";
    updatePplxStatus();
  }
  syncSettingsForm();

  pplxToggleKeyVis.addEventListener("click",()=>{
    if(pplxKeyInput.type==="password"){
      pplxKeyInput.type="text";
      pplxToggleKeyVis.textContent="Hide";
    }else{
      pplxKeyInput.type="password";
      pplxToggleKeyVis.textContent="Show";
    }
  });

  settingsSaveBtn.addEventListener("click",()=>{
    const key = pplxKeyInput.value.trim();

    if(key){
      setPplxKey(key);
      pplxKeyInput.value = "";
    }

    updatePplxStatus();
    showStatus("Perplexity key saved locally.","success",1800);
  });

  pplxClearBtn.addEventListener("click",()=>{
    setPplxKey("");
    pplxKeyInput.value = "";
    updatePplxStatus();
    showStatus("Perplexity key cleared.","success",1500);
  });

  /* ---------- Navigation & Swipe ---------- */
  function switchTab(name){
    Object.values(tabs).forEach(t=>t.classList.remove("active"));
    tabs[name].classList.add("active");
    navItems.forEach(n=>{
      if(n.dataset.tab===name) n.classList.add("active");
      else n.classList.remove("active");
    });
    if(name==="wardrobe"){
      headerTitle.textContent="Your Wardrobe";
      headerSubtitle.textContent="Browse, filter and inspect your items.";
    }else if(name==="scan"){
      headerTitle.textContent="Add Your Clothes";
      headerSubtitle.textContent="Upload and analyze outfits with your Perplexity key.";
    }else if(name==="outfits"){
      headerTitle.textContent="Outfit Suggestions";
      headerSubtitle.textContent="Curated and custom looks, saved locally.";
    }else if(name==="profile"){
      headerTitle.textContent="Settings";
      headerSubtitle.textContent="Store your Perplexity key and manage local data.";
    }
    updateProfileStats();
  }

  navItems.forEach(nav=>{
    nav.addEventListener("click",()=>switchTab(nav.dataset.tab));
  });

  let touchStartX=0,touchStartY=0;
  document.addEventListener("touchstart",e=>{
    const t=e.touches[0];
    touchStartX=t.clientX;
    touchStartY=t.clientY;
  },{passive:true});
  document.addEventListener("touchend",e=>{
    const dx=e.changedTouches[0].clientX-touchStartX;
    const dy=e.changedTouches[0].clientY-touchStartY;
    const absX=Math.abs(dx),absY=Math.abs(dy);
    if(absX<50 || absX<absY*1.5) return;
    const order=["wardrobe","scan","outfits","profile"];
    const current = [...navItems].find(n=>n.classList.contains("active")).dataset.tab;
    let idx=order.indexOf(current);
    if(dx<0 && idx<order.length-1) idx++;
    if(dx>0 && idx>0) idx--;
    switchTab(order[idx]);
  },{passive:true});

  /* ---------- Sync & Initial Render ---------- */
  function syncAfterDataChange(){
    updateProfileStats();
    updateCreateOutfitOptions();
  }

  function renderAll(){
    renderWardrobeGrid();
    renderWardrobeGreeting();
    renderRecentlyAdded();
    generateOutfitSuggestions();
    renderSavedOutfits();
    updateCreateOutfitOptions();
    updateProfileStats();
    updatePplxStatus();
  }
})();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", function() {
    navigator.serviceWorker
      .register("./sw.js")
      .catch(function(err){
        console.error("Service worker registration failed:", err);
      });
  });
}
