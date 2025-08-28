
document.addEventListener("DOMContentLoaded", () => {
  let token = "";
  let currentRepo = "";
  let editingFile = "";
  let deleteConfirm = false;

  const output = document.getElementById("output");
  const repoSelect = document.getElementById("repoSelect");
  const fileNameInput = document.getElementById("fileNameInput");
  const fileContentInput = document.getElementById("fileContentInput");

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
      Authorization:`token ${token}`,
      Accept:"application/vnd.github.v3+json"
    };
    if(body) headers["Content-Type"]="application/json";

    const res = await fetch(url, {method, headers, body: body?JSON.stringify(body):null});
    if(!res.ok){
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

  // ===== Load Repos =====
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
      const files=await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/`);
      renderRepoContent(files);
    }catch(e){ log("❌ Error load repo: "+e.message,"error"); }
  });

  function renderRepoContent(files){
    const repoDiv=document.getElementById("fileList");
    repoDiv.innerHTML="<ul>"+files.map(f=>`<li>${f.type==="dir"?"📁":"📄"} ${f.name}</li>`).join("")+"</ul>";
  }

  // ===== CRUD Functions =====
  async function createFile(){
    if(!currentRepo) return log("⚠️ Pilih repo dulu!","error");
    const name=fileNameInput.value.trim();
    let content=fileContentInput.value || "# File baru\n";
    if(!name) return log("⚠️ Nama file wajib!","error");
    try{
      const encoded=btoa(unescape(encodeURIComponent(content)));
      await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`,"PUT",{
        message:`Buat file ${name}`,
        content:encoded
      });
      log(`✅ File ${name} berhasil dibuat.`,"success");
      document.getElementById("loadRepoBtn").click();
    }catch(e){ log("❌ Error buat file: "+e.message,"error"); }
  }

  async function editFile(){
    if(!currentRepo) return log("⚠️ Pilih repo dulu!","error");
    const name=fileNameInput.value.trim();
    if(!name) return log("⚠️ Nama file wajib!","error");

    if(editingFile!==name){
      try{
        const fileData=await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`);
        const decoded=atob(fileData.content.replace(/\n/g,''));
        fileContentInput.value=decoded;
        editingFile=name;
        log(`✏️ File ${name} siap diedit. Edit di textarea lalu tekan Edit File lagi.`,"info");
      }catch(e){ log("❌ Error ambil file: "+e.message,"error"); }
    }else{
      try{
        const fileData=await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`);
        const encoded=btoa(unescape(encodeURIComponent(fileContentInput.value || "# File kosong\n")));
        await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`,"PUT",{
          message:`Edit file ${name}`,
          content:encoded,
          sha:fileData.sha
        });
        log(`✅ File ${name} berhasil diedit.`,"success");
        editingFile="";
        document.getElementById("loadRepoBtn").click();
      }catch(e){ log("❌ Error edit file: "+e.message,"error"); }
    }
  }

  async function deleteFile(){
    if(!currentRepo) return log("⚠️ Pilih repo dulu!","error");
    const name=fileNameInput.value.trim();
    if(!name) return log("⚠️ Nama file wajib!","error");

    if(!deleteConfirm || editingFile!==name){
      deleteConfirm=true;
      editingFile=name;
      log(`⚠️ Yakin mau hapus file ${name}? Tekan Hapus File lagi untuk konfirmasi.`,"info");
      return;
    }

    try{
      const fileData=await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`);
      await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`,"DELETE",{
        message:`Hapus file ${name}`,
        sha:fileData.sha
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
  }

  // ===== Upload File =====
  const uploadBtn = document.getElementById("uploadFileBtn");
  const fileInput = document.getElementById("fileUploadInput");

  uploadBtn.addEventListener("click", ()=>{
    if(!currentRepo) return log("⚠️ Pilih repo dulu!","error");
    if(!fileInput.files.length) return log("⚠️ Pilih file dulu!","error");
    const file=fileInput.files[0];
    const reader=new FileReader();
    reader.onload=async (e)=>{
      const content=btoa(unescape(encodeURIComponent(e.target.result)));
      try{
        await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${file.name}`,"PUT",{
          message:`Upload file ${file.name}`,
          content:content
        });
        log(`✅ File ${file.name} berhasil diupload.`,"success");
        document.getElementById("loadRepoBtn").click();
      }catch(err){ log("❌ Error upload file: "+err.message,"error"); }
    };
    reader.readAsText(file);
  });

  // ===== Dropdown runAction =====
  window.runAction = function(){
    const action=document.getElementById("actionMenu").value;
    switch(action){
      case "create": createFile(); break;
      case "edit": editFile(); break;
      case "delete": deleteFile(); break;
      case "upload": fileInput.click(); break;
      default: alert("⚠️ Pilih aksi dulu!");
    }
  }

  // ===== Toggle Dark/Light =====
  const toggleBtn=document.getElementById("modeToggle");
  toggleBtn.addEventListener("click", ()=>{
    document.body.classList.toggle("light");
    document.body.classList.toggle("dark");
    toggleBtn.textContent=document.body.classList.contains("dark")?"☀️ Mode":"🌙 Mode";
  });
});
