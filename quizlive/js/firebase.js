// Firebase initialisation — the only file you need to edit.
// Get these values from: Firebase console → Project settings → Your apps → Web app.
// The web config is public by design; your data is protected by the security rules.
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  // Copy the exact Realtime Database URL from the console (region-specific).
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

if (firebaseConfig.apiKey.startsWith("YOUR_")) {
  const warn = document.createElement("div");
  warn.className = "config-warning";
  warn.textContent = "Firebase is not configured yet: edit js/firebase.js with your project's web config.";
  document.addEventListener("DOMContentLoaded", () => document.body.prepend(warn));
}

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);   // Realtime Database — live games
export const fs = getFirestore(app);  // Firestore — quiz library

// Server clock: every timing decision uses server time, never the device clock.
let serverOffset = 0;
onValue(ref(db, ".info/serverTimeOffset"), (snap) => { serverOffset = snap.val() || 0; });
export const serverNow = () => Date.now() + serverOffset;
