// =============================================
//   MSTBRN COMMUNITY — MAIN APP
// =============================================

let currentUser = null;
let currentUserData = null;
let activePostId = null;
let postsUnsubscribe = null;

// =============================================
//   AUTH STATE OBSERVER
// =============================================

auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUser = user;
    const userDoc = await db.collection("users").doc(user.uid).get();
    if (userDoc.exists) {
      currentUserData = userDoc.data();
    } else {
      // Should not happen, but fallback
      currentUserData = { username: user.email.split("@")[0], role: "user" };
    }

    // Check if banned
    if (currentUserData.banned) {
      await auth.signOut();
      showToast("⛔ Your account has been banned.");
      return;
    }

    showApp();
  } else {
    currentUser = null;
    currentUserData = null;
    hideApp();
  }
});

// =============================================
//   AUTH FUNCTIONS
// =============================================

function showRegister() {
  document.getElementById("loginForm").classList.remove("active");
  document.getElementById("registerForm").classList.add("active");
}
function showLogin() {
  document.getElementById("registerForm").classList.remove("active");
  document.getElementById("loginForm").classList.add("active");
}

async function loginUser() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const errEl = document.getElementById("loginError");
  errEl.textContent = "";

  if (!email || !password) { errEl.textContent = "Please fill in all fields."; return; }

  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (e) {
    errEl.textContent = friendlyAuthError(e.code);
  }
}

async function registerUser() {
  const username = document.getElementById("regUsername").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;
  const errEl = document.getElementById("registerError");
  errEl.textContent = "";

  if (!username || !email || !password) { errEl.textContent = "Please fill in all fields."; return; }
  if (username.length < 3) { errEl.textContent = "Username must be at least 3 characters."; return; }
  if (password.length < 6) { errEl.textContent = "Password must be at least 6 characters."; return; }

  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await db.collection("users").doc(cred.user.uid).set({
      username,
      email,
      bio: "",
      photoURL: "",
      role: "user",
      banned: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {
    errEl.textContent = friendlyAuthError(e.code);
  }
}

async function logoutUser() {
  if (postsUnsubscribe) postsUnsubscribe();
  await auth.signOut();
}

function friendlyAuthError(code) {
  const map = {
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/email-already-in-use": "That email is already registered.",
    "auth/invalid-email": "Please enter a valid email.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/weak-password": "Password is too weak.",
  };
  return map[code] || "Something went wrong. Please try again.";
}

// =============================================
//   APP SHOW/HIDE
// =============================================

function showApp() {
  document.getElementById("authOverlay").classList.add("hidden");
  document.getElementById("mainApp").classList.remove("hidden");
  initApp();
}

function hideApp() {
  document.getElementById("authOverlay").classList.remove("hidden");
  document.getElementById("mainApp").classList.add("hidden");
}

function initApp() {
  updateSidebarUser();
  loadFeed();
  loadStats();
  if (currentUserData?.role === "admin") {
    document.getElementById("adminNavLink").classList.remove("hidden");
  }
}

function updateSidebarUser() {
  const avatar = currentUserData?.photoURL || generateAvatar(currentUserData?.username || "U");
  document.getElementById("sidebarAvatar").src = avatar;
  document.getElementById("sidebarUsername").textContent = currentUserData?.username || "User";
  document.getElementById("composerAvatar").src = avatar;
  document.getElementById("commentAvatar").src = avatar;
}

// =============================================
//   PAGE NAVIGATION
// =============================================

function showPage(name, clickedEl) {
  // Update pages
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("page-" + name)?.classList.add("active");

  // Update sidebar nav
  document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
  if (clickedEl) {
    // Find the closest nav-item
    const navEl = clickedEl.closest?.(".nav-item") || clickedEl;
    if (navEl) navEl.classList.add("active");
  }

  // Update mobile nav
  document.querySelectorAll(".mobile-nav-item").forEach(i => i.classList.remove("active"));

  // Load page-specific data
  if (name === "profile") loadProfile();
  if (name === "explore") loadExploreFeed();
  if (name === "admin" && currentUserData?.role === "admin") loadAdminUsers();
}

// =============================================
//   AVATAR HELPER
// =============================================

function generateAvatar(name) {
  const letter = (name || "U")[0].toUpperCase();
  const canvas = document.createElement("canvas");
  canvas.width = 80; canvas.height = 80;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 80, 80);
  gradient.addColorStop(0, "#00CFFF");
  gradient.addColorStop(1, "#008CFF");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 80, 80);
  ctx.fillStyle = "#000";
  ctx.font = "bold 36px Syne, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(letter, 40, 42);
  return canvas.toDataURL();
}

