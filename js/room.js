import { db } from "./firebase.js";
import { words } from "./words.js";

import {
    doc,
    onSnapshot,
    updateDoc,
    getDoc,
    arrayUnion
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
const resultSection = document.getElementById("resultSection");
const status = document.getElementById("status");
const wordBox = document.getElementById("wordBox");
const correctAnswer = document.getElementById("correctAnswer");
const guessResults = document.getElementById("guessResults");
const nextRoundBtn = document.getElementById("nextRoundBtn");
const guessBtn = document.getElementById("guessBtn");
const guessInput = document.getElementById("guessInput");

document.getElementById("roomCode").textContent = roomCode;

let timerInterval = null;


// ===== REALTIME LISTENER =====
onSnapshot(roomRef, (snap) => {

    if (!snap.exists()) return;

    const data = snap.data();

    console.log("HOST:", data.host, "ME:", playerName, "STATE:", data.state);

    // ---- render players ----
    playerList.innerHTML = "";
    data.players.forEach((p) => {
        const li = document.createElement("li");
        li.textContent = p.name;
        playerList.appendChild(li);
    });

    // ---- host button FIXED (safe compare) ----
    const isHost =
        data.host &&
        data.host.trim().toLowerCase() ===
        playerName.trim().toLowerCase();

    if (isHost && data.state === "waiting") {
        startBtn.style.display = "block";
    } else {
        startBtn.style.display = "none";
    }

    // ===== GAME STATE CONTROL =====
    if (data.state === "drawing") {

        resultSection.style.display = "none";
        lobbySection.style.display = "none";
        gameSection.style.display = "block";

        guessInput.disabled = false;
        guessBtn.disabled = false;
        guessInput.value = "";

        const isDrawer = data.currentDrawer === playerName;

        guessInput.style.display = isDrawer ? "none" : "inline-block";
        guessBtn.style.display = isDrawer ? "none" : "inline-block";

        status.textContent = isDrawer
            ? "You are drawing"
            : `${data.currentDrawer} is drawing`;

        wordBox.textContent = isDrawer
            ? `WORD: ${data.currentWord}`
            : "?????";

        // TIMER (fixed safe check)
        if (data.gameStartTime && !timerInterval) {

            const startTime = data.gameStartTime;
            const duration = 60 * 1000;

            timerInterval = setInterval(async () => {

                const now = Date.now();
                const remaining = Math.max(
                    0,
                    Math.floor((duration - (now - startTime)) / 1000)
                );

                status.textContent = isDrawer
                    ? `You are drawing • ⏱ ${remaining}s`
                    : `${data.currentDrawer} is drawing • ⏱ ${remaining}s`;

                if (remaining <= 0) {
                    clearInterval(timerInterval);
                    timerInterval = null;

                    if (data.host === playerName) {
                        await updateDoc(roomRef, { state: "result" });
                    }
                }

            }, 1000);
        }

    } else if (data.state === "result") {

        clearInterval(timerInterval);
        timerInterval = null;

        lobbySection.style.display = "none";
        gameSection.style.display = "none";
        resultSection.style.display = "block";

        nextRoundBtn.style.display = isHost ? "block" : "none";

        correctAnswer.textContent = `Correct Answer: ${data.currentWord}`;

        guessResults.innerHTML = "";
        data.guesses?.forEach((g) => {
            const p = document.createElement("p");
            p.textContent = `${g.player} guessed: ${g.guess}`;
            guessResults.appendChild(p);
        });

        nextRoundBtn.textContent = "Next Round";

    } else if (data.state === "finished") {

        lobbySection.style.display = "none";
        gameSection.style.display = "none";
        resultSection.style.display = "block";

        correctAnswer.textContent = "Game Finished!";
        guessResults.innerHTML = "";

        const p = document.createElement("p");
        p.textContent = "Everyone has drawn.";
        guessResults.appendChild(p);

        nextRoundBtn.textContent = "Play Again";
        nextRoundBtn.style.display = "block";

    } else {

        lobbySection.style.display = "block";
        gameSection.style.display = "none";
        resultSection.style.display = "none";

        status.textContent = "Waiting for game...";
    }

});


// ===== WORD =====
function getRandomWord() {
    return words[Math.floor(Math.random() * words.length)];
}


// ===== START GAME =====
startBtn.addEventListener("click", async () => {

    const snap = await getDoc(roomRef);
    if (!snap.exists()) return;

    const data = snap.data();

    if (data.state !== "waiting") return;

    const shuffled = [...data.players]
        .sort(() => Math.random() - 0.5);

    await updateDoc(roomRef, {
        host: data.host || playerName,   // IMPORTANT SAFE FIX

        state: "drawing",
        round: 1,
        currentDrawerIndex: 0,

        players: shuffled,
        currentDrawer: shuffled[0].name,
        currentWord: getRandomWord(),

        guesses: [],
        gameStartTime: Date.now(),
        timer: 60
    });

});


// ===== NEXT / PLAY AGAIN =====
nextRoundBtn.addEventListener("click", async () => {

    const snap = await getDoc(roomRef);
    const data = snap.data();

    if (data.state === "finished") {

        const shuffled = [...data.players]
            .sort(() => Math.random() - 0.5);

        await updateDoc(roomRef, {

            state: "waiting",

            host: data.host || playerName,

            round: 1,

            players: shuffled,

            currentDrawerIndex: 0,
            currentDrawer: null,
            currentWord: null,

            guesses: [],
            gameStartTime: null
        });

        return;
    }

    const nextIndex = data.currentDrawerIndex + 1;

    if (nextIndex >= data.players.length) {
        await updateDoc(roomRef, {
            state: "finished"
        });
        return;
    }

    await updateDoc(roomRef, {
        state: "drawing",
        currentDrawerIndex: nextIndex,
        currentDrawer: data.players[nextIndex].name,

        currentWord: getRandomWord(),
        guesses: [],
        gameStartTime: Date.now()
    });

});


// ===== GUESS =====
guessBtn.addEventListener("click", async () => {

    const guess = guessInput.value.trim();
    if (!guess) return;

    const snap = await getDoc(roomRef);
    const data = snap.data();

    if (data.guesses?.some(g => g.player === playerName)) {
        alert("You already guessed.");
        return;
    }

    await updateDoc(roomRef, {
        guesses: arrayUnion({
            player: playerName,
            guess
        })
    });

    guessInput.disabled = true;
    guessBtn.disabled = true;
    guessInput.value = "";
});