document.addEventListener("DOMContentLoaded", () => {

  let token = "", currentRepo = "", editingFile = "", deleteConfirm = false;

  const output = document.getElementById("output");
  const repoSelect = document.getElementById("repoSelect");
  const fileNameInput = document.getElementById("fileNameInput");
  const fileContentInput = document.getElementById("fileContentInput");
  const renamePopup = document.getElementById("renamePopup");
  const newNameInput = document.getElementById("newNameInput");

// ===== LOG =====
  function log(msg, type = "info") {
    const p = document.createElement("p");
    p.textContent = msg;
    p.style.color = (type === "success") ? "#0f0" : (type === "error") ? "#f33" : "#0af";
    output.appendChild(p);
    output.scrollTop = output.scrollHeight;
  }

// ===== API =====
  async function apiRequest(url, method = "GET", body = null) {
    const headers = { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" };
    if (body) headers["Content-Type"] = "application/json";
    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : null });
    if (res.status === 204) return {};
    try { return await res.json(); } catch { return {}; }
  }

// ===== TOKEN =====
  document.getElementById("saveTokenBtn").addEventListener("click", () => {
    token = document.getElementById("tokenInput").value.trim();
    if (token) { log("✅ Token disimpan!", "success"); localStorage.setItem("gh_token", token); loadRepos(); }
    else log("⚠️ Masukkan token!", "error");
  });

// ===== LOAD REPOS =====
  async function loadRepos() {
    try {
      log("🔄 Memuat daftar repository...", "info");
      const repos = await apiRequest("https://api.github.com/user/repos");
      repoSelect.innerHTML = '<option value="">-- Pilih Repo --</option>';
      repos.forEach(r => {
        const opt = document.createElement("option");
        opt.value = r.full_name;
        opt.textContent = r.name;
        repoSelect.appendChild(opt);
      });
      log("✅ Repo berhasil dimuat.", "success");
    } catch (e) { log("❌ Gagal load repo: " + e.message, "error"); }
  }

  document.getElementById("loadRepoBtn").addEventListener("click", async () => {
    currentRepo = repoSelect.value;
    if (!currentRepo) return log("⚠️ Pilih repo dulu!", "error");
    try {
      log(`📂 Memuat isi repo: ${currentRepo} ...`, "info");
      const files = await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/`);
      renderRepoContent(files);
    } catch (e) { log("❌ Error load repo: " + e.message, "error"); }
  });

  function renderRepoContent(files) {
    const repoDiv = document.getElementById("fileList");
    repoDiv.innerHTML = "<ul>" + files.map(f => `<li onclick="fileNameInput.value='${f.name}'">${f.type==='dir'?'📁':'📄'} ${f.name}</li>`).join("") + "</ul>";
  }

// ===== CRUD REPO =====
  async function createRepo() { const name=fileNameInput.value.trim(); if(!name) return log("⚠️ Masukkan nama repo baru!", "error"); try{const res=await apiRequest("https://api.github.com/user/repos","POST",{name}); if(res.id){log(`✅ Repo ${name} berhasil dibuat!`,"success"); fileNameInput.value=""; loadRepos();} else log("❌ Gagal buat repo","error");} catch(e){log("❌ Error buat repo: "+e.message,"error");} }

  async function renameRepo() { const oldName=fileNameInput.value.trim(); const newName=newNameInput.value.trim(); if(!oldName||!newName) return log("⚠️ Masukkan nama lama & baru","error"); try{await apiRequest(`https://api.github.com/repos/${oldName}`,"PATCH",{name:newName}); log(`✅ Repo ${oldName} berhasil di rename menjadi ${newName}`,"success"); fileNameInput.value=newName; newNameInput.value=""; loadRepos(); } catch(e){log("❌ Error rename repo: "+e.message,"error");} }

  async function deleteRepo() { const name=fileNameInput.value.trim(); if(!name) return log("⚠️ Masukkan nama repo yang mau dihapus","error"); if(!deleteConfirm){deleteConfirm=true; log("⚠️ Tekan tombol Hapus Repo lagi untuk konfirmasi","info"); return;} try{await apiRequest(`https://api.github.com/repos/${name}`,"DELETE"); log(`✅ Repo ${name} berhasil dihapus`,"success"); fileNameInput.value=""; deleteConfirm=false; loadRepos(); } catch(e){log("❌ Error hapus repo: "+e.message,"error"); deleteConfirm=false;} }

// ===== CRUD FILE/FOLDER =====
  async function createFile(){ if(!currentRepo) return log("⚠️ Pilih repo dulu!","error"); const name=fileNameInput.value.trim(); if(!name) return log("⚠️ Nama file wajib!","error"); const content=fileContentInput.value||"# File baru\n"; try{const encoded=btoa(unescape(encodeURIComponent(content))); await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`,"PUT",{message:`Buat file ${name}`,content:encoded}); log(`✅ File ${name} berhasil dibuat.`,"success"); fileContentInput.value=""; document.getElementById("loadRepoBtn").click(); } catch(e){log("❌ Error buat file: "+e.message,"error");} }

  async function editFile(){ if(!currentRepo) return log("⚠️ Pilih repo dulu!","error"); const name=fileNameInput.value.trim(); if(!name) return log("⚠️ Nama file wajib!","error"); if(editingFile!==name){ try{const fileData=await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`); fileContentInput.value=decodeURIComponent(escape(atob(fileData.content.replace(/\n/g,"")))); editingFile=name; log(`✏️ File ${name} siap diedit. Tekan Edit File lagi untuk menyimpan.`,"info"); } catch(e){log("❌ Error ambil file: "+e.message,"error");} } else { try{const fileData=await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`); const encoded=btoa(unescape(encodeURIComponent(fileContentInput.value||"# File kosong\n"))); await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`,"PUT",{message:`Edit file ${name}`,content:encoded,sha:fileData.sha}); log(`✅ File ${name} berhasil diedit.`,"success"); editingFile=""; fileContentInput.value=""; document.getElementById("loadRepoBtn").click(); } catch(e){log("❌ Error edit file: "+e.message,"error");} } }

  async function deleteFile(){ if(!currentRepo) return log("⚠️ Pilih repo dulu!","error"); const name=fileNameInput.value.trim(); if(!name) return log("⚠️ Nama file wajib!","error"); if(!deleteConfirm||editingFile!==name){deleteConfirm=true; editingFile=name; log("⚠️ Tekan Hapus File lagi untuk konfirmasi.","info"); return;} try{const fileData=await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`); await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`,"DELETE",{message:`Hapus file ${name}`,sha:fileData.sha}); log(`✅ File ${name} berhasil dihapus.`,"success"); deleteConfirm=false; editingFile=""; fileContentInput.value=""; document.getElementById("loadRepoBtn").click();} catch(e){log("❌ Error hapus file: "+e.message,"error"); deleteConfirm=false;} }

  async function createFolder(){ if(!currentRepo) return log("⚠️ Pilih repo dulu!","error"); const name=fileNameInput.value.trim(); if(!name) return log("⚠️ Nama folder wajib!","error"); try{const encoded=btoa(unescape(encodeURIComponent("# Folder kosong"))); await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}/.gitkeep`,"PUT",{message:`Buat folder ${name}`,content:encoded}); log(`✅ Folder ${name} berhasil dibuat.`,"success"); document.getElementById("loadRepoBtn").click();} catch(e){log("❌ Error buat folder: "+e.message,"error");} }

  async function openFolder(){ if(!currentRepo) return log("⚠️ Pilih repo dulu!","error"); const folder=fileNameInput.value.trim(); if(!folder) return log("⚠️ Masukkan nama folder!", "error"); try{log(`📂 Membuka folder: ${folder} ...`,"info"); const files=await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${folder}`); if(!files||files.length===0) log("⚠️ Folder kosong atau tidak ditemukan","info"); else{ log(`📂 Isi folder "${folder}":`,"info"); const repoDiv=document.getElementById("fileList"); repoDiv.innerHTML="<ul>"+files.map(f=>`<li onclick="fileNameInput.value='${f.name}'">${f.type==='dir'?'📁':'📄'} ${f.name}</li>`).join("")+"</ul>"; } } catch(e){log("❌ Error buka folder: "+e.message,"error");} }

  async function uploadFile(){ if(!currentRepo) return log("⚠️ Pilih repo dulu!","error"); const fileInput=document.createElement("input"); fileInput.type="file"; fileInput.accept="*/*"; fileInput.onchange=async (e)=>{const file=e.target.files[0]; if(!file) return; const reader=new FileReader(); reader.onload=async ()=>{const content=reader.result.split(",")[1]; try{await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${file.name}`,"PUT",{message:`Upload file ${file.name}`,content}); log(`✅ File ${file.name} berhasil diupload.`,"success"); showNotification("Sukses Upload Berkas ✔️"); document.getElementById("loadRepoBtn").click();}catch(err){log("❌ Error upload file: "+err.message,"error");}}; reader.readAsDataURL(file);}; fileInput.click(); }

  async function downloadFile(){ if(!currentRepo) return log("⚠️ Pilih repo dulu!","error"); const name=fileNameInput.value.trim(); if(!name) return log("⚠️ Pilih file yang mau di-download","error"); try{const fileData=await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`); const content=atob(fileData.content.replace(/\n/g,"")); const blob=new Blob([content],{type:"text/plain"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); document.body.removeChild(a); log(`✅ File ${name} berhasil didownload`,"success"); showNotification("Sukses Download Berkas ✔️");} catch(e){log("❌ Error download file: "+e.message,"error");} }

  function showNotification(msg){const notif=document.createElement("div"); notif.className="popup-notif"; notif.textContent=msg; document.body.appendChild(notif); setTimeout(()=>notif.classList.add("show"),10); setTimeout(()=>{notif.classList.remove("show"); setTimeout(()=>document.body.removeChild(notif),500);},2500); }

  async function renameItem(oldName,newName){if(!currentRepo)return log("❌ Pilih repo dulu","error"); try{const fileData=await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${oldName}`); const encoded=btoa(unescape(encodeURIComponent(fileContentInput.value||"# Kosong\n"))); await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${newName}`,"PUT",{message:`Rename ${oldName} → ${newName}`,content:encoded,sha:fileData.sha}); await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${oldName}`,"DELETE",{message:`Hapus ${oldName}`,sha:fileData.sha}); log(`✅ ${oldName} berhasil di rename menjadi ${newName}`,"success"); fileNameInput.value=newName; loadRepos();} catch(e){log("❌ Error rename: "+e.message,"error");}

// ===== ACTION DROPDOWN =====
  document.getElementById("runActionBtn").addEventListener("click",()=>{
    const action=document.getElementById("actionMenu").value.trim();
    switch(action){
      case "createRepo": createRepo(); break;
      case "renameRepo": if(!fileNameInput.value.trim()){log("⚠️ Masukkan nama repo lama","error"); return;} newNameInput.value=fileNameInput.value.trim(); renamePopup.style.display="flex"; break;
      case "deleteRepo": deleteRepo(); break;
      case "createFile": createFile(); break;
      case "editFile": editFile(); break;
      case "deleteFile": deleteFile(); break;
      case "createFolder": createFolder(); break;
      case "renameItem": if(!fileNameInput.value.trim()){log("⚠️ Pilih file/folder dulu!","error"); return;} newNameInput.value=fileNameInput.value.trim(); renamePopup.style.display="flex"; break;
      case "uploadFile": uploadFile(); break;
      case "downloadFile": downloadFile(); break;
      case "openFolder": openFolder(); break;
      default: alert("⚠️ Pilih aksi dulu!");
    }
  });

// ===== COPY & FULLSCREEN =====
  document.getElementById("copyBtn").addEventListener("click",()=>{fileContentInput.select(); document.execCommand("copy"); alert("✅ Isi berhasil disalin!");});
  document.getElementById("fullscreenBtn").addEventListener("click",()=>{document.getElementById("codeBox").classList.toggle("fullscreen");});

// ===== DARK/LIGHT MODE =====
  const toggleBtn=document.getElementById("modeToggle");
  toggleBtn.addEventListener("click",()=>{document.body.classList.toggle("light"); document.body.classList.toggle("dark"); toggleBtn.textContent=document.body.classList.contains("dark")?"🌞 Mode":"🌙 Mode";});

// ===== POPUP RENAME =====
  document.getElementById("renameConfirmBtn").addEventListener("click",async ()=>{
    const oldName=fileNameInput.value.trim();
    const newName=newNameInput.value.trim();
    if(document.getElementById("actionMenu").value==="renameRepo") await renameRepo();
    else await renameItem(oldName,newName);
    renamePopup.style.display="none";
  });

  document.getElementById("renameCancelBtn").addEventListener("click",()=>{renamePopup.style.display="none";});

});