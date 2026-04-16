# 🚀 MSTBRN Community — Firebase Setup Guide

## Step 1: Create Firebase Project

1. Go to **https://console.firebase.google.com**
2. Click **"Add project"**
3. Name it: `mstbrn-community`
4. Disable Google Analytics (optional)
5. Click **"Create project"**

---

## Step 2: Add a Web App

1. In your Firebase project dashboard, click the **Web icon** (`</>`)
2. Register app name: `MSTBRN Community`
3. Copy the `firebaseConfig` object shown
4. Open `firebase-config.js` in the project folder
5. Replace the placeholder values with your real config:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234...:web:abc123"
};
```

---

## Step 3: Enable Authentication

1. In Firebase Console → **Authentication** → **Get Started**
2. Click **Sign-in method** tab
3. Enable **Email/Password**
4. Click **Save**

---

## Step 4: Create Firestore Database

1. Firebase Console → **Firestore Database** → **Create database**
2. Start in **production mode**
3. Choose a location (e.g. `us-central`)
4. Click **Done**

### Firestore Security Rules

Paste these rules in **Firestore → Rules**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users: read by anyone logged in, write only own doc
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Posts: read by anyone logged in
    match /posts/{postId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if request.auth != null && (
        request.auth.uid == resource.data.authorId ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
      );

      // Likes sub-collection
      match /likes/{likeId} {
        allow read, write: if request.auth != null;
      }

      // Comments sub-collection
      match /comments/{commentId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null;
        allow delete: if request.auth != null && (
          request.auth.uid == resource.data.authorId ||
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
        );
      }
    }

    // Meta stats
    match /meta/{doc} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

---

## Step 5: Enable Firebase Storage

1. Firebase Console → **Storage** → **Get Started**
2. Start in **production mode**
3. Click **Done**

### Storage Security Rules

Paste in **Storage → Rules**:

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

## Step 6: Make Yourself Admin

After registering on the site, go to **Firestore → users** collection, find your user document, and change:

```json
"role": "user"   →   "role": "admin"
```

Refresh the site. The Admin panel will appear in the sidebar.

---

## Firestore Database Structure

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
│       ├── authorId: string (uid)
│       ├── username: string
│       ├── photoURL: string
│       ├── likeCount: number
│       ├── commentCount: number
│       ├── createdAt: timestamp
│       ├── likes/
│       │   └── {uid}/
│       │       └── likedAt: timestamp
│       └── comments/
│           └── {commentId}/
│               ├── text: string
│               ├── authorId: string
│               ├── username: string
│               ├── photoURL: string
│               └── createdAt: timestamp
│
└── meta/
    └── stats/
        ├── memberCount: number
        └── postCount: number
```

---

## Step 7: Launch the Site

Option A — **Local testing** (recommended):
- Install VS Code + Live Server extension
- Right-click `index.html` → **Open with Live Server**

Option B — **Firebase Hosting** (free deployment):
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Set public directory to: . (current folder)
# Single-page app: No
firebase deploy
```

Option C — **Netlify** (drag & drop):
- Go to https://netlify.com
- Drag the project folder onto the dashboard
- Done! Your site is live.

---

## File Structure

```
mstbrn/
├── index.html          ← Main app (all pages)
├── style.css           ← All styles
├── app.js              ← All logic
├── firebase-config.js  ← Your Firebase credentials
├── logo-dark.svg       ← Logo (dark background)
├── logo-light.svg      ← Logo (light background)
└── SETUP.md            ← This guide
```

---

## Customization

- **Social links** — Edit the URLs in the Links section of `index.html`
- **Roblox maps** — Update game IDs/links in the Roblox section
- **Discord** — Replace `https://discord.gg/mstbrn` with your actual invite
- **Colors** — Change CSS variables in `style.css` under `:root`

---

Happy building! 🚀 — MSTBRN Community
