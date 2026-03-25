document.addEventListener("DOMContentLoaded", () => {

const canvas = document.getElementById('networkCanvas');
const ctx = canvas.getContext('2d');
const PIXEL_RATIO = window.devicePixelRatio || 1;

let nodes = [], links = [], packets = [];
let mode = 'move';

let selectedNode = null, startNode = null, endNode = null;
let selectedLink = null;
let linkSource = null, isDragging = false;
let isPanning = false;

let totalPacketsSent = 0;
let trafficLevel = 1;

let shortestPath = [];
let rejectedLinks = [];
let traversedLinks = [];

let viewScale = 1;
let viewOffsetX = 0;
let viewOffsetY = 0;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

let panStartX = 0;
let panStartY = 0;
let panOriginX = 0;
let panOriginY = 0;

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
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.floor(width * PIXEL_RATIO);
    canvas.height = Math.floor(height * PIXEL_RATIO);
}
window.addEventListener('resize', resize);
resize();

function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

function getCanvasPoint(evt) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

function screenToWorld(x, y) {
    return {
        x: (x - viewOffsetX) / viewScale,
        y: (y - viewOffsetY) / viewScale
    };
}

function getConfiguredEdgeWeight() {
    const input = document.getElementById("edgeWeightInput");
    const parsed = parseFloat(input.value);
    if (Number.isNaN(parsed) || parsed <= 0) return 1;
    return parseFloat(parsed.toFixed(2));
}

function formatNodeScore(value) {
    if (!Number.isFinite(value)) return "inf";
    return value.toFixed(1);
}

function getLinkBetween(a, b) {
    return links.find(l =>
        (l.a === a && l.b === b) || (l.a === b && l.b === a)
    ) || null;
}

function refreshWeightLinkOptions() {
    const select = document.getElementById("weightLinkSelect");
    if (!select) return;

    select.innerHTML = "";

    if (!links.length) {
        const empty = document.createElement("option");
        empty.value = "";
        empty.textContent = "No links available";
        select.appendChild(empty);
        selectedLink = null;
        return;
    }

    links.forEach((link, index) => {
        const option = document.createElement("option");
        option.value = index.toString();
        option.textContent = `${link.a.id} ↔ ${link.b.id}`;
        select.appendChild(option);
    });

    if (selectedLink && links.includes(selectedLink)) {
        select.value = links.indexOf(selectedLink).toString();
    } else {
        select.value = "0";
        selectedLink = links[0];
    }

    if (selectedLink) {
        document.getElementById("edgeWeightInput").value = selectedLink.weight;
    }
}

function pointToSegmentDistance(px, py, ax, ay, bx, by) {
    const abx = bx - ax;
    const aby = by - ay;
    const apx = px - ax;
    const apy = py - ay;
    const abLenSq = abx * abx + aby * aby;

    if (abLenSq === 0) return Math.hypot(px - ax, py - ay);

    let t = (apx * abx + apy * aby) / abLenSq;
    t = clamp(t, 0, 1);

    const cx = ax + abx * t;
    const cy = ay + aby * t;

    return Math.hypot(px - cx, py - cy);
}

function findLinkNear(x, y) {
    const threshold = 10 / viewScale;
    return links.find(l => pointToSegmentDistance(x, y, l.a.x, l.a.y, l.b.x, l.b.y) <= threshold) || null;
}

function zoomAt(factor, anchorX, anchorY) {
    const worldX = (anchorX - viewOffsetX) / viewScale;
    const worldY = (anchorY - viewOffsetY) / viewScale;

    const newScale = clamp(viewScale * factor, MIN_ZOOM, MAX_ZOOM);
    viewScale = newScale;

    viewOffsetX = anchorX - worldX * viewScale;
    viewOffsetY = anchorY - worldY * viewScale;
}

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
        const x = Math.round(this.x);
        const y = Math.round(this.y);

        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);

        if (this === startNode) ctx.fillStyle = "#00ff88";
        else if (this === endNode) ctx.fillStyle = "#ffcc00";
        else if (this.congested) ctx.fillStyle = "#ff4d4d";
        else ctx.fillStyle = "#0f172a";

        ctx.fill();
        ctx.strokeStyle = "#00f2ff";
        ctx.stroke();

        ctx.fillStyle = "#00f2ff";
        ctx.font = "12px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillText(this.id, x, y - 8);
        ctx.fillText("P:" + this.id, x, y + 10);

        if (endNode) {
            let h = heuristic(this, endNode);
            let f = this.g + h;
            ctx.fillText(`f:${formatNodeScore(f)}`, x, y + 25);
        }
    }
}

