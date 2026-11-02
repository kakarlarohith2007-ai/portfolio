const $ = s => document.querySelector(s);
const panels = [...document.querySelectorAll('.panel')];
const N = panels.length;
const TOTAL = 300;
const ST = [0, 32, 80, 128, 190, 232];
const ACT = [
  'Prologue',
  'Chapter I: About me',
  'Chapter II: The craft',
  'Chapter III: Examore',
  'Chapter IV: The journey',
  'Epilogue: Let’s build something'
];

let cur = 0;
let reel = false;
let paused = false;
let reelT = 0;
let muted = false;
let started = false;
let lockUntil = 0;
let beat = 0;
let warp = 0;
let shake = 0;
let flash = 0;
let faded = 0;
let riserDone = -1;
let lastSec = -1;

/* ---------- score ---------- */
let AC, master, bus, wet, nz, nextT = 0, stp = 0;
const kicks = [];
const SP = 60 / 92 / 4;
const mtof = m => 440 * 2 ** ((m - 69) / 12);
const PR = [
  [57, [0, 3, 7]],
  [53, [0, 4, 7]],
  [48, [0, 4, 7]],
  [55, [0, 4, 7]],
  [50, [0, 3, 7]],
  [57, [0, 3, 7]]
];
const IN = [0, 1, 2, 3, 2, 4];

function initAudio() {
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    const comp = AC.createDynamicsCompressor();
    master = AC.createGain();
    master.gain.value = muted ? 0 : 0.7;
    bus = AC.createGain();
    bus.connect(master);
    master.connect(comp);
    comp.connect(AC.destination);

    const cv = AC.createConvolver();
    const L = AC.sampleRate * 3;
    const ib = AC.createBuffer(2, L, AC.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ib.getChannelData(c);
      for (let i = 0; i < L; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / L, 2.5);
      }
    }
    cv.buffer = ib;
    wet = AC.createGain();
    wet.gain.value = 0.5;
    wet.connect(cv);
    cv.connect(bus);

    nz = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
    const nd = nz.getChannelData(0);
    for (let i = 0; i < nd.length; i++) {
      nd[i] = Math.random() * 2 - 1;
    }

    nextT = AC.currentTime + 0.1;
    setInterval(sched, 40);
  } catch (e) {
    AC = null;
  }
}

function nt(type, f, t, dur, v, cut, att, rel, send) {
  const o = AC.createOscillator();
  const g = AC.createGain();
  const lp = AC.createBiquadFilter();
  o.type = type;
  o.frequency.value = f;
  lp.type = 'lowpass';
  lp.frequency.value = cut;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + att);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
  o.connect(lp);
  lp.connect(g);
  g.connect(bus);
  if (send) {
    const s = AC.createGain();
    s.gain.value = send;
    g.connect(s);
    s.connect(wet);
  }
  o.start(t);
  o.stop(t + dur + rel + 0.05);
}

function pad(i, t, d) {
  if (!AC) return;
  const [r, c] = PR[i];
  c.concat([12]).forEach(iv =>
    [-9, 9].forEach(dt =>
      nt('sawtooth', mtof(r + iv) * 2 ** (dt / 1200), t, d, 0.022, 700 + IN[i] * 350, 1.6, 2.2, 0.5)
    )
  );
  nt('sine', mtof(r - 12), t, d, 0.09, 300, 1.5, 2, 0.2);
}

function kick(t, v) {
  const o = AC.createOscillator();
  const g = AC.createGain();
  o.frequency.setValueAtTime(130, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.22);
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  o.connect(g);
  g.connect(bus);
  o.start(t);
  o.stop(t + 0.45);
  kicks.push(t);
}

function nzh(t, dur, type, f, v, send) {
  const s = AC.createBufferSource();
  const b = AC.createBiquadFilter();
  const g = AC.createGain();
  s.buffer = nz;
  b.type = type;
  b.frequency.value = f;
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(b);
  b.connect(g);
  g.connect(bus);
  if (send) {
    const x = AC.createGain();
    x.gain.value = send;
    g.connect(x);
    x.connect(wet);
  }
  s.start(t, Math.random());
  s.stop(t + dur + 0.05);
}

