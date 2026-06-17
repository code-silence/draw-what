// TODO: Replace with YOUR actual Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDK3Q4YJKD8rPCNxO6RY5dJGprLQdBoK2g",
  authDomain: "draw-what-a4407.firebaseapp.com",
  databaseURL: "https://draw-what-a4407-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "draw-what-a4407",
  storageBucket: "draw-what-a4407.firebasestorage.app",
  messagingSenderId: "582109778076",
  appId: "1:582109778076:web:51dad7e2d8c46d63579d59"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// DOM Elements
const roomSelection = document.getElementById('room-selection');
const gameContainer = document.getElementById('game-container');
const usernameInput = document.getElementById('usernameInput');
const roomInput = document.getElementById('roomInput');
const joinBtn = document.getElementById('joinBtn');
const roleDisplay = document.getElementById('role-display');

const canvas = document.getElementById('paintCanvas');
const ctx = canvas.getContext('2d');
const clearBtn = document.getElementById('clearBtn');

// Game Variables
let username = "";
let roomCode = "";
let isDrawer = true; // Temporary: hardcoded true so you can test drawing syncing
let drawing = false;
let roomRef = null;

ctx.lineWidth = 4;
ctx.lineCap = 'round';
ctx.strokeStyle = '#000000';

// 1. JOIN ROOM FUNCTIONALITY
joinBtn.addEventListener('click', () => {
    username = usernameInput.value.trim();
    roomCode = roomInput.value.trim();

    if (!username || !roomCode) {
        alert("Please enter both a username and a room code.");
        return;
    }

    // Switch screens
    roomSelection.style.display = 'none';
    gameContainer.style.display = 'flex';
    roleDisplay.innerText = `Logged in as: ${username} (Room: ${roomCode})`;

    // Reference to this specific room in Firebase
    roomRef = database.ref('rooms/' + roomCode);

    // Listen for incoming drawing coordinates from Firebase
    listenForDrawing();
    trackPlayerRoom(); 
    listenForGuesses();
});

// 2. DRAWING LOGIC (Send data if Drawer, receive data if Viewer)
canvas.addEventListener('mousedown', (e) => {
    if (!isDrawer) return;
    drawing = true;
    sendDrawData(e, 'start');
});

canvas.addEventListener('mousemove', (e) => {
    if (!drawing || !isDrawer) return;
    sendDrawData(e, 'draw');
});

canvas.addEventListener('mouseup', () => {
    if (!isDrawer) return;
    drawing = false;
    sendDrawData(null, 'stop');
});

canvas.addEventListener('mouseleave', () => {
    if (!isDrawer) return;
    drawing = false;
    sendDrawData(null, 'stop');
});

// Pack canvas coordinates and push to Firebase
function sendDrawData(e, type) {
    if (type === 'stop') {
        roomRef.child('drawing').push({ type: 'stop' });
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    roomRef.child('drawing').push({
        type: type,
        x: x,
        y: y
    });
}

// 3. LISTEN FOR FIREBASE UPDATES (This updates the canvas for everyone)
function listenForDrawing() {
    roomRef.child('drawing').on('child_added', (snapshot) => {
        const data = snapshot.val();
        
        if (data.type === 'start') {
            ctx.beginPath();
            ctx.moveTo(data.x, data.y);
        } else if (data.type === 'draw') {
            ctx.lineTo(data.x, data.y);
            ctx.stroke();
        } else if (data.type === 'stop') {
            ctx.beginPath();
        }
    });

    // Clear canvas when database triggers clear
    roomRef.child('clear').on('value', (snapshot) => {
        if (snapshot.val() === true) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    });
}

// Clear Button Action
clearBtn.addEventListener('click', () => {
    if (!isDrawer) return;
    roomRef.child('clear').set(true);
    // Reset the clear flag immediately so users can clear again later
    roomRef.child('clear').set(false); 
});

// 1. TRACK PLAYERS IN FIREBASE
function trackPlayerRoom() {
    // Create a unique reference for THIS player inside the room's user list
    const playerRef = roomRef.child('players').push();
    
    // Save player details
    playerRef.set({
        username: username,
        isHost: false // We will use this later to let the creator start the game
    });

    // CRITICAL: If the player closes the tab or disconnects, automatically remove them from Firebase
    playerRef.onDisconnect().remove();

    // 2. LISTEN FOR CURRENT PLAYERS IN THE ROOM
    roomRef.child('players').on('value', (snapshot) => {
        const players = snapshot.val();
        
        // Let's print the current player count to the console to verify it works
        console.log("Current Players in Room:", players);
        
        // Optional: Update UI header with player count
        if (players) {
            const count = Object.keys(players).length;
            roleDisplay.innerText = `Logged in as: ${username} | Players online: ${count}`;
        }
    });
}