// ==============================
// INTERACTION
// ==============================
canvas.addEventListener('mousedown', e => {

    if (!document.body.classList.contains('system-ready')) return;

    const point = getCanvasPoint(e);

    if (mode === 'pan') {
        isPanning = true;
        panStartX = point.x;
        panStartY = point.y;
        panOriginX = viewOffsetX;
        panOriginY = viewOffsetY;
        return;
    }

    const world = screenToWorld(point.x, point.y);
    const clicked = nodes.find(n => Math.hypot(n.x - world.x, n.y - world.y) < 20);

    if (mode === 'node' && !clicked) {
        nodes.push(new Node(`R${nodes.length}`, world.x, world.y));
        refreshWeightLinkOptions();
    }

    else if (mode === 'move' && clicked) {
        selectedNode = clicked;
        isDragging = true;
    }

    else if (mode === 'link' && clicked) {
        if (!linkSource) linkSource = clicked;
        else {
            const existingLink = getLinkBetween(linkSource, clicked);
            if (!existingLink) {
                links.push({ a: linkSource, b: clicked, weight: getConfiguredEdgeWeight() });
            }
            selectedLink = getLinkBetween(linkSource, clicked);
            refreshWeightLinkOptions();
            linkSource = null;
        }
    }

    else if (mode === 'weight') {
        selectedLink = findLinkNear(world.x, world.y);
        if (selectedLink) {
            document.getElementById("edgeWeightInput").value = selectedLink.weight;
        }
    }

    else if (mode === 'congest' && clicked) {
        clicked.congested = !clicked.congested;
    }

    else selectedNode = clicked;
});

window.addEventListener('mousemove', e => {
    const point = getCanvasPoint(e);

    if (isPanning) {
        viewOffsetX = panOriginX + (point.x - panStartX);
        viewOffsetY = panOriginY + (point.y - panStartY);
        return;
    }

    if (isDragging && selectedNode) {
        const world = screenToWorld(point.x, point.y);
        selectedNode.x = world.x;
        selectedNode.y = world.y;
    }
});

window.addEventListener('mouseup', () => {
    isDragging = false;
    isPanning = false;
});

canvas.addEventListener('wheel', e => {
    if (!document.body.classList.contains('system-ready')) return;

    e.preventDefault();
    const point = getCanvasPoint(e);
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    zoomAt(factor, point.x, point.y);
}, { passive: false });

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

function buildPathToNode(node) {
    const path = [];
    let cursor = node;

    while (cursor) {
        path.push(cursor);
        cursor = cursor.parent;
    }

    return path.reverse();
}

function isLinkInPath(link, path) {
    for (let i = 0; i < path.length - 1; i++) {
        const a = path[i];
        const b = path[i + 1];
        if ((link.a === a && link.b === b) || (link.a === b && link.b === a)) {
            return true;
        }
    }
    return false;
}