function riser(t, d) {
  const s = AC.createBufferSource();
  const b = AC.createBiquadFilter();
  const g = AC.createGain();
  s.buffer = nz;
  s.loop = true;
  b.type = 'bandpass';
  b.Q.value = 3;
  b.frequency.setValueAtTime(250, t);
  b.frequency.exponentialRampToValueAtTime(7000, t + d);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.3, t + d);
  g.gain.linearRampToValueAtTime(0, t + d + 0.05);
  s.connect(b);
  b.connect(g);
  g.connect(bus);
  g.connect(wet);
  s.start(t);
  s.stop(t + d + 0.1);

  const o = AC.createOscillator();
  const og = AC.createGain();
  const lp = AC.createBiquadFilter();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(110, t);
  o.frequency.exponentialRampToValueAtTime(880, t + d);
  lp.frequency.value = 1500;
  og.gain.setValueAtTime(0.0001, t);
  og.gain.exponentialRampToValueAtTime(0.05, t + d);
  og.gain.linearRampToValueAtTime(0, t + d + 0.05);
  o.connect(lp);
  lp.connect(og);
  og.connect(bus);
  o.start(t);
  o.stop(t + d + 0.1);
}

function impact(t) {
  const o = AC.createOscillator();
  const g = AC.createGain();
  o.frequency.setValueAtTime(90, t);
  o.frequency.exponentialRampToValueAtTime(26, t + 2);
  g.gain.setValueAtTime(0.9, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
  o.connect(g);
  g.connect(bus);
  g.connect(wet);
  o.start(t);
  o.stop(t + 2.3);
  nzh(t, 1.6, 'lowpass', 2200, 0.5, 0.8);
  kicks.push(t);
}

function step(n, t) {
  const s = n % 16;
  const i = IN[cur];
  const [r, c] = PR[cur];
  const T = [c[0], c[1], c[2], c[0] + 12];
  const P = [0, 3, 5, 7, 10, 12, 15];

  if (i >= 1 && (s === 0 || s === 6 || s === 10)) {
    nt('triangle', mtof(r + 24 + P[((n >> 4) * 3 + (s >> 1)) % 7]), t, 0.1, 0.1, 2600, 0.004, 1.6, 0.9);
  }
  if (i === 0 && s === 0 && (n >> 4) % 2 === 0) {
    nt('triangle', mtof(r + 24 + P[(n >> 4) % 7]), t, 0.1, 0.1, 2600, 0.004, 2.2, 1);
  }
  if (i >= 4 && s === 0 && (n >> 4) % 2 === 0) {
    c.forEach(iv => nt('sawtooth', mtof(r + iv - 12), t, SP * 14, 0.05, 1100, 1.2, 1.2, 0.4));
  }
  if (Math.random() < 0.12) {
    nzh(t, 0.008, 'highpass', 3000, 0.03);
  }
  if (s === 0 && (n / 16) % 2 === 0) {
    pad(cur, t, SP * 30);
  }
  if (i === 0) {
    if (s === 0 || s === 6) kick(t, 0.45);
  } else {
    if (s % 8 === 0 || (i >= 3 && s % 4 === 0)) kick(t, 0.8);
    if (s % 4 === 0) nt('sawtooth', mtof(r - 12), t, SP * 3, 0.16, 260 + i * 60, 0.01, 0.12);
  }
  if (i >= 2 && s % 2 === 1) {
    nzh(t, 0.05, 'highpass', 8000, 0.05 + i * 0.01);
  }
  if (i >= 3 && (s === 4 || s === 12)) {
    nzh(t, 0.18, 'bandpass', 1600, 0.22, 0.5);
  }
  if (i >= 2 && (i >= 4 || s % 2 === 0)) {
    const q = i >= 4 ? s : s >> 1;
    nt('triangle', mtof(r + 12 + T[[0, 1, 2, 3, 2, 1, 3, 2][q % 8]]), t, SP * 1.2, 0.07, 1800 + i * 500, 0.005, 0.2, 0.4);
  }
}

function sched() {
  if (!AC || AC.state !== 'running') return;
  while (nextT < AC.currentTime + 0.2) {
    step(stp, nextT);
    nextT += SP;
    stp++;
  }
  if (reel && !paused) {
    const ns = ST[cur + 1] || TOTAL;
    if (ns - reelT < 2.2 && riserDone !== cur && cur < N - 1) {
      riserDone = cur;
      riser(AC.currentTime + Math.max(0, ns - reelT - 2), 2);
    }
    if (reelT > TOTAL - 8 && !faded) {
      faded = 1;
      bus.gain.setValueAtTime(bus.gain.value, AC.currentTime);
      bus.gain.linearRampToValueAtTime(0, AC.currentTime + 7.5);
    }
  }
}

function unfade() {
  if (faded && AC) {
    faded = 0;
    bus.gain.cancelScheduledValues(AC.currentTime);
    bus.gain.setTargetAtTime(1, AC.currentTime, 0.3);
  }
}

function tone(a, b, d, ty, v, dl) {
  if (!AC) return;
  const t = AC.currentTime + (dl || 0);
  const o = AC.createOscillator();
  const g = AC.createGain();
  o.type = ty || 'sine';
  o.frequency.setValueAtTime(a, t);
  o.frequency.exponentialRampToValueAtTime(b, t + d);
  g.gain.setValueAtTime(v || 0.1, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g);
  g.connect(bus);
  o.start(t);
  o.stop(t + d);
}

document.addEventListener('pointerover', e => {
  if (e.target.closest('.btn, .chips span')) {
    tone(900, 1200, 0.07, 'triangle', 0.04);
  }
});

document.addEventListener('click', e => {
  if (e.target.closest('.btn, .dots button')) {
    tone(300, 600, 0.12, 'square', 0.03);
  }
});

/* ---------- 3D world ---------- */
const R = new THREE.WebGLRenderer({ canvas: $('#c'), antialias: true, powerPreference: 'high-performance' });
R.setPixelRatio(Math.min(devicePixelRatio, 2));
const S = new THREE.Scene();
S.background = new THREE.Color(0x000000);
S.fog = new THREE.FogExp2(0x000000, 0.011);
const C = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
S.add(C);

function rs() {
  const W = innerWidth;
  const H = innerHeight;
  R.setSize(W, H);
  C.aspect = W / H;
  if (W > 800) {
    C.setViewOffset(W, H, -W * 0.17, 0, W, H);
  } else {
    C.setViewOffset(W, H, 0, H * 0.14, W, H);
  }
  C.updateProjectionMatrix();
}
addEventListener('resize', rs);
rs();

const A = [...Array(N)].map((_, i) => new THREE.Vector3(Math.sin(i * 1.7) * 8, Math.cos(i * 1.1) * 2.5, -i * 46));
const cols = [0xff1a1a, 0xff3b2e, 0xc40000, 0xff5a4a, 0x9a0000, 0xff1a1a];
const ADD = THREE.AdditiveBlending;

const GT = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();

const VS = `
varying vec3 vN, vV, vP;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  vP = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * mv;
}
`;

const FS = `
uniform vec3 col;
uniform float time, pulse;
varying vec3 vN, vV, vP;
void main() {
  float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
  float b = 0.5 + 0.5 * sin(vP.y * 7.0 + time * 2.5);
  float g = f * (1.6 + pulse) + 0.06 + b * 0.07 * f;
  gl_FragColor = vec4(col * g, clamp(g, 0.0, 1.0));
}
`;

const geos = [
  new THREE.TorusKnotGeometry(2.2, 0.6, 160, 20),
  new THREE.IcosahedronGeometry(2.6, 1),
  new THREE.OctahedronGeometry(2.8, 0),
  new THREE.BoxGeometry(3.4, 3.4, 3.4, 3, 3, 3),
  new THREE.TorusGeometry(2.4, 0.7, 16, 60),
  new THREE.DodecahedronGeometry(2.7, 0)
];

const objs = geos.map((g, i) => {
  const grp = new THREE.Group();
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      col: { value: new THREE.Color(cols[i]) },
      time: { value: 0 },
      pulse: { value: 0 }
    },
    vertexShader: VS,
    fragmentShader: FS,
    transparent: true,
    blending: ADD,
    depthWrite: false
  });
  grp.add(new THREE.Mesh(g, mat));
  grp.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({
    color: cols[i],
    wireframe: true,
    transparent: true,
    opacity: 0.3,
    blending: ADD,
    depthWrite: false
  })));

  const ring = new THREE.Points(
    new THREE.BufferGeometry().setFromPoints(
      [...Array(120)].map((_, k) => new THREE.Vector3(Math.cos(k / 120 * 6.283) * 5, Math.sin(k * 0.9) * 0.15, Math.sin(k / 120 * 6.283) * 5))
    ),
    new THREE.PointsMaterial({
      map: GT,
      color: cols[i],
      size: 0.5,
      transparent: true,
      blending: ADD,
      depthWrite: false
    })
  );
  ring.rotation.x = 0.6;
  grp.add(ring);

  const core = new THREE.Sprite(new THREE.SpriteMaterial({
    map: GT,
    color: cols[i],
    transparent: true,
    opacity: 0.4,
    blending: ADD,
    depthWrite: false
  }));
  core.scale.setScalar(11);
  grp.add(core);

  grp.position.copy(A[i]);
  grp.userData.mat = mat;
  S.add(grp);
  return grp;
});

