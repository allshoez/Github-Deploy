document.addEventListener("DOMContentLoaded", () => {
  let token = "",
    currentRepo = "",
    editingFile = "";

  // === DOM ===
  const output = document.getElementById("output");
  const repoSelect = document.getElementById("repoSelect");
  const fileNameInput = document.getElementById("fileNameInput");
  const fileContentInput = document.getElementById("fileContentInput");
  const renamePopup = document.getElementById("renamePopup");
  const newNameInput = document.getElementById("newNameInput");

  // === LOGGING ===
  function log(msg, type = "info") {
    const p = document.createElement("p");
    p.textContent = msg;
    p.style.color =
      type === "success" ? "#0f0" : type === "error" ? "#f33" : "#0af";
    output.appendChild(p);
    output.scrollTop = output.scrollHeight;
  }

  // === API REQUEST ===
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
    if (res.status === 204) return {};
    try {
      return await res.json();
    } catch {
      return {};
    }
  }

  // === TOKEN HANDLING ===
  document.getElementById("saveTokenBtn").addEventListener("click", () => {
    token = document.getElementById("tokenInput").value.trim();
    if (token) {
      localStorage.setItem("gh_token", token);
      log("✅ Token disimpan!", "success");
      loadRepos();
    } else log("⚠️ Masukkan token!", "error");
  });

  // === LOAD REPOS ===
  async function loadRepos() {
    try {
      log("🔄 Memuat repo...", "info");
      const repos = await apiRequest("https://api.github.com/user/repos");
      repoSelect.innerHTML = `
        <option value="">-- Menu --</option>
        <option value="createRepo">➕ Buat Repo</option>
        <option value="renameRepo">📝 Rename Repo</option>
        <option value="deleteRepo">🗑️ Hapus Repo</option>
      `;
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

  // === RENDER FILE LIST ===
  function renderRepoContent(files) {
    const repoDiv = document.getElementById("fileList");
    repoDiv.innerHTML =
      "<ul>" +
      files
        .map(
          (f) =>
            `<li onclick="document.getElementById('fileNameInput').value='${f.name}'">${
              f.type === "dir" ? "📁" : "📄"
            } ${f.name}</li>`
        )
        .join("") +
      "</ul>";
  }

  // === REPO MENU ===
  repoSelect.addEventListener("change", async () => {
    const val = repoSelect.value;
    if (!val) return;

    if (val === "createRepo") {
      const name = prompt("Nama repo baru:");
      if (!name) return;
      try {
        await apiRequest("https://api.github.com/user/repos", "POST", {
          name,
          auto_init: true,
          private: false,
        });
        log(`✅ Repo ${name} dibuat.`, "success");
        loadRepos();
      } catch (e) {
        log("❌ Error buat repo: " + e.message, "error");
      }
    } else if (val === "renameRepo") {
      if (!currentRepo) return log("⚠️ Pilih repo dulu!", "error");
      const newName = prompt("Nama baru repo:");
      if (!newName) return;
      try {
        const [owner, repo] = currentRepo.split("/");
        const updated = await apiRequest(
          `https://api.github.com/repos/${owner}/${repo}`,
          "PATCH",
          { name: newName }
        );
        currentRepo = updated.full_name;
        log(`✅ Repo di-rename jadi ${newName}`, "success");
        loadRepos();
      } catch (e) {
        log("❌ Error rename repo: " + e.message, "error");
      }
    } else if (val === "deleteRepo") {
      if (!currentRepo) return log("⚠️ Pilih repo dulu!", "error");
      if (!confirm(`Hapus repo ${currentRepo}?`)) return;
      try {
        await apiRequest(`https://api.github.com/repos/${currentRepo}`, "DELETE");
        log(`✅ Repo ${currentRepo} dihapus.`, "success");
        currentRepo = "";
        loadRepos();
      } catch (e) {
        log("❌ Error hapus repo: " + e.message, "error");
      }
    } else {
      // Repo dipilih
      currentRepo = val;
      log(`📂 Repo aktif: ${currentRepo}`, "info");
      try {
        const files = await apiRequest(
          `https://api.github.com/repos/${currentRepo}/contents/`
        );
        renderRepoContent(files);
      } catch (e) {
        log("❌ Error load isi repo: " + e.message, "error");
      }
    }
  });

  // === FILE/FOLDER ACTIONS ===
  async function createFile() {
    const name = fileNameInput.value.trim();
    if (!name) return log("⚠️ Isi nama file!", "error");
    try {
      await apiRequest(
        `https://api.github.com/repos/${currentRepo}/contents/${name}`,
        "PUT",
        {
          message: "create file",
          content: btoa(fileContentInput.value || ""),
        }
      );
      log(`✅ File ${name} dibuat.`, "success");
    } catch (e) {
      log("❌ Error create file: " + e.message, "error");
    }
  }

  async function editFile() {
    const name = fileNameInput.value.trim();
    if (!name) return log("⚠️ Pilih file!", "error");
    try {
      const shaData = await apiRequest(
        `https://api.github.com/repos/${currentRepo}/contents/${name}`
      );
      await apiRequest(
        `https://api.github.com/repos/${currentRepo}/contents/${name}`,
        "PUT",
        {
          message: "update file",
          content: btoa(fileContentInput.value),
          sha: shaData.sha,
        }
      );
      log(`✅ File ${name} diupdate.`, "success");
    } catch (e) {
      log("❌ Error edit file: " + e.message, "error");
    }
  }

  async function deleteFile() {
    const name = fileNameInput.value.trim();
    if (!name) return log("⚠️ Pilih file!", "error");
    if (!confirm(`Hapus ${name}?`)) return;
    try {
      const shaData = await apiRequest(
        `https://api.github.com/repos/${currentRepo}/contents/${name}`
      );
      await apiRequest(
        `https://api.github.com/repos/${currentRepo}/contents/${name}`,
        "DELETE",
        { message: "delete file", sha: shaData.sha }
      );
      log(`✅ ${name} dihapus.`, "success");
    } catch (e) {
      log("❌ Error delete: " + e.message, "error");
    }
  }

  async function createFolder() {
    const name = fileNameInput.value.trim();
    if (!name) return log("⚠️ Isi nama folder!", "error");
    try {
      await apiRequest(
        `https://api.github.com/repos/${currentRepo}/contents/${name}/.gitkeep`,
        "PUT",
        { message: "create folder", content: btoa("") }
      );
      log(`✅ Folder ${name} dibuat.`, "success");
    } catch (e) {
      log("❌ Error create folder: " + e.message, "error");
    }
  }

  async function renameItem() {
    const oldName = fileNameInput.value.trim();
    const newName = newNameInput.value.trim();
    if (!oldName || !newName) return log("⚠️ Isi nama!", "error");
    try {
      const shaData = await apiRequest(
        `https://api.github.com/repos/${currentRepo}/contents/${oldName}`
      );
      await apiRequest(
        `https://api.github.com/repos/${currentRepo}/contents/${oldName}`,
        "DELETE",
        { message: "rename file", sha: shaData.sha }
      );
      await apiRequest(
        `https://api.github.com/repos/${currentRepo}/contents/${newName}`,
        "PUT",
        {
          message: "create renamed file",
          content: btoa(atob(shaData.content || "")),
        }
      );
      log(`✅ ${oldName} di-rename jadi ${newName}`, "success");
      renamePopup.style.display = "none";
    } catch (e) {
      log("❌ Error rename: " + e.message, "error");
    }
  }

  // === ACTION MENU ===
  window.runAction = function () {
    const action = document.getElementById("actionMenu").value;
    switch (action) {
      case "create": createFile(); break;
      case "edit": editFile(); break;
      case "delete": deleteFile(); break;
      case "uploadFileBtn": document.getElementById("uploadFile").click(); break;
      case "createFolder": createFolder(); break;
      case "rename":
        if (!fileNameInput.value.trim())
          return log("⚠️ Pilih file/folder dulu!", "error");
        newNameInput.value = fileNameInput.value.trim();
        renamePopup.style.display = "flex";
        break;
      default:
        alert("⚠️ Pilih aksi dulu!");
    }
  };

  // === POPUP EVENTS ===
  document.getElementById("renameConfirmBtn").addEventListener("click", renameItem);
  document.getElementById("renameCancelBtn").addEventListener("click", () => {
    renamePopup.style.display = "none";
  });
});
