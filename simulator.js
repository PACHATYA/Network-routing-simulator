document.addEventListener("DOMContentLoaded", () => {

const canvas = document.getElementById('networkCanvas');
const ctx = canvas.getContext('2d');

let nodes = [], links = [], packets = [];
let mode = 'move';

let selectedNode = null, startNode = null, endNode = null;
let linkSource = null, isDragging = false;

let totalPacketsSent = 0;
let trafficLevel = 1;
let globalEdgeWidth = 2;

let shortestPath = [];
let rejectedLinks = [];

let currentAlgo = "astar"; // 🔥 toggle

// ==============================
// INIT
// ==============================
document.getElementById("close-tutorial").onclick = () => {
    document.body.classList.add("system-ready");
    document.getElementById("tutorial-overlay").remove();
};

// ==============================
// RESIZE
// ==============================
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// ==============================
// NODE
// ==============================
class Node {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.g = Infinity;
        this.parent = null;
        this.congested = false;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);

        if (this === startNode) ctx.fillStyle = "#00ff88";
        else if (this === endNode) ctx.fillStyle = "#ffcc00";
        else if (this.congested) ctx.fillStyle = "#ff4d4d";
        else ctx.fillStyle = "#0f172a";

        ctx.fill();
        ctx.strokeStyle = "#00f2ff";
        ctx.stroke();

        ctx.fillStyle = "#00f2ff";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";

        ctx.fillText(this.id, this.x, this.y - 8);
        ctx.fillText("P:" + this.id, this.x, this.y + 10);

        if (this.parent && endNode) {
            let h = heuristic(this, endNode);
            let f = this.g + h;
            ctx.fillText(`f:${f.toFixed(1)}`, this.x, this.y + 25);
        }
    }
}

// ==============================
// INTERACTION
// ==============================
canvas.addEventListener('mousedown', e => {

    if (!document.body.classList.contains('system-ready')) return;

    const x = e.offsetX, y = e.offsetY;
    const clicked = nodes.find(n => Math.hypot(n.x - x, n.y - y) < 20);

    if (mode === 'node' && !clicked) {
        nodes.push(new Node(`R${nodes.length}`, x, y));
    }

    else if (mode === 'move' && clicked) {
        selectedNode = clicked;
        isDragging = true;
    }

    else if (mode === 'link' && clicked) {
        if (!linkSource) linkSource = clicked;
        else {
            links.push({ a: linkSource, b: clicked, weight: 1 });
            linkSource = null;
        }
    }

    else if (mode === 'congest' && clicked) {
        clicked.congested = !clicked.congested;
    }

    else selectedNode = clicked;
});

window.addEventListener('mousemove', e => {
    if (isDragging && selectedNode) {
        selectedNode.x = e.offsetX;
        selectedNode.y = e.offsetY;
    }
});

window.addEventListener('mouseup', () => isDragging = false);

// ==============================
// HEURISTIC
// ==============================
function heuristic(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

// ==============================
// LIVE PANEL
// ==============================
function updateLivePanel(node) {
    if (!node || !endNode) return;

    let g = node.g || 0;
    let h = heuristic(node, endNode);
    let f = g + h;

    document.getElementById("nodeName").innerText = node.id;
    document.getElementById("gVal").innerText = g.toFixed(2);
    document.getElementById("hVal").innerText = h.toFixed(2);
    document.getElementById("fVal").innerText = f.toFixed(2);
}

// ==============================
// A* / DIJKSTRA
// ==============================
async function runAStar() {

    if (!startNode || !endNode) return;

    shortestPath = [];
    rejectedLinks = [];

    nodes.forEach(n => {
        n.g = Infinity;
        n.parent = null;
    });

    startNode.g = 0;
    let openSet = [startNode];

    while (openSet.length) {

        if (currentAlgo === "astar") {
            openSet.sort((a, b) =>
                (a.g + heuristic(a, endNode)) -
                (b.g + heuristic(b, endNode))
            );
        } else {
            openSet.sort((a, b) => a.g - b.g);
        }

        let current = openSet.shift();
        updateLivePanel(current);

        if (current === endNode) {

            let path = [];
            let t = current;

            while (t) {
                path.push(t);
                t = t.parent;
            }

            shortestPath = path.reverse();

            sendPacket(shortestPath);
            logPath(shortestPath);
            return;
        }

        links.forEach(link => {
            let neighbor =
                link.a === current ? link.b :
                link.b === current ? link.a : null;

            if (!neighbor) return;

            let cost = link.weight * trafficLevel;
            if (neighbor.congested) cost *= 3;

            let tempG = current.g + cost;

            if (tempG < neighbor.g) {
                neighbor.g = tempG;
                neighbor.parent = current;

                if (!openSet.includes(neighbor)) {
                    openSet.push(neighbor);
                }
            } else {
                rejectedLinks.push(link);
            }
        });

        await new Promise(r => setTimeout(r, 100));
    }
}

// ==============================
// PACKETS
// ==============================
function sendPacket(path) {
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            packets.push({ path, step: 0, progress: 0 });
            totalPacketsSent++;
            document.getElementById("total-sent").innerText = totalPacketsSent;
        }, i * 200);
    }
}

