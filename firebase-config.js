// =============================================
//   FIREBASE CONFIG — MSTBRN COMMUNITY v2
//   Ganti nilai di bawah ini dengan kredensial
//   Firebase project kamu!
// =============================================

const firebaseConfig = {
  apiKey: "AIzaSyAuZLwwomxlNUjcPp4JYILdSz4EAWtoRxY",
  authDomain: "dooniniks-paradise.firebaseapp.com",
  projectId: "dooniniks-paradise",
  storageBucket: "dooniniks-paradise.firebasestorage.app",
  messagingSenderId: "140802324914",
  appId: "1:140802324914:web:17ea9b675e8770ba40ccab"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

console.log("✅ Firebase berhasil diinisialisasi — MSTBRN Community v2");
