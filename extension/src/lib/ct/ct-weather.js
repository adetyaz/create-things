/* eslint-disable */
// @ts-nocheck
// From the design handoff (Design system and art direction/ct-weather.js). Keep in sync with it.
(() => {
if (customElements.get('ct-weather')) return;
const K = [[0,[.03,.05,.13],[.08,.11,.24],[.15,.18,.32]],[4.8,[.05,.07,.18],[.16,.17,.33],[.32,.27,.4]],[6.4,[.30,.40,.66],[.90,.66,.64],[.99,.82,.66]],[8.5,[.12,.26,.52],[.40,.62,.86],[.78,.86,.93]],[13,[.04,.12,.30],[.20,.45,.74],[.52,.73,.90]],[16.8,[.12,.22,.46],[.52,.62,.80],[.95,.86,.74]],[18.6,[.20,.24,.50],[.90,.48,.38],[1,.74,.45]],[19.7,[.09,.11,.28],[.36,.25,.44],[.66,.42,.42]],[21,[.03,.05,.13],[.08,.11,.24],[.15,.18,.32]],[24,[.03,.05,.13],[.08,.11,.24],[.15,.18,.32]]];
const NAMED = { dawn: 6.5, morning: 9, day: 13, afternoon: 16, sunset: 18.6, dusk: 19.6, night: 23 };
// cloud, rain, snow, fog, storm
const WX = { clear: [.15,0,0,0,0], cloudy: [.72,0,0,0,0], rain: [.88,1,0,0,0], storm: [1,1.35,0,0,1], snow: [.62,0,1,0,0], fog: [.3,0,0,1,0] };
const ss = (a, b, x) => { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t, lv = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
function sky(h) { h = ((h % 24) + 24) % 24; let i = 0; while (i < K.length - 2 && h >= K[i + 1][0]) i++; const a = K[i], b = K[i + 1]; const t = ss(0, 1, (h - a[0]) / (b[0] - a[0])); return [lv(a[1], b[1], t), lv(a[2], b[2], t), lv(a[3], b[3], t)]; }
const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const FS = `precision highp float;
uniform vec2 R;uniform float T;uniform vec3 cTop,cMid,cBot,cSun,cCloud,S;
uniform float uNight,uCloud,uRain,uSnow,uFog,uStorm,uFlash;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y);}
float fb3(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<3;i++){v+=a*noise(p);p=m*p;a*=.5;}return v/.875;}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){v+=a*noise(p);p=m*p;a*=.5;}return v;}
float rainL(vec2 uv,float sc,float sp,float sd){uv.x+=uv.y*.16;vec2 q=vec2(uv.x*sc,uv.y*sc*.08+T*sp+sd);vec2 id=floor(q);vec2 f=fract(q);float r=h21(id+sd);float x=abs(f.x-(.2+.6*h21(id+7.1)));return (1.-smoothstep(0.,.06,x))*smoothstep(0.,.6,f.y)*(1.-smoothstep(.8,1.,f.y))*step(.6,r);}
float snowL(vec2 uv,float sc,float sp,float sd){uv.y+=T*sp;uv.x+=sin(uv.y*2.+T*.6+sd)*.05;vec2 q=uv*sc+sd;vec2 id=floor(q);vec2 f=fract(q)-.5;float r=h21(id);vec2 o=(vec2(h21(id+1.3),h21(id+5.7))-.5)*.6;return (1.-smoothstep(0.,.1+.08*r,length(f-o)))*step(.5,r);}
void main(){
vec2 uv=gl_FragCoord.xy/R;float a=R.x/R.y;vec2 p=vec2(uv.x*a,uv.y);float y=uv.y;
vec3 col=y<.42?mix(cBot,cMid,smoothstep(0.,.42,y)):mix(cMid,cTop,smoothstep(.42,1.,y));
vec2 sg=p*80.;float sr=h21(floor(sg));
col+=uNight*step(.986,sr)*(1.-smoothstep(0.,.16,length(fract(sg)-.5)))*(.55+.45*sin(T*1.7+sr*90.))*smoothstep(.2,.7,y)*(1.-uCloud);
vec2 sp=vec2(S.x*a,S.y);float d=length(p-sp);float sv=S.z*(1.-uCloud*.65);
col+=sv*cSun*(exp(-d*4.)*.45+exp(-d*16.)*.5);
col=mix(col,cSun+.15,sv*(1.-smoothstep(.042,.05,d)));
float an=atan(p.y-sp.y,p.x-sp.x);
col+=sv*cSun*noise(vec2(an*8.,T*.07))*noise(vec2(an*15.+3.,T*.05))*exp(-d*1.5)*.1*(1.-uFog)*(1.-uCloud);
vec2 mp=vec2(.8*a,.76);float md=length(p-mp);
float moon=(1.-smoothstep(.036,.042,md))*smoothstep(.03,.036,length(p-mp-vec2(.018,.012)));
col+=uNight*(1.-uCloud*.75)*(vec3(.95,.95,1.)*moon+vec3(.45,.55,.9)*exp(-md*8.)*.22);
vec2 cp=vec2(p.x*1.5+T*.012,p.y*2.4-T*.002);
float c=fbm(cp+fbm(cp*1.4+vec2(T*.01,0.))*.7);
float cov=mix(.78,.28,uCloud);
float cd=smoothstep(cov,cov+.3,c)*smoothstep(.02,.4,y);
float sh=fbm(cp+vec2(.07,-.09)+fbm(cp*1.4)*.7);
vec3 cc=mix(cCloud*.6,cCloud,clamp((c-sh)*3.+.6,0.,1.));
cc*=1.-uStorm*.5;cc+=S.z*cSun*exp(-d*2.5)*.3*(1.-uStorm);
col=mix(col,cc,cd*.94);
float e1=.44+.13*(noise(vec2(p.x*1.6+T*.006,1.))-.5)+.06*(noise(vec2(p.x*4.+T*.012,3.))-.5)+.025*(noise(vec2(p.x*11.,y*14.))-.5);
float e2=.30+.15*(noise(vec2(p.x*2.6+T*.012,7.))-.5)+.07*(noise(vec2(p.x*6.5+T*.02,9.))-.5)+.03*(noise(vec2(p.x*16.,y*18.))-.5);
float l1=noise(vec2(p.x*4.+T*.01,y*7.)),l2=noise(vec2(p.x*6.+T*.02,y*10.+5.));
vec3 sLo=mix(cMid,cCloud,.55)*.92,sHi=min(cCloud*1.18,vec3(1.));
float h1=clamp(.35+clamp((y-(e1-.22))/.22,0.,1.)*.5+(l1-.5)*.9,0.,1.);
col=mix(col,mix(sLo,sHi,h1)+S.z*cSun*exp(-d*2.)*.12,smoothstep(e1+.012,e1-.05,y)*.86*(1.-uFog*.4));
float h2=clamp(.35+clamp((y-(e2-.22))/.22,0.,1.)*.5+(l2-.5)*.9,0.,1.);
col=mix(col,mix(sLo,sHi,h2),smoothstep(e2+.012,e2-.05,y)*.98*(1.-uFog*.4));
col*=1.-uStorm*.3;
col=mix(col,col*vec3(.74,.78,.84),min(uRain,1.)*.55);
col+=uFlash*vec3(.75,.8,1.)*(.35+.65*cd);
float fgn=fbm(vec2(p.x*1.1+T*.03,p.y*1.8));
vec3 fc=mix(cBot,vec3(.92,.92,.9),.55)*(1.-uNight*.65);
col=mix(col,fc,uFog*clamp(.3+.55*fgn+(1.-y)*.45,0.,1.)*.92);
float rr=rainL(p,140.,9.,0.)*.35+rainL(p,80.,11.,3.7)*.6+rainL(p,45.,13.,9.1);
col=mix(col,vec3(.86,.9,1.),clamp(rr*uRain*.32,0.,1.));
float s=snowL(p,16.,.07,0.)*.45+snowL(p,10.,.12,4.)*.75+snowL(p,6.,.2,8.);
col=mix(col,vec3(1.),clamp(s*uSnow*.92,0.,1.));
col+=(h21(gl_FragCoord.xy+fract(T))-.5)/255.;
gl_FragColor=vec4(col,1.);}`;

// One shared WebGL context for every sky on the page; each instance copies its frame into a 2D canvas.
let GLS = null;
function shared() {
  if (GLS && !GLS.gl.isContextLost()) return GLS;
  const c = document.createElement('canvas'); c.width = c.height = 2;
  const gl = c.getContext('webgl', { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
  if (!gl) return null;
  c.addEventListener('webglcontextlost', e => e.preventDefault());
  c.addEventListener('webglcontextrestored', () => { GLS = null; });
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(o)); return o; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = {}; ['R','T','cTop','cMid','cBot','cSun','cCloud','S','uNight','uCloud','uRain','uSnow','uFog','uStorm','uFlash'].forEach(n => u[n] = gl.getUniformLocation(pr, n));
  GLS = { c, gl, u, W: 2, H: 2 }; return GLS;
}
const INST = new Set(); let RAF = 0, LAST = performance.now();
function loop(now) { RAF = requestAnimationFrame(loop); if (now - LAST < 32) return; const dt = Math.min(.1, (now - LAST) / 1000); LAST = now; for (const i of INST) if (i.vis && i.cw) i.frame(now, dt); }

class CtWeather extends HTMLElement {
  connectedCallback() {
    if (this.c) return;
    this.style.display = 'block'; this.style.width = '100%'; this.style.height = '100%';
    this.c = document.createElement('canvas'); this.c.style.cssText = 'width:100%;height:100%;display:block';
    this.appendChild(this.c); this.ctx = this.c.getContext('2d');
    this.cur = null; this.t0 = performance.now(); this.flash = 0; this.nextFlash = 2;
    this.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(this);
    this.vis = true; this.io = new IntersectionObserver(e => { this.vis = e[0].isIntersecting; }); this.io.observe(this);
    this.resize(); INST.add(this); if (!RAF) RAF = requestAnimationFrame(loop);
  }
  disconnectedCallback() {
    INST.delete(this); this.ro && this.ro.disconnect(); this.io && this.io.disconnect();
    this.c && this.c.remove(); this.c = null; this.cw = 0;
    if (!INST.size) { cancelAnimationFrame(RAF); RAF = 0; }
  }
  get(n) { const host = this.closest('[data-ct]'); if (host && host.hasAttribute('data-' + n)) return host.getAttribute('data-' + n); return (this._p && this._p[n]) ?? this.getAttribute(n); }
  target() {
    const hr = this.get('hour'), tn = this.get('time') || 'day';
    const h = hr != null && hr !== '' ? parseFloat(hr) : (NAMED[tn] ?? (parseFloat(tn) || 13));
    return { h, w: WX[this.get('weather') || 'clear'] || WX.clear };
  }
  resize() {
    if (!this.c) return;
    const d = .5;
    this.cw = Math.max(1, Math.round(this.clientWidth * d)); this.ch = Math.max(1, Math.round(this.clientHeight * d));
    if (this.c.width !== this.cw || this.c.height !== this.ch) { this.c.width = this.cw; this.c.height = this.ch; }
  }
  frame(now, dt) {
    const S = shared(); if (!S) return; const gl = S.gl, u = S.u;
    if (this.cw > S.W || this.ch > S.H) { S.W = Math.max(S.W, this.cw); S.H = Math.max(S.H, this.ch); S.c.width = S.W; S.c.height = S.H; }
    const T = this.reduce ? 20 : (now - this.t0) / 1000;
    const tg = this.target();
    if (!this.cur) this.cur = { h: tg.h, w: tg.w.slice() };
    let dh = tg.h - this.cur.h; dh = ((dh % 24) + 36) % 24 - 12;
    this.cur.h = (this.cur.h + dh * Math.min(1, dt * 2.5) + 24) % 24;
    this.cur.w = this.cur.w.map((v, i) => lerp(v, tg.w[i], Math.min(1, dt * 2)));
    const h = this.cur.h, [cl, rn, sn, fg, st] = this.cur.w, [top, mid, bot] = sky(h);
    let sx = .5, sy = -1, sa = 0;
    { const R = Math.PI / 180, lat = (parseFloat(this.get('lat')) || 51.5) * R, now2 = new Date(), doy = Math.floor((now2 - new Date(now2.getFullYear(), 0, 0)) / 864e5);
      const dec = 23.44 * R * Math.sin(2 * Math.PI * (284 + doy) / 365), H = 15 * (h - 12) * R;
      const el = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H)) / R;
      const az = (Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat)) / R + 180 + 360) % 360;
      sx = .5 + (az - 160) / 200; sy = .44 + el / 90 * .62; sa = ss(-3, 2, el); this._el = el; }
    const low = 1 - Math.min(1, Math.max(0, this._el) / 25);
    const sun = lv([1, .97, .9], [1, .55, .28], low);
    const night = Math.max(1 - ss(4.8, 6.6, h), ss(19.6, 21, h));
    const cloud = lv(lv(mid, [1, 1, 1], .55), lv(mid, [.3, .32, .4], .5), night * .85);
    if (st > .5 && !this.reduce) { this.nextFlash -= dt; if (this.nextFlash <= 0) { this.flash = 1; this.nextFlash = 3 + Math.random() * 6; } }
    this.flash *= Math.pow(.02, dt);
    const fl = this.flash > .02 ? this.flash * (.6 + .4 * Math.sin(T * 60)) : 0;
    gl.viewport(0, 0, this.cw, this.ch);
    gl.uniform2f(u.R, this.cw, this.ch); gl.uniform1f(u.T, T);
    gl.uniform3fv(u.cTop, top); gl.uniform3fv(u.cMid, mid); gl.uniform3fv(u.cBot, bot);
    gl.uniform3fv(u.cSun, sun); gl.uniform3fv(u.cCloud, cloud); gl.uniform3f(u.S, sx, sy, sa);
    gl.uniform1f(u.uNight, night); gl.uniform1f(u.uCloud, cl); gl.uniform1f(u.uRain, rn); gl.uniform1f(u.uSnow, sn);
    gl.uniform1f(u.uFog, fg); gl.uniform1f(u.uStorm, st); gl.uniform1f(u.uFlash, fl);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.ctx.drawImage(S.c, 0, S.H - this.ch, this.cw, this.ch, 0, 0, this.cw, this.ch);
  }
}
['time', 'weather', 'hour'].forEach(n => Object.defineProperty(CtWeather.prototype, n, { get() { return this._p && this._p[n]; }, set(v) { (this._p || (this._p = {}))[n] = v == null ? v : String(v); }, configurable: true }));
customElements.define('ct-weather', CtWeather);
})();

export {};
