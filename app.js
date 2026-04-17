// =============================================
//   MSTBRN COMMUNITY — APP.JS v2
//   Complete with: Secret Admin, Team Panel,
//   Admin Chat, Links, Roblox Maps, TikTok
// =============================================

// ─── CONFIG ───────────────────────────────────
const ADMIN_SECRET_PASSWORD = "mstbrn_admin_2025"; // Ganti dengan password rahasia Anda
const LOGO_CLICK_TARGET = 5; // Klik logo berapa kali untuk membuka admin login

// ─── GLOBALS ──────────────────────────────────
let currentUser = null;
let currentUserData = null;
let activePostId = null;
let feedUnsubscribe = null;
let chatUnsubscribe = null;
let logoClickCount = 0;
let logoClickTimer = null;

// ─── AUTH STATE ────────────────────────────────
auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUser = user;
    try {
      const userDoc = await db.collection("users").doc(user.uid).get();
      if (userDoc.exists) {
        currentUserData = userDoc.data();
      } else {
        currentUserData = { username: user.email.split("@")[0], role: "user", bio: "", photoURL: "", banned: false };
      }
      if (currentUserData.banned) {
        await auth.signOut();
        showToast("⛔ Akun kamu telah dibanned.");
        return;
      }
    } catch (e) {
      console.error("Error fetching user data:", e);
      currentUserData = { username: user.email.split("@")[0], role: "user", bio: "", photoURL: "", banned: false };
    }
    showApp();
  } else {
    currentUser = null;
    currentUserData = null;
    hideApp();
  }
});

// ─── SECRET LOGO CLICK ─────────────────────────
document.getElementById("secretLogoTrigger").addEventListener("click", () => {
  logoClickCount++;
  clearTimeout(logoClickTimer);

  const remaining = LOGO_CLICK_TARGET - logoClickCount;
  const hint = document.getElementById("logoClickHint");

  if (logoClickCount >= LOGO_CLICK_TARGET) {
    logoClickCount = 0;
    hint.textContent = "";
    showAdminSecretForm();
  } else if (logoClickCount >= 2) {
    hint.textContent = `${remaining} lagi...`;
    hint.style.color = "rgba(255,200,0,0.6)";
  }

  logoClickTimer = setTimeout(() => {
    logoClickCount = 0;
    const hint = document.getElementById("logoClickHint");
    hint.textContent = "";
  }, 2000);
});

function showAdminSecretForm() {
  document.querySelectorAll(".auth-form").forEach(f => f.classList.remove("active"));
  document.getElementById("adminSecretForm").classList.add("active");
  document.getElementById("adminSecretPass").focus();
}

function verifyAdminSecret() {
  const pass = document.getElementById("adminSecretPass").value;
  const err = document.getElementById("adminSecretError");
  err.textContent = "";

  if (pass === ADMIN_SECRET_PASSWORD) {
    // Mark this browser session as admin-unlocked
    sessionStorage.setItem("adminUnlocked", "true");
    showToast("✅ Password benar! Silakan login dengan akun admin.");
    showLogin();
    document.getElementById("adminSecretPass").value = "";
  } else {
    err.textContent = "Password salah. Akses ditolak.";
    document.getElementById("adminSecretPass").value = "";
  }
}

// ─── AUTH FORMS ────────────────────────────────
function showRegister() {
  document.querySelectorAll(".auth-form").forEach(f => f.classList.remove("active"));
  document.getElementById("registerForm").classList.add("active");
}
function showLogin() {
  document.querySelectorAll(".auth-form").forEach(f => f.classList.remove("active"));
  document.getElementById("loginForm").classList.add("active");
}

async function loginUser() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const err = document.getElementById("loginError");
  err.textContent = "";
  if (!email || !password) { err.textContent = "Mohon isi semua kolom."; return; }
  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (e) {
    err.textContent = friendlyError(e.code);
  }
}

