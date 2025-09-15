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

  // ===== Safe decode UTF-8 Base64 =====
  function decodeFileContent(b64) {
    try {
      return decodeURIComponent(escape(atob(b64)));
    } catch {
      return atob(b64);
    }
  }

  async function apiRequest(url, method = "GET", body = null) {
    const headers = { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" };
    if (body) headers["Content-Type"] = "application/json";
    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : null });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Error ${res.status}: ${errText}`);
    }
    // Beberapa endpoint delete repo tidak mengembalikan JSON
    if (res.status === 204 || res.status === 202) return null;
    return res.json();
  }

  // ===== TOKEN =====
  document.getElementById("saveTokenBtn").addEventListener("click", () => {
    token = document.getElementById("tokenInput").value.trim();
    if (token) {
      log("✅ Token disimpan!", "success");
      loadRepos();
    } else log("⚠️ Masukkan token!", "error");
  });

  // ===== LOAD REPOS =====
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

  // ===== CREATE REPO BUTTON =====
  document.getElementById("createRepo").addEventListener("click", async () => {
    const repoName = fileNameInput.value.trim();
    if (!token) return log("⚠️ Token belum diset!", "error");
    if (!repoName) return log("⚠️ Nama repo wajib!", "error");
    try {
      await apiRequest("https://api.github.com/user/repos", "POST", {
        name: repoName,
        private: false,
        description: "Repo dibuat via GitHub File Manager"
      });
      log(`✅ Repo ${repoName} berhasil dibuat.`, "success");
      fileNameInput.value = "";
      loadRepos();
    } catch (e) {
      log("❌ Error buat repo: " + e.message, "error");
    }
  });

  // ===== LOAD REPO CONTENT =====
  document.getElementById("loadRepoBtn").addEventListener("click", async () => {
    currentRepo = repoSelect.value;
    if (!currentRepo) return log("⚠️ Pilih repo dulu!", "error");
    try {
      log(`📂 Memuat isi repo: ${currentRepo} ...`, "info");
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

  // ===== CRUD FILE =====
  async function createFile() {
    if (!currentRepo) return log("⚠️ Pilih repo dulu!", "error");
    const name = fileNameInput.value.trim();
    const content = fileContentInput.value || "# File baru\n";
    if (!name) return log("⚠️ Nama file wajib!", "error");
    try {
      const encoded = btoa(unescape(encodeURIComponent(content)));
      await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`, "PUT", {
        message: `Buat file ${name}`,
        content: encoded
      });
      log(`✅ File ${name} berhasil dibuat.`, "success");
      fileContentInput.value = "";
      document.getElementById("loadRepoBtn").click();
    } catch (e) { log("❌ Error buat file: " + e.message, "error"); }
  }

  async function editFile() {
    if (!currentRepo) return log("⚠️ Pilih repo dulu!", "error");
    const name = fileNameInput.value.trim();
    if (!name) return log("⚠️ Nama file wajib!", "error");

    if (editingFile !== name) {
      try {
        const fileData = await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`);
        fileContentInput.value = decodeFileContent(fileData.content.replace(/\n/g, ""));
        editingFile = name;
        log(`✏️ File ${name} siap diedit. Tekan Edit File lagi untuk menyimpan.`, "info");
      } catch (e) { log("❌ Error ambil file: " + e.message, "error"); }
    } else {
      try {
        const fileData = await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`);
        const encoded = btoa(unescape(encodeURIComponent(fileContentInput.value || "# File kosong\n")));
        await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`, "PUT", {
          message: `Edit file ${name}`,
          content: encoded,
          sha: fileData.sha
        });
        log(`✅ File ${name} berhasil diedit.`, "success");
        editingFile = "";
        fileContentInput.value = "";
        document.getElementById("loadRepoBtn").click();
      } catch (e) { log("❌ Error edit file: " + e.message, "error"); }
    }
  }

  async function deleteFile() {
    if (!currentRepo) return log("⚠️ Pilih repo dulu!", "error");
    const name = fileNameInput.value.trim();
    if (!name) return log("⚠️ Nama file wajib!", "error");

    if (!deleteConfirm || editingFile !== name) {
      deleteConfirm = true;
      editingFile = name;
      log(`⚠️ Tekan Hapus File lagi untuk konfirmasi.`, "info");
      return;
    }

    try {
      const fileData = await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`);
      await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${name}`, "DELETE", {
        message: `Hapus file ${name}`,
        sha: fileData.sha
      });
      log(`✅ File ${name} berhasil dihapus.`, "success");
      deleteConfirm = false;
      editingFile = "";
      fileContentInput.value = "";
      document.getElementById("loadRepoBtn").click();
    } catch (e) {
      log("❌ Error hapus file: " + e.message, "error");
      deleteConfirm = false;
      editingFile = "";
    }
  }

  // ===== CREATE FOLDER =====
  async function createFolder() {
    if (!currentRepo) return log("⚠️ Pilih repo dulu!", "error");
    const folderName = fileNameInput.value.trim();
    if (!folderName) return log("⚠️ Nama folder wajib!", "error");
    try {
      const encoded = btoa(unescape(encodeURIComponent("# Folder placeholder")));
      await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${folderName}/.gitkeep`, "PUT", {
        message: `Buat folder ${folderName}`,
        content: encoded
      });
      log(`✅ Folder ${folderName} berhasil dibuat.`, "success");
      fileNameInput.value = "";
      document.getElementById("loadRepoBtn").click();
    } catch (e) {
      log("❌ Error buat folder: " + e.message, "error");
    }
  }

  // ===== UPLOAD FILE =====
  async function uploadFile() {
    if (!currentRepo) return log("⚠️ Pilih repo dulu!", "error");
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "*/*";
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const content = reader.result.split(",")[1];
        try {
          await apiRequest(`https://api.github.com/repos/${currentRepo}/contents/${file.name}`, "PUT", {
            message: `Upload file ${file.name}`,
            content: content
          });
          log(`✅ File ${file.name} berhasil diupload.`, "success");
          document.getElementById("loadRepoBtn").click();
        } catch (err) { log("❌ Error upload file: " + err.message, "error"); }
      };
      reader.readAsDataURL(file);
    };
    fileInput.click();
  }

  // ===== DELETE REPO =====
  async function deleteRepo() {
    if (!currentRepo) return log("⚠️ Pilih repo dulu!", "error");
    if (!deleteConfirm) {
      deleteConfirm = true;
      log(`⚠️ Tekan Hapus Repo lagi untuk konfirmasi.`, "info");
      return;
    }
    try {
      await apiRequest(`https://api.github.com/repos/${currentRepo}`, "DELETE");
      log(`✅ Repo ${currentRepo} berhasil dihapus.`, "success");
      deleteConfirm = false;
      currentRepo = "";
      loadRepos();
    } catch (e) {
      log("❌ Error hapus repo: " + e.message, "error");
      deleteConfirm = false;
    }
  }

  // ===== ACTION DROPDOWN =====
  window.runAction = function () {
    const action = document.getElementById("actionMenu").value;
    switch (action) {
      case "create": createFile(); break;
      case "edit": editFile(); break;
      case "delete": deleteFile(); break;
      case "uploadFileBtn": uploadFile(); break;
      case "createFolder": createFolder(); break;
      case "delletRepo": deleteRepo(); break;
      default: alert("⚠️ Pilih aksi dulu!");
    }
  };

  // ===== COPY & FULLSCREEN =====
  window.copyCode = function () {
    fileContentInput.select();
    document.execCommand("copy");
    alert("✅ Isi berhasil disalin!");
  };

  window.toggleFullscreen = function () {
    document.getElementById("codeBox").classList.toggle("fullscreen");
  };

  // ===== DARK/LIGHT MODE =====
  const toggleBtn = document.getElementById("modeToggle");
  toggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("light");
    document.body.classList.toggle("dark");
    toggleBtn.textContent = document.body.classList.contains("dark") ? "🌞 Mode" : "🌙 Mode";
  });
});