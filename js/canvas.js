import { db } from "./firebase.js";

import {
    doc,
    collection,
    addDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const roomCode = localStorage.getItem("roomCode");
const playerName = localStorage.getItem("playerName");

const roomRef = doc(db, "rooms", roomCode);
const strokeRef = collection(roomRef, "strokes");

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = 400;

let drawing = false;
let canDraw = false;

let lastX = null;
let lastY = null;

// Subscribe to room updates to know who can draw
onSnapshot(roomRef, (snap) => {
    if (!snap.exists()) return;

    const data = snap.data();
    
    if (data.state === "drawing" && data.gameStartTime) {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

    // ONLY DRAWER CAN DRAW
    canDraw = String(data.currentDrawer) === String(playerName);
});

function drawLine(x0, y0, x1, y1) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.closePath();
}

async function sendStroke(data) {
    if (!canDraw) return; // 🔥 LOCK

    // attach sender and timestamp so listeners can filter/ordering
    data.sender = playerName;
    data.ts = Date.now();

    await addDoc(strokeRef, data);
}

canvas.addEventListener("mousedown", (e) => {

    if (!canDraw) return;

    drawing = true;
    lastX = e.offsetX;
    lastY = e.offsetY;

    sendStroke({
        x: lastX,
        y: lastY,
        type: "start"
    });
});

canvas.addEventListener("mousemove", (e) => {

    if (!drawing || !canDraw) return;

    const x = e.offsetX;
    const y = e.offsetY;

    // draw locally for immediate feedback
    if (lastX !== null && lastY !== null) {
        drawLine(lastX, lastY, x, y);
    }

    sendStroke({
        x,
        y,
        type: "move"
    });

    lastX = x;
    lastY = y;
});

canvas.addEventListener("mouseup", () => {
    drawing = false;
});

canvas.addEventListener("mouseleave", () => {
    drawing = false;
});

onSnapshot(strokeRef, (snapshot) => {

    snapshot.docChanges().forEach((change) => {

        const data = change.doc.data();
        // ignore our own strokes (we already render them locally)
        if (data.sender === playerName) return;

        if (change.type !== 'added') return;

        if (data.type === "start") {
            lastX = data.x;
            lastY = data.y;
        } else if (data.type === "move") {
            if (lastX === null || lastY === null) {
                lastX = data.x;
                lastY = data.y;
                return;
            }

            drawLine(lastX, lastY, data.x, data.y);

            lastX = data.x;
            lastY = data.y;
        }
    });
});