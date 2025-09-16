
document.addEventListener("DOMContentLoaded",()=>{
let token="",currentRepo="",editingFile="",deleteConfirm=false;

const output=document.getElementById("output");
const repoSelect=document.getElementById("repoSelect");
const fileNameInput=document.getElementById("fileNameInput");
const fileContentInput=document.getElementById("fileContentInput");
const renamePopup=document.getElementById("renamePopup");
const newNameInput=document.getElementById("newNameInput");

// ===== LOG =====
function log(msg,type="info"){
  const p=document.createElement("p");
  p.textContent=msg;
  p.style.color=(type==="success")?"#0f0":(type==="error")?"#f33":"#0af";
  output.appendChild(p); output.scrollTop=output.scrollHeight;
}

// ===== API =====
async function apiRequest(url,method="GET",body=null){
  const headers={Authorization:`token ${token}`,Accept:"application/vnd.github.v3+json"};
  if(body) headers["Content-Type"]="application/json";
  const res=await fetch(url,{method,headers,body:body?JSON.stringify(body):null});

  if(res.status===204) return {}; // no content
  try{
    return await res.json();
  }catch{
    return {};
  }
}

// ===== TOKEN =====
document.getElementById("saveTokenBtn").addEventListener("click",()=>{
  token=document.getElementById("tokenInput").value.trim();
  if(token){log("✅ Token disimpan!","success");loadRepos();}
  else log("⚠️ Masukkan token!","error");
});

// ===== LOAD REPOS =====
async function loadRepos(){
  try{
    log("🔄 Memuat daftar repository...","info");
    const repos=await apiRequest("https://api.github.com/user/repos");
    console.log("Repos response:",repos); // Debug
    repoSelect.innerHTML='<option value="">-- Pilih Repo --</option>';
    repos.forEach(r=>{
      const opt=document.createElement("option");
      opt.value=r.full_name;
      opt.textContent=r.full_name;
      repoSelect.appendChild(opt);
    });
    log("✅ Repo berhasil dimuat.","success");
  }catch(e){log("❌ Gagal load repo: "+e.message,"error");}
}

// ===== LOAD REPO CONTENT =====
document.getElementById("loadRepoBtn").addEventListener("click",async()=>{
  currentRepo=repoSelect.value;
  if(!currentRepo)return log("⚠️ Pilih repo dulu!","error");
  try{
    log(`📂 Memuat isi repo: ${currentRepo} ...`,"info");
    const files=await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/`);
    renderRepoContent(files);
  }catch(e){log("❌ Error load repo: "+e.message,"error");}
});

function renderRepoContent(files){
  const repoDiv=document.getElementById("fileList");
  repoDiv.innerHTML="<ul>"+files.map(f=>`<li onclick="fileNameInput.value='${f.name}'">${f.type==='dir'?'📁':'📄'} ${f.name}</li>`).join("")+"</ul>";
}

// ===== CRUD + Upload + Folder + Rename + Delete Repo =====
async function createFile(){if(!currentRepo)return log("⚠️ Pilih repo dulu!","error");const name=fileNameInput.value.trim();const content=fileContentInput.value||"# File baru\n";if(!name)return log("⚠️ Nama file wajib!","error");try{const encoded=btoa(unescape(encodeURIComponent(content)));await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`,"PUT",{message:`Buat file ${name}`,content:encoded});log(`✅ File ${name} berhasil dibuat.`,"success");fileContentInput.value="";document.getElementById("loadRepoBtn").click();}catch(e){log("❌ Error buat file: "+e.message,"error");}}
async function editFile(){if(!currentRepo)return log("⚠️ Pilih repo dulu!","error");const name=fileNameInput.value.trim();if(!name)return log("⚠️ Nama file wajib!","error");if(editingFile!==name){try{const fileData=await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`);fileContentInput.value=decodeURIComponent(escape(atob(fileData.content.replace(/\n/g,""))));editingFile=name;log(`✏️ File ${name} siap diedit. Tekan Edit File lagi untuk menyimpan.`,"info");}catch(e){log("❌ Error ambil file: "+e.message,"error");}}else{try{const fileData=await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`);const encoded=btoa(unescape(encodeURIComponent(fileContentInput.value||"# File kosong\n")));await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`,"PUT",{message:`Edit file ${name}`,content:encoded,sha:fileData.sha});log(`✅ File ${name} berhasil diedit.`,"success");editingFile="";fileContentInput.value="";document.getElementById("loadRepoBtn").click();}catch(e){log("❌ Error edit file: "+e.message,"error");}}}
async function deleteFile(){if(!currentRepo)return log("⚠️ Pilih repo dulu!","error");const name=fileNameInput.value.trim();if(!name)return log("⚠️ Nama file wajib!","error");if(!deleteConfirm||editingFile!==name){deleteConfirm=true;editingFile=name;log("⚠️ Tekan Hapus File lagi untuk konfirmasi.","info");return;}try{const fileData=await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`);await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`,"DELETE",{message:`Hapus file ${name}`,sha:fileData.sha});log(`✅ File ${name} berhasil dihapus.`,"success");deleteConfirm=false;editingFile="";fileContentInput.value="";document.getElementById("loadRepoBtn").click();}catch(e){log("❌ Error hapus file: "+e.message,"error");deleteConfirm=false;editingFile="";}}
async function createFolder(){if(!currentRepo)return log("⚠️ Pilih repo dulu!","error");const name=fileNameInput.value.trim();if(!name)return log("⚠️ Nama folder wajib!","error");try{const encoded=btoa(unescape(encodeURIComponent("# Folder kosong")));await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}/.gitkeep`,"PUT",{message:`Buat folder ${name}`,content:encoded});log(`✅ Folder ${name} berhasil dibuat.`,"success");document.getElementById("loadRepoBtn").click();}catch(e){log("❌ Error buat folder: "+e.message,"error");}}
async function uploadFile(){if(!currentRepo)return log("⚠️ Pilih repo dulu!","error");const fileInput=document.createElement("input");fileInput.type="file";fileInput.accept="*/*";fileInput.onchange=async(e)=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=async()=>{const content=reader.result.split(",")[1];try{await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${file.name}`,"PUT",{message:`Upload file ${file.name}`,content:content});log(`✅ File ${file.name} berhasil diupload.`,"success");document.getElementById("loadRepoBtn").click();}catch(err){log("❌ Error upload file: "+err.message,"error");}};reader.readAsDataURL(file);};fileInput.click();}
async function deleteRepo(){if(!currentRepo) return log("⚠️ Pilih repo dulu!","error");if(!deleteConfirm){deleteConfirm=true;log(`⚠️ Tekan Hapus Repo lagi untuk konfirmasi.`,"info");return;}try{await apiRequest(`https://api.github.com/repos/${currentRepo}`,"DELETE");log(`✅ Repo ${currentRepo} berhasil dihapus.`,"success");deleteConfirm=false;currentRepo="";repoSelect.value="";document.getElementById("loadRepoBtn").click();}catch(e){log("❌ Error hapus repo: "+e.message,"error");deleteConfirm=false;}}
async function renameItem(){if(!currentRepo) return log("⚠️ Pilih repo dulu!","error");const oldName=fileNameInput.value.trim();const newName=newNameInput.value.trim();if(!oldName||!newName)return log("⚠️ Nama lama dan baru wajib!","error");try{const fileData=await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${oldName}`);const encoded=btoa(unescape(encodeURIComponent(fileContentInput.value||"# Kosong\n")));await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${newName}`,"PUT",{message:`Rename ${oldName} -> ${newName}`,content:encoded,sha:fileData.sha});await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${oldName}`,"DELETE",{message:`Hapus ${oldName}`,sha:fileData.sha});log(`✅ ${oldName} berhasil di rename menjadi ${newName}`,"success");renamePopup.style.display="none";fileNameInput.value=newName;document.getElementById("loadRepoBtn").click();}catch(e){log("❌ Error rename: "+e.message,"error");renamePopup.style.display="none";}}

// ===== ACTION DROPDOWN =====
window.runAction=function(){
  const action=document.getElementById("actionMenu").value;
  switch(action){
    case "create": createFile(); break;
    case "edit": editFile(); break;
    case "delete": deleteFile(); break;
    case "uploadFileBtn": uploadFile(); break;
    case "createFolder": createFolder(); break;
    case "rename": 
      if(!fileNameInput.value.trim()){log("⚠️ Pilih file/folder dulu!","error");return;}
      newNameInput.value=fileNameInput.value.trim();
      renamePopup.style.display="flex"; 
      break;
    case "delletRepo": deleteRepo(); break;
    default: alert("⚠️ Pilih aksi dulu!");
  }
};

// ===== COPY & FULLSCREEN =====
window.copyCode=function(){fileContentInput.select();document.execCommand("copy");alert("✅ Isi berhasil disalin!");};
window.toggleFullscreen=function(){document.getElementById("codeBox").classList.toggle("fullscreen");};

// ===== DARK/LIGHT MODE =====
const toggleBtn=document.getElementById("modeToggle");
toggleBtn.addEventListener("click",()=>{
  document.body.classList.toggle("light");
  document.body.classList.toggle("dark");
  toggleBtn.textContent=document.body.classList.contains("dark")?"🌞 Mode":"🌙 Mode";
});

// ===== POPUP RENAME =====
document.getElementById("renameConfirmBtn").addEventListener("click",renameItem);
document.getElementById("renameCancelBtn").addEventListener("click",()=>{renamePopup.style.display="none";});

});

// --- Popup Rename ---
function showRenamePopup(oldPath) {
  document.getElementById("renamePopup").style.display = "flex";
  document.getElementById("newNameInput").value = oldPath.split("/").pop(); // isi default nama lama

  document.getElementById("renameConfirmBtn").onclick = async () => {
    const newName = document.getElementById("newNameInput").value.trim();
    if (!newName) {
      log("❌ Nama baru tidak boleh kosong");
      return;
    }
    await renameItem(oldPath, newName);
    document.getElementById("renamePopup").style.display = "none";
  };

  document.getElementById("renameCancelBtn").onclick = () => {
    document.getElementById("renamePopup").style.display = "none";
  };
}

// fungsi rename file/folder
async function renameItem(oldPath, newName) {
  const repo = document.getElementById("repoSelect").value;
  if (!repo) return log("❌ Pilih repo dulu");
  const token = localStorage.getItem("gh_token");
  if (!token) return log("❌ Token belum diset");

  const newPath = oldPath.split("/").slice(0, -1).concat(newName).join("/");
  log(`🔄 Rename ${oldPath} → ${newPath} ...`);

  try {
    // ambil file lama
    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${oldPath}`, {
      headers: { Authorization: `token ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Gagal ambil file lama");

    // buat file baru di path baru
    const create = await fetch(`https://api.github.com/repos/${repo}/contents/${newPath}`, {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Rename ${oldPath} → ${newPath}`,
        content: data.content,
        sha: undefined
      })
    });
    if (!create.ok) throw new Error("Gagal buat file baru");

    // hapus file lama
    await fetch(`https://api.github.com/repos/${repo}/contents/${oldPath}`, {
      method: "DELETE",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Remove old file ${oldPath}`,
        sha: data.sha
      })
    });

    log(`✅ Berhasil rename ${oldPath} → ${newPath}`);
    loadRepo();
  } catch (e) {
    log("❌ Error rename: " + e.message);
  }
}
