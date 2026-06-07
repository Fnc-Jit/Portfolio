/* === JITRAJ ESH PORTFOLIO — Cosmic Hero (Three.js + GSAP) === */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }     from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

/* ----------------------------------------------------------
   State
---------------------------------------------------------- */
// Initial camera pos — this is where the camera starts at scroll=0
const INIT = { x: 0, y: 30, z: 300 };

const S = {
  scene: null, camera: null, renderer: null, composer: null,
  stars: [], nebula: null, mountains: [], atmosphere: null,
  animId: null,
  mountainBaseZ: [],
  mountainLocs: [],
  // target and smooth both start at INIT so there's no jump on load
  target: { ...INIT },
  smooth: { ...INIT }
};

/* ----------------------------------------------------------
   Bootstrap
---------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  const canvas = buildCanvas();
  initRenderer(canvas);
  buildStarField();
  buildNebula();
  buildMountains();
  buildAtmosphere();
  renderLoop();
  initScroll();
  runGSAP();
  window.addEventListener('resize', onResize);
});

/* ----------------------------------------------------------
   Canvas — fixed full-viewport behind everything
---------------------------------------------------------- */
function buildCanvas() {
  const el = document.createElement('canvas');
  el.id = 'hero-three-canvas';
  Object.assign(el.style, {
    position: 'fixed',
    top: '0', left: '0',
    width: '100vw', height: '100vh',
    zIndex: '0',
    pointerEvents: 'none',
    display: 'block'
  });
  document.body.insertBefore(el, document.body.firstChild);
  return el;
}

/* ----------------------------------------------------------
   Renderer — alpha:true, body colour is the base
---------------------------------------------------------- */
function initRenderer(canvas) {
  S.scene = new THREE.Scene();
  S.scene.fog = new THREE.FogExp2(0x000000, 0.00025);

  S.camera = new THREE.PerspectiveCamera(
    75, window.innerWidth / window.innerHeight, 0.1, 2000
  );
  // Start at INIT position immediately — no jump
  S.camera.position.set(INIT.x, INIT.y, INIT.z);

  S.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  S.renderer.setSize(window.innerWidth, window.innerHeight);
  S.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  S.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  S.renderer.toneMappingExposure = 0.5;

  S.composer = new EffectComposer(S.renderer);
  S.composer.addPass(new RenderPass(S.scene, S.camera));
  S.composer.addPass(new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.8, 0.4, 0.85
  ));
}