// ==============================
// A*
// ==============================
async function runAStar() {

    if (!startNode || !endNode) return;

    shortestPath = [];
    rejectedLinks = [];
    traversedLinks = [];

    nodes.forEach(n => {
        n.g = Infinity;
        n.parent = null;
    });

    startNode.g = 0;
    let openSet = [startNode];

    while (openSet.length) {
        openSet.sort((a, b) =>
            (a.g + heuristic(a, endNode)) -
            (b.g + heuristic(b, endNode))
        );

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
            updatePathCostValue(shortestPath);

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

            if (!traversedLinks.includes(link)) {
                traversedLinks.push(link);
            }

            if (tempG < neighbor.g) {
                neighbor.g = tempG;
                neighbor.parent = current;

                const exploredPath = buildPathToNode(neighbor);
                logPath(exploredPath, "explored");

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
    const mode = arguments[1] || "optimal";
    const container = document.getElementById("feed-container");

    const entry = document.createElement("div");
    entry.className = `log-entry ${mode === "optimal" ? "log-optimal" : "log-explored"}`;

    const label = document.createElement("div");
    label.className = "log-label";
    label.innerText = mode === "optimal" ? "OPTIMAL" : "EXPLORED";

    const pathLine = document.createElement("div");
    pathLine.className = "log-path";
    pathLine.innerText = path.map(n => n.id).join(" → ");

    entry.appendChild(label);
    entry.appendChild(pathLine);

    container.prepend(entry);

    while (container.children.length > 60) {
        container.removeChild(container.lastChild);
    }
}

function resetSearchState() {
    shortestPath = [];
    rejectedLinks = [];
    traversedLinks = [];
    packets = [];
}

function connectNodes(a, b) {
    if (!a || !b || a === b) return;

    const exists = getLinkBetween(a, b);

    if (exists) return;

    links.push({ a, b, weight: getConfiguredEdgeWeight() });
}

// ==============================
// TOPOLOGY
// ==============================
function generateTopology() {
    if (nodes.length < 2) return;

    const topology = document.getElementById("topologyType").value;
    links = [];
    resetSearchState();

    if (topology === "mesh") {
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                connectNodes(nodes[i], nodes[j]);
            }
        }
        refreshWeightLinkOptions();
        return;
    }

    if (topology === "bus") {
        for (let i = 0; i < nodes.length - 1; i++) {
            connectNodes(nodes[i], nodes[i + 1]);
        }
        refreshWeightLinkOptions();
        return;
    }

    if (topology === "ring") {
        for (let i = 0; i < nodes.length - 1; i++) {
            connectNodes(nodes[i], nodes[i + 1]);
        }
        connectNodes(nodes[nodes.length - 1], nodes[0]);
        refreshWeightLinkOptions();
        return;
    }

    if (topology === "star") {
        const hub = selectedNode || nodes[0];
        nodes.forEach(n => {
            if (n !== hub) {
                connectNodes(hub, n);
            }
        });
        refreshWeightLinkOptions();
    }
}

function updatePathCostValue(path) {
    let total = 0;

    for (let i = 0; i < path.length - 1; i++) {
        const link = getLinkBetween(path[i], path[i + 1]);
        if (!link) continue;

        let cost = link.weight * trafficLevel;
        if (path[i + 1].congested) cost *= 3;
        total += cost;
    }

    document.getElementById("path-cost").innerText = total.toFixed(2);
}

function resetGraph() {
    nodes = [];
    links = [];
    packets = [];

    selectedNode = null;
    startNode = null;
    endNode = null;
    selectedLink = null;
    linkSource = null;

    resetSearchState();

    totalPacketsSent = 0;
    document.getElementById("total-sent").innerText = "0";
    document.getElementById("packet-count").innerText = "0";
    document.getElementById("path-cost").innerText = "0";

    document.getElementById("nodeName").innerText = "-";
    document.getElementById("gVal").innerText = "-";
    document.getElementById("hVal").innerText = "-";
    document.getElementById("fVal").innerText = "-";

    document.getElementById("feed-container").innerHTML = "";
    refreshWeightLinkOptions();
}

function calculateAllNodeScores() {
    if (!startNode || !endNode) return;

    resetSearchState();
    nodes.forEach(n => {
        n.g = Infinity;
        n.parent = null;
    });

    startNode.g = 0;
    const queue = [startNode];

    while (queue.length) {
        queue.sort((a, b) => a.g - b.g);
        const current = queue.shift();

        links.forEach(link => {
            const neighbor =
                link.a === current ? link.b :
                link.b === current ? link.a : null;

            if (!neighbor) return;

            let cost = link.weight * trafficLevel;
            if (neighbor.congested) cost *= 3;

            const candidate = current.g + cost;
            if (candidate < neighbor.g) {
                neighbor.g = candidate;
                neighbor.parent = current;

                if (!queue.includes(neighbor)) {
                    queue.push(neighbor);
                }
            }
        });
    }

    if (Number.isFinite(endNode.g)) {
        shortestPath = buildPathToNode(endNode);
        updatePathCostValue(shortestPath);
    } else {
        shortestPath = [];
        document.getElementById("path-cost").innerText = "0";
    }

    updateLivePanel(startNode);
}

