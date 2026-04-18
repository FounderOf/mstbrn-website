// =============================================
//   NEXTGEN COLLECTIVE — APP.JS v4 FINAL
//   - Upload gambar & profil benar-benar fixed
//   - Role detection by username (case-insensitive)
//   - Admin nav muncul otomatis saat login
//   - Badge di post & komentar
//   - Team structure di bawah home
// =============================================

// ═══════════════════════════════════════════
//  EDIT BAGIAN INI — STRUKTUR TIM
//  Username harus PERSIS SAMA (case-insensitive)
// ═══════════════════════════════════════════
const TEAM_ROLES = {
  // ── TINGKAT 1: FOUNDER / OWNER ──────────
  "LeonYonn1":    { role: "founder_owner", display: "Founder",    divisi: "founder_owner", order: 0, icon: "👑" },

  // ── TINGKAT 2: CO FOUNDER / MANAGER ─────
  "NiksTry_":  { role: "rajaiblis",     display: "Raja Iblis", divisi: "rajaiblis",     order: 1, icon: "😈" },

  // ── TINGKAT 3: KETUA ─────────────────────
  "Sekay":    { role: "ketua",         display: "Ketua",      divisi: "ketua",         order: 2, icon: "🛡️" },
  
  // ── TINGKAT 4: ADMIN (bisa banyak) ──────
  "Ice":    { role: "admin",         display: "Admin",      divisi: "admin",         order: 3, icon: "🔧" },
  "Silver":    { role: "admin",         display: "Admin",      divisi: "admin",         order: 3, icon: "🔧" },
  "Mpittt":    { role: "admin",         display: "Admin",      divisi: "admin",         order: 3, icon: "🔧" },
  "ZoesaC24":    { role: "admin",         display: "Admin",      divisi: "admin",         order: 3, icon: "🔧" },
  // Tambah lebih banyak:
  // "namaadmin5":  { role: "admin", display: "Admin", divisi: "admin", order: 3, icon: "🔧" },
};

// Divisi info untuk rendering org chart
const DIVISI_INFO = {
  founder_owner: { label: "Founder / Owner",              icon: "👑", color: "#FFD700", border: "rgba(255,215,0,.35)",   bg: "rgba(255,215,0,.06)",   cls: "b-owner"     },
  rajaiblis:     { label: "Raja Iblis / Manager Server",  icon: "😈", color: "#48C4FF", border: "rgba(72,196,255,.35)",  bg: "rgba(72,196,255,.06)",  cls: "b-cofounder" },
  ketua:         { label: "Mentri Pertahanan / Ketua",    icon: "🛡️", color: "#7B9FFF", border: "rgba(123,159,255,.35)",bg: "rgba(123,159,255,.06)", cls: "b-ketua"     },
  admin:         { label: "Divisi Administrasi",          icon: "🔧", color: "#2B8EFF", border: "rgba(43,142,255,.3)",   bg: "rgba(43,142,255,.05)",  cls: "b-admin"     },
};

// Role yang bisa akses admin panel
const ADMIN_ROLES = ["founder_owner","rajaiblis","ketua","admin"];

// Skor leaderboard
const SCORE = { post: 10, like: 2, comment: 1 };

// ─── GLOBALS ────────────────────────────────
let CU   = null;  // currentUser
let CUD  = null;  // currentUserData
let activePid  = null;
let feedUnsub  = null;
let chatUnsub  = null;

// ─── AUTH STATE ─────────────────────────────
auth.onAuthStateChanged(async (user) => {
  if (user) {
    CU = user;
    try {
      const snap = await db.collection("users").doc(user.uid).get();
      CUD = snap.exists ? snap.data() : {
        username: user.email.split("@")[0], role: "member",
        photoURL: "", bio: "", banned: false,
        postCount:0, likeCount:0, commentCount:0
      };
    } catch (e) {
      console.error("Fetch user error:", e);
      CUD = { username: "User", role: "member", photoURL:"", bio:"", banned:false, postCount:0, likeCount:0, commentCount:0 };
    }
    if (CUD.banned) { await auth.signOut(); toast("⛔ Akun kamu dibanned."); return; }
    showApp();
  } else {
    CU = null; CUD = null;
    hideApp();
  }
});

// ─── ROLE HELPERS ───────────────────────────
function roleEntry(username) {
  if (!username) return null;
  return TEAM_ROLES[username.toLowerCase()] || null;
}
function isAdmin(role) { return ADMIN_ROLES.includes(role); }
function roleCls(role) {
  return { founder_owner:"b-owner", cofounder:"b-rajaiblis", ketua:"b-ketua", admin:"b-admin" }[role] || "";
}
function roleLabel(username, role) {
  const e = roleEntry(username);
  return e ? e.display : null;
}
function roleDisp(role) {
  return { founder_owner:"Founder / Owner", cofounder:"Raja Iblis", ketua:"Ketua", admin:"Admin", member:"Member" }[role] || "Member";
}

