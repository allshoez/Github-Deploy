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
    if(res.status===204) return {};
    try{ return await res.json(); }catch{ return {}; }
  }

  // ===== TOKEN =====
  document.getElementById("saveTokenBtn").addEventListener("click",()=>{
    token=document.getElementById("tokenInput").value.trim();
    if(token){ 
      localStorage.setItem("gh_token",token);
      log("✅ Token disimpan!","success");
      loadRepos();
    }
    else log("⚠️ Masukkan token!","error");
  });

  // ===== LOAD REPOS =====
  async function loadRepos(){
    try{
      log("🔄 Memuat daftar repository...","info");
      const repos=await apiRequest("https://api.github.com/user/repos");
      repoSelect.innerHTML='<option value="">-- Pilih Repo --</option>';
      repos.forEach(r=>{
        const opt=document.createElement("option");
        opt.value=r.full_name;
        opt.textContent=r.full_name;
        repoSelect.appendChild(opt);
      });
      log(`✅ ${repos.length} repo berhasil dimuat.`,"success");
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
  async function createFile(){
    if(!currentRepo)return log("⚠️ Pilih repo dulu!","error");
    const name=fileNameInput.value.trim();
    const content=fileContentInput.value||"# File baru\n";
    if(!name)return log("⚠️ Nama file wajib!","error");
    try{
      const encoded=btoa(unescape(encodeURIComponent(content)));
      await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`,"PUT",{message:`Buat file ${name}`,content:encoded});
      log(`✅ File ${name} berhasil dibuat.`,"success");
      fileContentInput.value="";
      document.getElementById("loadRepoBtn").click();
    }catch(e){log("❌ Error buat file: "+e.message,"error");}
  }

  async function editFile(){
    if(!currentRepo)return log("⚠️ Pilih repo dulu!","error");
    const name=fileNameInput.value.trim();
    if(!name)return log("⚠️ Nama file wajib!","error");

    // jika baru klik, load content
    if(editingFile!==name){
      try{
        const fileData=await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`);
        fileContentInput.value=decodeURIComponent(escape(atob(fileData.content.replace(/\n/g,""))));
        editingFile=name;
        log(`✏️ File ${name} siap diedit. Tekan Edit File lagi untuk menyimpan.`,"info");
      }catch(e){log("❌ Error ambil file: "+e.message,"error");}
    } else {
      try{
        const fileData=await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`);
        const encoded=btoa(unescape(encodeURIComponent(fileContentInput.value||"# File kosong\n")));
        await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`,"PUT",{message:`Edit file ${name}`,content:encoded,sha:fileData.sha});
        log(`✅ File ${name} berhasil diedit.`,"success");
        editingFile="";
        fileContentInput.value="";
        document.getElementById("loadRepoBtn").click();
      }catch(e){log("❌ Error edit file: "+e.message,"error");}
    }
  }

  async function deleteFile(){
    if(!currentRepo)return log("⚠️ Pilih repo dulu!","error");
    const name=fileNameInput.value.trim();
    if(!name)return log("⚠️ Nama file wajib!","error");
    if(!deleteConfirm||editingFile!==name){deleteConfirm=true;editingFile=name;log("⚠️ Tekan Hapus File lagi untuk konfirmasi.","info");return;}
    try{
      const fileData=await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`);
      await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`,"DELETE",{message:`Hapus file ${name}`,sha:fileData.sha});
      log(`✅ File ${name} berhasil dihapus.`,"success");
      deleteConfirm=false; editingFile=""; fileContentInput.value="";
      document.getElementById("loadRepoBtn").click();
    }catch(e){log("❌ Error hapus file: "+e.message,"error"); deleteConfirm=false; editingFile="";}
  }

  async function createFolder(){
    if(!currentRepo)return log("⚠️ Pilih repo dulu!","error");
    const name=fileNameInput.value.trim();
    if(!name)return log("⚠️ Nama folder wajib!","error");
    try{
      const encoded=btoa(unescape(encodeURIComponent("# Folder kosong")));
      await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}/.gitkeep`,"PUT",{message:`Buat folder ${name}`,content:encoded});
      log(`✅ Folder ${name} berhasil dibuat.`,"success");
      document.getElementById("loadRepoBtn").click();
    }catch(e){log("❌ Error buat folder: "+e.message,"error");}
  }

  async function uploadFile(){
    if(!currentRepo)return log("⚠️ Pilih repo dulu!","error");
    const fileInput=document.createElement("input");
    fileInput.type="file"; fileInput.accept="*/*";
    fileInput.onchange=async(e)=>{
      const file=e.target.files[0]; if(!file) return;
      const reader=new FileReader();
      reader.onload=async()=>{
        const content=reader.result.split(",")[1];
        try{
          await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${file.name}`,"PUT",{message:`Upload file ${file.name}`,content:content});
          log(`✅ File ${file.name} berhasil diupload.`,"success");
          document.getElementById("loadRepoBtn").click();
        }catch(err){log("❌ Error upload file: "+err.message,"error");}
      };
      reader.readAsDataURL(file);
    };
    fileInput.click();
  }

  async function downloadFile(name){
    if(!currentRepo) return log("⚠️ Pilih repo dulu!","error");
    if(!name) name=fileNameInput.value.trim();
    if(!name) return log("⚠️ Pilih file untuk download","error");
    try{
      const fileData=await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`);
      const blob=new Blob([Uint8Array.from(atob(fileData.content.replace(/\n/g,"")),c=>c.charCodeAt(0))]);
      const a=document.createElement("a");
      a.href=URL.createObjectURL(blob);
      a.download=name;
      a.click();
      log(`✅ File ${name} berhasil didownload.`,"success");
    }catch(e){log("❌ Error download file: "+e.message,"error");}
  }

  async function deleteRepo(){
    if(!currentRepo) return log("⚠️ Pilih repo dulu!","error");
    if(!deleteConfirm){deleteConfirm=true; log(`⚠️ Tekan Hapus Repo lagi untuk konfirmasi.`,"info"); return;}
    try{
      await apiRequest(`https://api.github.com/repos/${currentRepo}`,"DELETE");
      log(`✅ Repo ${currentRepo} berhasil dihapus.`,"success");
      deleteConfirm=false; currentRepo=""; repoSelect.value="";
      loadRepos();
    }catch(e){log("❌ Error hapus repo: "+e.message,"error"); deleteConfirm=false;}
  }

  async function renameItem(oldPath, newName){
    if(!currentRepo) return log("⚠️ Pilih repo dulu!","error");
    try{
      const fileData=await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${oldPath}`);
      const encoded=btoa(unescape(encodeURIComponent(fileContentInput.value||"# Kosong\n")));
      // buat baru
      await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${newName}`,"PUT",{message:`Rename ${oldPath} → ${newName}`,content:encoded,sha:fileData.sha});
      // hapus lama
      await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${oldPath}`,"DELETE",{message:`Hapus ${oldPath}`,sha:fileData.sha});
      log(`✅ ${oldPath} berhasil di rename menjadi ${newName}`,"success");
      renamePopup.style.display="none"; fileNameInput.value=newName;
      document.getElementById("loadRepoBtn").click();
    }catch(e){log("❌ Error rename: "+e.message,"error"); renamePopup.style.display="none";}
  }

  // ===== ACTION DROPDOWN =====
  document.getElementById("runActionBtn").addEventListener("click",()=>{
    const action=document.getElementById("actionMenu").value;
    switch(action){
      case "createRepo": createRepo(); break;
      case "renameRepo": renameRepo(); break;
      case "deleteRepo": deleteRepo(); break;
      case "createFile": createFile(); break;
      case "editFile": editFile(); break;
      case "deleteFile": deleteFile(); break;
      case "createFolder": createFolder(); break;
      case "uploadFile": uploadFile(); break;
      case "downloadFile": downloadFile(); break;
      case "renameItem": 
        if(!fileNameInput.value.trim()){log("⚠️ Pilih file/folder dulu!","error"); return;}
        newNameInput.value=fileNameInput.value.trim();
        renamePopup.style.display="flex"; 
        break;
      default: alert("⚠️ Pilih aksi dulu!");
    }
  });

  // ===== COPY & FULLSCREEN =====
  document.getElementById("copyBtn").addEventListener("click",()=>{
    fileContentInput.select();
    document.execCommand("copy");
    log("✅ Isi berhasil disalin.","success");
  });

  document.getElementById("fullscreenBtn").addEventListener("click",()=>{
    document.getElementById("codeBox").classList.toggle("fullscreen");
  });

  // ===== DARK/LIGHT MODE =====
  const toggleBtn=document.getElementById("modeToggle");
  toggleBtn.addEventListener("click",()=>{
    document.body.classList.toggle("light");
    document.body.classList.toggle("dark");
    toggleBtn.textContent=document.body.classList.contains("dark")?"🌞 Mode":"🌙 Mode";
  });

  // ===== POPUP RENAME =====
  document.getElementById("renameConfirmBtn").addEventListener("click",()=>{
    const oldName=fileNameInput.value.trim();
    const newName=newNameInput.value.trim();
    if(!oldName || !newName){ log("⚠️ Nama lama dan baru wajib!","error"); return; }
    renameItem(oldName,newName);
  });

  document.getElementById("renameCancelBtn").addEventListener("click",()=>{
    renamePopup.style.display="none";
  });

  // ===== INIT =====
  if(localStorage.getItem("gh_token")){
    token=localStorage.getItem("gh_token");
    document.getElementById("tokenInput").value=token;
    loadRepos();
  }

});
