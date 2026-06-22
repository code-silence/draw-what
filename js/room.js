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
        guessInput.disabled = false;
        guessBtn.disabled = false;
        guessInput.value = "";
        resultSection.style.display = "none";
        lobbySection.style.display = "none";
        gameSection.style.display = "block";

        if (data.currentDrawer === playerName) {

            guessInput.style.display = "none";
            guessBtn.style.display = "none";

        } else {

            guessInput.style.display = "inline-block";
            guessBtn.style.display = "inline-block";

        }

        status.textContent =
            data.currentDrawer === playerName
                ? "You are drawing"
                : `${data.currentDrawer} is drawing`;

        if (data.currentDrawer === playerName) {

            wordBox.textContent =
                `WORD: ${data.currentWord}`;

        } else {

            wordBox.textContent =
                "?????";

        }
        // ⏱ TIMER LOGIC
        if (data.state === "drawing" && data.gameStartTime && !timerInterval) {
            const startTime = data.gameStartTime;
            const duration = 60 * 1000; // 60 seconds

            timerInterval = setInterval(async () => {
                const now = Date.now();
                const elapsed = now - startTime;
                const remaining = Math.max(0, Math.floor((duration - elapsed) / 1000));

                status.textContent =
                    data.currentDrawer === playerName
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

        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }

        lobbySection.style.display = "none";
        gameSection.style.display = "none";
        resultSection.style.display = "block";

        if (data.host === playerName) {
            nextRoundBtn.style.display = "block";
        } else {
            nextRoundBtn.style.display = "none";
        }

        correctAnswer.textContent = `Correct Answer: ${data.currentWord}`;
        guessResults.innerHTML = "";
        data.guesses?.forEach((g) => {
            const p = document.createElement("p");
            p.textContent = `${g.player} guessed: ${g.guess}`;
            guessResults.appendChild(p);
        });

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

    } else {

        lobbySection.style.display = "block";
        gameSection.style.display = "none";

        status.textContent = "Waiting for game...";
    }

});

//get a random word from the words array
function getRandomWord() {

    return words[
        Math.floor(
            Math.random() * words.length
        )
    ];

}

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
        currentDrawerIndex: 0,
        players: shuffled,
        currentDrawer: shuffled[0].name,
        currentWord: getRandomWord(),
        guesses: [],

        // ⏱ ADD THIS
        timer: 60,
        gameStartTime: Date.now()
    });

});

nextRoundBtn.addEventListener("click", async () => {
    const snap = await getDoc(roomRef);
    const data = snap.data();
    const nextIndex = data.currentDrawerIndex + 1;
    // everyone finished
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

guessBtn.addEventListener("click", async () => {

    const guess = guessInput.value.trim();

    if (!guess) return;

    const snap = await getDoc(roomRef);

    const data = snap.data();

    const alreadyGuessed =
        data.guesses?.some(
            g => g.player === playerName
        );

    if (alreadyGuessed) {
        alert("You already guessed.");
        return;
    }

    await updateDoc(roomRef, {

        guesses: arrayUnion({
            player: playerName,
            guess: guess
        })

    });

    guessInput.disabled = true;
    guessBtn.disabled = true;

    guessInput.value = "";

});