// === Variabel global ===
let token = "";
let currentRepo = "";
let currentPath = "";
let renameTarget = null;

// === Helper ===
function log(msg) {
  const out = document.getElementById("output");
  out.innerHTML += `<p>${msg}</p>`;
  out.scrollTop = out.scrollHeight;
}

function setToken() {
  token = document.getElementById("tokenInput").value.trim();
  if (!token) {
    alert("Masukkan token dulu!");
    return;
  }
  localStorage.setItem("gh_token", token);
  log("✅ Token disimpan.");
  loadRepos();
}

function loadRepos() {
  // Dummy: tampilkan beberapa repo contoh
  const repoSelect = document.getElementById("repoSelect");
  repoSelect.innerHTML = `<option value="">-- Pilih Repo --</option>
    <option value="repo1">repo1</option>
    <option value="repo2">repo2</option>
    <option value="repo3">repo3</option>`;
  log("📦 Repo berhasil dimuat.");
}

function loadRepoContent() {
  const repoSelect = document.getElementById("repoSelect");
  currentRepo = repoSelect.value;
  if (!currentRepo) {
    alert("Pilih repo dulu!");
    return;
  }
  log(`📂 Isi repo <b>${currentRepo}</b> dimuat.`);

  const repoContent = document.getElementById("repoContent");
  repoContent.innerHTML = `
    <ul>
      <li>📄 index.html</li>
      <li>📄 style.css</li>
      <li>📂 assets/</li>
    </ul>
  `;
}

// === Repo Actions ===
function runRepoAction() {
  const action = document.getElementById("repoAction").value;
  if (!action) {
    alert("Pilih aksi repo!");
    return;
  }

  if (action === "createRepo") {
    const name = prompt("Masukkan nama repo baru:");
    if (name) log(`✅ Repo <b>${name}</b> berhasil dibuat.`);
  }

  if (action === "renameRepo") {
    const newName = prompt("Masukkan nama baru repo:");
    if (newName) log(`✏️ Repo diganti jadi <b>${newName}</b>.`);
  }

  if (action === "deleteRepo") {
    if (confirm("Yakin hapus repo ini?")) {
      log("🗑️ Repo berhasil dihapus.");
    }
  }
}

// === File/Folder Actions ===
function runAction() {
  const action = document.getElementById("actionMenu").value;
  if (!action) {
    alert("Pilih aksi dulu!");
    return;
  }

  if (action === "create") {
    const name = document.getElementById("fileNameInput").value.trim();
    if (!name) return alert("Isi nama file!");
    log(`✅ File <b>${name}</b> dibuat.`);
  }

  if (action === "edit") {
    const name = document.getElementById("fileNameInput").value.trim();
    if (!name) return alert("Isi nama file!");
    log(`✏️ File <b>${name}</b> diedit.`);
  }

  if (action === "delete") {
    const name = document.getElementById("fileNameInput").value.trim();
    if (!name) return alert("Isi nama file/folder!");
    log(`🗑️ <b>${name}</b> dihapus.`);
  }

  if (action === "createFolder") {
    const name = document.getElementById("fileNameInput").value.trim();
    if (!name) return alert("Isi nama folder!");
    log(`📂 Folder <b>${name}</b> dibuat.`);
  }

  if (action === "uploadFileBtn") {
    log("📤 Upload file diproses...");
  }

  if (action === "rename") {
    renameTarget = document.getElementById("fileNameInput").value.trim();
    if (!renameTarget) return alert("Pilih file/folder dulu!");
    openRenamePopup(renameTarget);
  }

  if (action === "delletRepo") {
    if (confirm("Yakin hapus repo ini?")) {
      log("🗑️ Repo berhasil dihapus (dari menu File).");
    }
  }
}

// === Popup Rename ===
function openRenamePopup(target) {
  document.getElementById("renamePopup").style.display = "flex";
  document.getElementById("newNameInput").value = target;
}

function closeRenamePopup() {
  document.getElementById("renamePopup").style.display = "none";
  renameTarget = null;
}

function confirmRename() {
  const newName = document.getElementById("newNameInput").value.trim();
  if (!newName) {
    alert("Nama baru tidak boleh kosong!");
    return;
  }
  log(`✏️ ${renameTarget} diganti jadi <b>${newName}</b>.`);
  closeRenamePopup();
}

// === Misc ===
function copyCode() {
  const txt = document.getElementById("fileContentInput");
  txt.select();
  document.execCommand("copy");
  log("📋 Konten disalin.");
}

function toggleFullscreen() {
  const box = document.getElementById("codeBox");
  box.classList.toggle("fullscreen");
}

function toggleMode() {
  document.body.classList.toggle("light");
  document.body.classList.toggle("dark");
}

// === Event Listeners ===
document.getElementById("saveTokenBtn").addEventListener("click", setToken);
document.getElementById("loadRepoBtn").addEventListener("click", loadRepoContent);
document.getElementById("runRepoAction").addEventListener("click", runRepoAction);

document.getElementById("renameConfirmBtn").addEventListener("click", confirmRename);
document.getElementById("renameCancelBtn").addEventListener("click", closeRenamePopup);

document.getElementById("modeToggle").addEventListener("click", toggleMode);

// === Init ===
window.onload = () => {
  const saved = localStorage.getItem("gh_token");
  if (saved) {
    token = saved;
    document.getElementById("tokenInput").value = token;
    log("🔑 Token ditemukan dari localStorage.");
    loadRepos();
  }
};
