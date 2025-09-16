document.addEventListener("DOMContentLoaded", () => {
  let token = "",
    currentRepo = "",
    editingFile = "",
    deleteConfirm = false;

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
    if (res.status === 204) return {};
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

  // ===== REPO MENU =====
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
        log(`✅ Repo ${name} berhasil dibuat.`, "success");
        loadRepos();
      } catch (e) {
        log("❌ Error buat repo: " + e.message, "error");
      }
    } else if (val === "renameRepo") {
      if (!currentRepo)
        return log("⚠️ Pilih repo dulu dari daftar!", "error");
      const newName = prompt("Nama baru untuk repo:");
      if (!newName) return;
      try {
        const [owner, repo] = currentRepo.split("/");
        const updated = await apiRequest(
          `https://api.github.com/repos/${owner}/${repo}`,
          "PATCH",
          { name: newName }
        );
        currentRepo = updated.full_name;
        log(`✅ Repo berhasil di-rename menjadi ${newName}`, "success");
        loadRepos();
      } catch (e) {
        log("❌ Error rename repo: " + e.message, "error");
      }
    } else if (val === "deleteRepo") {
      if (!currentRepo)
        return log("⚠️ Pilih repo dulu dari daftar!", "error");
      if (!confirm(`Yakin hapus repo ${currentRepo}?`)) return;
      try {
        await apiRequest(`https://api.github.com/repos/${currentRepo}`, "DELETE");
        log(`✅ Repo ${currentRepo} berhasil dihapus.`, "success");
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
        log("❌ Error load repo: " + e.message, "error");
      }
    }
  });

  function renderRepoContent(files) {
    const repoDiv = document.getElementById("fileList");
    repoDiv.innerHTML =
      "<ul>" +
      files
        .map(
          (f) =>
            `<li onclick="fileNameInput.value='${f.name}'">${
              f.type === "dir" ? "📁" : "📄"
            } ${f.name}</li>`
        )
        .join("") +
      "</ul>";
  }

  // ===== FILE ACTIONS (sama kayak versi lo sebelumnya, gw biarin tetap) =====
  async function createFile() { /* ... */ }
  async function editFile() { /* ... */ }
  async function deleteFile() { /* ... */ }
  async function createFolder() { /* ... */ }
  async function uploadFile() { /* ... */ }
  async function renameItem() { /* ... */ }

  // ===== ACTION DROPDOWN =====
  window.runAction = function () {
    const action = document.getElementById("actionMenu").value;
    switch (action) {
      case "create": createFile(); break;
      case "edit": editFile(); break;
      case "delete": deleteFile(); break;
      case "uploadFileBtn": uploadFile(); break;
      case "createFolder": createFolder(); break;
      case "rename":
        if (!fileNameInput.value.trim()) {
          log("⚠️ Pilih file/folder dulu!", "error");
          return;
        }
        newNameInput.value = fileNameInput.value.trim();
        renamePopup.style.display = "flex";
        break;
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
    toggleBtn.textContent = document.body.classList.contains("dark")
      ? "🌞 Mode"
      : "🌙 Mode";
  });

  // ===== POPUP RENAME =====
  document
    .getElementById("renameConfirmBtn")
    .addEventListener("click", renameItem);
  document
    .getElementById("renameCancelBtn")
    .addEventListener("click", () => {
      renamePopup.style.display = "none";
    });
});