// ─── AUTH FORMS ─────────────────────────────
function showReg()   { setForms("registerForm"); }
function showLogin() { setForms("loginForm"); }
function setForms(active) {
  document.querySelectorAll(".auth-form").forEach(f => f.classList.remove("active"));
  document.getElementById(active).classList.add("active");
}

async function loginUser() {
  const email = v("loginEmail"), pw = v("loginPassword");
  const err = document.getElementById("loginErr");
  err.textContent = "";
  if (!email||!pw) { err.textContent="Mohon isi semua kolom."; return; }
  try { await auth.signInWithEmailAndPassword(email, pw); }
  catch(e) { err.textContent = authErr(e.code); }
}

async function registerUser() {
  const username = v("regUsername"), email = v("regEmail"), pw = v("regPassword");
  const err = document.getElementById("regErr");
  err.textContent = "";
  if (!username||!email||!pw) { err.textContent="Mohon isi semua kolom."; return; }
  if (username.length < 3)    { err.textContent="Username minimal 3 karakter."; return; }
  if (pw.length < 6)          { err.textContent="Password minimal 6 karakter."; return; }
  const entry = roleEntry(username);
  const role  = entry ? entry.role : "member";
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, pw);
    await db.collection("users").doc(cred.user.uid).set({
      username, email, bio:"", photoURL:"", role,
      banned:false, postCount:0, likeCount:0, commentCount:0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch(e) { err.textContent = authErr(e.code); }
}

async function logoutUser() {
  if (feedUnsub) { feedUnsub(); feedUnsub=null; }
  if (chatUnsub) { chatUnsub(); chatUnsub=null; }
  await auth.signOut();
}

function authErr(code) {
  return {
    "auth/user-not-found":       "Akun tidak ditemukan.",
    "auth/wrong-password":       "Password salah.",
    "auth/email-already-in-use": "Email sudah terdaftar.",
    "auth/invalid-email":        "Format email tidak valid.",
    "auth/too-many-requests":    "Terlalu banyak percobaan, coba lagi nanti.",
    "auth/invalid-credential":   "Email atau password salah.",
    "auth/weak-password":        "Password terlalu lemah.",
  }[code] || "Terjadi kesalahan, coba lagi.";
}

// ─── SHOW / HIDE APP ────────────────────────
async function showApp() {
  document.getElementById("authOverlay").classList.add("hidden");
  document.getElementById("mainApp").classList.remove("hidden");
  await initApp();
}
function hideApp() {
  document.getElementById("authOverlay").classList.remove("hidden");
  document.getElementById("mainApp").classList.add("hidden");
  setForms("loginForm");
}

async function initApp() {
  // 1. Sync role dari TEAM_ROLES → Firestore
  await syncRole();
  // 2. Update UI dengan data terbaru
  updateUI();
  // 3. Tampilkan admin nav jika perlu
  refreshAdminNav();
  // 4. Load data
  loadFeed();
  loadTeamStructure();
  loadStats();
}

// ─── SYNC ROLE ──────────────────────────────
async function syncRole() {
  if (!CU || !CUD) return;
  const entry = roleEntry(CUD.username);
  if (entry && entry.role !== CUD.role) {
    try {
      await db.collection("users").doc(CU.uid).update({ role: entry.role });
      CUD.role = entry.role;
      console.log(`✅ Role synced: ${CUD.username} → ${entry.role}`);
    } catch(e) { console.error("syncRole:", e); }
  }
}

function refreshAdminNav() {
  const show = isAdmin(CUD?.role);
  ["sbAdminLink","mobAdminBtn"].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.classList.toggle("hidden", !show); el.classList.toggle("admin-only", show); }
  });
}

function updateUI() {
  const ava  = CUD?.photoURL || genAva(CUD?.username||"N");
  const name = CUD?.username || "User";
  const role = roleDisp(CUD?.role||"member");
  setAva("sbAva", ava, name);
  setAva("composerAva", ava, name);
  setAva("commentAva", ava, name);
  setText("sbName", name);
  setText("sbRole", role);
  if (isAdmin(CUD?.role)) setAva("adminChatAva", ava, name);
}

// ─── PAGE NAVIGATION ────────────────────────
function navTo(name, el) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const pg = document.getElementById("page-"+name);
  if (pg) pg.classList.add("active");

  document.querySelectorAll(".sni,.mbn").forEach(i => i.classList.remove("active"));
  if (el) {
    const nav = el.closest?.(".sni,.mbn") || el;
    if (nav) nav.classList.add("active");
  }

  if (name === "profile")     loadProfile();
  if (name === "explore")     loadExploreFeed();
  if (name === "leaderboard") loadLeaderboard();
  if (name === "admin" && isAdmin(CUD?.role)) loadAdminChat();
}