// ==============================
// LOG
// ==============================
function logPath(path) {
    const container = document.getElementById("feed-container");

    const entry = document.createElement("div");
    entry.className = "log-entry";

    entry.innerHTML = path.map(n => n.id).join(" → ");
    container.prepend(entry);
}

// ==============================
// MESH
// ==============================
function generateMesh() {
    if (nodes.length < 2) return;

    links = [];

    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            let a = nodes[i];
            let b = nodes[j];

            let weight = Math.hypot(a.x - b.x, a.y - b.y) / 100;

            links.push({ a, b, weight: parseFloat(weight.toFixed(2)) });
        }
    }
}

// ==============================
// DRAW
// ==============================
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    links.forEach(l => {

        const isPath = shortestPath.includes(l.a) && shortestPath.includes(l.b);
        const isRejected = rejectedLinks.includes(l);

        ctx.beginPath();
        ctx.moveTo(l.a.x, l.a.y);
        ctx.lineTo(l.b.x, l.b.y);

        if (isPath) {
            ctx.strokeStyle = "#00f2ff";
            ctx.lineWidth = 4;
        } else if (isRejected) {
            ctx.strokeStyle = "#ff4d4d";
            ctx.lineWidth = 2;
        } else {
            ctx.strokeStyle = "rgba(0,242,255,0.2)";
            ctx.lineWidth = globalEdgeWidth;
        }

        ctx.stroke();

        ctx.fillStyle = "#fff";
        ctx.fillText(l.weight, (l.a.x + l.b.x)/2, (l.a.y + l.b.y)/2);
    });

    packets.forEach((p, i) => {
        let a = p.path[p.step];
        let b = p.path[p.step + 1];

        if (!b) return packets.splice(i,1);

        updateLivePanel(a);

        p.progress += 0.04;

        let x = a.x + (b.x - a.x) * p.progress;
        let y = a.y + (b.y - a.y) * p.progress;

        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();

        if (p.progress >= 1) {
            p.progress = 0;
            p.step++;
        }
    });

    document.getElementById("packet-count").innerText = packets.length;

    nodes.forEach(n => n.draw());

    requestAnimationFrame(animate);
}

// ==============================
// UI
// ==============================
function bind(id, fn) {
    document.getElementById(id).addEventListener("click", fn);
}

bind("btn-node", () => mode = "node");
bind("btn-link", () => mode = "link");
bind("btn-move", () => mode = "move");
bind("btn-congest", () => mode = "congest");

bind("btn-start", () => startNode = selectedNode);
bind("btn-end", () => endNode = selectedNode);

bind("btn-run", runAStar);
bind("btn-mesh", generateMesh);

// 🔥 ALGO TOGGLE
bind("btn-toggle-algo", () => {
    if (currentAlgo === "astar") {
        currentAlgo = "dijkstra";
        document.getElementById("btn-toggle-algo").innerText = "ALGO: DIJKSTRA";
    } else {
        currentAlgo = "astar";
        document.getElementById("btn-toggle-algo").innerText = "ALGO: A*";
    }
});

document.getElementById("edgeWidthSlider").oninput = e => {
    globalEdgeWidth = parseInt(e.target.value);
};

document.getElementById("noise-slider").oninput = e => {
    trafficLevel = 1 + e.target.value / 50;
};

// ==============================
animate();

});