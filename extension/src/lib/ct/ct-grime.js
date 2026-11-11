/* eslint-disable */
// @ts-nocheck
// From the design handoff (Design system and art direction/ct-grime.js). Keep in sync with it.
(() => {
if (customElements.get('ct-grime')) return;
// Dust, smudges, condensation and cobwebs drawn as if on a pane of glass over the UI.
// attrs: level 0..1 (dust), fog 0..1 (condensation), webs "tl,tr,bl,br", seed, tone "light"|"dark"
function rng(s) { let a = (s >>> 0) || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function noiseCanvas(w, h, R, cell) {
  const c = document.createElement('canvas'), gw = Math.max(2, Math.ceil(w / cell)), gh = Math.max(2, Math.ceil(h / cell));
  c.width = gw; c.height = gh; const x = c.getContext('2d'), d = x.createImageData(gw, gh);
  for (let i = 0; i < gw * gh; i++) { const v = R() * 255; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = 255; d.data[i * 4 + 3] = v; }
  x.putImageData(d, 0, 0); return c;
}
class CtGrime extends HTMLElement {
  static get observedAttributes() { return ['level', 'fog', 'webs', 'seed', 'tone']; }
  connectedCallback() {
    if (this.c) return;
    this.style.display = 'block'; this.style.width = '100%'; this.style.height = '100%'; this.style.pointerEvents = 'none';
    if (this.parentElement) this.parentElement.style.pointerEvents = 'none';
    this.c = document.createElement('canvas'); this.c.style.cssText = 'width:100%;height:100%;display:block';
    this.appendChild(this.c);
    this.ro = new ResizeObserver(() => this.draw()); this.ro.observe(this);
    const host = this.closest('[data-ct]'); if (host) { this.mo = new MutationObserver(() => this.attributeChangedCallback()); this.mo.observe(host, { attributes: true }); }
    this.pm = e => this.wipe(e); window.addEventListener('pointermove', this.pm, { passive: true });
    this.draw();
  }
  disconnectedCallback() { this.mo && this.mo.disconnect(); this.ro && this.ro.disconnect(); window.removeEventListener('pointermove', this.pm); this.c && this.c.remove(); this.c = null; }
  attributeChangedCallback() { if (this.c) { clearTimeout(this._t); this._t = setTimeout(() => this.draw(), 30); } }
  wipe(e) {
    if (!this.c || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const b = this.getBoundingClientRect(); const x = e.clientX - b.left, y = e.clientY - b.top;
    if (x < 0 || y < 0 || x > b.width || y > b.height) return;
    const d = this.dpr, ctx = this.c.getContext('2d'), r = 26 * d;
    ctx.save(); ctx.globalCompositeOperation = 'destination-out';
    const g = ctx.createRadialGradient(x * d, y * d, 0, x * d, y * d, r); g.addColorStop(0, 'rgba(0,0,0,.09)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x * d - r, y * d - r, r * 2, r * 2); ctx.restore();
  }
  get(n) { const host = this.closest('[data-ct]'); if (host && host.hasAttribute('data-' + n)) return host.getAttribute('data-' + n); return this.getAttribute(n); }
  draw() {
    if (!this.c) return;
    const W = this.clientWidth, H = this.clientHeight; if (!W || !H) return;
    const d = this.dpr = Math.min(devicePixelRatio || 1, 2);
    this.c.width = Math.round(W * d); this.c.height = Math.round(H * d);
    const ctx = this.c.getContext('2d'); ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, W, H);
    const L = Math.max(0, Math.min(1, parseFloat(this.get('level') || '0')));
    const F = Math.max(0, Math.min(1, parseFloat(this.get('fog') || '0')));
    const webs = (this.get('webs') || '').split(',').map(s => s.trim()).filter(Boolean);
    const dark = this.get('tone') === 'dark';
    const R = rng(parseInt(this.get('seed') || '7', 10) * 9973 + 17);
    const area = W * H;
    // grime tones: dust reads as pale grey-brown film; on dark grounds it catches light
    const film = dark ? '205,198,186' : '128,116,96', speck = dark ? '226,220,208' : '92,82,66', glint = '255,253,248';
    if (L > 0) {
      // 1. uneven haze film (two octaves of soft noise) heavier toward edges and bottom
      ctx.save(); ctx.globalCompositeOperation = 'source-over';
      const off = document.createElement('canvas'); off.width = Math.ceil(W); off.height = Math.ceil(H); const o = off.getContext('2d');
      o.imageSmoothingEnabled = true; o.imageSmoothingQuality = 'high';
      o.globalAlpha = .9; o.drawImage(noiseCanvas(W, H, R, 70), 0, 0, W, H);
      o.globalAlpha = .55; o.drawImage(noiseCanvas(W, H, R, 22), 0, 0, W, H);
      o.globalCompositeOperation = 'source-in'; o.globalAlpha = 1; o.fillStyle = `rgb(${film})`; o.fillRect(0, 0, W, H);
      // edge build-up mask
      o.globalCompositeOperation = 'destination-in';
      const vg = o.createRadialGradient(W / 2, H * .42, Math.min(W, H) * .15, W / 2, H * .5, Math.max(W, H) * .78);
      vg.addColorStop(0, `rgba(0,0,0,${.35 + .3 * L})`); vg.addColorStop(1, 'rgba(0,0,0,1)');
      o.fillStyle = vg; o.fillRect(0, 0, W, H);
      // old cloth wipe arcs cut cleaner swirls into the film
      o.globalCompositeOperation = 'destination-out';
      const nw = 2 + Math.floor(R() * 3);
      for (let i = 0; i < nw; i++) {
        const cx = W * (.2 + R() * .6), cy = H * (.25 + R() * .55), rr = Math.min(W, H) * (.18 + R() * .3), a0 = R() * 6.28;
        for (let k = 0; k < 7; k++) { o.beginPath(); o.arc(cx, cy, rr + k * 3.2, a0, a0 + 1.4 + R() * 1.6); o.lineWidth = 2 + R() * 4; o.strokeStyle = `rgba(0,0,0,${.12 + R() * .2})`; o.stroke(); }
      }
      // fingerprints: oval sets of fine ridges
      const nf = Math.round(L * 3);
      for (let i = 0; i < nf; i++) {
        const fx = W * (.12 + R() * .76), fy = H * (.15 + R() * .7), fr = 9 + R() * 7, rot = R() * 3.14;
        o.save(); o.translate(fx, fy); o.rotate(rot); o.scale(1, 1.35);
        for (let k = 1; k < 9; k++) { o.beginPath(); o.arc(0, 0, k * fr / 8, R(), 5.6 + R()); o.lineWidth = .7; o.strokeStyle = 'rgba(0,0,0,.35)'; o.stroke(); }
        o.restore();
      }
      ctx.globalAlpha = .12 + .38 * L; ctx.drawImage(off, 0, 0, W, H);
      ctx.restore();
      // 2. dried water spots: faint rings with darker rim
      const nr = Math.round(L * L * area / 26000);
      for (let i = 0; i < nr; i++) {
        const x = R() * W, y = R() * H, r = 2 + R() * 7;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.28);
        ctx.fillStyle = `rgba(${film},${.04 + R() * .05})`; ctx.fill();
        ctx.lineWidth = .6 + R() * .6; ctx.strokeStyle = `rgba(${speck},${.18 + R() * .2})`; ctx.stroke();
      }
      // 3. micro dust: many specks, a dark core with a pale glint (backlit look)
      const ns = Math.round(L * area / 220);
      for (let i = 0; i < ns; i++) {
        let x = R() * W, y = R() * H; if (R() < .35) { y = H - Math.pow(R(), 2) * H * .4; }
        const r = Math.pow(R(), 3) * 1.5 + .25, a = .25 + R() * .55;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.28); ctx.fillStyle = `rgba(${speck},${a})`; ctx.fill();
        if (r > .8 && R() < .5) { ctx.beginPath(); ctx.arc(x - r * .3, y - r * .3, r * .45, 0, 6.28); ctx.fillStyle = `rgba(${glint},${.35 + R() * .3})`; ctx.fill(); }
      }
      // 4. grit clumps (irregular)
      const nc = Math.round(L * area / 9000);
      for (let i = 0; i < nc; i++) {
        const x = R() * W, y = R() * H, n = 3 + Math.floor(R() * 5), a = .35 + R() * .4;
        ctx.fillStyle = `rgba(${speck},${a})`;
        for (let k = 0; k < n; k++) { ctx.beginPath(); ctx.arc(x + (R() - .5) * 3, y + (R() - .5) * 3, .5 + R() * 1.1, 0, 6.28); ctx.fill(); }
      }
      // 5. lint fibres
      const nl = Math.round(L * L * area / 7000);
      ctx.lineCap = 'round';
      for (let i = 0; i < nl; i++) {
        const x = R() * W, y = R() * H, len = 6 + R() * 22, a = R() * 6.28;
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.bezierCurveTo(x + Math.cos(a) * len * .3 + (R() - .5) * 8, y + Math.sin(a) * len * .3 + (R() - .5) * 8, x + Math.cos(a) * len * .7 + (R() - .5) * 8, y + Math.sin(a) * len * .7 + (R() - .5) * 8, x + Math.cos(a) * len, y + Math.sin(a) * len);
        ctx.lineWidth = .35 + R() * .45; ctx.strokeStyle = `rgba(${dark ? glint : speck},${.25 + R() * .35})`; ctx.stroke();
      }
      // 6. hairline scratches catching light
      const nk = Math.round(L * 4);
      for (let i = 0; i < nk; i++) {
        const x = R() * W, y = R() * H, len = 20 + R() * 70, a = R() * 6.28;
        const g = ctx.createLinearGradient(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len);
        g.addColorStop(0, `rgba(${glint},0)`); g.addColorStop(.5, `rgba(${glint},${.35 + R() * .25})`); g.addColorStop(1, `rgba(${glint},0)`);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.lineWidth = .5; ctx.strokeStyle = g; ctx.stroke();
      }
    }
    if (F > 0) {
      // condensation: frosted breath film, beads, and a few run trails
      ctx.save();
      const off = document.createElement('canvas'); off.width = Math.ceil(W); off.height = Math.ceil(H); const o = off.getContext('2d');
      o.drawImage(noiseCanvas(W, H, R, 50), 0, 0, W, H); o.globalAlpha = .6; o.drawImage(noiseCanvas(W, H, R, 14), 0, 0, W, H);
      o.globalCompositeOperation = 'source-in'; o.globalAlpha = 1; o.fillStyle = 'rgb(244,244,242)'; o.fillRect(0, 0, W, H);
      ctx.globalAlpha = .25 + .45 * F; ctx.drawImage(off, 0, 0, W, H); ctx.globalAlpha = 1;
      const nb = Math.round(F * area / 160);
      for (let i = 0; i < nb; i++) {
        const x = R() * W, y = R() * H, r = Math.pow(R(), 2.4) * 3.2 + .4;
        ctx.beginPath(); ctx.ellipse(x, y, r, r * (.85 + R() * .2), 0, 0, 6.28);
        ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fill();
        ctx.lineWidth = Math.max(.4, r * .28); ctx.strokeStyle = 'rgba(60,64,72,.22)'; ctx.stroke();
        if (r > 1.2) { ctx.beginPath(); ctx.arc(x - r * .35, y - r * .35, r * .28, 0, 6.28); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill(); }
      }
      ctx.globalCompositeOperation = 'destination-out';
      const nt = Math.round(F * W / 90);
      for (let i = 0; i < nt; i++) {
        let x = W * (.05 + R() * .9), y = R() * H * .5; const end = y + H * (.15 + R() * .5), w = 2 + R() * 3;
        ctx.beginPath(); ctx.moveTo(x, y); while (y < end) { y += 6; x += (R() - .5) * 1.6; ctx.lineTo(x, y); }
        ctx.lineWidth = w; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath(); ctx.ellipse(x, y + 2, w * .75, w, 0, 0, 6.28); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fill(); ctx.strokeStyle = 'rgba(60,64,72,.25)'; ctx.lineWidth = .7; ctx.stroke();
        ctx.globalCompositeOperation = 'destination-out';
      }
      ctx.restore();
    }
    for (const w of webs) this.web(ctx, w, W, H, R, dark);
  }
  web(ctx, corner, W, H, R, dark) {
    const sx = corner[1] === 'r' ? -1 : 1, sy = corner[0] === 'b' ? -1 : 1;
    const ox = sx > 0 ? 0 : W, oy = sy > 0 ? 0 : H;
    const S = Math.min(W, H) * (.42 + R() * .12);
    const P = (x, y) => [ox + sx * x, oy + sy * y];
    const silk = dark ? '236,234,228' : '250,249,245', shade = '40,36,30';
    const thread = (pts, sag, a, lw) => {
      const draw = (dx, dy, col, al) => {
        ctx.beginPath(); ctx.moveTo(pts[0][0] + dx, pts[0][1] + dy);
        for (let i = 1; i < pts.length; i++) {
          const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
          ctx.quadraticCurveTo((x0 + x1) / 2 + dx, (y0 + y1) / 2 + sag + dy, x1 + dx, y1 + dy);
        }
        ctx.strokeStyle = `rgba(${col},${al})`; ctx.lineWidth = lw; ctx.stroke();
      };
      draw(.6, .9, shade, a * .28); draw(0, 0, silk, a);
    };
    ctx.save(); ctx.lineCap = 'round';
    // hazy sheet of tangled silk in the very corner
    const sg = ctx.createRadialGradient(ox, oy, 0, ox, oy, S * .55);
    sg.addColorStop(0, `rgba(${silk},${dark ? .22 : .32})`); sg.addColorStop(1, `rgba(${silk},0)`);
    ctx.fillStyle = sg; ctx.fillRect(Math.min(ox, ox + sx * S), Math.min(oy, oy + sy * S), S, S);
    // hub + radials (anchored on the two edges)
    const hub = P(S * (.28 + R() * .08), S * (.28 + R() * .08));
    const anchors = [];
    const nr = 9 + Math.floor(R() * 4);
    for (let i = 0; i < nr; i++) {
      const t = i / (nr - 1);
      const along = t < .5 ? P(S * (1.05 - t * 1.6) * (.85 + R() * .3), 0) : P(0, S * ((t - .5) * 2 * 1.05 + .2) * (.85 + R() * .3));
      const ang = Math.atan2(along[1] - hub[1], along[0] - hub[0]);
      anchors.push({ p: along, ang, len: Math.hypot(along[0] - hub[0], along[1] - hub[1]) });
    }
    anchors.forEach(a => { if (R() < .9) thread([hub, a.p], 1 + R() * 2, .55 + R() * .25, .55); });
    // diagonal frame thread
    thread([P(S * 1.08, 0), P(S * .55, S * .42), P(0, S * 1.1)], 3, .5, .6);
    // capture spiral: sagging chords between neighbouring radials
    const rings = 12 + Math.floor(R() * 6);
    for (let k = 1; k <= rings; k++) {
      const f = k / (rings + 1) * (.92 + R() * .08);
      for (let i = 0; i < anchors.length - 1; i++) {
        if (R() < .12) continue;
        const a = anchors[i], b = anchors[i + 1];
        const pa = [hub[0] + (a.p[0] - hub[0]) * f, hub[1] + (a.p[1] - hub[1]) * f];
        const pb = [hub[0] + (b.p[0] - hub[0]) * f, hub[1] + (b.p[1] - hub[1]) * f];
        thread([pa, pb], 1.5 + f * 3, .35 + R() * .25, .4);
      }
    }
    // tangle near corner and a couple of loose hanging strands
    for (let i = 0; i < 26; i++) {
      const a = P(R() * S * .45, R() * S * .45), b = P(R() * S * .5, R() * S * .5);
      thread([a, b], 2 + R() * 5, .25 + R() * .25, .35);
    }
    for (let i = 0; i < 3; i++) {
      const s = P(S * (.3 + R() * .6), S * (.05 + R() * .3));
      const e = [s[0] + (R() - .5) * 18, s[1] + 25 + R() * 50];
      thread([s, [s[0] + (R() - .5) * 8, (s[1] + e[1]) / 2], e], 4, .4, .45);
    }
    // dust caught on the silk
    for (let i = 0; i < 60; i++) {
      const f = R(), a = anchors[Math.floor(R() * anchors.length)];
      const x = hub[0] + (a.p[0] - hub[0]) * f, y = hub[1] + (a.p[1] - hub[1]) * f;
      ctx.beginPath(); ctx.arc(x + (R() - .5) * 2, y + (R() - .5) * 2, .4 + R() * 1.1, 0, 6.28);
      ctx.fillStyle = `rgba(${dark ? silk : '110,100,84'},${.35 + R() * .4})`; ctx.fill();
    }
    ctx.restore();
  }
}
customElements.define('ct-grime', CtGrime);
})();

export {};