// ─── TEAM STRUCTURE ─────────────────────────
async function loadTeamStructure() {
  const el = document.getElementById("teamStructure");
  if (!el) return;
  try {
    const snap = await db.collection("users").get();
    const users = [];
    snap.forEach(d => users.push({ id: d.id, ...d.data() }));

    // Kelompokkan per divisi
    const groups = {};
    ["founder_owner","cofounder","ketua","admin"].forEach(k => groups[k] = []);
    Object.entries(TEAM_ROLES).forEach(([uname, cfg]) => {
      const found = users.find(u => u.username?.toLowerCase() === uname);
      groups[cfg.divisi]?.push({
        username: found?.username || uname,
        ava: found?.photoURL || genAva(found?.username || uname),
        cfg
      });
    });

    el.innerHTML = "";
    const order = ["founder_owner","rajaiblis","ketua","admin"];
    let first = true;
    order.forEach(key => {
      const grp = groups[key];
      if (!grp?.length) return;
      const info = DIVISI_INFO[key];
      if (!first) {
        const conn = document.createElement("div");
        conn.className = "org-connector";
        el.appendChild(conn);
      }
      first = false;
      const sec = document.createElement("div");
      sec.className = "org-sec";
      sec.style.borderColor = info.border;
      sec.innerHTML = `
        <div class="org-sec-hdr" style="color:${info.color}">
          <span class="org-icon">${info.icon}</span>
          <span>${info.label.toUpperCase()}</span>
        </div>
        <div class="org-mbrs" id="orgd-${key}"></div>`;
      el.appendChild(sec);
      const mbrs = sec.querySelector(`#orgd-${key}`);
      grp.forEach(m => {
        const row = document.createElement("div");
        row.className = "org-row";
        row.innerHTML = `
          <img class="org-ava" src="${esc(m.ava)}" alt="" onerror="this.src='${genAva(m.username)}'" />
          <span class="org-mname">${esc(m.username)}</span>
          <span class="org-mtag" style="color:${info.color};border-color:${info.border};background:${info.bg}">${m.cfg.display}</span>`;
        mbrs.appendChild(row);
      });
    });
  } catch(e) {
    el.innerHTML = '<p style="text-align:center;padding:20px;color:var(--muted);font-size:.8rem;">Gagal memuat struktur tim.</p>';
    console.error("loadTeamStructure:", e);
  }
}

// ─── LEADERBOARD ────────────────────────────
async function loadLeaderboard() {
  const el = document.getElementById("lbList");
  el.innerHTML = '<div class="loader-wrap"><div class="ngc-spinner"></div></div>';
  try {
    const snap = await db.collection("users").get();
    const users = [];
    snap.forEach(d => {
      const ud = d.data();
      const score = (ud.postCount||0)*SCORE.post + (ud.likeCount||0)*SCORE.like + (ud.commentCount||0)*SCORE.comment;
      users.push({ id: d.id, ...ud, score });
    });
    users.sort((a,b) => {
      const aE = roleEntry(a.username), bE = roleEntry(b.username);
      const aO = aE ? aE.order : 99, bO = bE ? bE.order : 99;
      return aO !== bO ? aO - bO : b.score - a.score;
    });
    el.innerHTML = `
      <div class="lb-hdr-row">
        <div class="lbh-rank">#</div><div class="lbh-ava"></div>
        <div class="lbh-info">ANGGOTA</div><div class="lbh-score">SKOR</div>
      </div>`;
    users.forEach((u, i) => {
      const rank = i+1;
      const rc   = rank===1?"r1":rank===2?"r2":rank===3?"r3":"rn";
      const entry= roleEntry(u.username);
      const rCls = roleCls(u.role||"member");
      const rLbl = entry ? entry.display : roleDisp(u.role||"member");
      const icon = entry?.icon || "";
      const ava  = u.photoURL || genAva(u.username||"N");
      const isMe = u.id === CU?.uid;
      const row  = document.createElement("div");
      row.className = `lb-row${rank<=3?" rank-"+rank:""}`;
      row.innerHTML = `
        <div class="lb-rn ${rc}">${rank<=3?["🥇","🥈","🥉"][rank-1]:rank}</div>
        <div class="lb-aw">
          <img class="lb-ava" src="${esc(ava)}" alt="" onerror="this.src='${genAva(u.username||"N")}'" />
          ${rank===1?'<span class="lb-crown">👑</span>':""}
        </div>
        <div class="lb-info">
          <div class="lb-name">${esc(u.username)}${isMe?'<span class="lb-you">KAMU</span>':""}</div>
          ${rCls?`<span class="lb-rbadge ${rCls}">${icon} ${rLbl}</span>`:""}
        </div>
        <div class="lb-sb"><div class="lb-snum">${u.score}</div><div class="lb-slbl">POIN</div></div>`;
      el.appendChild(row);
    });
  } catch(e) {
    el.innerHTML = '<p style="text-align:center;padding:44px;color:var(--muted);">Gagal memuat leaderboard.</p>';
    console.error("loadLeaderboard:", e);
  }
}