// =============================================
//   POST FEED
// =============================================

function loadFeed() {
  const feedEl = document.getElementById("postFeed");
  feedEl.innerHTML = '<div class="feed-loader"><div class="spinner"></div></div>';

  if (postsUnsubscribe) postsUnsubscribe();

  postsUnsubscribe = db.collection("posts")
    .orderBy("createdAt", "desc")
    .limit(30)
    .onSnapshot(async (snapshot) => {
      if (snapshot.empty) {
        feedEl.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:48px 0;">No posts yet. Be the first to share!</p>';
        return;
      }
      feedEl.innerHTML = "";
      for (const doc of snapshot.docs) {
        const card = await renderPost(doc.id, doc.data());
        feedEl.appendChild(card);
      }
    });
}

function loadExploreFeed() {
  const feedEl = document.getElementById("exploreFeed");
  feedEl.innerHTML = '<div class="feed-loader"><div class="spinner"></div></div>';

  db.collection("posts")
    .orderBy("createdAt", "desc")
    .limit(50)
    .get()
    .then(async (snapshot) => {
      if (snapshot.empty) {
        feedEl.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:48px 0;">No posts yet.</p>';
        return;
      }
      feedEl.innerHTML = "";
      for (const doc of snapshot.docs) {
        const card = await renderPost(doc.id, doc.data());
        feedEl.appendChild(card);
      }
    });
}

async function renderPost(postId, data) {
  const card = document.createElement("div");
  card.className = "post-card";
  card.id = "post-" + postId;

  // Get author data
  let authorName = data.username || "User";
  let authorPhoto = data.photoURL || generateAvatar(authorName);

  // Check if liked by current user
  let liked = false;
  try {
    const likeDoc = await db.collection("posts").doc(postId).collection("likes").doc(currentUser.uid).get();
    liked = likeDoc.exists;
  } catch (e) {}

  const likeCount = data.likeCount || 0;
  const commentCount = data.commentCount || 0;
  const timeStr = data.createdAt ? formatTime(data.createdAt.toDate()) : "Just now";

  const isOwner = data.authorId === currentUser.uid;
  const isAdmin = currentUserData?.role === "admin";
  const showMenu = isOwner || isAdmin;

  card.innerHTML = `
    <div class="post-header">
      <img class="avatar-md" src="${authorPhoto}" alt="" onerror="this.src='${generateAvatar(authorName)}'" />
      <div class="post-author">
        <div class="post-author-name">${escapeHtml(authorName)}</div>
        <div class="post-time">${timeStr}</div>
      </div>
      ${showMenu ? `
        <div class="post-menu">
          <button class="post-menu-btn" onclick="togglePostMenu('${postId}')">···</button>
          <div class="post-dropdown hidden" id="menu-${postId}">
            <button onclick="sharePost('${postId}')">
              <svg viewBox="0 0 24 24" style="width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              Share
            </button>
            ${isOwner || isAdmin ? `<button class="danger" onclick="deletePost('${postId}')">
              <svg viewBox="0 0 24 24" style="width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
              Delete
            </button>` : ""}
          </div>
        </div>
      ` : `
        <button class="btn-icon" onclick="sharePost('${postId}')" title="Share">
          <svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        </button>
      `}
    </div>
    ${data.imageURL ? `<img class="post-image" src="${data.imageURL}" alt="Post image" loading="lazy" />` : ""}
    ${data.caption ? `<div class="post-body"><p class="post-caption">${escapeHtml(data.caption)}</p></div>` : ""}
    <div class="post-actions">
      <button class="action-btn ${liked ? "liked" : ""}" id="like-btn-${postId}" onclick="toggleLike('${postId}', this)">
        <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
        <span id="like-count-${postId}">${likeCount}</span>
      </button>
      <button class="action-btn" onclick="openComments('${postId}')">
        <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        <span>${commentCount}</span>
      </button>
      <button class="action-btn" onclick="sharePost('${postId}')">
        <svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        Share
      </button>
    </div>
  `;

  return card;
}