const gates = [...Array(40)].map((_, i) => {
  const g = new THREE.Mesh(
    new THREE.TorusGeometry(14 + (i % 3) * 2, 0.05, 6, 96),
    new THREE.MeshBasicMaterial({
      color: cols[i % 6],
      transparent: true,
      opacity: 0.4,
      blending: ADD,
      depthWrite: false
    })
  );
  g.position.set(Math.sin(i * 0.4) * 5, Math.cos(i * 0.3) * 2, 25 - i * 6.4);
  S.add(g);
  return g;
});

const dust = new THREE.Points(
  new THREE.BufferGeometry().setFromPoints(
    [...Array(3500)].map(() => new THREE.Vector3((Math.random() - 0.5) * 90, (Math.random() - 0.5) * 50, 40 - Math.random() * 300))
  ),
  new THREE.PointsMaterial({
    map: GT,
    color: 0xff6a5a,
    size: 0.45,
    transparent: true,
    opacity: 0.55,
    blending: ADD,
    depthWrite: false
  })
);
S.add(dust);

const sg = [];
for (let i = 0; i < 500; i++) {
  const x = (Math.random() - 0.5) * 40;
  const y = (Math.random() - 0.5) * 24;
  const z = -6 - Math.random() * 20;
  sg.push(x, y, z, x, y, z - 4);
}
const sgeo = new THREE.BufferGeometry();
sgeo.setAttribute('position', new THREE.Float32BufferAttribute(sg, 3));
const streak = new THREE.LineSegments(
  sgeo,
  new THREE.LineBasicMaterial({
    color: 0xff3b2e,
    transparent: true,
    opacity: 0,
    blending: ADD,
    depthWrite: false,
    fog: false
  })
);
streak.frustumCulled = false;
C.add(streak);