// ─── STATS ──────────────────────────────────
async function loadStats() {
  try {
    const [u, p] = await Promise.all([db.collection("users").get(), db.collection("posts").get()]);
    setText("statMembers", u.size); setText("statPosts", p.size);
    setText("wh-members", u.size);  setText("wh-posts", p.size);
  } catch(e) { console.error("loadStats:", e); }
}

// ─── FEED ───────────────────────────────────
function loadFeed() {
  const el = document.getElementById("postFeed");
  el.innerHTML = '<div class="loader-wrap"><div class="ngc-spinner"></div></div>';
  if (feedUnsub) feedUnsub();
  feedUnsub = db.collection("posts").orderBy("createdAt","desc").limit(30)
    .onSnapshot(async snap => {
      if (snap.empty) {
        el.innerHTML = '<p style="text-align:center;color:var(--muted);padding:48px 0;font-family:Rajdhani,sans-serif;letter-spacing:.1em;font-size:.82rem;">BELUM ADA POSTINGAN. JADILAH YANG PERTAMA!</p>';
        return;
      }
      el.innerHTML = "";
      for (const doc of snap.docs) el.appendChild(await buildPost(doc.id, doc.data()));
    }, err => {
      el.innerHTML = '<p style="text-align:center;color:var(--muted);padding:48px 0;">Gagal memuat postingan.</p>';
      console.error("loadFeed:", err);
    });
}

function loadExploreFeed() {
  const el = document.getElementById("exploreFeed");
  el.innerHTML = '<div class="loader-wrap"><div class="ngc-spinner"></div></div>';
  db.collection("posts").orderBy("createdAt","desc").limit(50).get()
    .then(async snap => {
      if (snap.empty) { el.innerHTML='<p style="text-align:center;color:var(--muted);padding:48px 0;">Belum ada postingan.</p>'; return; }
      el.innerHTML = "";
      for (const doc of snap.docs) el.appendChild(await buildPost(doc.id, doc.data()));
    }).catch(e => { el.innerHTML='<p style="text-align:center;color:var(--muted);padding:48px 0;">Gagal memuat.</p>'; console.error(e); });
}

// ─── BUILD POST ─────────────────────────────
async function buildPost(pid, data) {
  const card = document.createElement("div");
  card.className = "post-card"; card.id = "post-"+pid;

  const name  = data.username || "User";
  const ava   = data.photoURL  || genAva(name);
  const role  = data.authorRole || "member";
  const lc    = data.likeCount    || 0;
  const cc    = data.commentCount || 0;
  const time  = data.createdAt ? fmt(data.createdAt.toDate()) : "Baru saja";
  const mine  = data.authorId === CU?.uid;
  const admin = isAdmin(CUD?.role);
  const bCls  = roleCls(role);
  const bLbl  = roleLabel(name, role);
  const badge = (bCls && bLbl) ? `<span class="post-badge ${bCls}">${bLbl}</span>` : "";

  let liked = false;
  try {
    const ld = await db.collection("posts").doc(pid).collection("likes").doc(CU.uid).get();
    liked = ld.exists;
  } catch(e) {}

  card.innerHTML = `
    <div class="post-hdr">
      <img class="ava-md" src="${esc(ava)}" alt="" onerror="this.src='${genAva(name)}'" />
      <div class="post-aw">
        <div class="post-name-row">
          <span class="post-name">${esc(name)}</span>${badge}
        </div>
        <div class="post-time">${time}</div>
      </div>
      <div class="post-menu">
        <button class="post-menu-btn" onclick="toggleMenu('${pid}')">···</button>
        <div class="post-dd hidden" id="menu-${pid}">
          <button onclick="sharePost('${pid}');closeMenu('${pid}')">
            <svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Bagikan
          </button>
          ${(mine||admin)?`
          <button class="dd-del" onclick="deletePost('${pid}');closeMenu('${pid}')">
            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
            Hapus
          </button>`:""}
        </div>
      </div>
    </div>
    ${data.imageURL?`<img class="post-img" src="${esc(data.imageURL)}" alt="" loading="lazy" />`:""}
    ${data.caption?`<div class="post-cap-wrap"><p class="post-cap">${esc(data.caption)}</p></div>`:""}
    <div class="post-actions">
      <button class="act-btn${liked?" liked":""}" id="like-${pid}" onclick="toggleLike('${pid}',this)">
        <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
        <span id="lc-${pid}">${lc}</span>
      </button>
      <button class="act-btn" onclick="openComments('${pid}')">
        <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        <span>${cc}</span>
      </button>
      <button class="act-btn" onclick="sharePost('${pid}')">
        <svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        SHARE
      </button>
    </div>`;
  return card;
}

