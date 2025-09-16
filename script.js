// script.js
let token = "";
let username = "";
let currentRepo = "";
let currentBranch = "main";
let currentPath = "";
let fileShaMap = {}; // simpan sha file untuk update

// ====== UTILS ======
function log(msg) {
  const out = document.getElementById("output");
  out.innerHTML += `<p>${msg}</p>`;
  out.scrollTop = out.scrollHeight;
}

function getHeaders() {
  return {
    "Authorization": `token ${token}`,
    "Accept": "application/vnd.github.v3+json",
  };
}

// ====== TOKEN ======
document.getElementById("saveTokenBtn").addEventListener("click", async () => {
  token = document.getElementById("tokenInput").value.trim();
  if (!token) return log("❌ Token kosong!");
  try {
    let res = await fetch("https://api.github.com/user", { headers: getHeaders() });
    let data = await res.json();
    if (data.login) {
      username = data.login;
      log(`✅ Token valid, login sebagai: ${username}`);
      loadRepos();
    } else {
      log("❌ Token tidak valid!");
    }
  } catch (e) {
    log("❌ Error cek token: " + e.message);
  }
});

// ====== REPOS ======
async function loadRepos() {
  try {
    let res = await fetch(`https://api.github.com/user/repos`, { headers: getHeaders() });
    let repos = await res.json();
    let select = document.getElementById("repoSelect");
    select.innerHTML = `<option value="">-- Pilih Repo --</option>`;
    repos.forEach(r => {
      let opt = document.createElement("option");
      opt.value = r.name;
      opt.textContent = r.name;
      select.appendChild(opt);
    });
    log("📦 Repo berhasil dimuat");
  } catch (e) {
    log("❌ Error load repos: " + e.message);
  }
}

document.getElementById("loadRepoBtn").addEventListener("click", () => {
  currentRepo = document.getElementById("repoSelect").value;
  if (!currentRepo) return log("❌ Pilih repo dulu!");
  loadRepoContent("");
});

// ====== REPO ACTIONS ======
document.getElementById("runRepoAction").addEventListener("click", async () => {
  const action = document.getElementById("repoAction").value;
  const name = prompt("Nama repo:");
  if (!name) return;
  try {
    if (action === "createRepo") {
      await fetch(`https://api.github.com/user/repos`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ name }),
      });
      log(`✅ Repo ${name} dibuat`);
    } else if (action === "renameRepo") {
      if (!currentRepo) return log("❌ Pilih repo dulu!");
      await fetch(`https://api.github.com/repos/${username}/${currentRepo}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ name }),
      });
      log(`✏️ Repo diubah jadi ${name}`);
      currentRepo = name;
    } else if (action === "deleteRepo") {
      await fetch(`https://api.github.com/repos/${username}/${name}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      log(`🗑️ Repo ${name} dihapus`);
    }
    loadRepos();
  } catch (e) {
    log("❌ Error aksi repo: " + e.message);
  }
});

// ====== FILES ======
async function loadRepoContent(path) {
  currentPath = path;
  try {
    let res = await fetch(
      `https://api.github.com/repos/${username}/${currentRepo}/contents/${path}?ref=${currentBranch}`,
      { headers: getHeaders() }
    );
    let data = await res.json();
    let list = document.getElementById("fileList");
    list.innerHTML = "<ul>" + data.map(item => {
      fileShaMap[item.path] = item.sha;
      return `<li>
        ${item.type === "dir" ? "📂" : "📄"} 
        <a href="#" onclick="openItem('${item.path}','${item.type}')">${item.name}</a>
      </li>`;
    }).join("") + "</ul>";
    log(`📂 Path: /${path}`);
  } catch (e) {
    log("❌ Error load content: " + e.message);
  }
}

async function openItem(path, type) {
  if (type === "dir") {
    loadRepoContent(path);
  } else {
    try {
      let res = await fetch(
        `https://api.github.com/repos/${username}/${currentRepo}/contents/${path}?ref=${currentBranch}`,
        { headers: getHeaders() }
      );
      let data = await res.json();
      let content = atob(data.content.replace(/\n/g, ""));
      document.getElementById("fileNameInput").value = path;
      document.getElementById("fileContentInput").value = content;
      log(`✏️ Edit file: ${path}`);
    } catch (e) {
      log("❌ Error buka file: " + e.message);
    }
  }
}

// ====== ACTION MENU ======
async function runAction() {
  const action = document.getElementById("actionMenu").value;
  const name = document.getElementById("fileNameInput").value.trim();
  const content = document.getElementById("fileContentInput").value;
  if (!currentRepo) return log("❌ Pilih repo dulu!");
  try {
    if (action === "create" || action === "edit") {
      let sha = fileShaMap[name] || undefined;
      await fetch(`https://api.github.com/repos/${username}/${currentRepo}/contents/${name}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({
          message: action === "create" ? `Create ${name}` : `Update ${name}`,
          content: btoa(unescape(encodeURIComponent(content))),
          sha: sha,
          branch: currentBranch,
        }),
      });
      log(`✅ File ${name} ${action === "create" ? "dibuat" : "diedit"}`);
    } else if (action === "delete") {
      let sha = fileShaMap[name];
      await fetch(`https://api.github.com/repos/${username}/${currentRepo}/contents/${name}`, {
        method: "DELETE",
        headers: getHeaders(),
        body: JSON.stringify({
          message: `Delete ${name}`,
          sha: sha,
          branch: currentBranch,
        }),
      });
      log(`🗑️ File ${name} dihapus`);
    } else if (action === "rename") {
      const newName = prompt("Nama baru:");
      if (!newName) return;
      let oldSha = fileShaMap[name];
      // buat file baru dengan nama baru
      await fetch(`https://api.github.com/repos/${username}/${currentRepo}/contents/${newName}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({
          message: `Rename ${name} → ${newName}`,
          content: btoa(unescape(encodeURIComponent(content))),
          branch: currentBranch,
        }),
      });
      // hapus file lama
      await fetch(`https://api.github.com/repos/${username}/${currentRepo}/contents/${name}`, {
        method: "DELETE",
        headers: getHeaders(),
        body: JSON.stringify({
          message: `Remove old ${name}`,
          sha: oldSha,
          branch: currentBranch,
        }),
      });
      log(`📝 File ${name} di-rename jadi ${newName}`);
    }
    loadRepoContent(currentPath);
  } catch (e) {
    log("❌ Error aksi file: " + e.message);
  }
}

// ====== THEME ======
document.getElementById("modeToggle").addEventListener("click", () => {
  document.body.classList.toggle("light");
  document.body.classList.toggle("dark");
});

// ====== COPY / FULLSCREEN ======
function copyCode() {
  navigator.clipboard.writeText(document.getElementById("fileContentInput").value);
  log("📋 Disalin ke clipboard");
}

function toggleFullscreen() {
  const box = document.getElementById("codeBox");
  box.classList.toggle("fullscreen");
}
