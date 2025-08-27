document.addEventListener("DOMContentLoaded", () => {
  let token = "";
  let currentRepo = "";
  let defaultBranch = "main"; // fallback kalau gagal deteksi
  let editingFile = ""; 
  let deleteConfirm = false; 

  const output = document.getElementById("output");
  const repoSelect = document.getElementById("repoSelect");
  const fileNameInput = document.getElementById("fileNameInput");
  const fileContentInput = document.getElementById("fileContentInput");

  function log(msg, type = "info") {
    const p = document.createElement("p");
    p.textContent = msg;
    if(type === "success") p.style.color = "#0f0";
    else if(type === "error") p.style.color = "#f33";
    else p.style.color = "#0af";
    output.appendChild(p);
    output.scrollTop = output.scrollHeight;
  }

  async function apiRequest(url, method = "GET", body = null) {
    const headers = {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json"
    };
    if(body) headers["Content-Type"] = "application/json";

    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : null });
    if(!res.ok) {
      const err = await res.text();
      throw new Error(`Error ${res.status}: ${err}`);
    }
    return res.json();
  }

  // ===== Token =====
  document.getElementById("saveTokenBtn").addEventListener("click", ()=>{
    token = document.getElementById("tokenInput").value.trim();
    if(token){
      log("✅ Token disimpan!","success");
      loadRepos();
    } else log("⚠️ Masukkan token!","error");
  });

  // ===== Load Repo =====
  async function loadRepos(){
    try{
      log("🔄 Memuat daftar repository...","info");
      const repos = await apiRequest("https://api.github.com/user/repos");
      repoSelect.innerHTML='<option value="">-- Pilih Repo --</option>';
      repos.forEach(r=>{
        const opt=document.createElement("option");
        opt.value=r.full_name;
        opt.textContent=r.full_name;
        repoSelect.appendChild(opt);
      });
      log("✅ Repo berhasil dimuat.","success");
    }catch(e){ log("❌ Gagal load repo: "+e.message,"error"); }
  }

  // ===== Load Repo Content =====
  document.getElementById("loadRepoBtn").addEventListener("click", async ()=>{
    currentRepo=repoSelect.value;
    if(!currentRepo) return log("⚠️ Pilih repo dulu!","error");
    try{
      log(`📂 Memuat isi repo: ${currentRepo} ...`,"info");

      // ambil info repo dulu buat tau default branch
      const repoInfo = await apiRequest(`https://api.github.com/repos/${currentRepo}`);
      defaultBranch = repoInfo.default_branch || "main";
      log(`ℹ️ Default branch: ${defaultBranch}`,"info");

      const files=await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/?ref=${defaultBranch}`);
      renderRepoContent(files);
    }catch(e){ log("❌ Error load repo: "+e.message,"error"); }
  });

  function renderRepoContent(files){
    const repoDiv=document.getElementById("fileList");
    repoDiv.innerHTML="<ul>"+files.map(f=>`<li>${f.type==="dir"?"📁":"📄"} ${f.name}</li>`).join("")+"</ul>";
  }

  // ===== Buat File =====
  document.getElementById("createFileBtn").addEventListener("click", async ()=>{
    if(!currentRepo) return log("⚠️ Pilih repo dulu!","error");
    const name=fileNameInput.value.trim();
    let content=fileContentInput.value;
    if(!name) return log("⚠️ Nama file wajib!","error");
    if(!content) content="# File baru\n"; 
    try{
      const encoded=btoa(unescape(encodeURIComponent(content)));
      await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`,"PUT",{
        message:`Buat file ${name}`,
        content:encoded,
        branch: defaultBranch
      });
      log(`✅ File ${name} berhasil dibuat.`,"success");
      document.getElementById("loadRepoBtn").click();
    }catch(e){ log("❌ Error buat file: "+e.message,"error"); }
  });

  // ===== Edit File =====
  document.getElementById("editFileBtn").addEventListener("click", async ()=>{
    if(!currentRepo) return log("⚠️ Pilih repo dulu!","error");
    const name=fileNameInput.value.trim();
    if(!name) return log("⚠️ Nama file wajib!","error");

    if(editingFile!==name){
      try{
        const fileData=await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}?ref=${defaultBranch}`);
        const decoded=atob(fileData.content.replace(/\n/g,''));
        fileContentInput.value=decoded;
        editingFile=name;
        log(`✏️ File ${name} siap diedit.`,"info");
      }catch(e){ log("❌ Error ambil file: "+e.message,"error"); }
    }else{
      try{
        const fileData=await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}?ref=${defaultBranch}`);
        const encoded=btoa(unescape(encodeURIComponent(fileContentInput.value || "# File kosong\n")));
        await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`,"PUT",{
          message:`Edit file ${name}`,
          content:encoded,
          sha:fileData.sha,
          branch: defaultBranch
        });
        log(`✅ File ${name} berhasil diedit.`,"success");
        editingFile="";
        document.getElementById("loadRepoBtn").click();
      }catch(e){ log("❌ Error edit file: "+e.message,"error"); }
    }
  });

  // ===== Hapus File dengan Konfirmasi =====
  document.getElementById("deleteFileBtn").addEventListener("click", async ()=>{
    if(!currentRepo) return log("⚠️ Pilih repo dulu!","error");
    const name = fileNameInput.value.trim();
    if(!name) return log("⚠️ Nama file wajib!","error");

    if(!deleteConfirm || editingFile !== name){
      deleteConfirm = true;
      editingFile = name;
      log(`⚠️ Yakin mau hapus file ${name}? Tekan lagi untuk konfirmasi.`,"info");
      return;
    }

    try{
      const fileData=await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}?ref=${defaultBranch}`);
      await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`,"DELETE",{
        message:`Hapus file ${name}`,
        sha:fileData.sha,
        branch: defaultBranch
      });
      log(`✅ File ${name} berhasil dihapus.`,"success");
      deleteConfirm=false;
      editingFile="";
      document.getElementById("loadRepoBtn").click();
    }catch(e){
      log("❌ Error hapus file: "+e.message,"error");
      deleteConfirm=false;
      editingFile="";
    }
  });

  // ===== Toggle Mode =====
  const toggleBtn=document.getElementById("modeToggle");
  toggleBtn.addEventListener("click", ()=>{
    document.body.classList.toggle("light");
    document.body.classList.toggle("dark");
    toggleBtn.textContent=document.body.classList.contains("dark")?"☀️ Mode":"🌙 Mode";
  });
});