/* camera shots: theta0, d-theta, radius0, radius1, height0, height1, fov */
const SH = [
  [0, 0, 26, 12, 1, 1.5, 62],
  [-0.5, 0.5, 12, 12, 1, 2, 52],
  [0.9, -0.4, 14, 10, -2, 3, 56],
  [0, 1.4, 13, 9, 2, 0, 48],
  [1, -0.2, 12, 15, 0, 4, 54],
  [-0.2, 0.2, 10, 26, 1, 6, 66]
];

const look = new THREE.Vector3();
const tp = new THREE.Vector3();
const tl = new THREE.Vector3();
const m = { x: 0, y: 0 };

addEventListener('pointermove', e => {
  m.x = e.clientX / innerWidth - 0.5;
  m.y = e.clientY / innerHeight - 0.5;
  const r = document.documentElement.style;
  r.setProperty('--mx', m.x);
  r.setProperty('--my', m.y);
});

C.position.set(0, 2, A[0].z + 40);
look.copy(A[0]);
let last = performance.now();

const L = (a, b, p) => a + (b - a) * p;
const fmt = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  const t = now / 1000;

  if (AC) {
    while (kicks.length && kicks[0] <= AC.currentTime) {
      kicks.shift();
      beat = 1;
    }
  }

  beat *= Math.exp(-dt * 5);
  warp *= Math.exp(-dt * 1.1);
  shake *= Math.exp(-dt * 2.2);
  flash *= Math.exp(-dt * 3);

  if (reel && !paused && started) {
    reelT = Math.min(TOTAL, reelT + dt);
    let k = 0;
    ST.forEach((s, j) => {
      if (reelT >= s) k = j;
    });
    if (k !== cur) go(k);

    $('#fill').style.width = (reelT / TOTAL * 100) + '%';
    const sc = Math.floor(reelT);
    if (sc !== lastSec) {
      lastSec = sc;
      $('#tc').textContent = fmt(sc) + ' / 5:00';
    }
    creds(reelT >= 278, reelT >= 296);
    if (reelT >= TOTAL) stopReel(true);
  }

  const p = reel ? Math.min(1, (reelT - ST[cur]) / ((ST[cur + 1] || TOTAL) - ST[cur])) : Math.sin(t * 0.1) * 0.5 + 0.5;
  const sh = SH[cur];
  const a = A[cur];
  const th = sh[0] + sh[1] * p;
  const r = L(sh[2], sh[3], p);
  const h = L(sh[4], sh[5], p);
  const hand = 0.18 + shake * 1.2;

  tp.set(
    a.x + Math.sin(th) * r + Math.sin(t * 0.7) * hand * 0.5 + m.x * 1.6,
    a.y + h + Math.cos(t * 0.9) * hand * 0.4 - m.y * 1.1,
    a.z + Math.cos(th) * r
  );

  C.position.lerp(tp, 1 - Math.exp(-dt * (warp > 0.2 ? 2.2 : 3.2)));
  C.position.x += (Math.random() - 0.5) * shake * 0.3;
  C.position.y += (Math.random() - 0.5) * shake * 0.3;

  look.lerp(a, 1 - Math.exp(-dt * 4));
  C.lookAt(look);
  C.rotateZ(Math.sin(t * 0.35) * 0.02 + shake * Math.sin(t * 40) * 0.01);

  C.fov += (sh[6] + warp * 14 + beat * 1.2 - C.fov) * Math.min(1, dt * 3);
  C.updateProjectionMatrix();

  objs.forEach((o, i) => {
    const on = i === cur;
    const u = o.userData.mat.uniforms;
    const s = on ? 1 + beat * 0.06 : 0.4;
    o.rotation.y = t * (0.2 + 0.04 * i) + i;
    o.rotation.x = t * 0.1;
    o.children[2].rotation.z = t * 0.4;
    o.scale.setScalar(o.scale.x + (s - o.scale.x) * Math.min(1, dt * 3));
    u.time.value = t;
    u.pulse.value = on ? beat * 1.2 : 0;
    o.children[3].material.opacity = on ? 0.45 + beat * 0.4 : 0.15;
  });

  gates.forEach((g, i) => {
    g.rotation.z = t * 0.1 * (i % 2 ? 1 : -1);
    g.material.opacity = 0.3 + beat * 0.3;
  });

  dust.rotation.y = t * 0.004;
  streak.visible = warp > 0.02;
  streak.material.opacity = Math.min(0.85, warp * 0.9);
  streak.scale.z = 1 + warp * 3.5;

  document.documentElement.style.setProperty('--bt', beat.toFixed(2));
  $('#lens').style.opacity = 0.2 + beat * 0.5 + warp * 0.4;
  $('#flash').style.opacity = flash;

  R.render(S, C);
}
requestAnimationFrame(loop);

