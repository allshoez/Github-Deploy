// === GLOBAL STATE ===
let token = localStorage.getItem("githubToken") || "";
let currentRepo = "";
let currentPath = "";
let shaCache = {};
let renameTarget = null;

// === DOM ELEMENTS ===
const output = document.getElementById("output");
const tokenInput = document.getElementById("tokenInput");
const repoSelect = document.getElementById("repoSelect");
const fileNameInput = document.getElementById("fileNameInput");
const fileContentInput = document.getElementById("fileContentInput");
const repoContent = document.getElementById("repoContent");

// Popup Rename
const renamePopup = document.createElement("div");
renamePopup.id = "renamePopup";
renamePopup.innerHTML = `
  <div id="renamePopupContent">
    <p>Rename File / Folder</p>
    <input type="text" id="renameInput" placeholder="Nama baru"/>
    <div style="display:flex; gap:10px; justify-content:center; margin-top:10px;">
      <button id="renameConfirmBtn">OK</button>
      <button id="renameCancelBtn">Batal</button>
    </div>
  </div>
`;
document.body.appendChild(renamePopup);

// === HELPERS ===
function log(msg, type = "info") {
  const p = document.createElement("p");
  if (type === "error") p.style.color = "red";
  if (type === "success") p.style.color = "limegreen";
  if (type === "info") p.style.color = "deepskyblue";
  p.textContent = msg;
  output.appendChild(p);
  output.scrollTop = output.scrollHeight;
}

function headers() {
  return {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github.v3+json",
  };
}

// === TOKEN ===
document.getElementById("saveTokenBtn").onclick = () => {
  token = tokenInput.value.trim();
  if (!token) return log("❌ Token kosong", "error");
  localStorage.setItem("githubToken", token);
  log("✅ Token disimpan", "success");
  loadRepos();
};

// === MODE ===
document.getElementById("modeToggle").onclick = () => {
  document.body.classList.toggle("light");
  document.body.classList.toggle("dark");
};

// === LOAD REPOS ===
async function loadRepos() {
  if (!token) return log("❌ Set token dulu", "error");
  try {
    const res = await fetch("https://api.github.com/user/repos", { headers: headers() });
    const data = await res.json();
    repoSelect.innerHTML = '<option value="">-- Pilih Repo --</option>';
    data.forEach(repo => {
      const opt = document.createElement("option");
      opt.value = repo.full_name;
      opt.textContent = repo.full_name;
      repoSelect.appendChild(opt);
    });
    log("📦 Repo dimuat", "success");
  } catch (e) {
    log("❌ Error load repos: " + e.message, "error");
  }
}

// === LOAD REPO CONTENT ===
document.getElementById("loadRepoBtn").onclick = async () => {
  currentRepo = repoSelect.value;
  if (!currentRepo) return log("❌ Pilih repo dulu", "error");
  await loadRepoContent("");
};

async function loadRepoContent(path) {
  try {
    const res = await fetch(`https://api.github.com/repos/${currentRepo}/contents/${path}`, {
      headers: headers(),
    });
    const data = await res.json();
    currentPath = path;
    const list = document.getElementById("fileList");
    list.innerHTML = "";
    if (Array.isArray(data)) {
      const ul = document.createElement("ul");
      data.forEach(item => {
        shaCache[item.path] = item.sha;
        const li = document.createElement("li");
        li.textContent = `${item.type === "dir" ? "📂" : "📄"} ${item.name}`;
        li.style.cursor = "pointer";
        li.onclick = () => {
          if (item.type === "dir") {
            loadRepoContent(item.path);
          } else {
            editFile(item.path);
          }
        };
        ul.appendChild(li);
      });
      list.appendChild(ul);
      log(`📂 Isi ${currentRepo}/${path || ""}`, "info");
    }
  } catch (e) {
    log("❌ Error load content: " + e.message, "error");
  }
}

