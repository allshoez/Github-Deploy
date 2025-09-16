let githubToken = "";
let currentRepo = "";

// ===== Helper: Logging =====
function log(msg, type = "info") {
  const logBox = document.getElementById("logBox");
  const div = document.createElement("div");
  div.textContent = msg;
  div.className = type;
  logBox.appendChild(div);
  logBox.scrollTop = logBox.scrollHeight;
}

// ===== Request ke GitHub API =====
async function apiRequest(url, method = "GET", body = null) {
  const headers = {
    Authorization: `token ${githubToken}`,
    Accept: "application/vnd.github.v3+json",
  };
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : null });
  if (!res.ok) {
    let err = await res.text();
    throw new Error(err || res.statusText);
  }
  if (res.status === 204) return {}; // no content
  return await res.json();
}

// ===== Set Token =====
function setToken() {
  const token = document.getElementById("tokenInput").value.trim();
  if (!token) return log("⚠️ Token kosong!", "error");
  githubToken = token;
  log("✅ Token berhasil diset!", "success");
}

// ===== Load Repos =====
async function loadRepos() {
  if (!githubToken) return log("⚠️ Set token dulu!", "error");
  try {
    const repos = await apiRequest("https://api.github.com/user/repos");
    const select = document.getElementById("repoSelect");
    select.innerHTML = '<option value="">-- Pilih Repo --</option>';
    repos.forEach((r) => {
      const opt = document.createElement("option");
      opt.value = r.full_name;
      opt.textContent = r.full_name;
      select.appendChild(opt);
    });
    log("✅ Repo berhasil dimuat", "success");
  } catch (e) {
    log("❌ Error load repos: " + e.message, "error");
  }
}

// ===== Pilih Repo =====
function selectRepo() {
  const val = document.getElementById("repoSelect").value;
  if (!val) return log("⚠️ Pilih repo dulu!", "error");
  currentRepo = val;
  log("📂 Repo aktif: " + currentRepo);
}

// ===== Buat Repo =====
async function createRepo() {
  const name = prompt("Nama repo baru:");
  if (!name) return;
  try {
    await apiRequest("https://api.github.com/user/repos", "POST", { name });
    log("✅ Repo berhasil dibuat: " + name, "success");
    loadRepos();
  } catch (e) {
    log("❌ Error buat repo: " + e.message, "error");
  }
}

// ===== Hapus Repo =====
async function deleteRepo() {
  if (!currentRepo) return log("⚠️ Pilih repo dulu!", "error");
  if (!confirm(`Yakin mau hapus repo ${currentRepo}?`)) return;
  try {
    await apiRequest(`https://api.github.com/repos/${currentRepo}`, "DELETE");
    log("🗑️ Repo berhasil dihapus: " + currentRepo, "success");
    currentRepo = "";
    loadRepos();
  } catch (e) {
    log("❌ Error hapus repo: " + e.message, "error");
  }
}

// ===== Buat File =====
async function createFile() {
  if (!currentRepo) return log("⚠️ Pilih repo dulu!", "error");
  const path = document.getElementById("fileNameInput").value.trim();
  const content = document.getElementById("fileContentInput").value;
  if (!path) return log("⚠️ Nama file kosong!", "error");
  try {
    await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${path}`, "PUT", {
      message: "Buat file " + path,
      content: btoa(unescape(encodeURIComponent(content))),
    });
    log("✅ File berhasil dibuat: " + path, "success");
  } catch (e) {
    log("❌ Error buat file: " + e.message, "error");
  }
}

// ===== Hapus File =====
async function deleteFile() {
  if (!currentRepo) return log("⚠️ Pilih repo dulu!", "error");
  const path = document.getElementById("fileNameInput").value.trim();
  if (!path) return log("⚠️ Nama file kosong!", "error");
  try {
    const file = await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${path}`);
    await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${path}`, "DELETE", {
      message: "Hapus file " + path,
      sha: file.sha,
    });
    log("🗑️ File berhasil dihapus: " + path, "success");
  } catch (e) {
    log("❌ Error hapus file: " + e.message, "error");
  }
}

// ===== Buat Folder =====
async function createFolder() {
  if (!currentRepo) return log("⚠️ Pilih repo dulu!", "error");
  const folder = document.getElementById("fileNameInput").value.trim();
  if (!folder) return log("⚠️ Nama folder kosong!", "error");
  try {
    const dummyFile = folder + "/.gitkeep";
    await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${dummyFile}`, "PUT", {
      message: "Buat folder " + folder,
      content: btoa("folder keep"),
    });
    log("📂 Folder berhasil dibuat: " + folder, "success");
  } catch (e) {
    log("❌ Error buat folder: " + e.message, "error");
  }
}

