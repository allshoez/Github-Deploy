document.addEventListener("DOMContentLoaded", () => {
  let token = "";
  let currentRepo = "";
  let editingFile = "";
  let deleteConfirm = false;

  const output = document.getElementById("output");
  const repoSelect = document.getElementById("repoSelect");
  const fileNameInput = document.getElementById("fileNameInput");
  const fileContentInput = document.getElementById("fileContentInput");
  const actionMenu = document.getElementById("actionMenu");

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

  // ===== API REQUEST =====
  async function apiRequest(url, method = "GET", body = null) {
    const headers = {
      "Authorization": "token " + token,
      "Accept": "application/vnd.github.v3+json"
    };
    if (body) headers["Content-Type"] = "application/json";

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || res.statusText);
    }
    return res.json();
  }

  // ===== REPO LIST =====
  async function loadRepos() {
    if (!token) return log("⚠️ Masukkan token dulu!", "error");
    repoSelect.innerHTML = "<option value=''>-- Pilih Repo --</option>";
    try {
      const repos = await apiRequest("https://api.github.com/user/repos");
      repos.forEach(repo => {
        const opt = document.createElement("option");
        opt.value = repo.name;
        opt.textContent = repo.name;
        repoSelect.appendChild(opt);
      });
      log("✅ Daftar repo dimuat.", "success");
    } catch (e) {
      log("❌ Error ambil repos: " + e.message, "error");
    }
  }

  repoSelect.addEventListener("change", () => {
    currentRepo = repoSelect.value;
    log("📦 Repo dipilih: " + currentRepo);
  });

  // ===== CREATE FILE =====
  async function createFile() {
    if (!currentRepo) return log("⚠️ Pilih repo dulu!", "error");
    const fileName = fileNameInput.value.trim();
    const content = fileContentInput.value;
    if (!fileName) return log("⚠️ Nama file wajib!", "error");

    const url = `https://api.github.com/repos/${username()}/${currentRepo}/contents/${fileName}`;
    try {
      await apiRequest(url, "PUT", {
        message: "Create file via File Manager",
        content: btoa(content)
      });
      log(`✅ File ${fileName} berhasil dibuat.`, "success");
    } catch (e) {
      log("❌ Error create file: " + e.message, "error");
    }
  }

  // ===== EDIT FILE =====
  async function editFile() {
    if (!currentRepo) return log("⚠️ Pilih repo dulu!", "error");
    const fileName = fileNameInput.value.trim();
    const content = fileContentInput.value;
    if (!fileName) return log("⚠️ Nama file wajib!", "error");

    const url = `https://api.github.com/repos/${username()}/${currentRepo}/contents/${fileName}`;
    try {
      const file = await apiRequest(url);
      await apiRequest(url, "PUT", {
        message: "Update file via File Manager",
        content: btoa(content),
        sha: file.sha
      });
      log(`✅ File ${fileName} berhasil diupdate.`, "success");
    } catch (e) {
      log("❌ Error edit file: " + e.message, "error");
    }
  }

  // ===== DELETE FILE =====
  async function deleteFile() {
    if (!currentRepo) return log("⚠️ Pilih repo dulu!", "error");
    const fileName = fileNameInput.value.trim();
    if (!fileName) return log("⚠️ Nama file wajib!", "error");

    const url = `https://api.github.com/repos/${username()}/${currentRepo}/contents/${fileName}`;
    try {
      const file = await apiRequest(url);
      await apiRequest(url, "DELETE", {
        message: "Delete file via File Manager",
        sha: file.sha
      });
      log(`✅ File ${fileName} berhasil dihapus.`, "success");
    } catch (e) {
      log("❌ Error delete file: " + e.message, "error");
    }
  }

  // ===== UPLOAD FILE =====
  async function uploadFile() {
    if (!currentRepo) return log("⚠️ Pilih repo dulu!", "error");
    const file = document.getElementById("fileUpload").files[0];
    if (!file) return log("⚠️ Pilih file dulu!", "error");

    const reader = new FileReader();
    reader.onload = async () => {
      const content = reader.result.split(",")[1];
      const url = `https://api.github.com/repos/${username()}/${currentRepo}/contents/${file.name}`;
      try {
        await apiRequest(url, "PUT", {
          message: "Upload file via File Manager",
          content
        });
        log(`✅ File ${file.name} berhasil diupload.`, "success");
      } catch (e) {
        log("❌ Error upload file: " + e.message, "error");
      }
    };
    reader.readAsDataURL(file);
  }

  // ===== CREATE REPO =====
  async function createRepo() {
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
      loadRepos(); // refresh daftar repo
      fileNameInput.value = "";
    } catch (e) {
      log("❌ Error buat repo: " + e.message, "error");
    }
  }

  // ===== USERNAME (ambil dari token) =====
  function username() {
    // Hack: parse dari repoSelect option owner
    // Kalau perlu lebih pasti → panggil https://api.github.com/user
    const firstRepo = repoSelect.options[1];
    return firstRepo ? firstRepo.textContent.split("/")[0] : "";
  }

  // ===== ACTION DROPDOWN =====
  window.runAction = function () {
    const action = actionMenu.value;
    switch (action) {
      case "create": createFile(); break;
      case "edit": editFile(); break;
      case "delete": deleteFile(); break;
      case "uploadFileBtn": uploadFile(); break;
      case "createRepo": createRepo(); break;
      default: alert("⚠️ Pilih aksi dulu!");
    }
  };

  // ===== INIT =====
  document.getElementById("setTokenBtn").addEventListener("click", () => {
    token = document.getElementById("tokenInput").value.trim();
    if (!token) return log("⚠️ Token kosong!", "error");
    log("🔑 Token diset.");
    loadRepos();
  });
});