// ===== Terminal/log =====
const output = document.getElementById('output');
function log(msg, type='info') {
  const p = document.createElement('p');
  p.textContent = msg;
  if(type==='error') p.style.color='red';
  output.appendChild(p);
  output.scrollTop = output.scrollHeight;
}

// ===== Token GitHub =====
const userInput = document.getElementById('userInput');
const submitBtn = document.getElementById('submitBtn');

submitBtn.addEventListener('click', () => {
  const val = userInput.value.trim();
  if(!val) return;

  if(val.startsWith('set token ')) {
    const token = val.replace('set token ','');
    localStorage.setItem('gh_token', token);
    log('✅ Token GitHub tersimpan!');
  } else if(val==='show token') {
    const token = localStorage.getItem('gh_token');
    log(token ? `Token: ${token}` : '❌ Belum ada token tersimpan');
  } else {
    log(`Perintah tidak dikenali: ${val}`, 'error');
  }
  userInput.value='';
});

// ===== File Manager =====
const filePicker = document.getElementById('filePicker');
const dirPicker = document.getElementById('dirPicker');
const fileManager = document.createElement('div');
fileManager.style.cssText='margin-top:10px;padding:5px;background:#222;border-radius:5px;display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:5px;';
document.querySelector('.container').appendChild(fileManager);

const filesSelected = [];

document.getElementById('pickFilesBtn').addEventListener('click', ()=>filePicker.click());
document.getElementById('pickFolderBtn').addEventListener('click', ()=>dirPicker.click());

filePicker.addEventListener('change', e=>{
  const files = Array.from(e.target.files);
  filesSelected.push(...files);
  log(`📁 File dipilih: ${files.map(f=>f.name).join(', ')}`);
  renderFileManager();
});

dirPicker.addEventListener('change', e=>{
  const files = Array.from(e.target.files);
  filesSelected.push(...files);
  log(`📂 Folder dipilih (${files.length} file)`);
  renderFileManager();
});

// ===== Render File Manager Visual =====
function renderFileManager() {
  fileManager.innerHTML='';
  filesSelected.forEach((f,i)=>{
    const div = document.createElement('div');
    div.style.cssText='padding:5px;background:#333;border-radius:5px;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:12px;';

    // Thumbnail / icon
    if(f.type.startsWith('image/')){
      const img = document.createElement('img');
      img.src = URL.createObjectURL(f);
      img.style.cssText='width:80px;height:80px;object-fit:cover;margin-bottom:5px;border-radius:3px;';
      div.appendChild(img);
    } else {
      const icon = document.createElement('div');
      icon.textContent='📄';
      icon.style.fontSize='40px';
      div.appendChild(icon);
    }

    // Nama file
    const name = document.createElement('div');
    name.textContent = f.name;
    name.style.textAlign='center';
    div.appendChild(name);

    // Tombol Commit/Push per file
    const btn = document.createElement('button');
    btn.textContent='Commit/Push';
    btn.style.cssText='margin-top:5px;font-size:10px;padding:2px 4px;background:#555;color:#fff;border:none;border-radius:3px;cursor:pointer;';
    btn.addEventListener('click', ()=>deploySingle(f));
    div.appendChild(btn);

    fileManager.appendChild(div);
  });
}

// ===== Drag & Drop =====
fileManager.addEventListener('dragover', e=>{ e.preventDefault(); });
fileManager.addEventListener('drop', e=>{
  e.preventDefault();
  const dt = e.dataTransfer;
  if(dt.files.length){
    const files = Array.from(dt.files);
    filesSelected.push(...files);
    log(`📂 Drag & Drop (${files.length} file/folder)`);
    renderFileManager();
  }
});

// ===== Deploy Single File =====
async function deploySingle(file){
  const token = localStorage.getItem('gh_token');
  if(!token){ log('❌ Belum ada token! Ketik: set token ghp_xxx','error'); return; }
  
  const repoOwner = prompt('Masukkan username/owner repo GitHub:');
  const repoName = prompt('Masukkan nama repo:');
  if(!repoOwner || !repoName) return log('❌ Owner/Repo kosong','error');

  const path = file.webkitRelativePath || file.name;
  const content = await file.arrayBuffer();
  const b64 = btoa(String.fromCharCode(...new Uint8Array(content)));

  const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}`;

  let sha = null;
  try{
    const res = await fetch(apiUrl,{ headers:{Authorization:`token ${token}`}});
    if(res.ok){ const data=await res.json(); sha=data.sha; }
  } catch(e){}

  const body = JSON.stringify({ message:`Add/Update ${path}`, content:b64, sha:sha||undefined });

  try{
    const resp = await fetch(apiUrl,{
      method:'PUT',
      headers:{ Authorization:`token ${token}`, 'Content-Type':'application/json' },
      body:body
    });
    if(resp.ok) log(`✅ Berhasil deploy: ${path}`);
    else {
      const err = await resp.json();
      log(`❌ Gagal deploy ${path}: ${err.message}`,'error');
    }
  } catch(e){ log(`❌ Error deploy ${path}: ${e.message}`,'error'); }
}

// ===== Deploy Semua File =====
async function deployAll(){
  for(let file of filesSelected) await deploySingle(file);
  log('🚀 Semua file telah dideploy!');
}

// ===== Tombol A–G =====
document.querySelectorAll('.scroll-container button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const opt = btn.dataset.opt;
    switch(opt){
      case 'A': log('⚡ A: Deploy semua file'); deployAll(); break;
      case 'B': log('⚡ B: Commit simulasi'); break;
      case 'C': log('⚡ C: Cek status repo'); break;
      case 'D': log('⚡ D: Buat branch baru'); break;
      case 'E': log('⚡ E: Commit file'); break;
      case 'F': log('⚡ F: Push ke GitHub'); break;
      case 'G': 
        if(confirm('Yakin ingin hapus semua file/folder dari grid?')){
          fileManager.innerHTML=''; 
          filesSelected.length=0;
          log('🗑 Semua file/folder dihapus dari daftar');
        } else log('❌ Hapus dibatalkan');
        break;
      default: log('⚠ Tombol tidak dikenali', 'error');
    }
  });
});



// Ambil tombol
const modeToggle = document.getElementById('modeToggle');

// Cek localStorage dulu (supaya mode tersimpan)
if(localStorage.getItem('mode')==='dark'){
  document.body.classList.add('dark');
}

// Event klik toggle
modeToggle.addEventListener('click', ()=>{
  document.body.classList.toggle('dark'); // tambahkan/hapus kelas dark
  const mode = document.body.classList.contains('dark') ? 'Dark' : 'Light';
  console.log(`Mode diubah ke: ${mode}`);
  
  // simpan preferensi
  if(mode==='Dark') localStorage.setItem('mode','dark');
  else localStorage.setItem('mode','light');
});