document.addEventListener("DOMContentLoaded", () => {
  let token = "";
  let currentRepo = "";
  let editingFile = "";
  let deleteConfirm = false;

  const output = document.getElementById("output");
  const repoSelect = document.getElementById("repoSelect");
  const fileNameInput = document.getElementById("fileNameInput");
  const fileContentInput = document.getElementById("fileContentInput");
  const renamePopup = document.getElementById("renamePopup");
  const newNameInput = document.getElementById("newNameInput");

  // ===== LOG =====
  function log(msg, type = "info") {
    const p = document.createElement("p");
    p.textContent = msg;
    p.style.color =
      type === "success" ? "#0f0" : type === "error" ? "#f33" : "#0af";
    output.appendChild(p);
    output.scrollTop = output.scrollHeight;
  }

  // ===== API =====
  async function apiRequest(url, method = "GET", body = null) {
    const headers = {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
    };
    if (body) headers["Content-Type"] = "application/json";

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });

    if (res.status === 204) return {}; // no content
    try {
      return await res.json();
    } catch {
      return {};
    }
  }

  // ===== TOKEN =====
  document.getElementById("saveTokenBtn").addEventListener("click", () => {
    token = document.getElementById("tokenInput").value.trim();
    if (token) {
      localStorage.setItem("gh_token", token);
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
      repos.forEach((r) => {
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

  // ===== LOAD REPO CONTENT =====
  document.getElementById("loadRepoBtn").addEventListener("click", async () => {
    currentRepo = repoSelect.value;
    if (!currentRepo) return log("⚠️ Pilih repo dulu!", "error");
    try {
      log(`📂 Memuat isi repo: ${currentRepo} ...`, "info");
      const files = await apiRequest(
        `https://api.github.com/repos/${currentRepo}/contents/`
      );
      renderRepoContent(files);
    } catch (e) {
      log("❌ Error load repo: " + e.message, "error");
    }
  });

  function renderRepoContent(files) {
    const repoDiv = document.getElementById("fileList");
    repoDiv.innerHTML =
      "<ul>" +
      files
        .map(
          (f) =>
            `<li onclick="document.getElementById('fileNameInput').value='${f.name}'">${f.type === "dir" ? "📁" : "📄"} ${f.name}</li>`
        )
        .join("") +
      "</ul>";
  }

  // ===== ACTION DROPDOWN =====
  window.runAction = function () {
    const action = document.getElementById("actionMenu").value;
    switch (action) {
      case "create":
        createFile();
        break;
      case "edit":
        editFile();
        break;
      case "delete":
        deleteFile();
        break;
      case "uploadFileBtn":
        uploadFile();
        break;
      case "createFolder":
        createFolder();
        break;
      case "rename":
        if (!fileNameInput.value.trim())
          return log("⚠️ Pilih file/folder dulu!", "error");
        newNameInput.value = fileNameInput.value.trim();
        renamePopup.style.display = "flex"; // popup hanya muncul saat pilih rename
        break;
      case "delletRepo":
        deleteRepo();
        break;
      default:
        alert("⚠️ Pilih aksi dulu!");
    }
  };

  // ===== POPUP RENAME =====
  document
    .getElementById("renameConfirmBtn")
    .addEventListener("click", async () => {
      const oldName = fileNameInput.value.trim();
      const newName = newNameInput.value.trim();
      if (!oldName || !newName) return log("⚠️ Nama lama & baru wajib!", "error");
      await renameItem(oldName, newName);
      renamePopup.style.display = "none";
    });

  document
    .getElementById("renameCancelBtn")
    .addEventListener("click", () => {
      renamePopup.style.display = "none";
    });

  // ===== CRUD =====
  async function createFile() {
    if (!currentRepo) return log("⚠️ Pilih repo dulu!", "error");
    const name = fileNameInput.value.trim();
    const content = fileContentInput.value || "# File baru\n";
    if (!name) return log("⚠️ Nama file wajib!", "error");
    try {
      const encoded = btoa(unescape(encodeURIComponent(content)));
      await apiRequest(
        `https://api.github.com/repos/${currentRepo}/contents/${name}`,
        "PUT",
        { message: `Buat file ${name}`, content: encoded }
      );
      log(`✅ File ${name} berhasil dibuat.`, "success");
      document.getElementById("loadRepoBtn").click();
    } catch (e) {
      log("❌ Error buat file: " + e.message, "error");
    }
  }

  async function editFile() {
    // ... (mirip yang lo punya, tetap dipertahankan biar gak kepanjangan disini)
  }

  async function deleteFile() {
    // ... (sama kayak versi lo sebelumnya)
  }

  async function createFolder() {
    // ... (sama kayak versi lo sebelumnya)
  }

  async function uploadFile() {
    // ... (sama kayak versi lo sebelumnya)
  }

  async function deleteRepo() {
    // ... (sama kayak versi lo sebelumnya)
  }

  async function renameItem(oldName, newName) {
    try {
      const fileData = await apiRequest(
        `https://api.github.com/repos/${currentRepo}/contents/${oldName}`
      );
      const encoded = btoa(
        unescape(encodeURIComponent(fileContentInput.value || "# Kosong\n"))
      );
      await apiRequest(
        `https://api.github.com/repos/${currentRepo}/contents/${newName}`,
        "PUT",
        { message: `Rename ${oldName} -> ${newName}`, content: encoded, sha: fileData.sha }
      );
      await apiRequest(
        `https://api.github.com/repos/${currentRepo}/contents/${oldName}`,
        "DELETE",
        { message: `Hapus ${oldName}`, sha: fileData.sha }
      );
      log(`✅ ${oldName} berhasil di rename jadi ${newName}`, "success");
      fileNameInput.value = newName;
      document.getElementById("loadRepoBtn").click();
    } catch (e) {
      log("❌ Error rename: " + e.message, "error");
    }
  }
});