/* ----------------------------------------------------------
   Star field (3 depth layers)
---------------------------------------------------------- */
function buildStarField() {
  for (let layer = 0; layer < 3; layer++) {
    const COUNT = 5000;
    const geo   = new THREE.BufferGeometry();
    const pos   = new Float32Array(COUNT * 3);
    const col   = new Float32Array(COUNT * 3);
    const sz    = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      const r     = 200 + Math.random() * 800;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(Math.random() * 2 - 1);
      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i*3+2] = r * Math.cos(phi);

      const c   = new THREE.Color();
      const rnd = Math.random();
      if      (rnd < 0.70) c.setHSL(0,    0,   0.8 + Math.random() * 0.2);
      else if (rnd < 0.90) c.setHSL(0.08, 0.5, 0.8);
      else                 c.setHSL(0.6,  0.5, 0.8);
      col[i*3] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b;
      sz[i] = Math.random() * 2 + 0.5;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
    geo.setAttribute('size',     new THREE.BufferAttribute(sz,  1));

    const mat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, depth: { value: layer } },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float time;
        uniform float depth;
        void main() {
          vColor = color;
          vec3 p = position;
          float a = time * 0.05 * (1.0 - depth * 0.3);
          mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
          p.xy = rot * p.xy;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = size * (300.0 / -mv.z);
          gl_Position  = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          gl_FragColor = vec4(vColor, 1.0 - smoothstep(0.0, 0.5, d));
        }
      `,
      transparent: true,
      blending:    THREE.AdditiveBlending,
      depthWrite:  false
    });

    S.stars.push(new THREE.Points(geo, mat));
    S.scene.add(S.stars[layer]);
  }
}

/* ----------------------------------------------------------
   Nebula
---------------------------------------------------------- */
function buildNebula() {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      time:    { value: 0 },
      color1:  { value: new THREE.Color(0x0033ff) },
      color2:  { value: new THREE.Color(0xff0066) },
      opacity: { value: 0.3 }
    },
    vertexShader: `
      varying vec2 vUv; varying float vElev; uniform float time;
      void main() {
        vUv = uv; vec3 p = position;
        vElev = sin(p.x*0.01+time)*cos(p.y*0.01+time)*20.0;
        p.z += vElev;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color1, color2; uniform float opacity, time;
      varying vec2 vUv; varying float vElev;
      void main() {
        float m = sin(vUv.x*10.0+time)*cos(vUv.y*10.0+time);
        vec3 c = mix(color1, color2, m*0.5+0.5);
        float a = opacity*(1.0-length(vUv-0.5)*2.0)*(1.0+vElev*0.01);
        gl_FragColor = vec4(c, clamp(a,0.0,1.0));
      }
    `,
    transparent: true, blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide, depthWrite: false
  });

  S.nebula = new THREE.Mesh(new THREE.PlaneGeometry(8000, 4000, 100, 100), mat);
  S.nebula.position.z = -1050;
  S.scene.add(S.nebula);
}

/* ----------------------------------------------------------
   Mountains
---------------------------------------------------------- */
function buildMountains() {
  const layers = [
    { z: -50,  h: 60,  color: 0x1a1a2e, opacity: 1   },
    { z: -100, h: 80,  color: 0x16213e, opacity: 0.8  },
    { z: -150, h: 100, color: 0x0f3460, opacity: 0.6  },
    { z: -200, h: 120, color: 0x0a4668, opacity: 0.4  }
  ];

  layers.forEach((layer, idx) => {
    const pts = [];
    for (let i = 0; i <= 50; i++) {
      const x = (i / 50 - 0.5) * 1000;
      const y = Math.sin(i * 0.1) * layer.h
              + Math.sin(i * 0.05) * layer.h * 0.5
              + Math.random() * layer.h * 0.2 - 100;
      pts.push(new THREE.Vector2(x, y));
    }
    pts.push(new THREE.Vector2( 5000, -300));
    pts.push(new THREE.Vector2(-5000, -300));

    const mesh = new THREE.Mesh(
      new THREE.ShapeGeometry(new THREE.Shape(pts)),
      new THREE.MeshBasicMaterial({
        color: layer.color, transparent: true,
        opacity: layer.opacity, side: THREE.DoubleSide
      })
    );
    mesh.position.z = layer.z;
    mesh.position.y = layer.z;
    mesh.userData = { baseZ: layer.z };
    S.scene.add(mesh);
    S.mountains.push(mesh);
    S.mountainBaseZ.push(layer.z);
  });

  // Store initial positions for scroll reset
  S.mountainLocs = S.mountains.map(m => m.position.z);
}

/* ----------------------------------------------------------
   Atmosphere glow
---------------------------------------------------------- */
function buildAtmosphere() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal; uniform float time;
      void main() {
        float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        vec3 atm = vec3(0.3, 0.6, 1.0) * intensity * (sin(time*2.0)*0.1+0.9);
        gl_FragColor = vec4(atm, intensity * 0.25);
      }
    `,
    side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true
  });
  S.atmosphere = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 32), mat);
  S.scene.add(S.atmosphere);
}

/* ----------------------------------------------------------
   Render loop — ultra-smooth camera interpolation
---------------------------------------------------------- */
function renderLoop() {
  S.animId = requestAnimationFrame(renderLoop);
  const t = Date.now() * 0.001;

  // Animate shaders
  S.stars.forEach(s => { s.material.uniforms.time.value = t; });
  if (S.nebula)     S.nebula.material.uniforms.time.value     = t * 0.5;
  if (S.atmosphere) S.atmosphere.material.uniforms.time.value = t;

  // Ultra-smooth camera interpolation (0.025 = very gentle)
  const sf = 0.025;
  S.smooth.x += (S.target.x - S.smooth.x) * sf;
  S.smooth.y += (S.target.y - S.smooth.y) * sf;
  S.smooth.z += (S.target.z - S.smooth.z) * sf;

  // Gentle floating motion
  const floatX = Math.sin(t * 0.1) * 2;
  const floatY = Math.cos(t * 0.15) * 1;

  S.camera.position.x = S.smooth.x + floatX;
  S.camera.position.y = S.smooth.y + floatY;
  S.camera.position.z = S.smooth.z;
  S.camera.lookAt(0, 10, -600);

  // Mountain parallax sway
  S.mountains.forEach((m, i) => {
    const pf = 1 + i * 0.5;
    m.position.x = Math.sin(t * 0.1) * 2 * pf;
    m.position.y = 50 + Math.cos(t * 0.15) * 1 * pf;
  });

  S.composer.render();
}

