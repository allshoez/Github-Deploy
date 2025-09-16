// ===================== GLOBAL STATE =====================
let repos = {};          // penyimpanan repo -> { repoName: { files: [], folders: [] } }
let currentRepo = null;  // repo aktif sekarang

// ===================== INIT =====================
window.onload = () => {
  loadReposFromStorage();
  renderRepoOptions();
};

// ===================== STORAGE =====================
function saveReposToStorage() {
  localStorage.setItem("repos", JSON.stringify(repos));
}

function loadReposFromStorage() {
  const data = localStorage.getItem("repos");
  repos = data ? JSON.parse(data) : {};
}

// ===================== RENDER =====================
function renderRepoOptions() {
  const repoSelect = document.getElementById("repoSelect");
  repoSelect.innerHTML = `<option value="">-- Pilih Repo --</option>`;
  Object.keys(repos).forEach(repoName => {
    const opt = document.createElement("option");
    opt.value = repoName;
    opt.textContent = repoName;
    repoSelect.appendChild(opt);
  });
}

function renderRepoContent() {
  const repoContent = document.getElementById("repoContent");
  repoContent.innerHTML = "";

  if (!currentRepo) {
    repoContent.innerHTML = "<p>Belum ada repo dipilih.</p>";
    return;
  }

  const repo = repos[currentRepo];

  const filesList = document.createElement("div");
  filesList.innerHTML = `<h3>📄 File</h3>`;
  repo.files.forEach(file => {
    const item = document.createElement("div");
    item.textContent = file;
    filesList.appendChild(item);
  });

  const foldersList = document.createElement("div");
  foldersList.innerHTML = `<h3>📂 Folder</h3>`;
  repo.folders.forEach(folder => {
    const item = document.createElement("div");
    item.textContent = folder;
    foldersList.appendChild(item);
  });

  repoContent.appendChild(filesList);
  repoContent.appendChild(foldersList);
}

// ===================== REPO =====================
document.getElementById("loadRepoBtn").addEventListener("click", () => {
  const repoSelect = document.getElementById("repoSelect");
  const repoName = repoSelect.value;

  if (!repoName) {
    alert("Pilih repo dulu!");
    return;
  }

  if (!repos[repoName]) {
    repos[repoName] = { files: [], folders: [] };
    saveReposToStorage();
  }

  currentRepo = repoName;
  renderRepoContent();
});

// Jalankan aksi khusus repo
document.getElementById("runRepoAction").addEventListener("click", () => {
  const action = document.getElementById("repoAction").value;

  if (action === "createRepo") {
    const repoName = prompt("Masukkan nama repo baru:");
    if (repoName && !repos[repoName]) {
      repos[repoName] = { files: [], folders: [] };
      saveReposToStorage();
      renderRepoOptions();
      alert("Repo berhasil dibuat!");
    }
  }

  if (action === "renameRepo") {
    if (!currentRepo) return alert("Pilih repo dulu!");
    const newName = prompt("Masukkan nama baru:", currentRepo);
    if (newName && !repos[newName]) {
      repos[newName] = repos[currentRepo];
      delete repos[currentRepo];
      currentRepo = newName;
      saveReposToStorage();
      renderRepoOptions();
      renderRepoContent();
      alert("Repo berhasil di-rename!");
    }
  }

  if (action === "deleteRepo") {
    if (!currentRepo) return alert("Pilih repo dulu!");
    if (confirm(`Hapus repo "${currentRepo}"?`)) {
      delete repos[currentRepo];
      currentRepo = null;
      saveReposToStorage();
      renderRepoOptions();
      renderRepoContent();
      alert("Repo berhasil dihapus!");
    }
  }

  document.getElementById("repoAction").value = "";
});

// ===================== FILE/FOLDER =====================
function runAction() {
  const action = document.getElementById("actionMenu").value;
  if (!currentRepo) {
    alert("Pilih repo dulu!");
    return;
  }

  if (action === "create") {
    const fileName = prompt("Nama file baru:");
    if (fileName) {
      repos[currentRepo].files.push(fileName);
      saveReposToStorage();
      renderRepoContent();
    }
  }

  if (action === "createFolder") {
    const folderName = prompt("Nama folder baru:");
    if (folderName) {
      repos[currentRepo].folders.push(folderName);
      saveReposToStorage();
      renderRepoContent();
    }
  }

  if (action === "rename") {
    const target = prompt("Nama file/folder yang mau di-rename:");
    if (target) {
      const newName = prompt("Nama baru:", target);
      if (newName) {
        let repo = repos[currentRepo];
        if (repo.files.includes(target)) {
          repo.files[repo.files.indexOf(target)] = newName;
        } else if (repo.folders.includes(target)) {
          repo.folders[repo.folders.indexOf(target)] = newName;
        }
        saveReposToStorage();
        renderRepoContent();
      }
    }
  }

  if (action === "delete") {
    const target = prompt("Nama file/folder yang mau dihapus:");
    if (target) {
      let repo = repos[currentRepo];
      repo.files = repo.files.filter(f => f !== target);
      repo.folders = repo.folders.filter(f => f !== target);
      saveReposToStorage();
      renderRepoContent();
    }
  }

  document.getElementById("actionMenu").value = "";
}
