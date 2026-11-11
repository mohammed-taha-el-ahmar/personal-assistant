// 1) Paste your Firebase web app config here (Firebase console > Project settings > Your apps > Web app).
//    These values are not secret: access is protected by firestore.rules.
// 2) Leave apiKey empty to run the app without accounts (progress stays on the device).
export const firebaseConfig = {
  apiKey: "AIzaSyCVQU17drFiEG5G6vdxtDA66K0T-6k0e3I",
  authDomain: "sourah.firebaseapp.com",
  projectId: "sourah",
  storageBucket: "sourah.firebasestorage.app",
  messagingSenderId: "139375937197",
  appId: "1:139375937197:web:86f493187100e9e866e824"
};

export const FIREBASE_SDK = 'https://www.gstatic.com/firebasejs/13.2.0';

// Ayah-by-ayah audio. {r} = reciter folder, {sss} = surah (3 digits), {aaa} = ayah (3 digits).
export const AUDIO_URL = 'https://everyayah.com/data/{r}/{sss}{aaa}.mp3';
export const RECITERS = [
  ['Alafasy_128kbps', 'Mishary Rashid Alafasy'],
  ['Husary_64kbps', 'Mahmoud Khalil Al-Husary'],
  ['Minshawy_Murattal_128kbps', 'Mohamed Siddiq Al-Minshawi'],
  ['Abdul_Basit_Murattal_64kbps', 'Abdul Basit Abdul Samad'],
  ['Abu_Bakr_Ash-Shaatree_128kbps', 'Abu Bakr Ash-Shatri'],
  ['Saood_ash-Shuraym_128kbps', 'Saud Ash-Shuraim'],
  ['Hani_Rifai_192kbps', 'Hani Ar-Rifai'],
  ['Mohammad_al_Tablaway_128kbps', 'Mohammad Al-Tablawi']
];

export const PRIVACY_URL = 'privacy.html';