/* ----------------------------------------------------------
   Scroll → camera keyframes (full-page journey)
---------------------------------------------------------- */
function initScroll() {
  const CAM = [
    { x: 0, y: 30, z:  300 },   // top — hero
    { x: 0, y: 40, z:  -50 },   // mid — tiles
    { x: 0, y: 50, z: -700 }    // bottom — footer / deep space
  ];

  const SECTIONS = 2;

  function onScroll() {
    const scrollY   = window.scrollY;
    const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const progress  = Math.min(Math.max(scrollY / maxScroll, 0), 1);

    // Interpolate across 3 keyframes
    const raw  = progress * SECTIONS;
    const seg  = Math.min(Math.floor(raw), SECTIONS - 1);
    const frac = raw - seg;   // use subtraction, not modulo, to avoid float issues
    const cur  = CAM[seg];
    const next = CAM[seg + 1] || cur;

    S.target.x = cur.x + (next.x - cur.x) * frac;
    S.target.y = cur.y + (next.y - cur.y) * frac;
    S.target.z = cur.z + (next.z - cur.z) * frac;

    // Mountains & nebula scroll behaviour
    S.mountains.forEach((m, i) => {
      const speed   = 1 + i * 0.9;
      const targetZ = S.mountainLocs[i] + scrollY * speed * 0.5;

      if (S.nebula) S.nebula.position.z = (targetZ + progress * speed * 0.01) - 100;

      // Mountains disappear when scrolled past 70%
      m.position.z = progress > 0.7 ? 600000 : S.mountainLocs[i];
    });

    if (S.nebula && S.mountains[3]) {
      S.nebula.position.z = S.mountains[3].position.z;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  // Fire immediately to set correct position at page load
  onScroll();
}

/* ----------------------------------------------------------
   GSAP entrance
---------------------------------------------------------- */
function runGSAP() {
  const gsap = window.gsap;
  if (!gsap) return;

  const els = [
    document.querySelector('.hero-badge'),
    document.querySelector('.hero-title'),
    document.querySelector('.hero-sub'),
    document.querySelector('.hero-btns'),
    document.querySelector('.hero-stats'),
    document.querySelector('.scroll-indicator')
  ];

  els.forEach(el => { if (el) gsap.set(el, { opacity: 0, y: 30 }); });

  const tl = gsap.timeline({ delay: 0.4 });
  if (els[0]) tl.to(els[0], { opacity: 1, y: 0, duration: 0.9,  ease: 'power3.out' });
  if (els[1]) tl.to(els[1], { opacity: 1, y: 0, duration: 1.2,  ease: 'power4.out' }, '-=0.5');
  if (els[2]) tl.to(els[2], { opacity: 1, y: 0, duration: 0.9,  ease: 'power3.out' }, '-=0.6');
  if (els[3]) tl.to(els[3], { opacity: 1, y: 0, duration: 0.8,  ease: 'power3.out' }, '-=0.5');
  if (els[4]) tl.to(els[4], { opacity: 1, y: 0, duration: 0.7,  ease: 'power2.out' }, '-=0.45');
  if (els[5]) tl.to(els[5], { opacity: 1, y: 0, duration: 0.6,  ease: 'power2.out' }, '-=0.2');
}

/* ----------------------------------------------------------
   Resize
---------------------------------------------------------- */
function onResize() {
  if (!S.camera || !S.renderer || !S.composer) return;
  S.camera.aspect = window.innerWidth / window.innerHeight;
  S.camera.updateProjectionMatrix();
  S.renderer.setSize(window.innerWidth, window.innerHeight);
  S.composer.setSize(window.innerWidth, window.innerHeight);
}