// === FILE OPS ===
async function createFile(path, content) {
  const res = await fetch(`https://api.github.com/repos/${currentRepo}/contents/${path}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({
      message: "create file",
      content: btoa(content),
    }),
  });
  if (res.ok) {
    log("✅ File dibuat: " + path, "success");
    loadRepoContent(currentPath);
  } else log("❌ Gagal buat file", "error");
}

async function editFile(path) {
  try {
    const res = await fetch(`https://api.github.com/repos/${currentRepo}/contents/${path}`, {
      headers: headers(),
    });
    const data = await res.json();
    fileNameInput.value = path;
    fileContentInput.value = atob(data.content);
    shaCache[path] = data.sha;
    log("✏️ Edit file: " + path, "info");
  } catch (e) {
    log("❌ Error edit file: " + e.message, "error");
  }
}

async function saveFile(path, content) {
  const sha = shaCache[path] || null;
  const res = await fetch(`https://api.github.com/repos/${currentRepo}/contents/${path}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({
      message: "update file",
      content: btoa(content),
      sha,
    }),
  });
  if (res.ok) {
    log("✅ File disimpan: " + path, "success");
    loadRepoContent(currentPath);
  } else log("❌ Gagal simpan file", "error");
}

async function deleteFile(path) {
  const sha = shaCache[path];
  if (!sha) return log("❌ Tidak ada SHA untuk hapus", "error");
  const res = await fetch(`https://api.github.com/repos/${currentRepo}/contents/${path}`, {
    method: "DELETE",
    headers: headers(),
    body: JSON.stringify({
      message: "delete file",
      sha,
    }),
  });
  if (res.ok) {
    log("🗑️ File dihapus: " + path, "success");
    loadRepoContent(currentPath);
  } else log("❌ Gagal hapus file", "error");
}

// === RENAME FILE/FOLDER ===
function openRenamePopup(path) {
  renameTarget = path;
  document.getElementById("renameInput").value = path.split("/").pop();
  renamePopup.style.display = "flex";
}

document.getElementById("renameConfirmBtn").onclick = async () => {
  const newName = document.getElementById("renameInput").value.trim();
  if (!renameTarget || !newName) {
    renamePopup.style.display = "none";
    return;
  }
  const oldPath = renameTarget;
  const sha = shaCache[oldPath];
  const resGet = await fetch(`https://api.github.com/repos/${currentRepo}/contents/${oldPath}`, {
    headers: headers(),
  });
  const data = await resGet.json();
  const newPath = oldPath.split("/").slice(0, -1).concat(newName).join("/");
  const res = await fetch(`https://api.github.com/repos/${currentRepo}/contents/${newPath}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({
      message: "rename",
      content: data.content,
      sha,
    }),
  });
  if (res.ok) {
    await deleteFile(oldPath);
    log(`📝 Rename: ${oldPath} → ${newPath}`, "success");
    loadRepoContent(currentPath);
  } else log("❌ Gagal rename", "error");
  renamePopup.style.display = "none";
};

document.getElementById("renameCancelBtn").onclick = () => {
  renamePopup.style.display = "none";
};

// === ACTION MENU ===
function runAction() {
  const action = document.getElementById("actionMenu").value;
  const path = fileNameInput.value.trim();
  const content = fileContentInput.value;
  switch (action) {
    case "create": createFile(path, content); break;
    case "edit": if (path) editFile(path); break;
    case "delete": if (path) deleteFile(path); break;
    case "rename": if (path) openRenamePopup(path); break;
    default: log("⚠️ Pilih aksi dulu", "info");
  }
}
window.runAction = runAction;

// === COPY / FULLSCREEN ===
window.copyCode = () => {
  navigator.clipboard.writeText(fileContentInput.value);
  log("📋 Teks disalin", "success");
};
window.toggleFullscreen = () => {
  document.getElementById("codeBox").classList.toggle("fullscreen");
};

// === INIT ===
if (token) {
  tokenInput.value = token;
  loadRepos();
}