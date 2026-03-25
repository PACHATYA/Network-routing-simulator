// ==============================
// 🔵 PARTICLES INIT (UNCHANGED)
// ==============================
particlesJS("particles-js", {
    particles: {
        number: { value: 80, density: { enable: true, value_area: 800 } },
        color: { value: "#00f2ff" },
        shape: { type: "circle" },
        opacity: { value: 0.2 },
        size: { value: 2 },
        line_linked: {
            enable: true,
            distance: 150,
            color: "#00f2ff",
            opacity: 0.2,
            width: 1
        },
        move: { enable: true, speed: 1, out_mode: "out" }
    },
    interactivity: {
        events: { onhover: { enable: true, mode: "grab" } },
        modes: { grab: { distance: 200 } }
    }
});

// ==============================
// 🔥 SAFE ELEMENT SELECTORS
// ==============================
const launchBtn = document.querySelector('.launch-btn');
const hero = document.querySelector('.hero');

// Optional (if you add later)
const terminal = document.getElementById('terminal-text');

// ==============================
// 🚀 LAUNCH SEQUENCE
// ==============================
if (launchBtn) {
    launchBtn.addEventListener('click', function () {

        // Disable button
        launchBtn.style.pointerEvents = 'none';
        launchBtn.innerText = "BOOTING...";

        // Optional terminal text
        if (terminal) {
            terminal.innerText = "> Initializing A* routing engine...";
        }

        // Add exit animation
        if (hero) {
            hero.style.transition = "opacity 0.8s ease, transform 0.8s ease";
            hero.style.opacity = "0";
            hero.style.transform = "scale(1.05)";
        }

        // Redirect after animation
        setTimeout(() => {
            window.location.href = 'simulator.html';
        }, 1000);
    });
}

// ==============================
// 💻 TERMINAL LOOP (OPTIONAL)
// ==============================
const logs = [
    "> Initializing core routing protocols...",
    "> Loading A* heuristic engine...",
    "> Applying congestion models...",
    "> Ready for deployment."
];

let i = 0;

if (terminal) {
    setInterval(() => {
        if (!launchBtn.innerText.includes("BOOTING")) {
            terminal.innerText = logs[i % logs.length];
            i++;
        }
    }, 2500);
}

// ==============================
// 🔥 OPTIONAL: KEYBOARD SHORTCUT
// ==============================
document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && launchBtn) {
        launchBtn.click();
    }
});