import { db } from "./firebase.js";

import {
  doc,
  setDoc
}
from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

function generateCode() {

  return Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();
}

document
.getElementById("createRoomBtn")
.addEventListener("click", async () => {

  const roomCode =
    generateCode();

  await setDoc(
    doc(db, "rooms", roomCode),
    {
      host:
        localStorage.getItem(
          "playerName"
        ),

      state:
        "waiting",

      players: [
        localStorage.getItem(
          "playerName"
        )
      ]
    }
  );

  localStorage.setItem(
    "roomCode",
    roomCode
  );

  location.href =
    "room.html";
});