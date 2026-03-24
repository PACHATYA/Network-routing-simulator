// 1. Initialize Particles.js with a "Neural Network" look
particlesJS("particles-js", {
    "particles": {
        "number": { "value": 80, "density": { "enable": true, "value_area": 800 } },
        "color": { "value": "#00f2ff" },
        "shape": { "type": "circle" },
        "opacity": { "value": 0.2 },
        "size": { "value": 2 },
        "line_linked": { "enable": true, "distance": 150, "color": "#00f2ff", "opacity": 0.2, "width": 1 },
        "move": { "enable": true, "speed": 1, "out_mode": "out" }
    },
    "interactivity": {
        "events": { "onhover": { "enable": true, "mode": "grab" } },
        "modes": { "grab": { "distance": 200 } }
    }
});

// 2. Functional Redirect Logic
document.getElementById('launchBtn').addEventListener('click', function() {
    const hero = document.getElementById('hero-container');
    const terminal = document.getElementById('terminal-text');
    const btn = this;

    // Update UI to show "Booting"
    btn.style.pointerEvents = 'none';
    btn.querySelector('.btn-content').innerText = "BOOTING...";
    terminal.innerText = "> Loading topology modules...";
    
    // Play sound or haptic feedback feel via CSS
    hero.classList.add('fade-out-exit');

    // Wait for animation, then redirect
    setTimeout(() => {
        window.location.href = 'simulator.html';
    }, 1200); 
});

// Terminal Animation Loop
const logs = [
    "> Initializing core routing protocols...",
    "> Establishing A* heuristic parameters...",
    "> Ready for deployment."
];
let i = 0;
setInterval(() => {
    if(!document.getElementById('launchBtn').innerText.includes("BOOTING")) {
        document.getElementById('terminal-text').innerText = logs[i % logs.length];
        i++;
    }
}, 3000);