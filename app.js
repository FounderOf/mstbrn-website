// =============================================
//   NEXTGEN COLLECTIVE — APP.JS
//   Auto-role by Niks, leaderboard, admin
// =============================================

// ─── TEAM ROLES CONFIG ─────────────────────────
// Edit bagian ini untuk mengatur peran tim.
// Format: "username_lowercase": { role, display, order, badge }
// Saat user daftar dengan username ini, peran otomatis ditetapkan.

const TEAM_ROLES = {
  // OWNER
  "namaowner":    { role: "owner",     display: "Owner",     order: 0, icon: "👑" },

  // FOUNDER
  "NiksTry":  { role: "founder",   display: "Founder",   order: 1, icon: "⭐" },

  // DEVELOPER
  "namadev":      { role: "developer", display: "Developer", order: 2, icon: "💻" },

  // ADMIN — bisa banyak
  "admin1":       { role: "admin",     display: "Admin",     order: 3, icon: "" },
  "admin2":       { role: "admin",     display: "Admin",     order: 3, icon: "" },
  "admin3":       { role: "admin",     display: "Admin",     order: 3, icon: "" },
  "admin4":       { role: "admin",     display: "Admin",     order: 3, icon: "" },

  // STAFF — bisa banyak juga
  "staff1":       { role: "staff",     display: "Staff",     order: 4, icon: "" },
  "staff2":       { role: "staff",     display: "Staff",     order: 4, icon: "" },
  "staff3":       { role: "staff",     display: "Staff",     order: 4, icon: "" },
};

// Role yang punya akses admin panel
const ADMIN_ROLES = ["owner", "founder", "developer", "admin", "staff"];

// ─── LEADERBOARD SCORE WEIGHTS ─────────────────
const SCORE_WEIGHTS = { post: 10, like: 2, comment: 1 };

// ─── GLOBALS ───────────────────────────────────
let currentUser = null;
let currentUserData = null;
let activePostId = null;
let feedUnsub = null;
let chatUnsub = null;

// ─── AUTH STATE ────────────────────────────────
auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUser = user;
    try {
      const doc = await db.collection("users").doc(user.uid).get();
      if (doc.exists) {
        currentUserData = doc.data();
      } else {
        currentUserData = { username: user.email.split("@")[0], role: "member", photoURL: "", bio: "", banned: false };
      }
      if (currentUserData.banned) {
        await auth.signOut();
        showToast("⛔ Akun kamu telah dibanned.");
        return;
      }
    } catch (e) {
      console.error(e);
      currentUserData = { username: "User", role: "member", photoURL: "", bio: "", banned: false };
    }
    showApp();
  } else {
    currentUser = null; currentUserData = null;
    hideApp();
  }
});

// ─── HELPERS: ROLE ─────────────────────────────
function getRoleForUsername(username) {
  if (!username) return null;
  return TEAM_ROLES[username.toLowerCase()] || null;
}

function isAdminRole(role) {
  return ADMIN_ROLES.includes(role);
}

function getRoleBadgeClass(role) {
  const map = { owner: "role-owner", founder: "role-founder", developer: "role-developer", admin: "role-admin", staff: "role-staff", member: "role-member" };
  return map[role] || "role-member";
}

function getRoleDisplay(role) {
  const map = { owner: "Owner", founder: "Founder", developer: "Developer", admin: "Admin", staff: "Staff", member: "Member" };
  return map[role] || "Member";
}

// ─── AUTH: FORMS ───────────────────────────────
function showReg() {
  document.querySelectorAll(".auth-form").forEach(f => f.classList.remove("active"));
  document.getElementById("registerForm").classList.add("active");
}
function showLogin() {
  document.querySelectorAll(".auth-form").forEach(f => f.classList.remove("active"));
  document.getElementById("loginForm").classList.add("active");
}

async function loginUser() {
  const email = document.getElementById("loginEmail").value.trim();
  const pw = document.getElementById("loginPassword").value;
  const err = document.getElementById("loginErr");
  err.textContent = "";
  if (!email || !pw) { err.textContent = "Mohon isi semua kolom."; return; }
  try {
    await auth.signInWithEmailAndPassword(email, pw);
  } catch (e) { err.textContent = friendlyErr(e.code); }
}

