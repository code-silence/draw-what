import { db } from "./firebase.js";

import {
  doc,
  onSnapshot,
  updateDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ===== BASIC DATA =====
const roomCode = localStorage.getItem("roomCode");
const playerName = localStorage.getItem("playerName");

if (!roomCode || !playerName) {
    alert("Missing room or player info");
    location.href = "lobby.html";
}

const roomRef = doc(db, "rooms", roomCode);


// ===== UI ELEMENTS =====
const playerList = document.getElementById("playerList");
const startBtn = document.getElementById("startBtn");

const lobbySection = document.getElementById("lobbySection");
const gameSection = document.getElementById("gameSection");
const status = document.getElementById("status");

document.getElementById("roomCode").textContent = roomCode;


// ===== REALTIME LISTENER =====
onSnapshot(roomRef, (snap) => {

    if (!snap.exists()) return;

    const data = snap.data();

    // ---- render players ----
    playerList.innerHTML = "";

    data.players.forEach((p) => {
        const li = document.createElement("li");
        li.textContent = p.name;
        playerList.appendChild(li);
    });

    // ---- host only start button ----
    if (data.host === playerName && data.state === "waiting") {
        startBtn.style.display = "block";
    } else {
        startBtn.style.display = "none";
    }

    // ===== GAME STATE CONTROL =====
    if (data.state === "drawing") {

        lobbySection.style.display = "none";
        gameSection.style.display = "block";

        status.textContent =
            data.currentDrawer === playerName
                ? `You are drawing: ${data.currentWord}`
                : `${data.currentDrawer} is drawing`;

    } else {

        lobbySection.style.display = "block";
        gameSection.style.display = "none";

        status.textContent = "Waiting for game...";
    }

});


// ===== START GAME =====
startBtn.addEventListener("click", async () => {

    const snap = await getDoc(roomRef);

    if (!snap.exists()) {
        alert("Room not found");
        return;
    }

    const data = snap.data();

    if (data.state !== "waiting") {
        alert("Game already started");
        return;
    }

    // shuffle players
    const shuffled = [...data.players]
        .sort(() => Math.random() - 0.5);

    await updateDoc(roomRef, {
        state: "drawing",
        round: 1,
        players: shuffled,
        currentDrawer: shuffled[0].name,
        currentWord: "Cat" // temporary word (we improve later)
    });

});