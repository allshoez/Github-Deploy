// ========== Variabel Global ==========
let token = "";
let currentRepo = "";
const output = document.getElementById("output");
const repoSelect = document.getElementById("repoSelect");
const fileNameInput = document.getElementById("fileNameInput");
const fileContentInput = document.getElementById("fileContentInput");

// ========== Fungsi Helper ==========
function log(msg) {
  const p = document.createElement("p");
  p.textContent = msg;
  output.appendChild(p);
  output.scrollTop = output.scrollHeight;
}

async function apiRequest(url, method = "GET", body = null) {
  const headers = {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github.v3+json"
  };
  if (body) headers["Content-Type"] = "application/json";

  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : null });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error ${res.status}: ${err}`);
  }
  return res.json();
}

// ========== Simpan Token ==========
document.getElementById("saveTokenBtn").addEventListener("click", () => {
  token = document.getElementById("tokenInput").value.trim();
  if (token) {
    log("✅ Token disimpan!");
    loadRepos();
  } else {
    log("⚠️ Masukkan token!");
  }
});

// ========== Load Repository ==========
async function loadRepos() {
  try {
    log("🔄 Memuat daftar repository...");
    const repos = await apiRequest("https://api.github.com/user/repos");
    repoSelect.innerHTML = '<option value="">-- Pilih Repo --</option>';
    repos.forEach(r => {
      const opt = document.createElement("option");
      opt.value = r.full_name;
      opt.textContent = r.full_name;
      repoSelect.appendChild(opt);
    });
    log("✅ Repo berhasil dimuat.");
  } catch (e) {
    log("❌ Gagal load repo: " + e.message);
  }
}

// ========== Load Isi Repo ==========
document.getElementById("loadRepoBtn").addEventListener("click", async () => {
  currentRepo = repoSelect.value;
  if (!currentRepo) {
    log("⚠️ Pilih repo dulu!");
    return;
  }
  try {
    log(`📂 Memuat isi repo: ${currentRepo} ...`);
    const files = await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/`);
    renderRepoContent(files);
  } catch (e) {
    log("❌ Error load repo: " + e.message);
  }
});

function renderRepoContent(files) {
  const repoDiv = document.getElementById("repoContent");
  repoDiv.innerHTML = `
    <input type="text" id="fileNameInput" placeholder="Nama file/folder"/>
    <textarea id="fileContentInput" placeholder="Isi file (jika file)"></textarea>
    <ul>
      ${files.map(f => `<li>${f.type === "dir" ? "📁" : "📄"} ${f.name}</li>`).join("")}
    </ul>
  `;
}

// ========== Buat File ==========
document.getElementById("createFileBtn").addEventListener("click", async () => {
  if (!currentRepo) return log("⚠️ Pilih repo dulu!");
  const name = fileNameInput.value.trim();
  const content = fileContentInput.value;
  if (!name) return log("⚠️ Nama file wajib!");

  try {
    const encoded = btoa(unescape(encodeURIComponent(content)));
    await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`, "PUT", {
      message: `Buat file ${name}`,
      content: encoded
    });
    log(`✅ File ${name} berhasil dibuat.`);
  } catch (e) {
    log("❌ Error buat file: " + e.message);
  }
});

// ========== Edit File ==========
document.getElementById("editFileBtn").addEventListener("click", async () => {
  if (!currentRepo) return log("⚠️ Pilih repo dulu!");
  const name = fileNameInput.value.trim();
  const content = fileContentInput.value;
  if (!name) return log("⚠️ Nama file wajib!");

  try {
    // Ambil SHA dulu
    const fileData = await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`);
    const encoded = btoa(unescape(encodeURIComponent(content)));
    await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`, "PUT", {
      message: `Edit file ${name}`,
      content: encoded,
      sha: fileData.sha
    });
    log(`✏️ File ${name} berhasil diedit.`);
  } catch (e) {
    log("❌ Error edit file: " + e.message);
  }
});

// ========== Hapus File ==========
document.getElementById("deleteFileBtn").addEventListener("click", async () => {
  if (!currentRepo) return log("⚠️ Pilih repo dulu!");
  const name = fileNameInput.value.trim();
  if (!name) return log("⚠️ Nama file wajib!");

  try {
    // Ambil SHA dulu
    const fileData = await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`);
    await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`, "DELETE", {
      message: `Hapus file ${name}`,
      sha: fileData.sha
    });
    log(`🗑️ File ${name} berhasil dihapus.`);
  } catch (e) {
    log("❌ Error hapus file: " + e.message);
  }
});

// ========== Toggle Dark/Light Mode ==========
const toggleBtn = document.getElementById("modeToggle");
const body = document.body;

toggleBtn.addEventListener("click", () => {
  if (body.classList.contains("dark")) {
    body.classList.remove("dark");
    body.classList.add("light");
    toggleBtn.textContent = "🌙 Dark Mode";
  } else {
    body.classList.remove("light");
    body.classList.add("dark");
    toggleBtn.textContent = "☀️ Light Mode";
  }
});