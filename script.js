document.addEventListener("DOMContentLoaded", () => {
  let token = "";
  let currentRepo = "";
  let editingFile = "";
  let deleteConfirm = false;

  const output = document.getElementById("output");
  const repoSelect = document.getElementById("repoSelect");
  const fileNameInput = document.getElementById("fileNameInput");
  const fileContentInput = document.getElementById("fileContentInput");

  // ===== LOG =====
  function log(msg, type = "info") {
    const p = document.createElement("p");
    p.textContent = msg;
    if (type === "success") p.style.color = "#0f0";
    else if (type === "error") p.style.color = "#f33";
    else p.style.color = "#0af";
    output.appendChild(p);
    output.scrollTop = output.scrollHeight;
  }

  async function apiRequest(url, method = "GET", body = null) {
    const headers = { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" };
    if (body) headers["Content-Type"] = "application/json";
    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : null });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Error ${res.status}: ${err}`);
    }
    return res.json();
  }

  // ===== TOKEN =====
  document.getElementById("saveTokenBtn").addEventListener("click", () => {
    token = document.getElementById("tokenInput").value.trim();
    if (token) {
      log("\u2714\uFE0F Token disimpan!", "success");
      loadRepos();
    } else log("\u26A0\uFE0F Masukkan token!", "error");
  });

  // ===== LOAD REPOS =====
  async function loadRepos() {
    try {
      log("\uD83D\uDD04 Memuat daftar repository...", "info");
      const repos = await apiRequest("https://api.github.com/user/repos");
      repoSelect.innerHTML = '<option value="">-- Pilih Repo --</option>';
      repos.forEach(r => {
        const opt = document.createElement("option");
        opt.value = r.full_name;
        opt.textContent = r.full_name;
        repoSelect.appendChild(opt);
      });
      log("\u2714\uFE0F Repo berhasil dimuat.", "success");
    } catch (e) {
      log("\u274C Gagal load repo: " + e.message, "error");
    }
  }

  // ===== LOAD REPO CONTENT =====
  document.getElementById("loadRepoBtn").addEventListener("click", async () => {
    currentRepo = repoSelect.value;
    if (!currentRepo) return log("\u26A0\uFE0F Pilih repo dulu!", "error");
    try {
      log("\uD83D\uDCC2 Memuat isi repo: " + currentRepo + "...", "info");
      const files = await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/`);
      renderRepoContent(files);
    } catch (e) {
      log("\u274C Error load repo: " + e.message, "error");
    }
  });

  function renderRepoContent(files) {
    const repoDiv = document.getElementById("fileList");
    repoDiv.innerHTML = "<ul>" + files.map(f => `<li>${f.type === "dir" ? "\uD83D\uDCC1" : "\uD83D\uDCC4"} ${f.name}</li>`).join("") + "</ul>";
  }

  // ===== CRUD & UPLOAD tetap sama =====
  // (cukup ganti log/icon ke Unicode escape seperti di atas)
});