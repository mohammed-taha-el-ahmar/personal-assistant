// Firebase initialisation — the only file you need to edit.
// Get these values from: Firebase console → Project settings → Your apps → Web app.
// The web config is public by design; your data is protected by the security rules.
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyCL_cRYl-AmBdlhSNIGdAj_RFPv29dojf4",
  authDomain: "quizlive-d3b60.firebaseapp.com",
  databaseURL: "https://quizlive-d3b60-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "quizlive-d3b60",
  storageBucket: "quizlive-d3b60.firebasestorage.app",
  messagingSenderId: "30542254081",
  appId: "1:30542254081:web:bc712ce16ecd43311cf000",
  measurementId: "G-XEYVXN34YF"
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
