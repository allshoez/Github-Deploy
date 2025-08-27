ldocument.addEventListener("DOMContentLoaded", () => {
  let token = "";
  let currentRepo = "";
  let editingFile = "";      // file yang sedang diedit
  let deleteConfirm = false; // flag konfirmasi hapus

  const output = document.getElementById("output");
  const repoSelect = document.getElementById("repoSelect");
  const fileNameInput = document.getElementById("fileNameInput");
  const fileContentInput = document.getElementById("fileContentInput");
  const branchSelect = document.getElementById("branchSelect");

  function log(msg, type="info"){
    const p = document.createElement("p");
    p.textContent = msg;
    if(type==="success") p.style.color="#0f0";
    else if(type==="error") p.style.color="#f33";
    else p.style.color="#0af";
    output.appendChild(p);
    output.scrollTop = output.scrollHeight;
  }

  async function apiRequest(url, method="GET", body=null){
    const headers = {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json"
    };
    if(body) headers["Content-Type"]="application/json";
    const res = await fetch(url, {method, headers, body: body ? JSON.stringify(body) : null});
    if(!res.ok){
      const err = await res.text();
      throw new Error(`Error ${res.status}: ${err}`);
    }
    return res.json();
  }

  // ===== Token =====
  document.getElementById("saveTokenBtn").addEventListener("click", async ()=>{
    token = document.getElementById("tokenInput").value.trim();
    if(!token) return log("⚠️ Masukkan token!", "error");
    log("✅ Token disimpan!", "success");
    await loadRepos();
  });

  // ===== Load Repo =====
  async function loadRepos(){
    try{
      log("🔄 Memuat daftar repository...", "info");
      const repos = await apiRequest("https://api.github.com/user/repos");
      repoSelect.innerHTML='<option value="">-- Pilih Repo --</option>';
      repos.forEach(r=>{
        const opt=document.createElement("option");
        opt.value=r.full_name;
        opt.textContent=r.full_name;
        repoSelect.appendChild(opt);
      });
      log("✅ Repo berhasil dimuat.", "success");
    }catch(e){
      log("❌ Gagal load repo: "+e.message, "error");
    }
  }

  // ===== Load Repo & Branch =====
  document.getElementById("loadRepoBtn").addEventListener("click", async ()=>{
    const repoValue = repoSelect.value;
    if(!repoValue) return log("⚠️ Pilih repo dulu!", "error");
    currentRepo = repoValue;

    try{
      log(`📂 Memuat isi repo: ${currentRepo} ...`, "info");

      // Load branch
      await loadBranches();

      // Load file list
      const files = await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/`);
      renderRepoContent(files);
      log("✅ Repo & branch berhasil dimuat.", "success");
    }catch(e){
      log("❌ Error load repo: "+e.message, "error");
    }
  });

  async function loadBranches(){
    if(!currentRepo) return;
    try{
      const branches = await apiRequest(`https://api.github.com/repos/${currentRepo}/branches`);
      branchSelect.innerHTML='<option value="">-- Pilih Branch --</option>';
      branches.forEach(b=>{
        const opt=document.createElement("option");
        opt.value=b.name;
        opt.textContent=b.name;
        branchSelect.appendChild(opt);
      });
      log("✅ Branch berhasil dimuat.","success");
    }catch(e){
      log("❌ Gagal load branch: "+e.message,"error");
    }
  }

  function renderRepoContent(files){
    const repoDiv=document.getElementById("fileList");
    repoDiv.innerHTML="<ul>"+files.map(f=>`<li>${f.type==="dir"?"📁":"📄"} ${f.name}</li>`).join("")+"</ul>";
  }

  // ===== Buat File =====
  document.getElementById("createFileBtn").addEventListener("click", async ()=>{
    if(!currentRepo) return log("⚠️ Pilih repo dulu!", "error");
    const name=fileNameInput.value.trim();
    const content=fileContentInput.value;
    if(!name) return log("⚠️ Nama file wajib!", "error");
    try{
      const encoded=btoa(unescape(encodeURIComponent(content)));
      await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`, "PUT", {
        message: `Buat file ${name}`,
        content: encoded
      });
      log(`✅ File ${name} berhasil dibuat.`, "success");
      document.getElementById("loadRepoBtn").click();
    }catch(e){
      log("❌ Error buat file: "+e.message, "error");
    }
  });

  // ===== Edit File (2 fase) =====
  document.getElementById("editFileBtn").addEventListener("click", async ()=>{
    if(!currentRepo) return log("⚠️ Pilih repo dulu!", "error");
    const name=fileNameInput.value.trim();
    if(!name) return log("⚠️ Nama file wajib!", "error");

    if(editingFile!==name){
      try{
        const fileData=await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`);
        const decoded=decodeURIComponent(escape(atob(fileData.content)));
        fileContentInput.value=decoded;
        editingFile=name;
        log(`✏️ File ${name} siap diedit. Edit di textarea & tekan Edit File lagi.`, "info");
      }catch(e){
        log("❌ Error ambil file: "+e.message, "error");
      }
    }else{
      try{
        const fileData=await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`);
        const encoded=btoa(unescape(encodeURIComponent(fileContentInput.value)));
        await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`, "PUT", {
          message: `Edit file ${name}`,
          content: encoded,
          sha:fileData.sha
        });
        log(`✅ File ${name} berhasil diedit.`, "success");
        editingFile="";
        document.getElementById("loadRepoBtn").click();
      }catch(e){
        log("❌ Error edit file: "+e.message, "error");
      }
    }
  });

  // ===== Hapus File =====
  document.getElementById("deleteFileBtn").addEventListener("click", async ()=>{
    if(!currentRepo) return log("⚠️ Pilih repo dulu!", "error");
    const name=fileNameInput.value.trim();
    if(!name) return log("⚠️ Nama file wajib!", "error");
    const branch = branchSelect.value || undefined;

    if(!deleteConfirm || editingFile!==name){
      deleteConfirm=true;
      editingFile=name;
      log(`⚠️ Yakin mau hapus file ${name} di branch ${branch || "default"}? Tekan Hapus File lagi untuk konfirmasi.`,"info");
      return;
    }

    try{
      const fileData = await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}${branch?`?ref=${branch}`:""}`);
      await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}${branch?`?ref=${branch}`:""}`,"DELETE",{
        message:`Hapus file ${name}`,
        sha:fileData.sha,
        branch:branch
      });
      log(`✅ File ${name} berhasil dihapus di branch ${branch || "default"}.`,"success");
      deleteConfirm=false;
      editingFile="";
      document.getElementById("loadRepoBtn").click();
    }catch(e){
      if(e.message.includes("404")){
        log(`❌ File ${name} tidak ditemukan di branch ${branch || "default"}. Pastikan nama/file path benar dan sudah commit.`,"error");
      }else{
        log("❌ Error hapus file: "+e.message,"error");
      }
      deleteConfirm=false;
      editingFile="";
    }
  });

  // ===== Toggle Dark/Light Mode =====
  const toggleBtn=document.getElementById("modeToggle");
  toggleBtn.addEventListener("click", ()=>{
    document.body.classList.toggle("light");
    document.body.classList.toggle("dark");
    toggleBtn.textContent=document.body.classList.contains("dark")?"☀️ Mode":"🌙 Mode";
  });
});