async function registerUser() {
  const username = document.getElementById("regUsername").value.trim();
  const email    = document.getElementById("regEmail").value.trim();
  const pw       = document.getElementById("regPassword").value;
  const err      = document.getElementById("regErr");
  err.textContent = "";
  if (!username || !email || !pw) { err.textContent = "Mohon isi semua kolom."; return; }
  if (username.length < 3) { err.textContent = "Username minimal 3 karakter."; return; }
  if (pw.length < 6) { err.textContent = "Password minimal 6 karakter."; return; }

  // Auto-detect role dari username
  const teamEntry = getRoleForUsername(username);
  const role = teamEntry ? teamEntry.role : "member";

  try {
    const cred = await auth.createUserWithEmailAndPassword(email, pw);
    await db.collection("users").doc(cred.user.uid).set({
      username, email, bio: "", photoURL: "", role,
      banned: false, postCount: 0, likeCount: 0, commentCount: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) { err.textContent = friendlyErr(e.code); }
}

async function logoutUser() {
  if (feedUnsub) { feedUnsub(); feedUnsub = null; }
  if (chatUnsub) { chatUnsub(); chatUnsub = null; }
  await auth.signOut();
}

function friendlyErr(code) {
  const m = {
    "auth/user-not-found": "Akun tidak ditemukan.",
    "auth/wrong-password": "Password salah.",
    "auth/email-already-in-use": "Email sudah terdaftar.",
    "auth/invalid-email": "Format email tidak valid.",
    "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi nanti.",
    "auth/invalid-credential": "Email atau password salah.",
    "auth/weak-password": "Password terlalu lemah.",
  };
  return m[code] || "Terjadi kesalahan. Coba lagi.";
}

// ─── SHOW / HIDE APP ───────────────────────────
function showApp() {
  document.getElementById("authOverlay").classList.add("hidden");
  document.getElementById("mainApp").classList.remove("hidden");
  initApp();
}
function hideApp() {
  document.getElementById("authOverlay").classList.remove("hidden");
  document.getElementById("mainApp").classList.add("hidden");
  document.querySelectorAll(".auth-form").forEach(f => f.classList.remove("active"));
  document.getElementById("loginForm").classList.add("active");
}

function initApp() {
  syncRoleIfNeeded();
  updateUI();
  loadFeed();
  loadTeamPanel();
  loadStats();
  if (isAdminRole(currentUserData?.role)) {
    document.querySelectorAll(".admin-gate").forEach(el => el.classList.remove("hidden"));
  }
}

// ─── SYNC ROLE ─────────────────────────────────
// Jika username cocok dengan TEAM_ROLES tapi role di Firestore belum diperbarui
async function syncRoleIfNeeded() {
  if (!currentUser || !currentUserData) return;
  const expected = getRoleForUsername(currentUserData.username);
  if (expected && expected.role !== currentUserData.role) {
    await db.collection("users").doc(currentUser.uid).update({ role: expected.role });
    currentUserData.role = expected.role;
    updateUI();
  }
}

function updateUI() {
  const ava = currentUserData?.photoURL || genAva(currentUserData?.username || "N");
  const username = currentUserData?.username || "User";
  const role = getRoleDisplay(currentUserData?.role || "member");

  setAva("sbAvatar", ava, username);
  setAva("composerAva", ava, username);
  setAva("commentAva", ava, username);
  setText("sbUsername", username);
  setText("sbRole", role);

  if (isAdminRole(currentUserData?.role)) {
    setAva("adminChatAva", ava, username);
  }
}

// ─── PAGE NAVIGATION ───────────────────────────
function showPage(name, el) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const t = document.getElementById("page-" + name);
  if (t) t.classList.add("active");

  document.querySelectorAll(".sbnav-item").forEach(i => i.classList.remove("active"));
  document.querySelectorAll(".mbn").forEach(i => i.classList.remove("active"));
  if (el) { const nav = el.closest?.(".sbnav-item,.mbn") || el; if (nav) nav.classList.add("active"); }

  if (name === "profile")     loadProfile();
  if (name === "explore")     loadExploreFeed();
  if (name === "leaderboard") loadLeaderboard();
  if (name === "admin")       { if (isAdminRole(currentUserData?.role)) loadAdminChat(); }
}

// ─── TEAM PANEL ────────────────────────────────
async function loadTeamPanel() {
  const el = document.getElementById("teamLeaderboard");
  if (!el) return;

  // Fetch all users
  try {
    const snap = await db.collection("users").get();
    const users = [];
    snap.forEach(doc => {
      const d = doc.data();
      users.push({ id: doc.id, ...d });
    });

    // Compute score for each
    users.forEach(u => {
      u._score = (u.postCount || 0) * SCORE_WEIGHTS.post +
                 (u.likeCount || 0) * SCORE_WEIGHTS.like +
                 (u.commentCount || 0) * SCORE_WEIGHTS.comment;
    });

    // Sort: first by role order, then by score
    users.sort((a, b) => {
      const aEntry = getRoleForUsername(a.username);
      const bEntry = getRoleForUsername(b.username);
      const aOrder = aEntry ? aEntry.order : 99;
      const bOrder = bEntry ? bEntry.order : 99;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return b._score - a._score;
    });

    el.innerHTML = "";
    users.slice(0, 8).forEach((u, idx) => {
      const entry = getRoleForUsername(u.username);
      const roleClass = getRoleBadgeClass(u.role || "member");
      const roleLabel = entry ? entry.display : getRoleDisplay(u.role || "member");
      const icon = entry?.icon || "";
      const ava = u.photoURL || genAva(u.username || "N");
      const rank = idx + 1;
      const rankClass = rank === 1 ? "r1" : rank === 2 ? "r2" : rank === 3 ? "r3" : "rn";
      const rankEmoji = rank === 1 ? "👑" : "";

      const row = document.createElement("div");
      row.className = `tlb-row ${rank<=3?"rank-"+rank:""}`;
      row.innerHTML = `
        <div class="tlb-rank ${rankClass}">${rank <= 3 ? ["🥇","🥈","🥉"][rank-1] : rank}</div>
        <div class="tlb-ava-wrap">
          <img class="tlb-ava" src="${esc(ava)}" alt="" onerror="this.src='${genAva(u.username||"N")}'" />
          ${rankEmoji ? `<span class="tlb-ava-crown">${rankEmoji}</span>` : ""}
        </div>
        <div class="tlb-info">
          <div class="tlb-name">${esc(u.username)}</div>
          <span class="tlb-role-badge ${roleClass}">${icon} ${roleLabel}</span>
        </div>
        <div class="tlb-score">${u._score}<span>POIN</span></div>
      `;
      el.appendChild(row);
    });
  } catch (e) {
    el.innerHTML = '<p style="text-align:center;padding:20px;color:var(--text-muted);font-size:.82rem;">Gagal memuat tim.</p>';
  }
}

// ─── LEADERBOARD PAGE ──────────────────────────
async function loadLeaderboard() {
  const el = document.getElementById("leaderboardList");
  el.innerHTML = '<div class="ngc-loader"><div class="ngc-spinner"></div></div>';

  try {
    const snap = await db.collection("users").get();
    const users = [];
    snap.forEach(doc => {
      const d = doc.data();
      const score = (d.postCount || 0) * SCORE_WEIGHTS.post +
                    (d.likeCount || 0) * SCORE_WEIGHTS.like +
                    (d.commentCount || 0) * SCORE_WEIGHTS.comment;
      users.push({ id: doc.id, ...d, _score: score });
    });

    // Sort by role order first, then score
    users.sort((a, b) => {
      const aE = getRoleForUsername(a.username);
      const bE = getRoleForUsername(b.username);
      const aO = aE ? aE.order : 99;
      const bO = bE ? bE.order : 99;
      if (aO !== bO) return aO - bO;
      return b._score - a._score;
    });

    // Header row
    el.innerHTML = `
      <div class="lb-header-row">
        <div class="lbh-rank">#</div>
        <div class="lbh-ava"></div>
        <div class="lbh-info">ANGGOTA</div>
        <div class="lbh-score">SKOR</div>
      </div>
    `;

    users.forEach((u, idx) => {
      const rank = idx + 1;
      const rankClass = rank === 1 ? "r1" : rank === 2 ? "r2" : rank === 3 ? "r3" : "rn";
      const entry = getRoleForUsername(u.username);
      const roleClass = getRoleBadgeClass(u.role || "member");
      const roleLabel = entry ? entry.display : getRoleDisplay(u.role || "member");
      const icon = entry?.icon || "";
      const ava = u.photoURL || genAva(u.username || "N");
      const isMe = u.id === currentUser?.uid;
      const crown = rank === 1 ? "👑" : "";

      const row = document.createElement("div");
      row.className = `lb-row ${rank <= 3 ? "rank-" + rank : ""}`;
      row.innerHTML = `
        <div class="lb-rank-num ${rankClass}">${rank<=3?["🥇","🥈","🥉"][rank-1]:rank}</div>
        <div class="lb-ava-wrap">
          <img class="lb-ava" src="${esc(ava)}" alt="" onerror="this.src='${genAva(u.username||"N")}'" />
          ${crown?`<span class="lb-crown">${crown}</span>`:""}
        </div>
        <div class="lb-info">
          <div class="lb-name">
            ${esc(u.username)}
            ${isMe ? '<span class="lb-you-tag">KAMU</span>' : ""}
          </div>
          <span class="tlb-role-badge ${roleClass}">${icon} ${roleLabel}</span>
        </div>
        <div class="lb-score-box">
          <div class="lb-score-num">${u._score}</div>
          <div class="lb-score-lbl">POIN</div>
        </div>
      `;
      el.appendChild(row);
    });
  } catch (e) {
    el.innerHTML = '<div class="ngc-loader">Gagal memuat leaderboard.</div>';
  }
}

// ─── FEED ──────────────────────────────────────
function loadFeed() {
  const el = document.getElementById("postFeed");
  el.innerHTML = '<div class="ngc-loader"><div class="ngc-spinner"></div><span>Memuat postingan...</span></div>';
  if (feedUnsub) feedUnsub();
  feedUnsub = db.collection("posts").orderBy("createdAt", "desc").limit(30)
    .onSnapshot(async (snap) => {
      if (snap.empty) {
        el.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:52px 0;font-family:Rajdhani,sans-serif;letter-spacing:.08em;">BELUM ADA POSTINGAN. JADILAH YANG PERTAMA!</p>';
        return;
      }
      el.innerHTML = "";
      for (const doc of snap.docs) el.appendChild(await renderPost(doc.id, doc.data()));
    }, err => {
      el.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:52px 0;">Gagal memuat postingan.</p>';
    });
}

function loadExploreFeed() {
  const el = document.getElementById("exploreFeed");
  el.innerHTML = '<div class="ngc-loader"><div class="ngc-spinner"></div></div>';
  db.collection("posts").orderBy("createdAt", "desc").limit(50).get().then(async snap => {
    if (snap.empty) { el.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:52px 0;">Belum ada postingan.</p>'; return; }
    el.innerHTML = "";
    for (const doc of snap.docs) el.appendChild(await renderPost(doc.id, doc.data()));
  });
}

// ─── RENDER POST ───────────────────────────────
async function renderPost(postId, data) {
  const card = document.createElement("div");
  card.className = "post-card"; card.id = "post-" + postId;

  const authorName = data.username || "User";
  const authorAva = data.photoURL || genAva(authorName);
  const likeCount = data.likeCount || 0;
  const commentCount = data.commentCount || 0;
  const timeStr = data.createdAt ? fmtTime(data.createdAt.toDate()) : "Baru saja";
  const isOwner = data.authorId === currentUser?.uid;
  const isAdmin = isAdminRole(currentUserData?.role);

  let liked = false;
  try {
    const ld = await db.collection("posts").doc(postId).collection("likes").doc(currentUser.uid).get();
    liked = ld.exists;
  } catch(e) {}

  card.innerHTML = `
    <div class="post-hdr">
      <img class="ava-md" src="${esc(authorAva)}" alt="" onerror="this.src='${genAva(authorName)}'" />
      <div class="post-author-wrap">
        <div class="post-author-name">${esc(authorName)}</div>
        <div class="post-time">${timeStr}</div>
      </div>
      <div class="post-menu">
        <button class="post-menu-btn" onclick="toggleMenu('${postId}')">···</button>
        <div class="post-dropdown hidden" id="menu-${postId}">
          <button onclick="sharePost('${postId}');closeMenu('${postId}')">
            <svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Bagikan
          </button>
          ${(isOwner || isAdmin) ? `
          <button class="dd-del" onclick="deletePost('${postId}');closeMenu('${postId}')">
            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
            Hapus
          </button>` : ""}
        </div>
      </div>
    </div>
    ${data.imageURL ? `<img class="post-img" src="${esc(data.imageURL)}" alt="" loading="lazy" />` : ""}
    ${data.caption ? `<div class="post-caption-wrap"><p class="post-caption">${esc(data.caption)}</p></div>` : ""}
    <div class="post-actions">
      <button class="action-btn ${liked?"liked":""}" id="like-${postId}" onclick="toggleLike('${postId}',this)">
        <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
        <span id="lc-${postId}">${likeCount}</span>
      </button>
      <button class="action-btn" onclick="openComments('${postId}')">
        <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        <span>${commentCount}</span>
      </button>
      <button class="action-btn" onclick="sharePost('${postId}')">
        <svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        SHARE
      </button>
    </div>`;
  return card;
}

// ─── POST MENU ─────────────────────────────────
function toggleMenu(id) {
  const m = document.getElementById("menu-" + id);
  if (!m) return;
  m.classList.toggle("hidden");
  if (!m.classList.contains("hidden")) {
    setTimeout(() => {
      function h(e) { if (!m.contains(e.target)) { m.classList.add("hidden"); document.removeEventListener("click", h); } }
      document.addEventListener("click", h);
    }, 10);
  }
}
function closeMenu(id) { document.getElementById("menu-" + id)?.classList.add("hidden"); }

// ─── SUBMIT POST ───────────────────────────────
let selectedFile = null;
function previewImg(e) {
  const f = e.target.files[0]; if (!f) return;
  selectedFile = f;
  const r = new FileReader();
  r.onload = ev => {
    document.getElementById("imgPreview").src = ev.target.result;
    document.getElementById("imgPreviewWrap").classList.remove("hidden");
  };
  r.readAsDataURL(f);
}
function removePreview() {
  selectedFile = null;
  document.getElementById("imgPreview").src = "";
  document.getElementById("imgPreviewWrap").classList.add("hidden");
  document.getElementById("imgUpload").value = "";
}
async function submitPost() {
  const caption = document.getElementById("captionInput").value.trim();
  if (!caption && !selectedFile) { showToast("Tambahkan caption atau foto."); return; }
  const prog = document.getElementById("uploadProg");
  const fill = document.getElementById("progFill");
  const txt  = document.getElementById("progTxt");
  let imageURL = "";
  try {
    if (selectedFile) {
      prog.classList.remove("hidden");
      const ref = storage.ref(`posts/${currentUser.uid}/${Date.now()}_${selectedFile.name}`);
      const task = ref.put(selectedFile);
      await new Promise((res, rej) => {
        task.on("state_changed",
          s => { const p = Math.round(s.bytesTransferred/s.totalBytes*100); fill.style.width=p+"%"; txt.textContent=`Mengunggah... ${p}%`; },
          rej, async () => { imageURL = await task.snapshot.ref.getDownloadURL(); res(); }
        );
      });
    }
    txt.textContent = "Memposting...";
    await db.collection("posts").add({
      caption, imageURL, authorId: currentUser.uid,
      username: currentUserData?.username || "User",
      photoURL: currentUserData?.photoURL || "",
      likeCount: 0, commentCount: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    // Increment user post count for leaderboard
    await db.collection("users").doc(currentUser.uid).update({ postCount: firebase.firestore.FieldValue.increment(1) });
    document.getElementById("captionInput").value = "";
    removePreview(); prog.classList.add("hidden"); fill.style.width = "0%";
    showToast("✅ Postingan berhasil dikirim!");
    loadStats(); loadTeamPanel();
  } catch (e) {
    prog.classList.add("hidden"); showToast("❌ Gagal memposting: " + e.message);
  }
}

// ─── LIKES ─────────────────────────────────────
async function toggleLike(postId, btn) {
  const likeRef = db.collection("posts").doc(postId).collection("likes").doc(currentUser.uid);
  const postRef = db.collection("posts").doc(postId);
  const cnt = document.getElementById("lc-" + postId);
  const ld = await likeRef.get();
  if (ld.exists) {
    await likeRef.delete();
    await postRef.update({ likeCount: firebase.firestore.FieldValue.increment(-1) });
    btn.classList.remove("liked"); cnt.textContent = Math.max(0, parseInt(cnt.textContent)-1);
  } else {
    await likeRef.set({ at: firebase.firestore.FieldValue.serverTimestamp() });
    await postRef.update({ likeCount: firebase.firestore.FieldValue.increment(1) });
    // Update liker's count
    await db.collection("users").doc(currentUser.uid).update({ likeCount: firebase.firestore.FieldValue.increment(1) });
    btn.classList.add("liked"); cnt.textContent = parseInt(cnt.textContent)+1;
  }
}

// ─── COMMENTS ──────────────────────────────────
function openComments(postId) {
  activePostId = postId;
  document.getElementById("commentModal").classList.remove("hidden");
  loadComments(postId);
}
function closeComments() {
  document.getElementById("commentModal").classList.add("hidden");
  document.getElementById("commentsList").innerHTML = "";
  document.getElementById("commentInput").value = "";
  activePostId = null;
}
async function loadComments(postId) {
  const el = document.getElementById("commentsList");
  el.innerHTML = '<div class="ngc-loader" style="padding:16px 0"><div class="ngc-spinner"></div></div>';
  const snap = await db.collection("posts").doc(postId).collection("comments").orderBy("createdAt","asc").limit(50).get();
  if (snap.empty) { el.innerHTML = '<p style="text-align:center;color:var(--text-muted);font-size:.82rem;padding:16px 0;">Belum ada komentar.</p>'; return; }
  el.innerHTML = "";
  snap.forEach(doc => {
    const d = doc.data();
    const div = document.createElement("div");
    div.className = "comment-item";
    div.innerHTML = `
      <img class="ava-sm" src="${esc(d.photoURL||genAva(d.username))}" alt="" onerror="this.src='${genAva(d.username)}'" />
      <div class="comment-body">
        <div class="comment-author">${esc(d.username)}</div>
        <div class="comment-text">${esc(d.text)}</div>
        <div class="comment-time">${d.createdAt?fmtTime(d.createdAt.toDate()):"Baru saja"}</div>
      </div>`;
    el.appendChild(div);
  });
  el.scrollTop = el.scrollHeight;
}
async function addComment() {
  const input = document.getElementById("commentInput");
  const text = input.value.trim();
  if (!text || !activePostId) return;
  input.value = "";
  await db.collection("posts").doc(activePostId).collection("comments").add({
    text, authorId: currentUser.uid,
    username: currentUserData?.username || "User",
    photoURL: currentUserData?.photoURL || "",
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  await db.collection("posts").doc(activePostId).update({ commentCount: firebase.firestore.FieldValue.increment(1) });
  await db.collection("users").doc(currentUser.uid).update({ commentCount: firebase.firestore.FieldValue.increment(1) });
  loadComments(activePostId);
}

// ─── SHARE ─────────────────────────────────────
function sharePost(postId) {
  const url = `${location.origin}${location.pathname}?post=${postId}`;
  navigator.clipboard?.writeText(url).then(()=>showToast("🔗 Link berhasil disalin!")).catch(()=>showToast("Post ID: "+postId));
}
function copyLink(url) {
  navigator.clipboard?.writeText(url).then(()=>showToast("🔗 Link berhasil disalin!")).catch(()=>{});
}

// ─── DELETE POST ───────────────────────────────
async function deletePost(postId) {
  if (!confirm("Hapus postingan ini secara permanen?")) return;
  try {
    await db.collection("posts").doc(postId).delete();
    document.getElementById("post-"+postId)?.remove();
    showToast("🗑️ Postingan dihapus.");
    loadStats(); loadTeamPanel();
  } catch(e) { showToast("❌ Gagal menghapus."); }
}

// ─── PROFILE ───────────────────────────────────
async function loadProfile() {
  const ava = currentUserData?.photoURL || genAva(currentUserData?.username||"N");
  setAva("profileAva", ava, currentUserData?.username||"N");
  setText("profileUsername", currentUserData?.username||"—");
  setText("profileEmail", currentUser?.email||"—");
  setText("profileBio", currentUserData?.bio||"Belum ada bio.");
  const chip = document.getElementById("profileRoleChip");
  if (chip) { chip.textContent = getRoleDisplay(currentUserData?.role||"member"); chip.className = `profile-role-chip`; }

  const el = document.getElementById("userPostFeed");
  el.innerHTML = '<div class="ngc-loader"><div class="ngc-spinner"></div></div>';
  const snap = await db.collection("posts").where("authorId","==",currentUser.uid).orderBy("createdAt","desc").limit(20).get();
  if (snap.empty) { el.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:48px 0;font-family:Rajdhani,sans-serif;letter-spacing:.08em;">BELUM ADA POSTINGAN.</p>'; return; }
  el.innerHTML = "";
  for (const doc of snap.docs) el.appendChild(await renderPost(doc.id, doc.data()));
}
function openEditProfile() {
  document.getElementById("editUsername").value = currentUserData?.username||"";
  document.getElementById("editBio").value = currentUserData?.bio||"";
  document.getElementById("editProfileModal").classList.remove("hidden");
}
function closeEditProfile() { document.getElementById("editProfileModal").classList.add("hidden"); }
async function saveProfile() {
  const username = document.getElementById("editUsername").value.trim();
  const bio = document.getElementById("editBio").value.trim();
  if (!username) { showToast("Username tidak boleh kosong."); return; }
  // Re-detect role from new username
  const entry = getRoleForUsername(username);
  const role = entry ? entry.role : currentUserData.role;
  try {
    await db.collection("users").doc(currentUser.uid).update({ username, bio, role });
    currentUserData.username = username; currentUserData.bio = bio; currentUserData.role = role;
    closeEditProfile(); updateUI(); loadProfile(); loadTeamPanel();
    showToast("✅ Profil diperbarui!");
  } catch(e) { showToast("❌ Gagal menyimpan."); }
}
async function uploadAva(e) {
  const f = e.target.files[0]; if (!f) return;
  showToast("Mengunggah foto profil...");
  try {
    const ref = storage.ref(`avatars/${currentUser.uid}/${Date.now()}`);
    await ref.put(f);
    const url = await ref.getDownloadURL();
    await db.collection("users").doc(currentUser.uid).update({ photoURL: url });
    currentUserData.photoURL = url;
    setAva("profileAva", url, currentUserData.username); updateUI();
    showToast("✅ Foto profil diperbarui!");
  } catch(e) { showToast("❌ Gagal mengunggah foto."); }
}

// ─── STATS ─────────────────────────────────────
async function loadStats() {
  try {
    const u = await db.collection("users").get();
    const p = await db.collection("posts").get();
    setText("statMembers", u.size); setText("statPosts", p.size);
  } catch(e) {}
}

// ─── ADMIN: CHAT ───────────────────────────────
function loadAdminChat() {
  if (!isAdminRole(currentUserData?.role)) return;
  const el = document.getElementById("adminChatMsgs");
  el.innerHTML = '<div class="ngc-loader"><div class="ngc-spinner"></div></div>';
  if (chatUnsub) chatUnsub();
  chatUnsub = db.collection("adminChat").orderBy("createdAt","asc").limit(100)
    .onSnapshot(snap => {
      el.innerHTML = "";
      if (snap.empty) { el.innerHTML = '<p style="text-align:center;color:var(--text-muted);font-size:.82rem;padding:30px 0;">Belum ada pesan.</p>'; return; }
      snap.forEach(doc => {
        const d = doc.data();
        const isOwn = d.authorId === currentUser.uid;
        const div = document.createElement("div");
        div.className = `chat-msg ${isOwn?"own":""}`;
        div.innerHTML = `
          <img class="ava-sm" src="${esc(d.photoURL||genAva(d.username))}" alt="" onerror="this.src='${genAva(d.username)}'" />
          <div class="chat-bubble">
            <div class="chat-author">${esc(d.username)}</div>
            <div class="chat-text">${esc(d.text)}</div>
            <div class="chat-time">${d.createdAt?fmtTime(d.createdAt.toDate()):"Baru saja"}</div>
          </div>`;
        el.appendChild(div);
      });
      el.scrollTop = el.scrollHeight;
    });
}
async function sendAdminChat() {
  if (!isAdminRole(currentUserData?.role)) return;
  const input = document.getElementById("adminChatInput");
  const text = input.value.trim(); if (!text) return;
  input.value = "";
  try {
    await db.collection("adminChat").add({
      text, authorId: currentUser.uid,
      username: currentUserData?.username || "Admin",
      photoURL: currentUserData?.photoURL || "",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch(e) { showToast("❌ Gagal mengirim pesan."); }
}

// ─── ADMIN: USERS ──────────────────────────────
async function loadAdminUsers() {
  if (!isAdminRole(currentUserData?.role)) return;
  const el = document.getElementById("adminUserList");
  el.innerHTML = '<div class="ngc-loader"><div class="ngc-spinner"></div></div>';
  const snap = await db.collection("users").orderBy("createdAt","desc").get();
  el.innerHTML = "";
  snap.forEach(doc => {
    const d = doc.data();
    const entry = getRoleForUsername(d.username);
    const roleClass = getRoleBadgeClass(d.role||"member");
    const roleLabel = getRoleDisplay(d.role||"member");
    const badgeClass = d.banned ? "role-banned" : roleClass;
    const badgeLabel = d.banned ? "Banned" : roleLabel;
    const row = document.createElement("div");
    row.className = "admin-user-row";
    row.innerHTML = `
      <img class="ava-md" src="${esc(d.photoURL||genAva(d.username))}" alt="" onerror="this.src='${genAva(d.username)}'" />
      <div class="aur-info">
        <span class="aur-name">${esc(d.username)}</span>
        <span class="aur-email">${esc(d.email)}</span>
      </div>
      <span class="tlb-role-badge ${badgeClass}">${badgeLabel}</span>
      ${doc.id !== currentUser.uid && !["owner","founder"].includes(d.role) ? `
        <button class="btn-danger-sm" onclick="toggleBan('${doc.id}',${d.banned})">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          ${d.banned?"Unban":"Ban"}
        </button>` : ""}`;
    el.appendChild(row);
  });
}
async function toggleBan(uid, isBanned) {
  if (!confirm(isBanned?"Unban user ini?":"Ban user ini?")) return;
  await db.collection("users").doc(uid).update({ banned: !isBanned });
  showToast(isBanned ? "✅ User di-unban." : "⛔ User di-ban.");
  loadAdminUsers();
}

// ─── ADMIN: ALL POSTS ──────────────────────────
async function loadAdminPosts() {
  if (!isAdminRole(currentUserData?.role)) return;
  const el = document.getElementById("adminPostList");
  el.innerHTML = '<div class="ngc-loader"><div class="ngc-spinner"></div></div>';
  const snap = await db.collection("posts").orderBy("createdAt","desc").limit(50).get();
  if (snap.empty) { el.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:48px 0;">Belum ada postingan.</p>'; return; }
  el.innerHTML = "";
  for (const doc of snap.docs) el.appendChild(await renderPost(doc.id, doc.data()));
}

// ─── ADMIN: TEAM ROLES PREVIEW ─────────────────
function loadTeamRolesPreview() {
  const el = document.getElementById("teamRolesPreview");
  if (!el) return;
  el.innerHTML = "";
  Object.entries(TEAM_ROLES).forEach(([uname, info]) => {
    const row = document.createElement("div");
    row.className = "trp-row";
    row.innerHTML = `
      <span class="trp-username">${info.icon} ${uname}</span>
      <span class="tlb-role-badge ${getRoleBadgeClass(info.role)}">${info.display}</span>`;
    el.appendChild(row);
  });
}

// ─── ADMIN TAB SWITCH ──────────────────────────
function switchAdminTab(tab, btn) {
  document.querySelectorAll(".atab").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById("adminTabChat").classList.toggle("hidden", tab !== "chat");
  document.getElementById("adminTabUsers").classList.toggle("hidden", tab !== "users");
  document.getElementById("adminTabPosts").classList.toggle("hidden", tab !== "posts");
  document.getElementById("adminTabTeam").classList.toggle("hidden", tab !== "team");
  if (tab === "chat")  loadAdminChat();
  if (tab === "users") loadAdminUsers();
  if (tab === "posts") loadAdminPosts();
  if (tab === "team")  loadTeamRolesPreview();
}

// ─── HELPERS ───────────────────────────────────
function genAva(name) {
  const letter = (name||"N")[0].toUpperCase();
  const c = document.createElement("canvas"); c.width=80; c.height=80;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0,0,80,80);
  g.addColorStop(0,"#2B8EFF"); g.addColorStop(1,"#0A5CE8");
  ctx.fillStyle=g; ctx.fillRect(0,0,80,80);
  ctx.fillStyle="#fff"; ctx.font="bold 34px Rajdhani,sans-serif";
  ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillText(letter,40,43);
  return c.toDataURL();
}

function esc(str) {
  if (!str) return "";
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

function fmtTime(date) {
  const s = Math.floor((new Date()-date)/1000);
  if (s<60) return "Baru saja";
  if (s<3600) return Math.floor(s/60)+" menit lalu";
  if (s<86400) return Math.floor(s/3600)+" jam lalu";
  if (s<604800) return Math.floor(s/86400)+" hari lalu";
  return date.toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"});
}

function setText(id, val) { const el=document.getElementById(id); if(el) el.textContent=val; }
function setAva(id, src, name) { const el=document.getElementById(id); if(el){ el.src=src; el.onerror=()=>{ el.src=genAva(name); }; } }

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent=msg; t.classList.remove("hidden");
  clearTimeout(t._t); t._t=setTimeout(()=>t.classList.add("hidden"),3200);
}

// ─── MODAL BACKDROP CLOSE ──────────────────────
document.getElementById("editProfileModal").addEventListener("click", e => { if(e.target===document.getElementById("editProfileModal")) closeEditProfile(); });
document.getElementById("commentModal").addEventListener("click", e => { if(e.target===document.getElementById("commentModal")) closeComments(); });
