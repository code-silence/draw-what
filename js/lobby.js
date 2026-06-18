import { db } from "./firebase.js";

import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// Generate room code
function generateCode() {
  return Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();
}


// Create Room
document
  .getElementById("createRoomBtn")
  .addEventListener("click", async () => {

    const playerName =
      localStorage.getItem("playerName");

    if (!playerName) {
      alert("Please enter your name first.");
      return;
    }

    const roomCode = generateCode();

    try {

      await setDoc(
        doc(db, "rooms", roomCode),
        {
          host: playerName,

          state: "waiting",

          createdAt: Date.now(),

          players: [
            {
              name: playerName
            }
          ]
        }
      );

      localStorage.setItem(
        "roomCode",
        roomCode
      );

      location.href = "room.html";

    } catch (error) {

      console.error(error);

      alert("Failed to create room.");
    }

  });


// Join Room
document
  .getElementById("joinRoomBtn")
  .addEventListener("click", async () => {

    const roomCode =
      document
        .getElementById("roomCodeInput")
        .value
        .trim()
        .toUpperCase();

    const playerName =
      localStorage.getItem("playerName");

    if (!roomCode) {
      alert("Enter room code.");
      return;
    }

    if (!playerName) {
      alert("Please enter your name first.");
      return;
    }

    try {

      const roomRef =
        doc(db, "rooms", roomCode);

      const roomSnap =
        await getDoc(roomRef);

      if (!roomSnap.exists()) {

        alert("Room not found.");

        return;
      }

      await updateDoc(
        roomRef,
        {
          players: arrayUnion({
            name: playerName
          })
        }
      );

      localStorage.setItem(
        "roomCode",
        roomCode
      );

      location.href =
        "room.html";

    } catch (error) {

      console.error(error);

      alert("Failed to join room.");
    }

  });