// ===== Upload File =====
async function uploadFile(file) {
  if (!currentRepo) return log("⚠️ Pilih repo dulu!", "error");
  const reader = new FileReader();
  reader.onload = async () => {
    const content = reader.result.split(",")[1];
    try {
      await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${file.name}`, "PUT", {
        message: "Upload file " + file.name,
        content,
      });
      log("✅ File berhasil diupload: " + file.name, "success");
    } catch (e) {
      log("❌ Error upload file: " + e.message, "error");
    }
  };
  reader.readAsDataURL(file);
}

// ===== Rename File / Folder =====
function showRenamePopup(oldPath) {
  const popup = document.getElementById("renamePopup");
  document.getElementById("oldNameInput").value = oldPath;
  document.getElementById("newNameInput").value = "";
  popup.style.display = "block";
}

async function renameItem(oldPath, newPath) {
  if (!currentRepo) return log("⚠️ Pilih repo dulu!", "error");
  if (!oldPath || !newPath) return log("⚠️ Nama lama/baru kosong!", "error");

  try {
    const file = await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${oldPath}`);
    const content = atob(file.content.replace(/\n/g, ""));
    await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${newPath}`, "PUT", {
      message: `Rename ${oldPath} → ${newPath}`,
      content: btoa(unescape(encodeURIComponent(content))),
    });
    await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${oldPath}`, "DELETE", {
      message: `Hapus ${oldPath} setelah rename`,
      sha: file.sha,
    });
    log(`✏️ ${oldPath} berhasil di-rename jadi ${newPath}`, "success");
    document.getElementById("renamePopup").style.display = "none";
  } catch (e) {
    log("❌ Error rename: " + e.message, "error");
  }
}

// ===== Jalankan Aksi =====
function runAction() {
  const action = document.getElementById("actionMenu").value;
  switch (action) {
    case "create":
      createFile();
      break;
    case "delete":
      deleteFile();
      break;
    case "createFolder":
      createFolder();
      break;
    case "uploadFileBtn":
      document.getElementById("fileUploadInput").click();
      break;
    case "rename":
      const oldPath = document.getElementById("fileNameInput").value.trim();
      if (!oldPath) return log("⚠️ Masukkan nama file/folder dulu!", "error");
      showRenamePopup(oldPath);
      break;
    case "delletRepo":
      deleteRepo();
      break;
    default:
      log("⚠️ Pilih aksi dulu!", "error");
  }
}

// ===== Event Binding =====
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("setTokenBtn").onclick = setToken;
  document.getElementById("loadRepoBtn").onclick = loadRepos;
  document.getElementById("repoSelect").onchange = selectRepo;
  document.getElementById("createRepo").onclick = createRepo;

  document.getElementById("fileUploadInput").addEventListener("change", (e) => {
    if (e.target.files.length > 0) uploadFile(e.target.files[0]);
  });

  document.getElementById("renameConfirm").onclick = () => {
    const oldPath = document.getElementById("oldNameInput").value.trim();
    const newPath = document.getElementById("newNameInput").value.trim();
    renameItem(oldPath, newPath);
  };
  document.getElementById("renameCancel").onclick = () => {
    document.getElementById("renamePopup").style.display = "none";
  };
});