/* ---------- navigation and reel ---------- */
const sceneImages = [
  'assets/img1.jpg',
  'assets/img2.jpg',
  'assets/img3.jpg',
  'assets/img4.jpg',
  'assets/img4.jpg',
  'assets/img5.jpg'
];
sceneImages.forEach(src => {
  const img = new Image();
  img.src = src;
});

const dots = $('#dots');
panels.forEach((_, i) => {
  const b = document.createElement('button');
  b.setAttribute('aria-label', 'Scene ' + (i + 1));
  b.onclick = () => manual(i);
  dots.appendChild(b);
});

const logo = $('.logo');
if (logo) {
  logo.style.cursor = 'pointer';
  logo.onclick = () => manual(0);
}

function go(i) {
  i = Math.max(0, Math.min(N - 1, i));
  const moved = i !== cur;
  if (!moved && panels[i].classList.contains('on')) return;
  cur = i;

  const sw = () => {
    panels.forEach((p, k) => p.classList.toggle('on', k === i));
    document.body.dataset.s = i;
    document.querySelectorAll('.nv').forEach(n => n.classList.toggle('on', +n.dataset.go === i));
    const pt = $('#pt');
    if (pt && sceneImages[i]) {
      pt.src = sceneImages[i];
    }
  };

  if (moved && started) {
    px();
    setTimeout(sw, 520);
  } else {
    sw();
  }

  [...dots.children].forEach((d, k) => d.classList.toggle('on', k === i));

  if (moved && started) {
    warp = 1;
    shake = 1;
    flash = 0.5;
    unfade();
    if (reel) card(ACT[i]);
    if (AC && AC.state === 'running') {
      const t = AC.currentTime + 0.04;
      impact(t);
      pad(i, t, 5);
      nt('sine', mtof(PR[i][0] + 24), t + 0.3, 1.5, 0.06, 4000, 0.01, 1.5, 0.8);
    }
  }
}

