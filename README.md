# NextGen Collective — Setup Guide

## 📁 File yang dibutuhkan di repo GitHub kamu:
```
/
├── index.html       ← File utama web
├── logo.png         ← Logo NGC kamu (upload dari file yang udah ada)
└── firestore.rules  ← (hanya untuk referensi, rules diset via Firebase Console)
```

---

## 🔥 Setup Firebase (langkah-langkah)

### 1. Buat Project Firebase
1. Buka [https://console.firebase.google.com](https://console.firebase.google.com)
2. Klik **"Add project"** → beri nama (contoh: `ngc-community`)
3. Setelah dibuat, masuk ke project

### 2. Aktifkan Authentication
1. Di sidebar kiri → **Build > Authentication**
2. Klik **"Get started"**
3. Di tab **Sign-in method** → aktifkan **Email/Password**

### 3. Aktifkan Firestore Database
1. Di sidebar kiri → **Build > Firestore Database**
2. Klik **"Create database"**
3. Pilih **"Start in production mode"** → pilih region terdekat (asia-southeast1 / Singapore)
4. Klik **"Done"**

### 4. Pasang Firestore Rules (PENTING)
1. Di Firestore → klik tab **"Rules"**
2. Hapus semua rules yang ada
3. Copy-paste isi file `firestore.rules` ke sana
4. Klik **"Publish"**

### 5. Ambil Firebase Config
1. Di Firebase Console → klik icon ⚙️ (Project Settings)
2. Scroll ke bawah → **"Your apps"**
3. Klik **"</> Web"** → register app dengan nama apapun
4. Copy nilai `firebaseConfig` yang muncul

### 6. Isi Config di index.html
Buka `index.html`, cari bagian ini di atas script, lalu isi:

```javascript
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSy...",          // ← dari Firebase Console
  authDomain:        "ngc-xxx.firebaseapp.com",
  projectId:         "ngc-xxx",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc"
};
```

---

## ✏️ Kustomisasi Konten

### Ganti Data Role & Pendiri
Cari bagian `ROLE_USERS` dan `FOUNDERS_DATA` di `index.html`:

```javascript
// Username yang dapat badge khusus
const ROLE_USERS = {
  owner:         ['NamaOwner'],       // ← ganti dengan username asli
  raja_iblis:    ['NamaRajaIblis'],
  ketua:         ['NamaKetua'],
  administrasi:  ['Admin1', 'Admin2']
};

// Data yang tampil di panel Pendiri
const FOUNDERS_DATA = [
  {
    tier: 'owner', label: '👑 Owner / Founder', color: '#ffd700',
    members: [{ name: 'Nama Lengkap', username: 'NamaOwner', desc: 'Founder & Owner NGC' }]
  },
  // ... dst
];
```

### Ganti Links
```javascript
const LINKS_CONFIG = {
  discord: { url: 'https://discord.gg/KODE_KAMU', label: 'Join Server NGC' },
  tiktok:  { url: 'https://tiktok.com/@akun_kamu', label: '@akun_kamu' },
  roblox:  [
    { name: 'Nama Map 1', url: 'https://www.roblox.com/games/ID_GAME', desc: 'Deskripsi map' },
    // ...
  ]
};
```

---

## 🚀 Deploy ke GitHub Pages

1. Buat repo baru di GitHub (Public)
2. Upload `index.html` dan `logo.png` ke repo
3. Masuk ke **Settings > Pages**
4. Di **Source** → pilih **"Deploy from a branch"**
5. Branch: `main` / Folder: `/ (root)` → Save
6. Website live di: `https://username.github.io/nama-repo`

---

## ⚠️ Catatan Penting

- **Gambar disimpan sebagai Base64 di Firestore** (tanpa Firebase Storage yang berbayar)
  - Profile photo: dikompres ke max 300px
  - Post image: dikompres ke max 1000px
- Firestore Free Tier (Spark): 50K reads/day, 20K writes/day — cukup untuk komunitas kecil-menengah
- Jika traffic meningkat, pertimbangkan upgrade ke Blaze plan

---

## 🎮 Fitur yang sudah ada:
- ✅ Login / Daftar dengan Email & Password
- ✅ Feed postingan real-time
- ✅ Buat postingan dengan teks & gambar
- ✅ Like & Unlike postingan
- ✅ Komentar real-time
- ✅ Share postingan
- ✅ Hapus postingan & komentar milik sendiri
- ✅ Upload foto profil
- ✅ Edit bio profil
- ✅ Badge role otomatis (Owner, Raja Iblis, Ketua, Admin, Member)
- ✅ Panel Pendiri dengan hierarki
- ✅ Panel Links (Discord, TikTok, Roblox Maps)
- ✅ Responsive (Desktop & Mobile)
- ✅ Mobile bottom navigation