async function registerUser() {
  const username = document.getElementById("regUsername").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;
  const err = document.getElementById("registerError");
  err.textContent = "";
  if (!username || !email || !password) { err.textContent = "Mohon isi semua kolom."; return; }
  if (username.length < 3) { err.textContent = "Username minimal 3 karakter."; return; }
  if (password.length < 6) { err.textContent = "Password minimal 6 karakter."; return; }
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await db.collection("users").doc(cred.user.uid).set({
      username, email, bio: "", photoURL: "", role: "user", banned: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {
    err.textContent = friendlyError(e.code);
  }
}

async function logoutUser() {
  if (feedUnsubscribe) { feedUnsubscribe(); feedUnsubscribe = null; }
  if (chatUnsubscribe) { chatUnsubscribe(); chatUnsubscribe = null; }
  await auth.signOut();
}

function friendlyError(code) {
  const map = {
    "auth/user-not-found": "Akun tidak ditemukan.",
    "auth/wrong-password": "Password salah.",
    "auth/email-already-in-use": "Email sudah terdaftar.",
    "auth/invalid-email": "Format email tidak valid.",
    "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi nanti.",
    "auth/weak-password": "Password terlalu lemah.",
    "auth/invalid-credential": "Email atau password salah.",
  };
  return map[code] || "Terjadi kesalahan. Coba lagi.";
}

// ─── APP SHOW/HIDE ─────────────────────────────
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
  updateUI();
  loadFeed();
  loadStats();
  if (currentUserData?.role === "admin") {
    document.querySelectorAll(".admin-only").forEach(el => el.classList.remove("hidden"));
    document.getElementById("adminNavItem").classList.remove("hidden");
    document.getElementById("mobileAdminTab")?.classList.remove("hidden");
  }
}

function updateUI() {
  const avatar = currentUserData?.photoURL || genAvatar(currentUserData?.username || "U");
  const username = currentUserData?.username || "User";
  const role = currentUserData?.role === "admin" ? "Admin" : "Member";

  document.getElementById("sidebarAvatar").src = avatar;
  document.getElementById("sidebarAvatar").onerror = () => { document.getElementById("sidebarAvatar").src = genAvatar(username); };
  document.getElementById("sidebarUsername").textContent = username;
  document.getElementById("sidebarRole").textContent = role;
  document.getElementById("composerAvatar").src = avatar;
  document.getElementById("composerAvatar").onerror = () => { document.getElementById("composerAvatar").src = genAvatar(username); };
  document.getElementById("commentAvatar").src = avatar;
  document.getElementById("commentAvatar").onerror = () => { document.getElementById("commentAvatar").src = genAvatar(username); };
  if (currentUserData?.role === "admin") {
    document.getElementById("adminChatAvatar").src = avatar;
    document.getElementById("adminChatAvatar").onerror = () => { document.getElementById("adminChatAvatar").src = genAvatar(username); };
  }
}

// ─── PAGE NAVIGATION ───────────────────────────
function showPage(name, el) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const target = document.getElementById("page-" + name);
  if (target) target.classList.add("active");

  document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
  document.querySelectorAll(".mni").forEach(i => i.classList.remove("active"));

  if (el) {
    const navEl = el.closest?.(".nav-item, .mni") || el;
    if (navEl) navEl.classList.add("active");
  }

  if (name === "profile") loadProfile();
  if (name === "explore") loadExploreFeed();
  if (name === "admin") {
    if (currentUserData?.role !== "admin") return;
    loadAdminChat();
  }
}

// ─── AVATAR GENERATOR ──────────────────────────
function genAvatar(name) {
  const letter = (name || "U")[0].toUpperCase();
  const c = document.createElement("canvas");
  c.width = 80; c.height = 80;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0,0,80,80);
  g.addColorStop(0, "#00CFFF"); g.addColorStop(1, "#008CFF");
  ctx.fillStyle = g; ctx.fillRect(0,0,80,80);
  ctx.fillStyle = "#000"; ctx.font = "bold 32px Syne,sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(letter, 40, 42);
  return c.toDataURL();
}

// ─── FEED ──────────────────────────────────────
function loadFeed() {
  const el = document.getElementById("postFeed");
  el.innerHTML = '<div class="feed-loader"><div class="spinner"></div><span>Memuat postingan...</span></div>';
  if (feedUnsubscribe) feedUnsubscribe();
  feedUnsubscribe = db.collection("posts").orderBy("createdAt","desc").limit(30)
    .onSnapshot(async (snap) => {
      if (snap.empty) {
        el.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:52px 0;font-size:.88rem;">Belum ada postingan. Jadilah yang pertama! 🚀</p>';
        return;
      }
      el.innerHTML = "";
      for (const doc of snap.docs) {
        el.appendChild(await renderPost(doc.id, doc.data()));
      }
    }, (err) => {
      console.error(err);
      el.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:52px 0;">Gagal memuat postingan.</p>';
    });
}

