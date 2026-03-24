const canvas = document.getElementById('networkCanvas');
const ctx = canvas.getContext('2d');
let nodes = [], links = [], packets = [], mode = 'move';
let selectedNode = null, startNode = null, endNode = null, linkSource = null, isDragging = false;
let totalPacketsSent = 0;

function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resize); resize();

document.getElementById('close-tutorial').onclick = () => {
    document.body.classList.add('system-ready');
    document.getElementById('tutorial-overlay').style.display = 'none';
    document.getElementById('feed-container').innerHTML = '';
};

// --- LOGGING & STATUS ---
function logBatch(path, batchId) {
    const container = document.getElementById('feed-container');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    
    const pathStr = path.map(n => n.id).join(' → ');
    entry.innerHTML = `
        <div style="opacity: 0.5; font-size: 0.6rem;">BATCH #${batchId.toString().padStart(3, '0')}</div>
        <span class="log-path">${pathStr}</span>
        <div id="status-${batchId}" class="status-tag status-init">INITIALIZED</div>
    `;
    container.prepend(entry);
    if (container.children.length > 10) container.lastChild.remove();
}

function updateStatus(batchId) {
    const el = document.getElementById(`status-${batchId}`);
    if (el) {
        el.innerText = "DELIVERED";
        el.className = "status-tag status-done";
    }
}

class Node {
    constructor(id, x, y) {
        this.id = id; this.x = x; this.y = y; this.radius = 22;
        this.isPath = false; this.isCongested = false;
    }
    draw() {
        ctx.save();
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        
        // Node State Coloring
        if (this.isCongested) { ctx.fillStyle = "#ff4d4d"; }
        else if (this === startNode || this === endNode) { ctx.fillStyle = "#00f2ff"; }
        else { ctx.fillStyle = "#0f172a"; }

        ctx.strokeStyle = (this === selectedNode) ? "#fff" : (this.isCongested ? "#ff4d4d" : "#00f2ff");
        ctx.lineWidth = (this.isPath) ? 4 : 2;
        ctx.fill(); ctx.stroke();
        
        // Text Label
        ctx.fillStyle = (this === startNode || this === endNode || this.isCongested) ? "#020617" : "#00f2ff";
        ctx.font = "bold 11px 'JetBrains Mono'"; ctx.textAlign = "center";
        ctx.fillText(this.id, this.x, this.y + 4);
        ctx.restore();
    }
}

// --- INTERACTION ---
canvas.addEventListener('mousedown', e => {
    if (!document.body.classList.contains('system-ready')) return;
    const m = { x: e.offsetX, y: e.offsetY };
    const clicked = nodes.find(n => Math.hypot(n.x - m.x, n.y - m.y) < 30);

    if (mode === 'node' && !clicked) nodes.push(new Node(`R${nodes.length}`, m.x, m.y));
    else if (mode === 'congest' && clicked) {
        clicked.isCongested = !clicked.isCongested;
    }
    else if (mode === 'move' && clicked) { selectedNode = clicked; isDragging = true; }
    else if (mode === 'link' && clicked) {
        if (!linkSource) linkSource = clicked;
        else if (linkSource !== clicked) {
            links.push({ a: linkSource, b: clicked });
            linkSource = null;
        }
    } else selectedNode = clicked || null;
});

window.addEventListener('mousemove', e => { if (isDragging && selectedNode) { selectedNode.x = e.offsetX; selectedNode.y = e.offsetY; } });
window.addEventListener('mouseup', () => isDragging = false);

// --- A* PATHFINDING ---
async function runAStar() {
    if (!startNode || !endNode || startNode.isCongested || endNode.isCongested) return;

    nodes.forEach(n => { n.visited = false; n.isPath = false; n.parent = null; });
    let openSet = [startNode];

    while (openSet.length > 0) {
        let curr = openSet.shift();
        if (curr === endNode) {
            let path = []; let t = curr;
            while(t) { path.push(t); t.isPath = true; t = t.parent; }
            const finalPath = path.reverse();
            
            totalPacketsSent++;
            document.getElementById('total-sent').innerText = totalPacketsSent;
            logBatch(finalPath, totalPacketsSent);
            
            packets.push({ path: finalPath, step: 0, progress: 0, id: totalPacketsSent });
            return;
        }
        curr.visited = true;
        links.forEach(l => {
            let n = (l.a === curr) ? l.b : (l.b === curr ? l.a : null);
            if (n && !n.visited && !n.isCongested && !openSet.includes(n)) {
                n.parent = curr; openSet.push(n);
            }
        });
    }
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Links
    links.forEach(l => {
        ctx.beginPath(); ctx.moveTo(l.a.x, l.a.y); ctx.lineTo(l.b.x, l.b.y);
        ctx.strokeStyle = (l.a.isPath && l.b.isPath) ? "#00f2ff" : "rgba(0, 242, 255, 0.1)";
        ctx.lineWidth = (l.a.isPath && l.b.isPath) ? 3 : 1.5;
        ctx.stroke();
    });

    // Packets
    packets.forEach((p, i) => {
        let s = p.path[p.step], e = p.path[p.step+1];
        if (e) {
            p.progress += 0.04;
            let x = s.x + (e.x-s.x)*p.progress, y = s.y + (e.y-s.y)*p.progress;
            ctx.save();
            ctx.fillStyle = "#fff"; ctx.shadowBlur = 10; ctx.shadowColor = "#00f2ff";
            ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2); ctx.fill(); 
            ctx.restore();
            if (p.progress >= 1) { p.progress = 0; p.step++; }
        } else { 
            updateStatus(p.id);
            packets.splice(i, 1); 
        }
    });

    document.getElementById('packet-count').innerText = packets.length;
    nodes.forEach(n => n.draw());
    requestAnimationFrame(animate);
}

// UI Bindings
const btns = document.querySelectorAll('.tool-btn');
btns.forEach(b => b.onclick = () => {
    btns.forEach(x => x.classList.remove('active-tool'));
    b.classList.add('active-tool');
    mode = b.id.replace('btn-', '');
});

document.getElementById('btn-start').onclick = () => { if(selectedNode) startNode = selectedNode; };
document.getElementById('btn-end').onclick = () => { if(selectedNode) endNode = selectedNode; };
document.getElementById('btn-run').onclick = runAStar;
document.getElementById('btn-reset').onclick = () => { nodes = []; links = []; packets = []; totalPacketsSent = 0; document.getElementById('total-sent').innerText = 0; document.getElementById('feed-container').innerHTML = ''; };

// Clock
setInterval(() => {
    if (!document.body.classList.contains('system-ready')) return;
    let el = document.getElementById('uptime');
    let [m, s] = el.innerText.split(':').map(Number);
    s++; if(s===60) { s=0; m++; }
    el.innerText = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}, 1000);

animate();