/* eslint-disable */
// @ts-nocheck
// From the design handoff (Design system and art direction/ct-kawaii.js). Keep in sync with it.
// <ct-kawaii> — createthings kawaii pet (three.js, toon shading + ink outline).
// Reads data-species / data-state / data-action from the nearest [data-ct] host, else from its own attributes.
// species: dog | cat | rabbit | bird        state: egg | happy | peckish | hungry | starving | died | ran
// action:  auto | idle | walk | happy | wave | eat | sniff | spin | sleep   (aliases: play, hop, wag, stretch → happy; sit, stand → idle; scratch → wave; nap → sleep)
// Tap/click the pet → short "pet" reaction (hearts) and a bubbling `ct-pet-tap` event.
// All instances share ONE WebGL renderer and blit into their own 2D canvas, so many pets on a page are cheap.
(() => {
if (customElements.get('ct-kawaii')) return;
const PI = Math.PI, cl = (v, a, b) => Math.max(a, Math.min(b, v)), wrap = a => ((a + PI) % (2 * PI) + 2 * PI) % (2 * PI) - PI;
const INK = '#3B2A22';
const SPECIES = {
  dog:    { body: '#F6C99A', belly: '#FFF3E4', paw: '#FBE3C8', ear: '#B97B52', muzzle: '#FFF3E4', nose: INK, H: 2.7 },
  cat:    { body: '#D9D5E0', belly: '#F7F5F9', paw: '#F1EEF4', ear: '#D9D5E0', inner: '#F4B6BC', muzzle: '#F7F5F9', nose: '#F49A9A', stripe: '#A7A1B4', H: 2.95 },
  rabbit: { body: '#FBF4EC', belly: '#FFFFFF', paw: '#FFFFFF', ear: '#FBF4EC', inner: '#F7BFC4', muzzle: '#FFFFFF', nose: '#F49A9A', H: 3.55 },
  bird:   { body: '#8FCBE6', belly: '#B7DEF0', face: '#FDF8EC', wing: '#6AAFD2', beak: '#F6B35B', feet: '#E8964A', crest: '#7CC0E0', H: 2.65 },
};
const MOOD = {
  happy:    { spd: 1,   grey: 0,   droop: 0 },
  peckish:  { spd: .8,  grey: .08, droop: .25 },
  hungry:   { spd: .6,  grey: .2,  droop: .55 },
  starving: { spd: .4,  grey: .38, droop: .9 },
  died:     { spd: 0,   grey: .7,  droop: 0 },
  ran:      { spd: 0,   grey: 0,   droop: 0 },
  egg:      { spd: 0,   grey: 0,   droop: 0 },
};
const ALIAS = { play: 'happy', hop: 'happy', wag: 'happy', stretch: 'happy', sit: 'idle', stand: 'idle', scratch: 'wave', nap: 'sleep' };
const ACTIONS = ['idle', 'walk', 'happy', 'wave', 'eat', 'sniff', 'spin', 'sleep'];

let S = null;
const shared = () => S ? S.ready : (S = { inst: new Set(), px: -1e4, py: -1e4 }, S.ready = (async () => {
  const T = await import('three'); S.T = T;
  const R = new T.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: false });
  R.outputColorSpace = T.SRGBColorSpace; R.setClearColor(0x000000, 0); R.autoClear = false;
  S.pr = Math.min(2, devicePixelRatio || 1); R.setPixelRatio(S.pr); S.W = 1; S.H = 1; R.setSize(1, 1, false); S.R = R;
  const grad = new T.DataTexture(new Uint8Array([120, 120, 120, 255, 196, 196, 196, 255, 255, 255, 255, 255]), 3, 1, T.RGBAFormat);
  grad.minFilter = grad.magFilter = T.NearestFilter; grad.needsUpdate = true; S.grad = grad;
  const ol = w => new T.ShaderMaterial({ side: T.BackSide, uniforms: { w: { value: w }, c: { value: new T.Color(INK) } },
    vertexShader: 'uniform float w;void main(){vec4 p=modelViewMatrix*vec4(position,1.);vec3 n=normalize(normalMatrix*normal);p.xyz+=n*w*(-p.z)*.06;gl_Position=projectionMatrix*p;}',
    fragmentShader: 'uniform vec3 c;void main(){gl_FragColor=vec4(c,1.);\n#include <colorspace_fragment>\n}' });
  S.OL = ol(.16); S.OLs = ol(.1);
  S.sph = new T.SphereGeometry(1, 48, 36);
  const tex = draw => { const c = document.createElement('canvas'); c.width = c.height = 128; draw(c.getContext('2d')); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; };
  S.shadowTex = tex(x => { const g = x.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, 'rgba(40,30,20,.34)'); g.addColorStop(1, 'rgba(40,30,20,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); });
  S.zTex = tex(x => { x.fillStyle = INK; x.font = '600 96px Geist, system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('z', 64, 64); });
  S.heartTex = tex(x => { x.fillStyle = '#F07A86'; x.beginPath(); x.moveTo(64, 108); x.bezierCurveTo(10, 70, 14, 22, 46, 22); x.bezierCurveTo(58, 22, 64, 32, 64, 40); x.bezierCurveTo(64, 32, 70, 22, 82, 22); x.bezierCurveTo(114, 22, 118, 70, 64, 108); x.fill(); });
  addEventListener('pointermove', e => { S.px = e.clientX; S.py = e.clientY; }, { passive: true });
  let last = performance.now();
  const loop = () => {
    requestAnimationFrame(loop);
    const now = performance.now(), dt = Math.min(.05, (now - last) / 1000); last = now;
    const vis = []; let mw = 1, mh = 1;
    for (const e of S.inst) { if (!e.vis || !e.isConnected || !e.scene) continue; const w = e.clientWidth, h = e.clientHeight; if (w < 4 || h < 4) continue; vis.push([e, w, h]); mw = Math.max(mw, w); mh = Math.max(mh, h); }
    if (mw > S.W || mh > S.H) { S.W = Math.max(mw, S.W); S.H = Math.max(mh, S.H); R.setSize(S.W, S.H, false); }
    R.setScissorTest(true);
    for (const [e, w, h] of vis) {
      try { e.tick(dt, w, h); } catch (err) { console.error(err); continue; }
      R.setViewport(0, 0, w, h); R.setScissor(0, 0, w, h); R.clear(); R.render(e.scene, e.cam); e.blit(w, h);
    }
  };
  loop();
})());

customElements.define('ct-kawaii', class extends HTMLElement {
  attr(n, d) { const host = this.closest('[data-ct]'); if (host && host.hasAttribute('data-' + n)) return host.getAttribute('data-' + n); return this.getAttribute(n) ?? d; }
  setAction(a) { this.setAttribute('action', a); const host = this.closest('[data-ct]'); if (host) host.setAttribute('data-action', a); this.task = null; }
  async connectedCallback() {
    if (S && this.scene) { S.inst.add(this); return; }
    if (this._on) return; this._on = true;
    Object.assign(this.style, { display: 'block', position: this.style.position || 'absolute', inset: this.style.inset || '0' });
    const cv = this.cv = document.createElement('canvas');
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;cursor:pointer;touch-action:manipulation';
    this.appendChild(cv); this.ctx = cv.getContext('2d');
    this.vis = true; this.io = new IntersectionObserver(es => { this.vis = es[es.length - 1].isIntersecting; }, { rootMargin: '200px' }); this.io.observe(this);
    let down = null;
    cv.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
    cv.addEventListener('pointerup', e => { if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 8) this.tap(e); down = null; });
    await shared();
    const T = this.T = S.T;
    this.scene = new T.Scene(); this.cam = new T.PerspectiveCamera(28, 1, .1, 80);
    this.scene.add(new T.HemisphereLight('#ffffff', '#e6dccb', 1.1));
    const key = new T.DirectionalLight('#fff6ea', 2.1); key.position.set(-3, 5, 4); this.scene.add(key);
    this.sh = new T.Mesh(new T.PlaneGeometry(2.4, 1.7), new T.MeshBasicMaterial({ map: S.shadowTex, transparent: true, depthWrite: false }));
    this.sh.rotation.x = -PI / 2; this.sh.position.y = .002; this.scene.add(this.sh);
    this.zs = [0, 1, 2].map(() => { const s = new T.Sprite(new T.SpriteMaterial({ map: S.zTex, transparent: true, depthWrite: false, opacity: 0 })); this.scene.add(s); return s; });
    this.hearts = [0, 1, 2].map(() => { const s = new T.Sprite(new T.SpriteMaterial({ map: S.heartTex, transparent: true, depthWrite: false, opacity: 0 })); s.userData.t = 9; this.scene.add(s); return s; });
    Object.assign(this, { t: 0, ph: 0, walkA: 0, face: 0, blink: 2, look: { y: 0, z: 0, t: 0 }, prevHy: 0, grey: 0, task: null, sqS: { x: 1, v: 0 }, tailS: { x: 0, v: 0 }, food: 1, spinA: 0 });
    this.pose = { yaw: 0, pitch: 0, tilt: 0, lie: 0, zz: 0, droop: 0, halo: 0, side: 0, back: 0 };
    { const egg = this.egg = new T.Group(), m = new T.MeshToonMaterial({ color: new T.Color('#FBF1DE'), gradientMap: S.grad });
      const e = new T.Mesh(S.sph, m); e.scale.set(.78, 1.0, .78); e.position.y = 1.0; egg.add(e); const o = new T.Mesh(S.sph, S.OL); o.scale.copy(e.scale); o.position.copy(e.position); egg.add(o);
      const sm = new T.MeshToonMaterial({ color: new T.Color('#F6C99A'), gradientMap: S.grad });
      for (const [x, y, r] of [[-.35, 1.25, .13], [.2, 1.5, .1], [.38, .9, .15], [-.15, .7, .11], [.05, 1.1, .08]]) { const z = Math.sqrt(Math.max(0, 1 - (x / .78) ** 2 - ((y - 1) / 1) ** 2)) * .78; const d = new T.Mesh(S.sph, sm); d.scale.set(r, r, r * .3); d.position.set(x, y, z); d.lookAt(x * 2, (y - 1) * 2 + 1, z * 2); egg.add(d); }
      egg.visible = false; this.scene.add(egg); }
    S.inst.add(this);
  }
  disconnectedCallback() { if (S) S.inst.delete(this); }
  tap(e) {
    if (!this.rig || this.mood === 'died' || this.mood === 'ran') return;
    const r = this.cv.getBoundingClientRect(), ray = new this.T.Raycaster();
    ray.setFromCamera(new this.T.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), this.cam);
    if (!ray.intersectObject(this.rig.sq, true).length) return;
    this.task = { a: 'pet', u: 0, dur: 1.8 }; this.sqS.v -= 7;
    this.hearts.forEach((h, i) => { h.userData.t = -i * .18; h.userData.x = (i - 1) * .45; });
    this.dispatchEvent(new CustomEvent('ct-pet-tap', { bubbles: true, detail: { species: this.species } }));
  }
  blit(w, h) {
    const pr = S.pr, cw = Math.round(w * pr), ch = Math.round(h * pr);
    if (this.cv.width !== cw || this.cv.height !== ch) { this.cv.width = cw; this.cv.height = ch; }
    this.ctx.clearRect(0, 0, cw, ch);
    this.ctx.drawImage(S.R.domElement, 0, Math.round((S.H - h) * pr), cw, ch, 0, 0, cw, ch);
  }

  build(sp) {
    const T = this.T, C = SPECIES[sp] || SPECIES.dog;
    if (this.rig) { this.scene.remove(this.rig.mover); this.rig.mats.forEach(m => m.m.dispose()); }
    const mats = [], toon = c => { const m = new T.MeshToonMaterial({ color: new T.Color(c), gradientMap: S.grad }); mats.push({ m, c0: m.color.clone() }); return m; };
    const mover = new T.Group(), hopG = new T.Group(), lay = new T.Group(), sq = new T.Group(); mover.add(hopG); hopG.add(lay); lay.add(sq);
    const PC = sp === 'bird' ? .9 : 1.0; lay.position.y = PC; sq.position.y = -PC; const solids = [];
    const part = (col, s, p, o = S.OL, parent = sq, geo = S.sph) => {
      const g = new T.Group(); g.position.set(...p); parent.add(g);
      const m = new T.Mesh(geo, toon(col)); m.scale.set(...s); g.add(m); if (geo === S.sph) solids.push(m);
      if (o) { const h = new T.Mesh(geo, o); h.scale.copy(m.scale); g.add(h); }
      return g;
    };
    const inkM = new T.MeshBasicMaterial({ color: INK }); mats.push({ m: inkM, c0: inkM.color.clone(), keep: true });
    const tube = (pts, r = .022, mat = inkM, parent) => { const g = new T.Group();
      g.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts, false, 'centripetal'), 40, r, 8, false), mat));
      for (const p of [pts[0], pts[pts.length - 1]]) { const c = new T.Mesh(new T.SphereGeometry(r, 10, 8), mat); c.position.copy(p); g.add(c); }
      if (parent) parent.add(g); return g; };
    const bird = sp === 'bird';
    const HC = bird ? new T.Vector3(0, 1.2, 0) : new T.Vector3(0, 1.55, 0), HA = bird ? new T.Vector3(1.1, 1.15, 1.0) : new T.Vector3(1.18, .98, 1.0);
    const onHead = (nx, ny) => { const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      return { p: new T.Vector3(HC.x + nx * HA.x, HC.y + ny * HA.y, HC.z + nz * HA.z), n: new T.Vector3(nx / HA.x, ny / HA.y, nz / HA.z).normalize() }; };
    const orient = (o, n) => o.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), n);
    // feet
    const feet = [-1, 1].map(s => { const f = bird ? part(C.feet, [.17, .07, .24], [s * .3, .06, .32], S.OLs) : part(C.paw, [.27, .17, .33], [s * .3, .1, .14]); f.userData.base = f.position.clone(); return f; });
    // body (mammals)
    let tail = new T.Group();
    if (!bird) {
      tail.position.set(0, .45, -.5); sq.add(tail);
      part(C.body, [.62, .56, .56], [0, .58, 0]);
      part(C.belly, [.34, .32, .14], [0, .52, .45], null);
    }
    // head pivot
    const head = new T.Group(); head.position.set(0, bird ? .6 : 1.0, 0); sq.add(head);
    const hi = new T.Group(); hi.position.set(0, bird ? -.6 : -1.0, 0); head.add(hi);
    const headG = part(C.body, [HA.x, HA.y, HA.z], [HC.x, HC.y, HC.z], S.OL, hi);
    // arms / wings
    const arms = [-1, 1].map(s => {
      const g = new T.Group(); g.position.set(bird ? s * 1.0 : s * .56, bird ? .98 : .64, bird ? 0 : .12); (bird ? hi : sq).add(g);
      if (bird) { part(C.wing, [.15, .5, .36], [s * .06, -.34, -.02], S.OLs, g); }
      else { part(C.body, [.15, .25, .15], [0, -.17, 0], S.OLs, g); part(C.paw, [.13, .11, .13], [0, -.36, .01], S.OLs, g); }
      return { g, s, x: { x: 0, v: 0 }, z: { x: 0, v: 0 } };
    });
    const ears = [];
    let mouthW = new T.Group(), mouthO = new T.Group(), beakLo = null, nose = new T.Group();
    if (!bird) {
      const mz = onHead(0, -.3), MC = mz.p.clone().addScaledVector(mz.n, -.16), MA = new T.Vector3(.44, .3, .3);
      const muz = new T.Mesh(S.sph, toon(C.muzzle)); muz.position.copy(MC); muz.scale.copy(MA); hi.add(muz);
      const onMuz = (x, y, lift = .004) => { const nx = x / MA.x, ny = y / MA.y, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)); return new T.Vector3(MC.x + x, MC.y + y, MC.z + nz * MA.z + lift); };
      nose.position.copy(onMuz(0, .1, -.02)); hi.add(nose);
      const nm = new T.Mesh(S.sph, toon(C.nose)); nm.scale.set(sp === 'dog' ? .15 : .1, sp === 'dog' ? .1 : .07, .08); nose.add(nm);
      const nh = new T.Mesh(S.sph, new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .7 })); nh.scale.set(.04, .022, .02); nh.position.set(-.035, .035, .065); nose.add(nh);
      mouthW = tube([[-.15, -.03], [-.075, -.1], [0, -.035], [.075, -.1], [.15, -.03]].map(([x, y]) => onMuz(x, y, .012)), .022, inkM, hi);
      hi.add(mouthO); mouthO.visible = false;
      { const p = onMuz(0, -.09); const o = new T.Mesh(S.sph, toon('#5A2E26')); o.scale.set(.1, .08, .04); o.position.copy(p); mouthO.add(o);
        const tg = new T.Mesh(S.sph, toon('#F28C8C')); tg.scale.set(.065, .04, .03); tg.position.copy(p).add(new T.Vector3(0, -.035, .02)); mouthO.add(tg); }
      if (sp === 'rabbit') { const tt = new T.Mesh(S.sph, toon('#FFFFFF')); tt.scale.set(.07, .065, .03); tt.position.copy(onMuz(0, -.17, -.005)); hi.add(tt); }
      if (sp === 'cat') {
        for (const s of [-1, 1]) for (const dy of [.02, -.07]) tube([onMuz(s * .3, dy), new T.Vector3(s * .62, MC.y + dy * 1.6 + .02, MC.z + .12), new T.Vector3(s * .86, MC.y + dy * 2.2 + .03, MC.z + .02)], .013, inkM, hi);
        const stM = toon(C.stripe); for (const x of [-.14, 0, .14]) tube([onHead(x, .78).p, onHead(x * .9, .66).p, onHead(x * .8, .55).p], .032, stM, hi);
      }
    } else {
      part(C.face, [.8, .6, .3], [0, 1.4, .7], null, hi);
      part(C.belly, [.6, .38, .3], [0, .55, .56], null, hi);
      const bp = onHead(0, .06).p;
      const up = part(C.beak, [.12, .1, .16], [bp.x, bp.y + .02, bp.z + .1], S.OLs, hi);
      beakLo = new T.Group(); beakLo.position.set(bp.x, bp.y - .04, bp.z + .06); hi.add(beakLo); part(C.beak, [.09, .06, .1], [0, -.02, .05], S.OLs, beakLo);
      for (const [x, y, rz] of [[-.12, .97, .5], [.02, 1.02, 0], [.16, .96, -.5]]) { const c = onHead(x, y > 1 ? .99 : .97); const g = part(C.crest, [.1, .24, .08], [c.p.x, c.p.y + .14, c.p.z - .1], S.OLs, hi); g.rotation.z = rz; }
      tail.position.set(0, .5, -.9); hi.add(tail); part(C.wing, [.3, .1, .32], [0, 0, -.18], S.OLs, tail).rotation.x = -.5;
    }
    // eyes + blush
    const white = new T.MeshBasicMaterial({ color: '#ffffff' });
    const eyes = [-1, 1].map(s => {
      const e = onHead(s * (bird ? .36 : .4), bird ? .26 : .05), g = new T.Group(); g.position.copy(e.p).addScaledVector(e.n, bird ? .05 : -.05); orient(g, e.n); hi.add(g);
      const open = new T.Group(); g.add(open);
      const ball = new T.Mesh(S.sph, new T.MeshStandardMaterial({ color: '#2E1F18', roughness: .25 })); ball.scale.set(.17, .2, .1); open.add(ball);
      const h1 = new T.Mesh(S.sph, white); h1.scale.set(.07, .07, .03); h1.position.set(s * .02 + .05, .08, .08); open.add(h1);
      const h2 = new T.Mesh(S.sph, white); h2.scale.set(.03, .03, .02); h2.position.set(-.06, -.09, .085); open.add(h2);
      const arc = k => tube([[-.14, -.03 * k], [-.08, .06 * k], [0, .09 * k], [.08, .06 * k], [.14, -.03 * k]].map(([x, y]) => new T.Vector3(x, y, .07)), .028);
      const happy = arc(1), shut = arc(-1); happy.visible = shut.visible = false; g.add(happy, shut);
      const bl = onHead(s * (bird ? .6 : .66), bird ? .02 : -.26), bm = new T.Mesh(new T.CircleGeometry(.17, 32), new T.MeshBasicMaterial({ color: '#F49A9A', transparent: true, opacity: .62, depthWrite: false }));
      bm.position.copy(bl.p).addScaledVector(bl.n, bird ? .05 : .006); orient(bm, bl.n); bm.scale.set(1.15, .62, 1); hi.add(bm);
      return { open, happy, shut, blush: bm };
    });
    // ears / tails
    if (sp === 'dog') {
      for (const s of [-1, 1]) { const g = new T.Group(); g.position.set(s * 1.02, 1.98, .02); g.rotation.set(0, s * .28, s * .18); hi.add(g); part(C.ear, [.32, .62, .17], [s * .1, -.5, 0], S.OL, g); ears.push({ g, s, x: 0, v: 0, rest: [0, s * .28, s * .18], hang: 1 }); }
      part(C.body, [.1, .1, .22], [0, .1, -.12], S.OLs, tail).rotation.x = .85;
    } else if (sp === 'cat') {
      const cone = new T.ConeGeometry(1, 1, 40, 1);
      for (const s of [-1, 1]) { const p = onHead(s * .6, .66).p, g = new T.Group(); g.position.copy(p); g.rotation.set(-.1, 0, -s * .38); hi.add(g);
        part(C.ear, [.34, .62, .2], [0, .22, 0], S.OL, g, cone); part(C.inner, [.2, .4, .05], [0, .16, .12], null, g, cone);
        ears.push({ g, s, x: 0, v: 0, rest: [-.1, 0, -s * .38], hang: 0 }); }
      tube([[0, 0, 0], [0, .12, -.28], [.12, .45, -.42], [.06, .78, -.32], [-.06, .9, -.18]].map(p => new T.Vector3(...p)), .085, toon(C.body), tail);
      tail.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([[0, 0, 0], [0, .12, -.28], [.12, .45, -.42], [.06, .78, -.32], [-.06, .9, -.18]].map(p => new T.Vector3(...p)), false, 'centripetal'), 40, .085, 8, false), S.OLs));
    } else if (sp === 'rabbit') {
      for (const s of [-1, 1]) { const p = onHead(s * .34, .86).p, g = new T.Group(); g.position.copy(p).add(new T.Vector3(0, -.08, 0)); g.rotation.set(-.08, 0, -s * .14); hi.add(g);
        if (s < 0) { part(C.ear, [.21, .66, .15], [0, .6, 0], S.OL, g); part(C.inner, [.11, .5, .04], [0, .58, .12], null, g); }
        else { part(C.ear, [.2, .36, .15], [0, .32, 0], S.OL, g); const tip = new T.Group(); tip.position.set(0, .6, 0); tip.rotation.z = -1.55; g.add(tip); part(C.ear, [.18, .34, .14], [0, .28, 0], S.OL, tip); part(C.inner, [.1, .26, .04], [0, .26, .11], null, tip); part(C.inner, [.1, .26, .04], [0, .32, .12], null, g); }
        ears.push({ g, s, x: 0, v: 0, rest: [-.08, 0, -s * .14], hang: 0 }); }
      part('#FFFFFF', [.2, .2, .2], [0, .1, -.06], S.OLs, tail);
    }
    // cookie (eat)
    const cookie = new T.Group(); cookie.position.set(0, bird ? .95 : .86, bird ? 1.12 : .88); (bird ? hi : sq).add(cookie); cookie.visible = false;
    { const d = part('#D9A066', [.2, .2, .06], [0, 0, 0], S.OLs, cookie); for (const [x, y] of [[-.07, .06], [.06, .02], [-.02, -.08]]) { const c = new T.Mesh(S.sph, toon('#6B3E22')); c.scale.set(.03, .03, .02); c.position.set(x, y, .06); cookie.add(c); } }
    // halo (died)
    const halo = new T.Mesh(new T.TorusGeometry(.5, .055, 12, 48), new T.MeshBasicMaterial({ color: '#F2C76B', transparent: true, opacity: 0 }));
    halo.rotation.x = PI / 2; halo.position.y = C.H + .15; mover.add(halo);
    this.scene.add(mover);
    const ck = new Set(); cookie.traverse(o => ck.add(o));
    this.rig = { lay, PC, headG, solids: solids.filter(m => !ck.has(m)), mover, hopG, sq, head, hi, arms, ears, tail, feet, eyes, mouthW, mouthO, beakLo, nose, cookie, halo, mats, H: C.H, bird };
    this.species = sp; this.task = null; this._g = -1;
  }

  next(mood) {
    let a = ALIAS[this.action] || this.action; if (!ACTIONS.includes(a)) a = 'auto';
    if (a === 'auto') {
      const r = Math.random(), d = MOOD[mood].droop;
      if (d >= .9) a = r < .55 ? 'idle' : 'sleep';
      else if (d >= .5) a = r < .45 ? 'idle' : r < .75 ? 'walk' : r < .9 ? 'sniff' : 'sleep';
      else a = r < .32 ? 'walk' : r < .55 ? 'idle' : r < .67 ? 'happy' : r < .76 ? 'wave' : r < .84 ? 'eat' : r < .9 ? 'sniff' : r < .95 ? 'spin' : 'sleep';
    }
    if (a === 'walk') {
      const rx = this.roamX, rz = this.roamZ, m = this.rig.mover.position; let x = 0, z = 0, n = 0;
      if (rx < .25) { this.task = { a: 'idle', u: 0, dur: 2.5, waddle: true }; return; }
      do { x = (Math.random() * 2 - 1) * rx; z = (Math.random() * 2 - 1) * rz; } while (Math.hypot(x - m.x, z - m.z) < Math.min(.9, rx) && ++n < 20);
      this.task = { a, x, z, u: 0 };
    } else this.task = { a, u: 0, dur: { idle: 3.5 + Math.random() * 2, happy: 2.8, wave: 2.6, eat: 5, sniff: 3, spin: 1.4, sleep: 9 }[a] };
    if (a === 'eat') this.food = 1;
  }

  tick(dt, w, h) {
    const T = this.T;
    const sp = SPECIES[this.attr('species', 'dog')] ? this.attr('species', 'dog') : 'dog';
    if (!this.rig || sp !== this.species) this.build(sp);
    const moodIn = this.attr('state', 'happy'), mood = MOOD[moodIn] ? moodIn : (moodIn === 'dead' ? 'died' : 'happy');
    const act = this.attr('action', 'auto');
    if (act !== this.action) { this.action = act; this.task = null; }
    if (mood !== this.mood) { this.mood = mood; this.task = null; }
    const rig = this.rig, M = MOOD[mood], cam = this.cam, t = (this.t += dt);
    // framing
    const aspect = w / h, fov = 28, tf = Math.tan(fov * PI / 360), Hs = rig.H + 1.0;
    const dist = Math.max((Hs / 2) / tf, 1.85 / (tf * aspect));
    cam.fov = fov; cam.aspect = aspect; cam.updateProjectionMatrix();
    const cy = Hs / 2 - .32; cam.position.set(0, cy + dist * .16, dist); cam.lookAt(0, cy, 0);
    this.roamX = Math.max(0, tf * dist * aspect - 1.75); this.roamZ = this.roamX > .4 ? .6 : 0;
    const mv = rig.mover; mv.position.x = cl(mv.position.x, -this.roamX, this.roamX); mv.position.z = cl(mv.position.z, -this.roamZ, this.roamZ);
    rig.mover.visible = mood !== 'ran' && mood !== 'egg'; this.sh.visible = mood !== 'ran'; this.egg.visible = mood === 'egg';
    if (mood === 'egg') { const b = (t % 3.2) < .9 ? Math.sin((t % 3.2) / .9 * PI * 4) * Math.sin((t % 3.2) / .9 * PI) : 0;
      this.egg.rotation.z = .16 * b; this.egg.position.x = mv.position.x; this.egg.scale.y = 1 + .015 * Math.sin(t * 2); this.sh.position.set(mv.position.x, .002, .05); this.sh.scale.set(.8, .8, 1); this.sh.material.opacity = 1;
      this.zs.forEach(z => z.material.opacity = 0); return; }
    if (mood === 'ran') return;
    if (mood === 'died') this.task = { a: 'died', u: 0 };
    else if (!this.task) this.next(mood);
    const k = this.task; k.u += dt;
    const P = { yaw: 0, pitch: 0, tilt: 0, lie: 0, zz: 0, droop: M.droop, halo: 0, side: 0, back: 0 };
    let hy = 0, sy = 1, walking = false, eyeMode = 'open', wagA = .35 * (1 - M.droop * .8), wagF = 2.2, mouthOpen = false, faceCam = true;
    let arm = [[0, .25], [0, .25]], cookie = false, spin = 0;
    // pointer: head follows the cursor a little
    const r = this.getBoundingClientRect(), pdx = (S.px - (r.left + r.width / 2)) / Math.max(200, r.width), pdy = (S.py - (r.top + r.height * .35)) / Math.max(200, r.height);
    const near = Math.abs(pdx) < 2.5 && Math.abs(pdy) < 2.5;
    switch (k.a) {
      case 'idle':
        if ((this.look.t -= dt) < 0) this.look = { y: (Math.random() * 2 - 1) * .5, z: (Math.random() * 2 - 1) * .2, t: 1.4 + Math.random() * 2 };
        P.yaw = near ? cl(pdx * .7, -.6, .6) : this.look.y; P.pitch = near ? cl(pdy * .3, -.2, .25) : -.04; P.tilt = this.look.z;
        if (M.droop > .4) { arm = [[-.9, -.45], [-.9, -.45]]; P.pitch += .18 * M.droop; sy = 1 - .06 * M.droop; }
        if (k.waddle) { walking = true; faceCam = true; }
        break;
      case 'walk': {
        faceCam = false;
        const dx = k.x - mv.position.x, dz = k.z - mv.position.z, d = Math.hypot(dx, dz), want = Math.atan2(dx, dz);
        this.face += wrap(want - this.face) * (1 - Math.exp(-dt * 6));
        if (Math.abs(wrap(want - this.face)) < .5 && d > .001) { const m = Math.min(d, .95 * M.spd * dt); mv.position.x += dx / d * m; mv.position.z += dz / d * m; walking = true; }
        if (d < .02) this.task = null;
        wagA = .5 * (1 - M.droop * .8); wagF = 3; break; }
      case 'happy': {
        const c = (k.u % .72) / .72; let up = 0;
        if (c < .2) sy = 1 - .2 * Math.sin(c / .2 * PI);
        else if (c < .86) { const s = (c - .2) / .66; hy = .62 * 4 * s * (1 - s); sy = 1 + .14 * Math.abs(1 - 2 * s); up = Math.sin(s * PI); }
        else sy = 1 - .22 * Math.sin((c - .86) / .14 * PI);
        const a = rig.bird ? .3 + 1.1 * Math.abs(Math.sin(t * 16)) : .3 + 1.45 * up; arm = [[-.4 * up, a], [-.4 * up, a]];
        eyeMode = 'happy'; mouthOpen = true; wagA = .8; wagF = 9; P.pitch = -.1; P.tilt = .12 * Math.sin(k.u * 4.4); break; }
      case 'wave': {
        arm = [[0, .25], [-.6, 1.75 + .38 * Math.sin(t * 11)]]; P.tilt = -.16; P.yaw = .12; eyeMode = k.u > .3 && k.u < 2.2 ? 'happy' : 'open'; mouthOpen = k.u > .3 && k.u < 2.2; wagA = .6; wagF = 6; break; }
      case 'eat': {
        cookie = k.u < k.dur - .5; const munch = k.u > .5 && cookie;
        arm = rig.bird ? [[-.5, -.2], [-.5, -.2]] : [[-1.6, -.42], [-1.6, -.42]];
        P.pitch = .14 + (munch ? .06 * Math.sin(t * 12) : 0); mouthOpen = munch && Math.sin(t * 12) > 0; eyeMode = munch ? 'happy' : 'open';
        if (munch) this.food = Math.max(.15, this.food - dt / 4); wagA = .6; wagF = 5; break; }
      case 'sniff':
        arm = [[-.3, .15], [-.3, .15]]; P.pitch = .32; P.yaw = .35 * Math.sin(k.u * 1.6); rig.nose.scale.setScalar(1 + .12 * Math.max(0, Math.sin(t * 22))); break;
      case 'spin': {
        const u = cl(k.u / 1.2, 0, 1); spin = (u * u * (3 - 2 * u)) * 2 * PI; hy = .3 * Math.sin(u * PI); arm = [[0, 1.4], [0, 1.4]]; eyeMode = 'happy'; mouthOpen = true; wagA = .8; wagF = 9; break; }
      case 'pet':
        eyeMode = 'happy'; mouthOpen = true; wagA = .9; wagF = 10; P.tilt = .22 * Math.sin(k.u * 6); P.pitch = -.06; sy = 1 + .05 * Math.sin(k.u * 12) * Math.exp(-k.u * 2);
        arm = [[-.45, 1.6 + .2 * Math.sin(t * 12)], [-.45, 1.6 - .2 * Math.sin(t * 12)]]; break;
      case 'sleep':
        eyeMode = k.u > .9 ? 'shut' : 'open'; P.pitch = .05; P.tilt = -.12; P.lie = 1; P.side = k.u > .4 ? 1 : 0; P.zz = k.u > 1.6 ? 1 : 0; wagA = 0; sy = .97 + .03 * Math.sin(t * 1.3); arm = [[-.7, .15], [-.95, .55]]; break;
      case 'died':
        eyeMode = 'shut'; P.pitch = -.3; P.tilt = 0; P.yaw = -.25; P.lie = 1; P.back = 1; P.halo = 1; wagA = 0; sy = 1; arm = [[-1.5, .45], [-1.5, .45]]; faceCam = true; break;
    }
    if (k.dur && k.u > k.dur) this.task = null;
    if (faceCam) { const camAz = Math.atan2(cam.position.x - mv.position.x, cam.position.z - mv.position.z) + (k.a === 'died' ? .95 : 0); this.face += wrap(camAz - this.face) * (1 - Math.exp(-dt * (k.a === 'died' ? 4 : 2.2))); }
    mv.rotation.y = this.face + spin;
    const pose = this.pose; for (const n in P) pose[n] += (P[n] - pose[n]) * (1 - Math.exp(-dt * (n === 'zz' || n === 'halo' ? 2 : n === 'side' || n === 'back' ? 3 : 5)));
    this.walkA += ((walking ? 1 : 0) - this.walkA) * (1 - Math.exp(-dt * 10));
    if (walking) this.ph += dt * 10 * Math.max(.5, M.spd);
    const wa = this.walkA, ph = this.ph, s1 = Math.sin(ph), sq = rig.sq;
    hy += .07 * wa * Math.abs(Math.sin(ph));
    sy *= 1 + .035 * wa * Math.cos(ph * 2) + .018 * Math.sin(t * (2.2 - M.droop)) * (1 - pose.lie * .5) * (1 - pose.back);
    sq.rotation.z = .14 * wa * s1; sq.rotation.x = .05 * wa;
    rig.feet.forEach((f, i) => { const s = Math.sin(ph + i * PI), lift = Math.max(0, s) * .12 * wa, b = f.userData.base;
      const bk = pose.back; f.position.set(b.x * (1 - .1 * bk), (b.y + lift) * (1 - bk) + .36 * bk, (b.z + .1 * wa * Math.cos(ph + i * PI)) * (1 - bk) + .66 * bk); f.rotation.x = -lift * 1.5 * (1 - bk) - .2 * bk; });
    const sp2 = (o, tgt, kk, d) => { o.v += ((tgt - o.x) * kk - o.v * d) * dt; o.x += o.v * dt; return o.x; };
    sp2(this.sqS, 1, 160, 9);
    const syF = sy * this.sqS.x, sxz = 1 / Math.sqrt(syF); sq.scale.set(sxz, syF, sxz);
    rig.hopG.position.y = hy;
    const hv = (hy - this.prevHy) / Math.max(dt, 1e-3); this.prevHy = hy;
    rig.head.rotation.set(pose.pitch + .05 * wa * Math.sin(ph * 2), pose.yaw - .1 * wa * s1, pose.tilt - .1 * wa * s1);
    rig.ears.forEach(e => { const tgt = cl(hv * .22, -.6, .9) + .12 * wa * Math.sin(ph * 2 + e.s) - pose.tilt * e.s * .6 + (k.a === 'pet' ? .25 : 0) - pose.droop * .35 - pose.lie * .1;
      sp2(e, tgt, 90, 7);
      if (e.hang) e.g.rotation.set(-e.x * .25, e.rest[1], e.rest[2] + e.s * e.x);
      else e.g.rotation.set(e.rest[0] + e.x * .1 + pose.droop * .5, e.rest[1], e.rest[2] - e.s * e.x * .35 - e.s * pose.droop * .5); });
    // arms: walking swing blended over the action pose, springy
    rig.arms.forEach((a, i) => { const [ax, az] = arm[i]; const swing = .6 * wa * Math.sin(ph + (i ? 0 : PI));
      sp2(a.x, ax + swing, 120, 11); sp2(a.z, az + .04 * Math.sin(t * 2 + i), 120, 11);
      a.g.rotation.set(a.x.x, 0, a.s * a.z.x); });
    const tw = wagA * Math.sin(t * wagF * PI); sp2(this.tailS, tw, 140, 10);
    rig.tail.rotation.set(-.15 + pose.lie * .3 - pose.droop * .3, this.tailS.x, 0);
    if ((this.blink -= dt) < -.12) this.blink = 2 + Math.random() * 3.5;
    const bl = (this.blink < 0 ? .12 : 1) * (1 - .45 * pose.droop);
    rig.eyes.forEach(e => { e.open.visible = eyeMode === 'open'; e.open.scale.y = bl; e.happy.visible = eyeMode === 'happy'; e.shut.visible = eyeMode === 'shut';
      e.blush.material.opacity = (eyeMode === 'happy' ? .85 : .62) * (1 - this.grey); });
    if (rig.bird) rig.beakLo.rotation.x = mouthOpen ? .45 : 0; else { rig.mouthW.visible = !mouthOpen; rig.mouthO.visible = mouthOpen; }
    if (k.a !== 'sniff') rig.nose.scale.setScalar(1);
    rig.cookie.visible = cookie; rig.cookie.scale.setScalar(this.food);
    // mood colour
    this.grey += (M.grey - this.grey) * (1 - Math.exp(-dt * 2));
    if (Math.abs(this.grey - (this._g || 0)) > .002) { this._g = this.grey; const g = new T.Color();
      rig.mats.forEach(o => { if (o.keep) return; const l = o.c0.r * .3 + o.c0.g * .59 + o.c0.b * .11; g.setRGB(l, l, l * 1.02); o.m.color.copy(o.c0).lerp(g, this.grey); }); }
    const sd = pose.side, bk = pose.back, L = cl((sd + bk) * 1.6, 0, 1);
    rig.lay.rotation.set(-1.5 * bk, 0, 1.42 * sd); rig.lay.position.set(0, rig.PC, 0);
    if (L > .001) {
      mv.updateMatrixWorld(true); let y0 = Infinity, x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (const m of rig.solids) { if (!m.parent.visible) continue; const e = m.matrixWorld.elements, ry = Math.hypot(e[1], e[5], e[9]), rx = Math.hypot(e[0], e[4], e[8]), rz = Math.hypot(e[2], e[6], e[10]);
        y0 = Math.min(y0, e[13] - ry); x0 = Math.min(x0, e[12] - rx); x1 = Math.max(x1, e[12] + rx); z0 = Math.min(z0, e[14] - rz); z1 = Math.max(z1, e[14] + rz); }
      const lc = mv.worldToLocal(new T.Vector3((x0 + x1) / 2, 0, (z0 + z1) / 2));
      rig.lay.position.set(-lc.x * L, rig.PC - (y0 - hy) * L, -lc.z * L);
    }
    mv.updateMatrixWorld(true); const hw = rig.headG.getWorldPosition(new T.Vector3());
    rig.halo.material.opacity = pose.halo; rig.halo.position.set(hw.x - mv.position.x, hw.y + 1.25 + .06 * Math.sin(t * 1.6), hw.z - mv.position.z); rig.halo.visible = pose.halo > .02;
    // shadow, z's, hearts
    this.sh.position.set(mv.position.x, .002, mv.position.z + .05);
    const ss = 1 - hy * .5; this.sh.scale.set(ss * sxz * (1 + .75 * L), ss * sxz, 1); this.sh.material.opacity = 1 - hy * .6;
    this.zs.forEach((z, i) => { const u = (t * .32 + i / 3) % 1; z.material.opacity = pose.zz * Math.sin(u * PI);
      z.position.set(hw.x + .7 + u * .45 + .08 * Math.sin(u * 7 + i), hw.y + .75 + u, hw.z); const sc = .26 + u * .3; z.scale.set(sc, sc, 1); });
    this.hearts.forEach(hh => { const d = hh.userData; d.t += dt; const u = d.t / 1.3; hh.material.opacity = u > 0 && u < 1 ? Math.sin(u * PI) : 0;
      if (u > 0 && u < 1) { hh.position.set(mv.position.x + d.x + .1 * Math.sin(u * 8), rig.H + u * .9, mv.position.z + .3); const sc = .28 + .12 * Math.sin(u * PI); hh.scale.set(sc, sc, 1); } });
  }
});
})();

export {};