function togglePostMenu(postId) {
  const menu = document.getElementById("menu-" + postId);
  if (!menu) return;
  menu.classList.toggle("hidden");
  // Close on outside click
  setTimeout(() => {
    document.addEventListener("click", function handler() {
      menu.classList.add("hidden");
      document.removeEventListener("click", handler);
    });
  }, 10);
}

// =============================================
//   SUBMIT POST
// =============================================

let selectedImageFile = null;

function previewImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  selectedImageFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById("imagePreview").src = e.target.result;
    document.getElementById("imagePreviewWrap").classList.remove("hidden");
  };
  reader.readAsDataURL(file);
}

function removePreview() {
  selectedImageFile = null;
  document.getElementById("imagePreview").src = "";
  document.getElementById("imagePreviewWrap").classList.add("hidden");
  document.getElementById("imageUpload").value = "";
}

async function submitPost() {
  const caption = document.getElementById("captionInput").value.trim();
  if (!caption && !selectedImageFile) {
    showToast("Add a caption or image first.");
    return;
  }

  const progressWrap = document.getElementById("uploadProgress");
  const progressFill = document.getElementById("progressFill");
  const progressText = document.getElementById("progressText");

  let imageURL = "";

  try {
    if (selectedImageFile) {
      progressWrap.classList.remove("hidden");
      const storageRef = storage.ref(`posts/${currentUser.uid}/${Date.now()}_${selectedImageFile.name}`);
      const uploadTask = storageRef.put(selectedImageFile);

      await new Promise((resolve, reject) => {
        uploadTask.on("state_changed",
          (snap) => {
            const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            progressFill.style.width = pct + "%";
            progressText.textContent = `Uploading... ${pct}%`;
          },
          reject,
          async () => {
            imageURL = await uploadTask.snapshot.ref.getDownloadURL();
            resolve();
          }
        );
      });
    }

    progressText.textContent = "Posting...";

    await db.collection("posts").add({
      caption,
      imageURL,
      authorId: currentUser.uid,
      username: currentUserData?.username || "User",
      photoURL: currentUserData?.photoURL || "",
      likeCount: 0,
      commentCount: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Update post count in stats
    db.collection("meta").doc("stats").set({
      postCount: firebase.firestore.FieldValue.increment(1)
    }, { merge: true });

    // Reset form
    document.getElementById("captionInput").value = "";
    removePreview();
    progressWrap.classList.add("hidden");
    progressFill.style.width = "0%";
    showToast("✅ Post shared!");
  } catch (e) {
    progressWrap.classList.add("hidden");
    showToast("❌ Failed to post: " + e.message);
  }
}

// =============================================
//   LIKES
// =============================================

async function toggleLike(postId, btn) {
  const likeRef = db.collection("posts").doc(postId).collection("likes").doc(currentUser.uid);
  const postRef = db.collection("posts").doc(postId);
  const countEl = document.getElementById("like-count-" + postId);

  const likeDoc = await likeRef.get();
  if (likeDoc.exists) {
    await likeRef.delete();
    await postRef.update({ likeCount: firebase.firestore.FieldValue.increment(-1) });
    btn.classList.remove("liked");
    countEl.textContent = Math.max(0, parseInt(countEl.textContent) - 1);
  } else {
    await likeRef.set({ likedAt: firebase.firestore.FieldValue.serverTimestamp() });
    await postRef.update({ likeCount: firebase.firestore.FieldValue.increment(1) });
    btn.classList.add("liked");
    countEl.textContent = parseInt(countEl.textContent) + 1;
  }
}

// =============================================
//   COMMENTS
// =============================================

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
  const listEl = document.getElementById("commentsList");
  listEl.innerHTML = '<div class="feed-loader"><div class="spinner"></div></div>';

  const snapshot = await db.collection("posts").doc(postId).collection("comments")
    .orderBy("createdAt", "asc").limit(50).get();

  if (snapshot.empty) {
    listEl.innerHTML = '<p style="text-align:center;color:var(--text-muted);font-size:.85rem;padding:20px 0;">No comments yet. Be first!</p>';
    return;
  }

  listEl.innerHTML = "";
  snapshot.forEach(doc => {
    const d = doc.data();
    const div = document.createElement("div");
    div.className = "comment-item";
    div.innerHTML = `
      <img class="avatar-sm" src="${d.photoURL || generateAvatar(d.username)}" alt="" onerror="this.src='${generateAvatar(d.username)}'" />
      <div class="comment-body">
        <div class="comment-author">${escapeHtml(d.username)}</div>
        <div class="comment-text">${escapeHtml(d.text)}</div>
        <div class="comment-time">${d.createdAt ? formatTime(d.createdAt.toDate()) : "Just now"}</div>
      </div>
    `;
    listEl.appendChild(div);
  });
  listEl.scrollTop = listEl.scrollHeight;
}

async function addComment() {
  const input = document.getElementById("commentInput");
  const text = input.value.trim();
  if (!text || !activePostId) return;

  input.value = "";

  await db.collection("posts").doc(activePostId).collection("comments").add({
    text,
    authorId: currentUser.uid,
    username: currentUserData?.username || "User",
    photoURL: currentUserData?.photoURL || "",
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  await db.collection("posts").doc(activePostId).update({
    commentCount: firebase.firestore.FieldValue.increment(1)
  });

  loadComments(activePostId);
}

// =============================================
//   SHARE
// =============================================

function sharePost(postId) {
  const url = `${window.location.origin}${window.location.pathname}?post=${postId}`;
  navigator.clipboard.writeText(url).then(() => {
    showToast("🔗 Link copied to clipboard!");
  }).catch(() => {
    showToast("🔗 Post ID: " + postId);
  });
}

// =============================================
//   DELETE POST
// =============================================

async function deletePost(postId) {
  if (!confirm("Delete this post permanently?")) return;
  try {
    await db.collection("posts").doc(postId).delete();
    document.getElementById("post-" + postId)?.remove();
    showToast("🗑️ Post deleted.");
  } catch (e) {
    showToast("❌ Could not delete post.");
  }
}

// =============================================
//   PROFILE
// =============================================

async function loadProfile() {
  const userData = currentUserData;
  const avatar = userData?.photoURL || generateAvatar(userData?.username || "U");

  document.getElementById("profileAvatar").src = avatar;
  document.getElementById("profileUsername").textContent = userData?.username || "—";
  document.getElementById("profileEmail").textContent = currentUser?.email || "—";
  document.getElementById("profileBio").textContent = userData?.bio || "No bio yet.";

  // Load user's own posts
  const feedEl = document.getElementById("userPostFeed");
  feedEl.innerHTML = '<div class="feed-loader"><div class="spinner"></div></div>';

  const snapshot = await db.collection("posts")
    .where("authorId", "==", currentUser.uid)
    .orderBy("createdAt", "desc")
    .limit(20)
    .get();

  if (snapshot.empty) {
    feedEl.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:48px 0;">No posts yet.</p>';
    return;
  }
  feedEl.innerHTML = "";
  for (const doc of snapshot.docs) {
    const card = await renderPost(doc.id, doc.data());
    feedEl.appendChild(card);
  }
}

function openEditProfile() {
  document.getElementById("editUsername").value = currentUserData?.username || "";
  document.getElementById("editBio").value = currentUserData?.bio || "";
  document.getElementById("editProfileModal").classList.remove("hidden");
}

function closeEditProfile() {
  document.getElementById("editProfileModal").classList.add("hidden");
}

async function saveProfile() {
  const username = document.getElementById("editUsername").value.trim();
  const bio = document.getElementById("editBio").value.trim();

  if (!username) { showToast("Username cannot be empty."); return; }

  await db.collection("users").doc(currentUser.uid).update({ username, bio });
  currentUserData.username = username;
  currentUserData.bio = bio;

  closeEditProfile();
  updateSidebarUser();
  loadProfile();
  showToast("✅ Profile updated!");
}

async function uploadAvatar(event) {
  const file = event.target.files[0];
  if (!file) return;

  showToast("Uploading avatar...");
  try {
    const ref = storage.ref(`avatars/${currentUser.uid}/${Date.now()}`);
    await ref.put(file);
    const url = await ref.getDownloadURL();

    await db.collection("users").doc(currentUser.uid).update({ photoURL: url });
    currentUserData.photoURL = url;

    document.getElementById("profileAvatar").src = url;
    document.getElementById("sidebarAvatar").src = url;
    document.getElementById("composerAvatar").src = url;
    document.getElementById("commentAvatar").src = url;

    showToast("✅ Avatar updated!");
  } catch (e) {
    showToast("❌ Failed to upload avatar.");
  }
}

// =============================================
//   COMMUNITY STATS
// =============================================

async function loadStats() {
  try {
    const usersSnap = await db.collection("users").get();
    document.getElementById("statMembers").textContent = usersSnap.size;

    const postsSnap = await db.collection("posts").get();
    document.getElementById("statPosts").textContent = postsSnap.size;
  } catch (e) {}
}

// =============================================
//   ADMIN PANEL
// =============================================

async function loadAdminUsers() {
  if (currentUserData?.role !== "admin") return;
  const listEl = document.getElementById("adminUsersList");
  listEl.innerHTML = '<div class="feed-loader"><div class="spinner"></div></div>';

  const snapshot = await db.collection("users").orderBy("createdAt", "desc").get();
  listEl.innerHTML = "";

  snapshot.forEach(doc => {
    const d = doc.data();
    const row = document.createElement("div");
    row.className = "admin-user-row";
    row.innerHTML = `
      <img class="avatar-md" src="${d.photoURL || generateAvatar(d.username)}" alt="" onerror="this.src='${generateAvatar(d.username)}'" />
      <div class="admin-user-info">
        <strong>${escapeHtml(d.username)}</strong>
        <span>${escapeHtml(d.email)}</span>
      </div>
      <span class="admin-badge ${d.banned ? "banned" : ""}">${d.role === "admin" ? "Admin" : d.banned ? "Banned" : "Member"}</span>
      ${doc.id !== currentUser.uid && d.role !== "admin" ? `
        <button class="btn-danger" onclick="toggleBanUser('${doc.id}', ${d.banned})">
          ${d.banned ? "Unban" : "Ban"}
        </button>
      ` : ""}
    `;
    listEl.appendChild(row);
  });
}

async function loadAdminPosts() {
  if (currentUserData?.role !== "admin") return;
  const feedEl = document.getElementById("adminPostsList");
  feedEl.innerHTML = '<div class="feed-loader"><div class="spinner"></div></div>';

  const snapshot = await db.collection("posts").orderBy("createdAt", "desc").limit(50).get();
  feedEl.innerHTML = "";

  for (const doc of snapshot.docs) {
    const card = await renderPost(doc.id, doc.data());
    feedEl.appendChild(card);
  }
}

async function toggleBanUser(uid, currentlyBanned) {
  const action = currentlyBanned ? "unban" : "ban";
  if (!confirm(`Are you sure you want to ${action} this user?`)) return;

  await db.collection("users").doc(uid).update({ banned: !currentlyBanned });
  showToast(currentlyBanned ? "✅ User unbanned." : "⛔ User banned.");
  loadAdminUsers();
}

function switchAdminTab(tab, btn) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  document.getElementById("adminUsersTab").classList.toggle("hidden", tab !== "users");
  document.getElementById("adminPostsTab").classList.toggle("hidden", tab !== "posts");

  if (tab === "posts") loadAdminPosts();
  if (tab === "users") loadAdminUsers();
}

// =============================================
//   HELPERS
// =============================================

function formatTime(date) {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  if (diff < 604800) return Math.floor(diff / 86400) + "d ago";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.add("hidden"), 3000);
}

// Close modals on overlay click
document.getElementById("editProfileModal")?.addEventListener("click", (e) => {
  if (e.target === document.getElementById("editProfileModal")) closeEditProfile();
});
document.getElementById("commentModal")?.addEventListener("click", (e) => {
  if (e.target === document.getElementById("commentModal")) closeComments();
});
