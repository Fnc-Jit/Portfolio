/* === JITRAJ ESH PORTFOLIO — JS === */

document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initTiles();
    initModals();
    fetchGitHub();
});

/* ---- Particle Background ---- */
function initParticles() {
    const c = document.getElementById('particles');
    const ctx = c.getContext('2d');
    let w, h, pts = [];
    const N = 70, DIST = 120, MR = 150;
    let mx = -9999, my = -9999;

    function resize() { w = c.width = innerWidth; h = c.height = innerHeight; }

    class P {
        constructor() { this.r(); }
        r() {
            this.x = Math.random() * w; this.y = Math.random() * h;
            this.vx = (Math.random() - .5) * .4; this.vy = (Math.random() - .5) * .4;
            this.rad = Math.random() * 1.5 + .5; this.o = Math.random() * .5 + .1;
        }
        u() {
            this.x += this.vx; this.y += this.vy;
            const dx = this.x - mx, dy = this.y - my, d = Math.sqrt(dx * dx + dy * dy);
            if (d < MR) { const f = (MR - d) / MR; this.vx += dx / d * f * .02; this.vy += dy / d * f * .02; }
            this.vx *= .999; this.vy *= .999;
            if (this.x < 0) this.x = w; if (this.x > w) this.x = 0;
            if (this.y < 0) this.y = h; if (this.y > h) this.y = 0;
        }
        d() {
            ctx.beginPath(); ctx.arc(this.x, this.y, this.rad, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(79,142,255,${this.o})`; ctx.fill();
        }
    }

    function create() { pts = []; for (let i = 0; i < N; i++) pts.push(new P()); }

    function lines() {
        for (let i = 0; i < pts.length; i++)
            for (let j = i + 1; j < pts.length; j++) {
                const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d = Math.sqrt(dx * dx + dy * dy);
                if (d < DIST) {
                    ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
                    ctx.strokeStyle = `rgba(79,142,255,${(1 - d / DIST) * .15})`; ctx.lineWidth = .5; ctx.stroke();
                }
            }
    }

    function loop() {
        ctx.clearRect(0, 0, w, h);
        pts.forEach(p => { p.u(); p.d(); });
        lines();
        requestAnimationFrame(loop);
    }

    addEventListener('resize', resize);
    addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
    resize(); create(); loop();
}

/* ---- Tile Reveal ---- */
function initTiles() {
    const tiles = document.querySelectorAll('.tile');
    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                const idx = Array.from(tiles).indexOf(e.target);
                setTimeout(() => e.target.classList.add('visible'), idx * 100);
                obs.unobserve(e.target);
            }
        });
    }, { threshold: .1, rootMargin: '0px 0px -50px 0px' });
    tiles.forEach(t => obs.observe(t));
}

/* ---- Modals ---- */
function initModals() {
    document.querySelectorAll('.tile[data-modal]').forEach(t => {
        t.addEventListener('click', () => {
            const m = document.getElementById(t.dataset.modal);
            if (m) openModal(m);
        });
    });
    document.querySelectorAll('.modal').forEach(m => {
        m.querySelector('.modal-x')?.addEventListener('click', () => closeModal(m));
        m.querySelector('.modal-bg')?.addEventListener('click', () => closeModal(m));
    });
    addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            const a = document.querySelector('.modal.active');
            if (a) closeModal(a);
        }
    });
}
function openModal(m) { document.body.classList.add('modal-open'); m.classList.add('active'); }
function closeModal(m) { m.classList.remove('active'); document.body.classList.remove('modal-open'); }

/* ---- GitHub API ---- */
async function fetchGitHub() {
    const el = document.getElementById('gh-repos');
    try {
        const r = await fetch('https://api.github.com/users/Fnc-Jit/repos?sort=updated&per_page=6&type=owner');
        if (!r.ok) throw 0;
        const repos = await r.json();
        el.innerHTML = repos.map(rp => `
            <a href="${rp.html_url}" target="_blank" rel="noopener" class="repo-card">
                <div class="repo-name">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                    ${rp.name}
                </div>
                <div class="repo-desc">${rp.description || 'No description available'}</div>
                <div class="repo-meta">
                    ${rp.language ? `<span class="repo-lang"><span class="lang-dot" style="background:${langColor(rp.language)}"></span>${rp.language}</span>` : ''}
                    ${rp.stargazers_count ? `<span class="repo-stars">⭐ ${rp.stargazers_count}</span>` : ''}
                </div>
            </a>
        `).join('');
    } catch {
        el.innerHTML = `<div class="gh-loading"><span>Unable to load repos. <a href="https://github.com/Fnc-Jit" target="_blank">Visit GitHub →</a></span></div>`;
    }
}

function langColor(l) {
    return { JavaScript: '#f1e05a', Python: '#3572A5', TypeScript: '#3178c6', HTML: '#e34c26', CSS: '#563d7c', Java: '#b07219', Shell: '#89e051', Kotlin: '#A97BFF' }[l] || '#8b949e';
}

/* ---- Smooth scroll ---- */
document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function (e) {
        const t = document.querySelector(this.getAttribute('href'));
        if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
    });
});
