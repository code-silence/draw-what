import { rtdb } from "./firebase.js";

import {
    ref,
    set,
    get
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

const testRef = ref(rtdb, "test");

await set(testRef, {
    message: "Hello RTDB"
});

const snap = await get(testRef);

console.log(snap.val());