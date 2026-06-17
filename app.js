const canvas = document.getElementById('paintCanvas');
const ctx = canvas.getContext('2d');
const clearBtn = document.getElementById('clearBtn');

let drawing = false;

// Canvas styling for smooth lines
ctx.lineWidth = 4;
ctx.lineCap = 'round';
ctx.strokeStyle = '#000000';

// Start drawing
canvas.addEventListener('mousedown', (e) => {
    drawing = true;
    draw(e);
});

// Stop drawing
canvas.addEventListener('mouseup', () => {
    drawing = false;
    ctx.beginPath(); // Resets the line path
});

canvas.addEventListener('mouseleave', () => {
    drawing = false;
    ctx.beginPath();
});

// Draw function
function draw(e) {
    if (!drawing) return;

    // Get correct mouse coordinates relative to canvas
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
}

// Clear canvas
clearBtn.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});