function loadExploreFeed() {
  const el = document.getElementById("exploreFeed");
  el.innerHTML = '<div class="feed-loader"><div class="spinner"></div><span>Memuat...</span></div>';
  db.collection("posts").orderBy("createdAt","desc").limit(50).get().then(async (snap) => {
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
  const authorPhoto = data.photoURL || genAvatar(authorName);
  const likeCount = data.likeCount || 0;
  const commentCount = data.commentCount || 0;
  const timeStr = data.createdAt ? formatTime(data.createdAt.toDate()) : "Baru saja";

  let liked = false;
  try {
    const ld = await db.collection("posts").doc(postId).collection("likes").doc(currentUser.uid).get();
    liked = ld.exists;
  } catch(e) {}

  const isOwner = data.authorId === currentUser.uid;
  const isAdmin = currentUserData?.role === "admin";

  card.innerHTML = `
    <div class="post-header">
      <img class="avatar-md" src="${esc(authorPhoto)}" alt="" onerror="this.src='${genAvatar(authorName)}'" />
      <div class="post-author">
        <div class="post-author-name">${esc(authorName)}</div>
        <div class="post-time">${timeStr}</div>
      </div>
      <div class="post-menu">
        <button class="post-menu-trigger" onclick="toggleMenu('${postId}')">···</button>
        <div class="post-dropdown hidden" id="menu-${postId}">
          <button onclick="sharePost('${postId}');closeMenu('${postId}')">
            <svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Bagikan
          </button>
          ${(isOwner || isAdmin) ? `<button class="dd-danger" onclick="deletePost('${postId}');closeMenu('${postId}')">
            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
            Hapus Postingan
          </button>` : ""}
        </div>
      </div>
    </div>
    ${data.imageURL ? `<img class="post-image" src="${esc(data.imageURL)}" alt="Post" loading="lazy" />` : ""}
    ${data.caption ? `<div class="post-body"><p class="post-caption">${esc(data.caption)}</p></div>` : ""}
    <div class="post-actions">
      <button class="action-btn ${liked?"liked":""}" id="like-btn-${postId}" onclick="toggleLike('${postId}',this)">
        <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
        <span id="lc-${postId}">${likeCount}</span>
      </button>
      <button class="action-btn" onclick="openComments('${postId}')">
        <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        <span>${commentCount}</span>
      </button>
      <button class="action-btn" onclick="sharePost('${postId}')">
        <svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        Bagikan
      </button>
    </div>
  `;
  return card;
}

// ─── POST MENU ─────────────────────────────────
function toggleMenu(id) {
  const m = document.getElementById("menu-" + id);
  if (!m) return;
  m.classList.toggle("hidden");
  if (!m.classList.contains("hidden")) {
    setTimeout(() => {
      function handler(e) {
        if (!m.contains(e.target)) { m.classList.add("hidden"); document.removeEventListener("click", handler); }
      }
      document.addEventListener("click", handler);
    }, 10);
  }
}
function closeMenu(id) { document.getElementById("menu-" + id)?.classList.add("hidden"); }

// ─── SUBMIT POST ───────────────────────────────
let selectedFile = null;

function previewImage(e) {
  const file = e.target.files[0];
  if (!file) return;
  selectedFile = file;
  const reader = new FileReader();
  reader.onload = (ev) => {
    document.getElementById("imagePreview").src = ev.target.result;
    document.getElementById("imagePreviewWrap").classList.remove("hidden");
  };
  reader.readAsDataURL(file);
}

function removePreview() {
  selectedFile = null;
  document.getElementById("imagePreview").src = "";
  document.getElementById("imagePreviewWrap").classList.add("hidden");
  document.getElementById("imageUpload").value = "";
}

async function submitPost() {
  const caption = document.getElementById("captionInput").value.trim();
  if (!caption && !selectedFile) { showToast("Tambahkan caption atau foto terlebih dahulu."); return; }

  const prog = document.getElementById("uploadProgress");
  const fill = document.getElementById("progressFill");
  const txt = document.getElementById("progressText");
  let imageURL = "";

  try {
    if (selectedFile) {
      prog.classList.remove("hidden");
      const ref = storage.ref(`posts/${currentUser.uid}/${Date.now()}_${selectedFile.name}`);
      const task = ref.put(selectedFile);
      await new Promise((res, rej) => {
        task.on("state_changed", (s) => {
          const p = Math.round(s.bytesTransferred / s.totalBytes * 100);
          fill.style.width = p + "%"; txt.textContent = `Mengunggah... ${p}%`;
        }, rej, async () => { imageURL = await task.snapshot.ref.getDownloadURL(); res(); });
      });
    }
    txt.textContent = "Memposting...";
    await db.collection("posts").add({
      caption, imageURL,
      authorId: currentUser.uid,
      username: currentUserData?.username || "User",
      photoURL: currentUserData?.photoURL || "",
      likeCount: 0, commentCount: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById("captionInput").value = "";
    removePreview();
    prog.classList.add("hidden"); fill.style.width = "0%";
    showToast("✅ Postingan berhasil dibagikan!");
    await loadStats();
  } catch (e) {
    prog.classList.add("hidden");
    showToast("❌ Gagal memposting: " + e.message);
  }
}

// ─── LIKES ─────────────────────────────────────
async function toggleLike(postId, btn) {
  const likeRef = db.collection("posts").doc(postId).collection("likes").doc(currentUser.uid);
  const postRef = db.collection("posts").doc(postId);
  const cntEl = document.getElementById("lc-" + postId);
  const ld = await likeRef.get();
  if (ld.exists) {
    await likeRef.delete();
    await postRef.update({ likeCount: firebase.firestore.FieldValue.increment(-1) });
    btn.classList.remove("liked"); cntEl.textContent = Math.max(0, parseInt(cntEl.textContent) - 1);
  } else {
    await likeRef.set({ likedAt: firebase.firestore.FieldValue.serverTimestamp() });
    await postRef.update({ likeCount: firebase.firestore.FieldValue.increment(1) });
    btn.classList.add("liked"); cntEl.textContent = parseInt(cntEl.textContent) + 1;
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
  el.innerHTML = '<div class="feed-loader" style="padding:20px 0"><div class="spinner"></div></div>';
  const snap = await db.collection("posts").doc(postId).collection("comments")
    .orderBy("createdAt","asc").limit(50).get();
  if (snap.empty) {
    el.innerHTML = '<p style="text-align:center;color:var(--text-muted);font-size:.82rem;padding:20px 0;">Belum ada komentar.</p>';
    return;
  }
  el.innerHTML = "";
  snap.forEach(doc => {
    const d = doc.data();
    const div = document.createElement("div");
    div.className = "comment-item";
    div.innerHTML = `
      <img class="avatar-sm" src="${esc(d.photoURL || genAvatar(d.username))}" alt="" onerror="this.src='${genAvatar(d.username)}'" />
      <div class="comment-body">
        <div class="comment-author">${esc(d.username)}</div>
        <div class="comment-text">${esc(d.text)}</div>
        <div class="comment-time">${d.createdAt ? formatTime(d.createdAt.toDate()) : "Baru saja"}</div>
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
  loadComments(activePostId);
}

// ─── SHARE ─────────────────────────────────────
function sharePost(postId) {
  const url = `${location.origin}${location.pathname}?post=${postId}`;
  navigator.clipboard?.writeText(url).then(() => showToast("🔗 Link berhasil disalin!")).catch(() => showToast("🔗 Post ID: " + postId));
}

function copyLink(url) {
  navigator.clipboard?.writeText(url).then(() => showToast("🔗 Link berhasil disalin!")).catch(() => {});
}

// ─── DELETE POST ───────────────────────────────
async function deletePost(postId) {
  if (!confirm("Hapus postingan ini secara permanen?")) return;
  try {
    await db.collection("posts").doc(postId).delete();
    document.getElementById("post-" + postId)?.remove();
    showToast("🗑️ Postingan dihapus.");
    await loadStats();
  } catch (e) { showToast("❌ Gagal menghapus postingan."); }
}

// ─── PROFILE ───────────────────────────────────
async function loadProfile() {
  const avatar = currentUserData?.photoURL || genAvatar(currentUserData?.username || "U");
  document.getElementById("profileAvatar").src = avatar;
  document.getElementById("profileAvatar").onerror = () => { document.getElementById("profileAvatar").src = genAvatar(currentUserData?.username || "U"); };
  document.getElementById("profileUsername").textContent = currentUserData?.username || "—";
  document.getElementById("profileEmail").textContent = currentUser?.email || "—";
  document.getElementById("profileBio").textContent = currentUserData?.bio || "Belum ada bio.";
  document.getElementById("profileRoleChip").textContent = currentUserData?.role === "admin" ? "Admin" : "Member";

  const el = document.getElementById("userPostFeed");
  el.innerHTML = '<div class="feed-loader"><div class="spinner"></div></div>';
  const snap = await db.collection("posts").where("authorId","==",currentUser.uid).orderBy("createdAt","desc").limit(20).get();
  if (snap.empty) {
    el.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:48px 0;font-size:.88rem;">Belum ada postingan.</p>';
    return;
  }
  el.innerHTML = "";
  for (const doc of snap.docs) el.appendChild(await renderPost(doc.id, doc.data()));
}

function openEditProfile() {
  document.getElementById("editUsername").value = currentUserData?.username || "";
  document.getElementById("editBio").value = currentUserData?.bio || "";
  document.getElementById("editProfileModal").classList.remove("hidden");
}
function closeEditProfile() { document.getElementById("editProfileModal").classList.add("hidden"); }

async function saveProfile() {
  const username = document.getElementById("editUsername").value.trim();
  const bio = document.getElementById("editBio").value.trim();
  if (!username) { showToast("Username tidak boleh kosong."); return; }
  try {
    await db.collection("users").doc(currentUser.uid).update({ username, bio });
    currentUserData.username = username; currentUserData.bio = bio;
    closeEditProfile(); updateUI(); loadProfile();
    showToast("✅ Profil berhasil diperbarui!");
  } catch(e) { showToast("❌ Gagal menyimpan profil."); }
}

async function uploadAvatar(e) {
  const file = e.target.files[0];
  if (!file) return;
  showToast("Mengunggah foto profil...");
  try {
    const ref = storage.ref(`avatars/${currentUser.uid}/${Date.now()}`);
    await ref.put(file);
    const url = await ref.getDownloadURL();
    await db.collection("users").doc(currentUser.uid).update({ photoURL: url });
    currentUserData.photoURL = url;
    document.getElementById("profileAvatar").src = url;
    updateUI();
    showToast("✅ Foto profil diperbarui!");
  } catch(e) { showToast("❌ Gagal mengunggah foto."); }
}

// ─── STATS ─────────────────────────────────────
async function loadStats() {
  try {
    const u = await db.collection("users").get();
    const p = await db.collection("posts").get();
    document.getElementById("statMembers").textContent = u.size;
    document.getElementById("statPosts").textContent = p.size;
  } catch(e) {}
}

// ─── ADMIN: CHAT ───────────────────────────────
function loadAdminChat() {
  if (currentUserData?.role !== "admin") return;
  const el = document.getElementById("adminChatMessages");
  el.innerHTML = '<div class="chat-loader"><div class="spinner"></div></div>';
  if (chatUnsubscribe) chatUnsubscribe();
  chatUnsubscribe = db.collection("adminChat").orderBy("createdAt","asc").limit(100)
    .onSnapshot((snap) => {
      el.innerHTML = "";
      if (snap.empty) {
        el.innerHTML = '<p style="text-align:center;color:var(--text-muted);font-size:.82rem;padding:30px 0;">Belum ada pesan. Mulai obrolan!</p>';
        return;
      }
      snap.forEach(doc => {
        const d = doc.data();
        const isOwn = d.authorId === currentUser.uid;
        const div = document.createElement("div");
        div.className = `chat-msg ${isOwn ? "own" : ""}`;
        div.innerHTML = `
          <img class="avatar-sm" src="${esc(d.photoURL || genAvatar(d.username))}" alt="" onerror="this.src='${genAvatar(d.username)}'" />
          <div class="chat-bubble">
            <div class="chat-author">${esc(d.username)}</div>
            <div class="chat-text">${esc(d.text)}</div>
            <div class="chat-time">${d.createdAt ? formatTime(d.createdAt.toDate()) : "Baru saja"}</div>
          </div>`;
        el.appendChild(div);
      });
      el.scrollTop = el.scrollHeight;
    });
}

async function sendAdminChat() {
  if (currentUserData?.role !== "admin") return;
  const input = document.getElementById("adminChatInput");
  const text = input.value.trim();
  if (!text) return;
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
  if (currentUserData?.role !== "admin") return;
  const el = document.getElementById("adminUsersList");
  el.innerHTML = '<div class="feed-loader"><div class="spinner"></div></div>';
  const snap = await db.collection("users").orderBy("createdAt","desc").get();
  el.innerHTML = "";
  snap.forEach(doc => {
    const d = doc.data();
    const row = document.createElement("div");
    row.className = "admin-user-row";
    const badgeCls = d.role === "admin" ? "role-admin" : d.banned ? "role-banned" : "role-member";
    const badgeTxt = d.role === "admin" ? "Admin" : d.banned ? "Banned" : "Member";
    row.innerHTML = `
      <img class="avatar-md" src="${esc(d.photoURL || genAvatar(d.username))}" alt="" onerror="this.src='${genAvatar(d.username)}'" />
      <div class="aru-info">
        <span class="aru-name">${esc(d.username)}</span>
        <span class="aru-email">${esc(d.email)}</span>
      </div>
      <span class="aru-badge ${badgeCls}">${badgeTxt}</span>
      ${doc.id !== currentUser.uid && d.role !== "admin" ? `
        <button class="btn-danger" onclick="toggleBan('${doc.id}',${d.banned})">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          ${d.banned ? "Unban" : "Ban"}
        </button>` : ""}`;
    el.appendChild(row);
  });
}

async function toggleBan(uid, isBanned) {
  if (!confirm(isBanned ? "Unban user ini?" : "Ban user ini dari komunitas?")) return;
  await db.collection("users").doc(uid).update({ banned: !isBanned });
  showToast(isBanned ? "✅ User di-unban." : "⛔ User di-ban.");
  loadAdminUsers();
}

// ─── ADMIN: ALL POSTS ──────────────────────────
async function loadAdminPosts() {
  if (currentUserData?.role !== "admin") return;
  const el = document.getElementById("adminPostsList");
  el.innerHTML = '<div class="feed-loader"><div class="spinner"></div></div>';
  const snap = await db.collection("posts").orderBy("createdAt","desc").limit(50).get();
  if (snap.empty) { el.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:52px 0;">Belum ada postingan.</p>'; return; }
  el.innerHTML = "";
  for (const doc of snap.docs) el.appendChild(await renderPost(doc.id, doc.data()));
}

// ─── ADMIN TAB SWITCH ──────────────────────────
function switchAdminTab(tab, btn) {
  document.querySelectorAll(".atab").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById("adminTabChat").classList.toggle("hidden", tab !== "chat");
  document.getElementById("adminTabUsers").classList.toggle("hidden", tab !== "users");
  document.getElementById("adminTabPosts").classList.toggle("hidden", tab !== "posts");
  if (tab === "users") loadAdminUsers();
  if (tab === "posts") loadAdminPosts();
  if (tab === "chat") loadAdminChat();
}

// ─── HELPERS ───────────────────────────────────
function formatTime(date) {
  const s = Math.floor((new Date() - date) / 1000);
  if (s < 60) return "Baru saja";
  if (s < 3600) return Math.floor(s/60) + " menit lalu";
  if (s < 86400) return Math.floor(s/3600) + " jam lalu";
  if (s < 604800) return Math.floor(s/86400) + " hari lalu";
  return date.toLocaleDateString("id-ID", { day:"numeric", month:"short", year:"numeric" });
}

function esc(str) {
  if (!str) return "";
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.remove("hidden");
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.add("hidden"), 3200);
}

// ─── MODAL CLOSE ON BACKDROP ───────────────────
document.getElementById("editProfileModal").addEventListener("click", e => { if (e.target === document.getElementById("editProfileModal")) closeEditProfile(); });
document.getElementById("commentModal").addEventListener("click", e => { if (e.target === document.getElementById("commentModal")) closeComments(); });

// ─── PARTICLES ─────────────────────────────────
(function createParticles() {
  const container = document.getElementById("authParticles");
  if (!container) return;
  for (let i = 0; i < 12; i++) {
    const p = document.createElement("div");
    p.className = "auth-particle";
    const size = Math.random() * 80 + 20;
    p.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;animation-duration:${Math.random()*15+10}s;animation-delay:${Math.random()*10}s;`;
    container.appendChild(p);
  }
})();
