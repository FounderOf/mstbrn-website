# 🚀 NextGen Collective — Panduan Setup

## File Structure
```
ngc/
├── index.html          ← Seluruh website
├── style.css           ← Styling (tema NGC biru/navy)
├── app.js              ← Logika + auto-role system
├── firebase-config.js  ← Isi kredensial Firebase kamu
├── logo.png            ← Logo NextGen Collective
└── PANDUAN.md          ← Panduan ini
```

---

## Langkah 1: Setup Firebase Project

1. Buka **https://console.firebase.google.com**
2. Buat project baru: `nextgen-collective`
3. Daftar Web App → salin `firebaseConfig`
4. Paste ke `firebase-config.js`

---

## Langkah 2: Aktifkan Layanan Firebase

### Authentication
- Firebase Console → Authentication → Get Started
- Aktifkan **Email/Password**

### Firestore Database
- Firebase Console → Firestore Database → Create database → Production mode
- Lokasi: `asia-southeast1` (rekomendasi untuk Indonesia)

### Rules Firestore:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /posts/{postId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if request.auth != null && (
        request.auth.uid == resource.data.authorId ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['owner','founder','developer','admin','staff']
      );
      match /likes/{likeId} { allow read, write: if request.auth != null; }
      match /comments/{commentId} {
        allow read, create: if request.auth != null;
        allow delete: if request.auth != null;
      }
    }
    match /adminChat/{msgId} {
      allow read, write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['owner','founder','developer','admin','staff'];
    }
  }
}
```

### Firebase Storage
- Firebase Console → Storage → Get Started → Production mode

### Rules Storage:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /posts/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /avatars/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## Langkah 3: Setting Auto-Role by Username

Buka `app.js`, cari bagian `TEAM_ROLES` di atas file:

```js
const TEAM_ROLES = {
  "ownerku":      { role: "owner",     display: "Owner",     order: 0, icon: "👑" },
  "founderku":    { role: "founder",   display: "Founder",   order: 1, icon: "⭐" },
  "developerku":  { role: "developer", display: "Developer", order: 2, icon: "💻" },
  "adminku":      { role: "admin",     display: "Admin",     order: 3, icon: "" },
  "staffku":      { role: "staff",     display: "Staff",     order: 4, icon: "" },
};
```

**Ganti** `"ownerku"`, `"founderku"`, dst. dengan username asli kamu.
Username bersifat **case-insensitive** (huruf besar/kecil tidak berpengaruh).

### Cara Kerja:
- Saat seseorang **mendaftar** dengan username yang ada di `TEAM_ROLES`, peran otomatis ditetapkan.
- Saat seseorang **mengubah username** ke nama yang terdaftar, peran juga diperbarui otomatis.
- Anggota biasa yang tidak terdaftar di `TEAM_ROLES` mendapat peran `member`.

---

## Langkah 4: Kustomisasi Links

Di `index.html`, ganti:
- `https://discord.gg/GANTI_LINK_DISCORD` → link Discord kamu
- `GANTI_ID_1`, `GANTI_ID_2`, `GANTI_ID_3` → ID game Roblox
- `@GANTI_USERNAME_TIKTOK` → username TikTok kamu

---

## Struktur Database Firestore

```
users/{uid}/
  username, email, bio, photoURL, role, banned
  postCount, likeCount, commentCount  ← untuk Leaderboard
  createdAt

posts/{postId}/
  caption, imageURL, authorId, username, photoURL
  likeCount, commentCount, createdAt
  /likes/{uid} → { at }
  /comments/{id} → { text, authorId, username, photoURL, createdAt }

adminChat/{msgId}/
  text, authorId, username, photoURL, createdAt
```

---

## Sistem Leaderboard

Skor dihitung otomatis:
- **1 postingan** = 10 poin
- **1 like diberikan** = 2 poin
- **1 komentar ditulis** = 1 poin

Tim (owner/founder/dll) selalu tampil di atas, diurutkan berdasarkan `order`.
Member biasa diurutkan berdasarkan total skor.

---

## Deploy

### Netlify (termudah):
Drag folder `ngc` ke https://app.netlify.com/drop

### Firebase Hosting:
```bash
npm i -g firebase-tools
firebase login
firebase init hosting  # public dir: .  |  SPA: No
firebase deploy
```
