import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    getDatabase
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

import {
    getAuth,
    signInAnonymously
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyApx9s_nJZ_M5Pci7zZ-o1tPbu0L0_NN2M",
    authDomain: "draw-what-21e71.firebaseapp.com",
    projectId: "draw-what-21e71",
    storageBucket: "draw-what-21e71.firebasestorage.app",
    messagingSenderId: "777612175385",
    appId: "1:777612175385:web:1385a25aa16b193fcfe288",

    // IMPORTANT: use your Singapore RTDB URL
    databaseURL:
        "https://draw-what-21e71-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);

// Firestore
export const db = getFirestore(app);

// Realtime Database
export const rtdb = getDatabase(app);

// Auth
export const auth = getAuth(app);

signInAnonymously(auth)
    .then(() => {
        console.log("Logged in");
    })
    .catch(console.error);