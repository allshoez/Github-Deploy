
let deleteConfirm = false; // flag konfirmasi hapus
let editingFile = "";      // file yang sedang dihapus/edit

// ===== Load Branch ketika load repo =====
async function loadBranches() {
  if(!currentRepo) return;
  try {
    const branches = await apiRequest(`https://api.github.com/repos/${currentRepo}/branches`);
    const branchSelect = document.getElementById("branchSelect");
    branchSelect.innerHTML = '<option value="">-- Pilih Branch --</option>';
    branches.forEach(b=>{
      const opt = document.createElement("option");
      opt.value = b.name;
      opt.textContent = b.name;
      branchSelect.appendChild(opt);
    });
    log("✅ Branch berhasil dimuat.","success");
  } catch(e) {
    log("❌ Gagal load branch: " + e.message,"error");
  }
}

// panggil setelah pilih repo
document.getElementById("loadRepoBtn").addEventListener("click", async ()=>{
  currentRepo = repoSelect.value;
  if(!currentRepo) return log("⚠️ Pilih repo dulu!","error");
  await loadBranches(); // load branch otomatis
  // ... load repo content seperti biasa
});

// ===== Hapus File dengan konfirmasi dan branch =====
document.getElementById("deleteFileBtn").addEventListener("click", async ()=>{
  const branch = document.getElementById("branchSelect").value || undefined; // kalau kosong pakai default
  if(!currentRepo) return log("⚠️ Pilih repo dulu!","error");
  const name = fileNameInput.value.trim();
  if(!name) return log("⚠️ Nama file wajib!","error");

  if(!deleteConfirm || editingFile!==name){
    deleteConfirm=true;
    editingFile=name;
    log(`⚠️ Yakin mau hapus file ${name} di branch ${branch || "default"}? Tekan Hapus File lagi untuk konfirmasi.`,"info");
    return;
  }

  try{
    const fileData = await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}${branch?`?ref=${branch}`:""}`);
    await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}${branch?`?ref=${branch}`:""}`, "DELETE", {
      message: `Hapus file ${name}`,
      sha: fileData.sha,
      branch: branch
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
