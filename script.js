document.addEventListener("DOMContentLoaded", () => {
  let token = "";
  let currentRepo = "";
  let editingFile = "";
  let deleteConfirm = false;

  const output = document.getElementById("output");
  const repoSelect = document.getElementById("repoSelect");
  const fileNameInput = document.getElementById("fileNameInput");
  const fileContentInput = document.getElementById("fileContentInput");

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

  document.getElementById("saveTokenBtn").addEventListener("click", () => {
    token = document.getElementById("tokenInput").value.trim();
    if (token) {
      log("✅ Token disimpan!", "success");
      loadRepos();
    } else log("⚠️ Masukkan token!", "error");
  });

  async function loadRepos() {
    try {
      log("🔄 Memuat daftar repository...", "info");
      const repos = await apiRequest("https://api.github.com/user/repos");
      repoSelect.innerHTML = '<option value="">-- Pilih Repo --</option>';
      repos.forEach(r => {
        const opt = document.createElement("option");
        opt.value = r.full_name;
        opt.textContent = r.full_name;
        repoSelect.appendChild(opt);
      });
      log("✅ Repo berhasil dimuat.", "success");
    } catch (e) {
      log("❌ Gagal load repo: " + e.message, "error");
    }
  }

  document.getElementById("loadRepoBtn").addEventListener("click", async () => {
    currentRepo = repoSelect.value;
    if (!currentRepo) return log("⚠️ Pilih repo dulu!", "error");
    try {
      log(`📄 Memuat isi repo: ${currentRepo} ...`, "info");
      const files = await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/`);
      renderRepoContent(files);
    } catch (e) {
      log("❌ Error load repo: " + e.message, "error");
    }
  });

  function renderRepoContent(files) {
    const repoDiv = document.getElementById("fileList");
    repoDiv.innerHTML = "<ul>" + files.map(f => `<li>${f.type === "dir" ? "📁" : "📄"} ${f.name}</li>`).join("") + "</ul>";
  }

  // CRUD functions sama seperti versi lama, tapi log & tombol pakai Unicode langsung
  // ...
  window.runAction = function () { /* sama seperti sebelumnya */ };
  window.copyCode = function () { fileContentInput.select(); document.execCommand("copy"); alert("✅ Isi berhasil disalin!"); };
  window.toggleFullscreen = function () { document.getElementById("codeBox").classList.toggle("fullscreen"); };
  
  const toggleBtn = document.getElementById("modeToggle");
  toggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("light");
    document.body.classList.toggle("dark");
    toggleBtn.textContent = document.body.classList.contains("dark") ? "☀️ Mode" : "🌙 Mode";
  });
});