// ─── POST MENU ──────────────────────────────
function toggleMenu(id) {
  const m = document.getElementById("menu-"+id);
  if (!m) return;
  m.classList.toggle("hidden");
  if (!m.classList.contains("hidden")) {
    setTimeout(() => {
      function h(e) { if (!m.contains(e.target)) { m.classList.add("hidden"); document.removeEventListener("click",h); } }
      document.addEventListener("click",h);
    }, 10);
  }
}
function closeMenu(id) { document.getElementById("menu-"+id)?.classList.add("hidden"); }

// ─── SUBMIT POST ────────────────────────────
let selFile = null;

function previewImg(e) {
  const f = e.target.files[0]; if (!f) return;
  selFile = f;
  const r = new FileReader();
  r.onload = ev => {
    document.getElementById("imgPreview").src = ev.target.result;
    document.getElementById("imgPreviewWrap").classList.remove("hidden");
  };
  r.readAsDataURL(f);
}

function removePreview() {
  selFile = null;
  document.getElementById("imgPreview").src = "";
  document.getElementById("imgPreviewWrap").classList.add("hidden");
  document.getElementById("imgUpload").value = "";
}

function autoResize(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 140) + "px";
}

async function submitPost() {
  const caption = v("captionInput");
  if (!caption && !selFile) { toast("Tambahkan caption atau foto terlebih dahulu."); return; }

  // Disable tombol agar tidak double submit
  const btn = document.getElementById("postBtn");
  if (btn) { btn.disabled = true; btn.style.opacity = ".5"; }

  const prog = document.getElementById("uploadProg");
  const fill = document.getElementById("progFill");
  const txt  = document.getElementById("progTxt");
  let imageURL = "";

  try {
    if (selFile) {
      prog.classList.remove("hidden");
      fill.style.width = "0%";
      // Pastikan storage sudah diinisialisasi
      if (!storage) throw new Error("Firebase Storage belum diinisialisasi. Periksa firebase-config.js");
      const ext  = selFile.name.split(".").pop();
      const path = `posts/${CU.uid}/${Date.now()}.${ext}`;
      const ref  = storage.ref(path);
      const task = ref.put(selFile, { contentType: selFile.type });

      await new Promise((res, rej) => {
        task.on("state_changed",
          snap => {
            const pct = Math.round(snap.bytesTransferred / snap.totalBytes * 100);
            fill.style.width = pct + "%";
            txt.textContent = `Mengunggah... ${pct}%`;
          },
          err => rej(err),
          async () => {
            imageURL = await task.snapshot.ref.getDownloadURL();
            res();
          }
        );
      });
    }

    txt.textContent = "Memposting...";
    await db.collection("posts").add({
      caption,
      imageURL,
      authorId:   CU.uid,
      username:   CUD?.username || "User",
      photoURL:   CUD?.photoURL || "",
      authorRole: CUD?.role || "member",
      likeCount: 0,
      commentCount: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Increment postCount untuk leaderboard
    await db.collection("users").doc(CU.uid).update({
      postCount: firebase.firestore.FieldValue.increment(1)
    });

    document.getElementById("captionInput").value = "";
    document.getElementById("captionInput").style.height = "auto";
    removePreview();
    prog.classList.add("hidden");
    fill.style.width = "0%";
    toast("✅ Postingan berhasil dikirim!");
    loadStats();

  } catch(e) {
    prog.classList.add("hidden");
    fill.style.width = "0%";
    console.error("submitPost error:", e);
    toast("❌ Gagal posting: " + (e.message || "Periksa koneksi dan Firebase Storage."));
  } finally {
    if (btn) { btn.disabled = false; btn.style.opacity = "1"; }
  }
}

// ─── LIKES ──────────────────────────────────
async function toggleLike(pid, btn) {
  const lRef = db.collection("posts").doc(pid).collection("likes").doc(CU.uid);
  const pRef = db.collection("posts").doc(pid);
  const cnt  = document.getElementById("lc-"+pid);
  try {
    const ld = await lRef.get();
    if (ld.exists) {
      await lRef.delete();
      await pRef.update({ likeCount: firebase.firestore.FieldValue.increment(-1) });
      btn.classList.remove("liked");
      cnt.textContent = Math.max(0, parseInt(cnt.textContent)-1);
    } else {
      await lRef.set({ at: firebase.firestore.FieldValue.serverTimestamp() });
      await pRef.update({ likeCount: firebase.firestore.FieldValue.increment(1) });
      await db.collection("users").doc(CU.uid).update({ likeCount: firebase.firestore.FieldValue.increment(1) });
      btn.classList.add("liked");
      cnt.textContent = parseInt(cnt.textContent)+1;
    }
  } catch(e) { console.error("toggleLike:", e); }
}

// ─── COMMENTS ───────────────────────────────
function openComments(pid) {
  activePid = pid;
  document.getElementById("commentModal").classList.remove("hidden");
  loadComments(pid);
}
function closeComments() {
  document.getElementById("commentModal").classList.add("hidden");
  document.getElementById("commentsList").innerHTML = "";
  document.getElementById("commentInput").value = "";
  activePid = null;
}

async function loadComments(pid) {
  const el = document.getElementById("commentsList");
  el.innerHTML = '<div class="loader-wrap" style="padding:16px 0"><div class="ngc-spinner"></div></div>';
  try {
    const snap = await db.collection("posts").doc(pid).collection("comments")
      .orderBy("createdAt","asc").limit(50).get();
    if (snap.empty) {
      el.innerHTML = '<p style="text-align:center;color:var(--muted);font-size:.8rem;padding:14px 0;">Belum ada komentar.</p>';
      return;
    }
    el.innerHTML = "";
    snap.forEach(doc => {
      const d   = doc.data();
      const bCls = roleCls(d.authorRole||"member");
      const bLbl = roleLabel(d.username, d.authorRole||"member");
      const badge = (bCls && bLbl) ? `<span class="comment-badge ${bCls}">${bLbl}</span>` : "";
      const div = document.createElement("div");
      div.className = "comment-item";
      div.innerHTML = `
        <img class="ava-sm" src="${esc(d.photoURL||genAva(d.username))}" alt="" onerror="this.src='${genAva(d.username)}'" />
        <div class="comment-body">
          <div class="comment-ar">
            <span class="comment-author">${esc(d.username)}</span>${badge}
          </div>
          <div class="comment-text">${esc(d.text)}</div>
          <div class="comment-time">${d.createdAt?fmt(d.createdAt.toDate()):"Baru saja"}</div>
        </div>`;
      el.appendChild(div);
    });
    el.scrollTop = el.scrollHeight;
  } catch(e) { console.error("loadComments:", e); }
}

async function addComment() {
  const input = document.getElementById("commentInput");
  const text  = input.value.trim();
  if (!text || !activePid) return;
  input.value = "";
  try {
    await db.collection("posts").doc(activePid).collection("comments").add({
      text,
      authorId:   CU.uid,
      username:   CUD?.username || "User",
      photoURL:   CUD?.photoURL || "",
      authorRole: CUD?.role || "member",
      createdAt:  firebase.firestore.FieldValue.serverTimestamp()
    });
    await db.collection("posts").doc(activePid).update({ commentCount: firebase.firestore.FieldValue.increment(1) });
    await db.collection("users").doc(CU.uid).update({ commentCount: firebase.firestore.FieldValue.increment(1) });
    loadComments(activePid);
  } catch(e) { console.error("addComment:", e); }
}

// ─── SHARE / DELETE ─────────────────────────
function sharePost(pid) {
  const url = `${location.origin}${location.pathname}?post=${pid}`;
  navigator.clipboard?.writeText(url).then(()=>toast("🔗 Link disalin!")).catch(()=>toast("Post ID: "+pid));
}
function copyLink(url) { navigator.clipboard?.writeText(url).then(()=>toast("🔗 Link disalin!")).catch(()=>{}); }

async function deletePost(pid) {
  if (!confirm("Hapus postingan ini secara permanen?")) return;
  try {
    await db.collection("posts").doc(pid).delete();
    document.getElementById("post-"+pid)?.remove();
    toast("🗑️ Postingan dihapus.");
    loadStats();
  } catch(e) { toast("❌ Gagal menghapus."); console.error(e); }
}

// ─── PROFILE ────────────────────────────────
async function loadProfile() {
  const ava = CUD?.photoURL || genAva(CUD?.username||"N");
  setAva("profileAva", ava, CUD?.username||"N");
  setText("profileName",  CUD?.username || "—");
  setText("profileEmail", CU?.email || "—");
  setText("profileBio",   CUD?.bio || "Belum ada bio.");
  const chip = document.getElementById("profileChip");
  if (chip) chip.textContent = roleDisp(CUD?.role||"member");

  const el = document.getElementById("userPostFeed");
  el.innerHTML = '<div class="loader-wrap"><div class="ngc-spinner"></div></div>';
  try {
    const snap = await db.collection("posts")
      .where("authorId","==",CU.uid)
      .orderBy("createdAt","desc").limit(20).get();
    if (snap.empty) {
      el.innerHTML = '<p style="text-align:center;color:var(--muted);padding:44px 0;font-family:Rajdhani,sans-serif;letter-spacing:.08em;font-size:.8rem;">BELUM ADA POSTINGAN.</p>';
      return;
    }
    el.innerHTML = "";
    for (const doc of snap.docs) el.appendChild(await buildPost(doc.id, doc.data()));
  } catch(e) {
    el.innerHTML = '<p style="text-align:center;color:var(--muted);padding:44px 0;">Gagal memuat postingan.</p>';
    console.error("loadProfile posts:", e);
  }
}

function openEditProfile() {
  document.getElementById("editUsername").value = CUD?.username || "";
  document.getElementById("editBio").value      = CUD?.bio || "";
  document.getElementById("editModal").classList.remove("hidden");
}
function closeEditProfile() { document.getElementById("editModal").classList.add("hidden"); }

async function saveProfile() {
  const username = document.getElementById("editUsername").value.trim();
  const bio      = document.getElementById("editBio").value.trim();
  if (!username) { toast("Username tidak boleh kosong."); return; }
  const entry = roleEntry(username);
  // Jika username ada di TEAM_ROLES → pakai role baru. Kalau tidak → pertahankan role lama jika admin, else member
  const role = entry ? entry.role : (isAdmin(CUD.role) ? CUD.role : "member");
  try {
    await db.collection("users").doc(CU.uid).update({ username, bio, role });
    CUD.username = username; CUD.bio = bio; CUD.role = role;
    closeEditProfile();
    updateUI();
    refreshAdminNav();
    loadProfile();
    loadTeamStructure();
    toast("✅ Profil diperbarui! Role: " + roleDisp(role));
  } catch(e) { toast("❌ Gagal menyimpan."); console.error(e); }
}

async function uploadAva(e) {
  const f = e.target.files[0]; if (!f) return;
  toast("Mengunggah foto profil...");
  try {
    if (!storage) throw new Error("Firebase Storage belum diinisialisasi.");
    const ext  = f.name.split(".").pop();
    const path = `avatars/${CU.uid}/${Date.now()}.${ext}`;
    const ref  = storage.ref(path);
    const snap = await ref.put(f, { contentType: f.type });
    const url  = await snap.ref.getDownloadURL();
    await db.collection("users").doc(CU.uid).update({ photoURL: url });
    CUD.photoURL = url;
    setAva("profileAva", url, CUD.username);
    updateUI();
    toast("✅ Foto profil diperbarui!");
  } catch(e) { toast("❌ Gagal upload foto: " + e.message); console.error("uploadAva:", e); }
}

// ─── ADMIN: CHAT ────────────────────────────
function loadAdminChat() {
  if (!isAdmin(CUD?.role)) return;
  const el = document.getElementById("adminChatMsgs");
  el.innerHTML = '<div class="loader-wrap"><div class="ngc-spinner"></div></div>';
  if (chatUnsub) chatUnsub();
  chatUnsub = db.collection("adminChat").orderBy("createdAt","asc").limit(100)
    .onSnapshot(snap => {
      el.innerHTML = "";
      if (snap.empty) {
        el.innerHTML = '<p style="text-align:center;color:var(--muted);font-size:.8rem;padding:26px 0;">Belum ada pesan.</p>';
        return;
      }
      snap.forEach(doc => {
        const d  = doc.data();
        const own = d.authorId === CU.uid;
        const div = document.createElement("div");
        div.className = `chat-msg${own?" own":""}`;
        div.innerHTML = `
          <img class="ava-sm" src="${esc(d.photoURL||genAva(d.username))}" alt="" onerror="this.src='${genAva(d.username)}'" />
          <div class="chat-bubble">
            <div class="chat-author">${esc(d.username)}</div>
            <div class="chat-text">${esc(d.text)}</div>
            <div class="chat-time">${d.createdAt?fmt(d.createdAt.toDate()):"Baru saja"}</div>
          </div>`;
        el.appendChild(div);
      });
      el.scrollTop = el.scrollHeight;
    }, err => console.error("adminChat:", err));
}

async function sendAdminChat() {
  if (!isAdmin(CUD?.role)) return;
  const input = document.getElementById("adminChatInput");
  const text  = input.value.trim(); if (!text) return;
  input.value = "";
  try {
    await db.collection("adminChat").add({
      text,
      authorId: CU.uid,
      username: CUD?.username || "Admin",
      photoURL: CUD?.photoURL || "",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch(e) { toast("❌ Gagal kirim pesan."); console.error(e); }
}

// ─── ADMIN: USERS ───────────────────────────
async function loadAdminUsers() {
  if (!isAdmin(CUD?.role)) return;
  const el = document.getElementById("adminUserList");
  el.innerHTML = '<div class="loader-wrap"><div class="ngc-spinner"></div></div>';
  try {
    const snap = await db.collection("users").orderBy("createdAt","desc").get();
    el.innerHTML = "";
    snap.forEach(doc => {
      const d    = doc.data();
      const entry= roleEntry(d.username);
      const bCls = roleCls(d.role||"member");
      const bLbl = d.banned ? "Banned" : (entry ? entry.display : roleDisp(d.role||"member"));
      const cls  = d.banned ? "" : bCls;
      const row  = document.createElement("div");
      row.className = "admin-user-row";
      row.innerHTML = `
        <img class="ava-md" src="${esc(d.photoURL||genAva(d.username))}" alt="" onerror="this.src='${genAva(d.username)}'" />
        <div class="aur-info">
          <span class="aur-name">${esc(d.username)}</span>
          <span class="aur-email">${esc(d.email)}</span>
        </div>
        <span class="post-badge ${cls}" style="font-size:.65rem;padding:3px 9px">${bLbl}</span>
        ${doc.id!==CU.uid&&d.role!=="founder_owner"?`
        <button class="btn-danger-sm" onclick="toggleBan('${doc.id}',${!!d.banned})">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          ${d.banned?"Unban":"Ban"}
        </button>`:""}`;
      el.appendChild(row);
    });
  } catch(e) { el.innerHTML='<p style="padding:20px;color:var(--muted);">Gagal memuat user.</p>'; console.error(e); }
}

async function toggleBan(uid, isBanned) {
  if (!confirm(isBanned?"Unban user ini?":"Ban user ini dari komunitas?")) return;
  try {
    await db.collection("users").doc(uid).update({ banned: !isBanned });
    toast(isBanned ? "✅ User di-unban." : "⛔ User di-ban.");
    loadAdminUsers();
  } catch(e) { toast("❌ Gagal."); }
}

// ─── ADMIN: ALL POSTS ───────────────────────
async function loadAdminPosts() {
  if (!isAdmin(CUD?.role)) return;
  const el = document.getElementById("adminPostList");
  el.innerHTML = '<div class="loader-wrap"><div class="ngc-spinner"></div></div>';
  try {
    const snap = await db.collection("posts").orderBy("createdAt","desc").limit(50).get();
    if (snap.empty) { el.innerHTML='<p style="text-align:center;color:var(--muted);padding:44px 0;">Belum ada postingan.</p>'; return; }
    el.innerHTML = "";
    for (const doc of snap.docs) el.appendChild(await buildPost(doc.id, doc.data()));
  } catch(e) { el.innerHTML='<p style="padding:20px;color:var(--muted);">Gagal memuat postingan.</p>'; console.error(e); }
}

// ─── ADMIN TAB SWITCH ───────────────────────
function switchTab(tab, btn) {
  document.querySelectorAll(".atab").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById("adminTabChat").classList.toggle("hidden",  tab!=="chat");
  document.getElementById("adminTabUsers").classList.toggle("hidden", tab!=="users");
  document.getElementById("adminTabPosts").classList.toggle("hidden", tab!=="posts");
  if (tab==="chat")  loadAdminChat();
  if (tab==="users") loadAdminUsers();
  if (tab==="posts") loadAdminPosts();
}

// ─── HELPERS ────────────────────────────────
function genAva(name) {
  const letter = (name||"N")[0].toUpperCase();
  const c = document.createElement("canvas"); c.width=80; c.height=80;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0,0,80,80);
  g.addColorStop(0,"#2B8EFF"); g.addColorStop(1,"#0A5CE8");
  ctx.fillStyle=g; ctx.fillRect(0,0,80,80);
  ctx.fillStyle="#fff"; ctx.font="bold 36px Rajdhani,sans-serif";
  ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillText(letter,40,44);
  return c.toDataURL();
}

function esc(str) {
  if (str===null||str===undefined) return "";
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

function fmt(date) {
  if (!date) return "Baru saja";
  const s = Math.floor((new Date()-date)/1000);
  if (s<60) return "Baru saja";
  if (s<3600) return Math.floor(s/60)+" menit lalu";
  if (s<86400) return Math.floor(s/3600)+" jam lalu";
  if (s<604800) return Math.floor(s/86400)+" hari lalu";
  return date.toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"});
}

function v(id)  { return document.getElementById(id)?.value?.trim()||""; }
function setText(id, val) { const e=document.getElementById(id); if(e) e.textContent=val; }
function setAva(id, src, name) {
  const e = document.getElementById(id);
  if (!e) return;
  e.src = src;
  e.onerror = () => { e.src = genAva(name); e.onerror = null; };
}

function toast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.add("hidden"), 3400);
}

// ─── MODAL CLOSE ON BACKDROP ────────────────
document.getElementById("editModal").addEventListener("click", e => { if(e.target===document.getElementById("editModal")) closeEditProfile(); });
document.getElementById("commentModal").addEventListener("click", e => { if(e.target===document.getElementById("commentModal")) closeComments(); });