const PXE = $('#px');
for (let i = 0; i < 112; i++) {
  PXE.appendChild(document.createElement('i'));
}
const PX = [...PXE.children];

function px() {
  PX.forEach(c => {
    c.style.background = Math.random() < 0.12 ? '#f00' : '#000';
    c.style.transitionDelay = Math.random() * 0.25 + 's';
    c.style.opacity = 1;
  });
  setTimeout(() => {
    PX.forEach(c => {
      c.style.transitionDelay = Math.random() * 0.3 + 's';
      c.style.opacity = 0;
    });
  }, 560);
}

function card(t) {
  const c = $('#card');
  c.textContent = t;
  c.classList.remove('on');
  void c.offsetWidth;
  c.classList.add('on');
}

function creds(a, b) {
  $('#credits').classList.toggle('on', !!a);
  $('#fin').classList.toggle('on', !!b);
}

function opening() {
  $('#o1').textContent = 'Kakarla Rohith';
  $('#o2').textContent = 'presents';
  $('#open').classList.add('on');
  setTimeout(() => $('#open').classList.remove('on'), 2700);
}

function manual(i) {
  stopReel();
  creds(0, 0);
  go(i);
}

addEventListener('wheel', e => {
  if (!started || Date.now() < lockUntil || Math.abs(e.deltaY) < 20) return;
  lockUntil = Date.now() + 1200;
  manual(cur + (e.deltaY > 0 ? 1 : -1));
}, { passive: true });

addEventListener('keydown', e => {
  if (!started) return;
  if (['ArrowDown', 'ArrowRight', 'PageDown'].includes(e.key)) manual(cur + 1);
  if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) manual(cur - 1);
  if (e.key === ' ' && reel && document.activeElement.tagName !== 'BUTTON') {
    e.preventDefault();
    togglePause();
  }
});

let ty = 0;
addEventListener('touchstart', e => ty = e.touches[0].clientY, { passive: true });
addEventListener('touchend', e => {
  const d = ty - e.changedTouches[0].clientY;
  if (started && Math.abs(d) > 50) manual(cur + (d > 0 ? 1 : -1));
});

document.querySelectorAll('[data-go]').forEach(b => {
  b.onclick = () => manual(+b.dataset.go);
});

function startReel() {
  reel = true;
  paused = false;
  reelT = 0;
  riserDone = -1;
  lastSec = -1;
  unfade();
  document.body.classList.remove('pre');
  document.body.classList.add('reel');
  $('#tourBtn').textContent = 'Stop reel';
  go(0);
  creds(0, 0);
  card(ACT[0]);
}

function stopReel(end) {
  if (!reel) return;
  reel = false;
  document.body.classList.remove('reel');
  $('#tourBtn').textContent = 'Play 5-minute reel';
  $('#pauseBtn').textContent = 'Pause';
  if (paused) {
    paused = false;
    if (AC) AC.resume();
  }
  $('#fill').style.width = end ? '100%' : '0';
}

function togglePause() {
  if (!reel) return;
  paused = !paused;
  $('#pauseBtn').textContent = paused ? 'Resume' : 'Pause';
  if (AC) {
    if (paused) AC.suspend();
    else AC.resume();
  }
}

$('#tourBtn').onclick = () => reel ? (stopReel(), creds(0, 0)) : startReel();
$('#pauseBtn').onclick = togglePause;
$('#prog').onclick = e => {
  if (reel) {
    reelT = e.clientX / innerWidth * TOTAL;
    riserDone = -1;
  }
};

$('#mute').onclick = () => {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.7;
  $('#mute').textContent = muted ? 'Sound off' : 'Sound on';
};

function enter(snd, rl) {
  muted = !snd;
  $('#mute').textContent = muted ? 'Sound off' : 'Sound on';
  initAudio();
  started = true;
  $('#intro').classList.add('off');

  if (rl) {
    opening();
    if (AC) {
      const t = AC.currentTime;
      riser(t + 0.1, 2.4);
      impact(t + 2.5);
      pad(0, t + 2.5, 6);
    }
    setTimeout(startReel, 2550);
  } else {
    document.body.classList.remove('pre');
    if (AC) impact(AC.currentTime + 0.1);
    setTimeout(() => go(0), 900);
  }
}

$('#enter').onclick = () => enter(true, true);
$('#enterq').onclick = () => enter(false, true);
$('#enterf').onclick = () => enter(true, false);

