# 🚀 MSTBRN Community v2 — Panduan Setup Firebase

## Struktur File

```
mstbrn2/
├── index.html          ← Aplikasi utama (semua halaman)
├── style.css           ← Semua styling
├── app.js              ← Semua logika & fitur
├── firebase-config.js  ← Isi dengan kredensial Firebase kamu
├── logo.png            ← Logo MSTBRN Community
└── PANDUAN.md          ← File ini
```

---

## Langkah 1: Buat Firebase Project

1. Buka **https://console.firebase.google.com**
2. Klik **"Add project"**
3. Nama project: `mstbrn-community`
4. Klik **"Create project"**

---

## Langkah 2: Daftarkan Web App

1. Di dashboard Firebase, klik ikon **Web (`</>`)**
2. Nama app: `MSTBRN Community`
3. Salin `firebaseConfig` yang muncul
4. Buka file `firebase-config.js` dan ganti nilai-nilainya:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "mstbrn-community.firebaseapp.com",
  projectId: "mstbrn-community",
  storageBucket: "mstbrn-community.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234...:web:abc123"
};
```

---

## Langkah 3: Aktifkan Authentication

1. Firebase Console → **Authentication** → **Get Started**
2. Tab **Sign-in method** → Aktifkan **Email/Password**
3. Klik **Save**

---

## Langkah 4: Buat Firestore Database

1. Firebase Console → **Firestore Database** → **Create database**
2. Pilih **production mode**
3. Pilih lokasi server (contoh: `asia-southeast1` untuk Asia Tenggara)
4. Klik **Done**

### Rules Firestore (Paste di Firestore → Rules):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Posts
    match /posts/{postId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if request.auth != null && (
        request.auth.uid == resource.data.authorId ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
      );

      match /likes/{likeId} {
        allow read, write: if request.auth != null;
      }
      match /comments/{commentId} {
        allow read, create: if request.auth != null;
        allow delete: if request.auth != null && (
          request.auth.uid == resource.data.authorId ||
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
        );
      }
    }

    // Admin Chat — hanya admin yang bisa akses
    match /adminChat/{msgId} {
      allow read, write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

---

## Langkah 5: Aktifkan Storage

1. Firebase Console → **Storage** → **Get Started**
2. Pilih **production mode** → Done

### Rules Storage (Paste di Storage → Rules):

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

## Langkah 6: Jadikan Diri Sendiri Admin

1. Daftar akun di website
2. Buka Firebase Console → Firestore → Collection `users`
3. Temukan dokumen dengan UID kamu
4. Ubah field: `"role": "user"` → `"role": "admin"`
5. Refresh website — panel Admin akan muncul di sidebar

---

## Langkah 7: Ubah Password Admin Rahasia

Di file `app.js`, baris paling atas:

```js
const ADMIN_SECRET_PASSWORD = "mstbrn_admin_2025"; // Ganti ini!
```

Ganti dengan password rahasia yang kuat dan simpan baik-baik.

---

## Cara Akses Panel Admin (Tombol Rahasia)

1. Buka halaman login
2. **Klik logo MSTBRN sebanyak 5 kali** (muncul hint "4 lagi...", "3 lagi...", dst)
3. Form password rahasia akan muncul
4. Masukkan password admin rahasia
5. Setelah berhasil, login dengan akun admin

---

## Kustomisasi

### Nama Tim / Pendiri (index.html)
Cari bagian `.team-grid` dan ubah:
- `NamaFounder` → nama founder sebenarnya
- `NamaDeveloper` → nama developer sebenarnya
- `NamaAdmin` → nama admin sebenarnya
- `NamaStaff` → nama staff sebenarnya

### Link Discord (index.html)
Ganti semua `https://discord.gg/GANTI_LINK_DISCORD` dengan link Discord kamu.

### Link Roblox Maps (index.html)
Ganti:
- `GANTI_ID_MAP_1` → ID game Roblox map 1
- `GANTI_ID_MAP_2` → ID game Roblox map 2
- `GANTI_ID_MAP_3` → ID game Roblox map 3

### Link TikTok (index.html)
Ganti `@GANTI_USERNAME_TIKTOK` dengan username TikTok kamu.

---

## Struktur Firestore Database

```
firestore/
├── users/
│   └── {uid}/
│       ├── username: string
│       ├── email: string
│       ├── bio: string
│       ├── photoURL: string
│       ├── role: "user" | "admin"
│       ├── banned: boolean
│       └── createdAt: timestamp
│
├── posts/
│   └── {postId}/
│       ├── caption: string
│       ├── imageURL: string
│       ├── authorId: string
│       ├── username: string
│       ├── photoURL: string
│       ├── likeCount: number
│       ├── commentCount: number
│       ├── createdAt: timestamp
│       ├── likes/
│       │   └── {uid}/ → { likedAt }
│       └── comments/
│           └── {id}/ → { text, authorId, username, photoURL, createdAt }
│
└── adminChat/
    └── {msgId}/
        ├── text: string
        ├── authorId: string
        ├── username: string
        ├── photoURL: string
        └── createdAt: timestamp
```

---

## Deploy (Gratis)

### Firebase Hosting:
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Public directory: . (titik)
# Single page app: No
firebase deploy
```

### Netlify (Drag & Drop):
Buka https://netlify.com → drag folder `mstbrn2` ke dashboard → selesai!

---

Selamat! 🎉 MSTBRN Community siap digunakan.