// ==============================
// DRAW
// ==============================
function animate() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.setTransform(
        PIXEL_RATIO * viewScale,
        0,
        0,
        PIXEL_RATIO * viewScale,
        PIXEL_RATIO * viewOffsetX,
        PIXEL_RATIO * viewOffsetY
    );

    links.forEach(l => {

        const isPath = isLinkInPath(l, shortestPath);
        const isRejected = rejectedLinks.includes(l);
        const isTraversed = traversedLinks.includes(l);
        const isSelected = selectedLink === l;

        ctx.beginPath();
        ctx.moveTo(l.a.x, l.a.y);
        ctx.lineTo(l.b.x, l.b.y);

        if (isPath) {
            ctx.strokeStyle = "#00f2ff";
            ctx.lineWidth = 4 / viewScale;
        } else if (isSelected) {
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 4 / viewScale;
        } else if (isTraversed) {
            ctx.strokeStyle = "rgba(255, 208, 102, 0.65)";
            ctx.lineWidth = 3 / viewScale;
        } else if (isRejected) {
            ctx.strokeStyle = "#ff4d4d";
            ctx.lineWidth = 2 / viewScale;
        } else {
            ctx.strokeStyle = "rgba(0,242,255,0.2)";
            ctx.lineWidth = 2 / viewScale;
        }

        ctx.stroke();

        ctx.fillStyle = "#fff";
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const labelX = Math.round((l.a.x + l.b.x) / 2);
        const labelY = Math.round((l.a.y + l.b.y) / 2);
        ctx.fillText(l.weight, labelX, labelY);
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
        ctx.arc(Math.round(x), Math.round(y), 5, 0, Math.PI * 2);
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

function setMode(nextMode) {
    mode = nextMode;

    ["btn-node", "btn-link", "btn-move", "btn-pan", "btn-weight", "btn-congest"].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.remove("active-tool");
    });

    const activeMap = {
        node: "btn-node",
        link: "btn-link",
        move: "btn-move",
        pan: "btn-pan",
        weight: "btn-weight",
        congest: "btn-congest"
    };

    const activeBtn = document.getElementById(activeMap[nextMode]);
    if (activeBtn) activeBtn.classList.add("active-tool");
}

bind("btn-node", () => setMode("node"));
bind("btn-link", () => setMode("link"));
bind("btn-move", () => setMode("move"));
bind("btn-pan", () => setMode("pan"));
bind("btn-weight", () => setMode("weight"));
bind("btn-congest", () => setMode("congest"));

bind("btn-start", () => startNode = selectedNode);
bind("btn-end", () => endNode = selectedNode);

bind("btn-run", runAStar);
bind("btn-mesh", generateTopology);
bind("btn-apply-weight", () => {
    if (!selectedLink) return;
    selectedLink.weight = getConfiguredEdgeWeight();
    refreshWeightLinkOptions();
});
bind("btn-calc-all", calculateAllNodeScores);
bind("btn-reset", resetGraph);
bind("btn-zoom-in", () => zoomAt(1.15, window.innerWidth / 2, window.innerHeight / 2));
bind("btn-zoom-out", () => zoomAt(0.87, window.innerWidth / 2, window.innerHeight / 2));
bind("btn-reset-view", () => {
    viewScale = 1;
    viewOffsetX = 0;
    viewOffsetY = 0;
});

document.getElementById("noise-slider").oninput = e => {
    trafficLevel = 1 + e.target.value / 50;
};

document.getElementById("weightLinkSelect").addEventListener("change", e => {
    const index = parseInt(e.target.value, 10);
    if (Number.isNaN(index) || !links[index]) {
        selectedLink = null;
        return;
    }

    selectedLink = links[index];
    document.getElementById("edgeWeightInput").value = selectedLink.weight;
});

setMode("move");
refreshWeightLinkOptions();

// ==============================
animate();

});