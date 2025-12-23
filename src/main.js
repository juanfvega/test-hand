import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Draggable } from 'gsap/Draggable';
import './style.css';

gsap.registerPlugin(ScrollTrigger, Draggable);

// 1. VISOR 3D (HERO SECTION)
// ==========================================

const canvasContainer = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x270315); // --illusion-950

// 2. Camera
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(10.53, -0.25, 30.43); // Adjusted for distance: 32.2
scene.add(camera);

// 3. Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
canvasContainer.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enableZoom = false;   // Disable zoom
controls.enablePan = false;    // Disable pan
controls.enableRotate = false; // Disable rotation (Lock view)

// ==========================================
// DEBUG UI: Camera Info & Zoom
// ==========================================
const debugUI = document.createElement('div');
debugUI.style.position = 'absolute';
debugUI.style.top = '10px';
debugUI.style.left = '10px';
debugUI.style.color = 'lime';
debugUI.style.backgroundColor = 'rgba(0,0,0,0.5)';
debugUI.style.padding = '5px 10px';
debugUI.style.fontFamily = 'monospace';
debugUI.style.fontSize = '12px';
debugUI.style.pointerEvents = 'none';
debugUI.style.zIndex = '1000';
document.body.appendChild(debugUI);

function updateDebugInfo() {
  const distance = camera.position.distanceTo(controls.target);
  debugUI.innerHTML = `
        <strong>Camera Debug</strong><br>
        x: ${camera.position.x.toFixed(2)}<br>
        y: ${camera.position.y.toFixed(2)}<br>
        z: ${camera.position.z.toFixed(2)}<br>
        Zoom (Dist): ${distance.toFixed(2)}
    `;
}

controls.addEventListener('change', updateDebugInfo);
updateDebugInfo();

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 2);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 3);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);

// Model
let nailsMesh = null;
let modelGroup = null;

// Placeholder Function
function createPlaceholderHand() {
  const group = new THREE.Group();
  const fingerGeo = new THREE.CapsuleGeometry(0.5, 3, 4, 8);
  const material = new THREE.MeshStandardMaterial({ color: 0xffccaa });

  for (let i = 0; i < 5; i++) {
    const finger = new THREE.Mesh(fingerGeo, material);
    finger.position.x = (i - 2) * 1.5;
    finger.position.y = Math.sin(i) * 0.5;

    // Add nail
    const nailGeo = new THREE.CapsuleGeometry(0.4, 0.5, 4, 8);
    const nailMat = new THREE.MeshStandardMaterial({ color: 0xe43493 });
    const nail = new THREE.Mesh(nailGeo, nailMat);
    nail.position.y = 1.6;
    nail.position.z = 0.3;
    nail.scale.set(1, 0.5, 0.2);
    nail.name = `Nail_${i}`;

    finger.add(nail);
    group.add(finger);

    if (i === 2) nailsMesh = nail; // Assign one nail for color picker logic
  }
  return group;
}

const loader = new GLTFLoader();
loader.load('/hand.glb', (gltf) => {
  modelGroup = gltf.scene;
  scene.add(modelGroup);

  modelGroup.position.set(5, -1, 0);
  modelGroup.rotation.y = -Math.PI / 2;
  modelGroup.scale.set(3, 3, 3);

  modelGroup.traverse((child) => {
    if (child.isMesh) {
      // Create a high-quality material foundation
      const baseMaterialProps = {
        metalness: 0,
        roughness: 0.5,
      };

      const name = child.name.toLowerCase();
      // Check both own name and parent name to handle Group/Mesh content
      const parentName = child.parent ? child.parent.name.toLowerCase() : '';

      if (name.includes('nails') || parentName.includes('nails')) {
        nailsMesh = child;
        // Use a specific material for nails to allow color changing
        nailsMesh.material = new THREE.MeshStandardMaterial({
          ...baseMaterialProps,
          color: 0xe43493, // Initial pink color
          roughness: 0.1,   // Shinier for nails
          metalness: 0.3
        });
      } else if (name.includes('hands') || name.includes('hand') || parentName.includes('hands') || parentName.includes('hand')) {
        // Apply skin color
        child.material = new THREE.MeshStandardMaterial({
          ...baseMaterialProps,
          color: 0xffccaa, // Skin tone
          roughness: 0.6
        });
      }
    }
  });

  console.log("Modelo hand.glb cargado correctamente.");

}, undefined, (error) => {
  console.warn("Error cargando hand.glb", error);
  // Fallback to placeholder
  modelGroup = createPlaceholderHand();
  scene.add(modelGroup);
  modelGroup.position.set(5, 0, 0);
  modelGroup.scale.set(2, 2, 2);
  modelGroup.rotation.y = -Math.PI / 2;
});

// Color Picker Logic
const colorPicker = document.getElementById('colorPicker');
if (colorPicker) {
  colorPicker.addEventListener('input', (e) => {
    const color = e.target.value;

    // Strategy: Traverse the modelGroup and update anything identifying as a nail.
    // This covers both the placeholder (multiple Nail_x meshes) and the imported OBJ (Nails mesh).
    if (modelGroup) {
      modelGroup.traverse((child) => {
        if (child.isMesh) {
          const name = child.name.toLowerCase();
          const parentName = child.parent ? child.parent.name.toLowerCase() : '';

          if (name.includes('nail') || parentName.includes('nail')) {
            // Determine if we need to update a single material or an array
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.color.set(color));
            } else {
              child.material.color.set(color);
            }
          }
        }
      });
    }
  });
}

// Animation
function animate() {
  requestAnimationFrame(animate);
  controls.update();

  if (modelGroup) {
    modelGroup.rotation.y = -Math.PI / 2 + Math.sin(Date.now() * 0.0005) * 0.2;
    modelGroup.position.y = -1 + Math.sin(Date.now() * 0.0005) * 0.02;
  }

  renderer.render(scene, camera);
}
animate();

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);

  if (modelGroup) {
    if (window.innerWidth < 768) {
      modelGroup.position.set(0, -3, 0);
      modelGroup.scale.set(2.5, 2.5, 2.5);
    } else {
      modelGroup.position.set(2, -2, 0);
      modelGroup.scale.set(3, 3, 3);
    }
  }
});


// ==========================================
// GSAP CAROUSEL (Services / Transformations)
// ==========================================
// Animación simple de entrada para las cards

const serviceCards = document.querySelectorAll('.service-grid .card');
if (serviceCards.length > 0) {
  gsap.from(serviceCards, {
    duration: 1,
    y: 50,
    opacity: 0,
    stagger: 0,
    ease: "power3.out",
    scrollTrigger: {
      trigger: ".service-grid",
      start: "top 80%",
    }
  });
}

// ==========================================
// INFINITE GALLERY CAROUSEL
// ==========================================

// 1. Setup Helper Functions & Spacing
const spacing = 0.1; // Space between cards (relative to loop duration)
const cards = gsap.utils.toArray('.cards li');

// Ensure correct initial z-index and positions
gsap.set(cards, { xPercent: 400, opacity: 0, scale: 0 });

// 2. Build the Loop Timeline
const loopTimeline = buildSeamlessLoop(cards, spacing, (element) => {
  // Animation for a single card entering and leaving the active area
  const tl = gsap.timeline();
  tl.fromTo(element,
    { scale: 0, opacity: 0 },
    { scale: 1, opacity: 1, zIndex: 100, duration: 0.5, yoyo: true, repeat: 1, ease: "power1.in", immediateRender: false }
  )
    .fromTo(element,
      { xPercent: 400 },
      { xPercent: -400, duration: 1, ease: "none", immediateRender: false },
      0
    );
  return tl;
});

// 3. Auto-Play Logic
// We animate the 'totalTime' of the loopTimeline continuously
const autoPlay = gsap.to(loopTimeline, {
  totalTime: loopTimeline.duration() + 100, // Move forward indefinitely
  duration: 7000, // Speed set to 7000 as requested
  ease: "none",
  repeat: -1,
});

// 4. Draggable Integration (Decoupled from Page Scroll)
Draggable.create(".drag-proxy", {
  type: "x",
  trigger: ".cards",
  onPress() {
    // Pause auto-play while dragging
    autoPlay.pause();
    this.startTotalTime = loopTimeline.totalTime();
  },
  onDrag() {
    // Map drag distance to timeline progress
    // Drag Left (negative) -> Advancing Time (positive)
    const sensitivity = 0.005;
    const dragDelta = (this.startX - this.x) * sensitivity;
    loopTimeline.totalTime(this.startTotalTime + dragDelta);
  },
  onDragEnd() {
    // Resume auto-play from the new position
    // We need to re-create the tween to continue smoothly from current totalTime
    const currentTotalTime = loopTimeline.totalTime();

    autoPlay.vars.totalTime = currentTotalTime + 100;
    autoPlay.invalidate().restart();
  }
});

// 5. Seamless Loop Builder
function buildSeamlessLoop(items, spacing, animateFunc) {
  let overlap = Math.ceil(1 / spacing),
    startTime = items.length * spacing + 0.5,
    loopTime = (items.length + overlap) * spacing + 1,
    rawSequence = gsap.timeline({ paused: true }),
    // Note: repeat: -1 is fine here because we scrub totalTime which handles the wrapping logic internally if we go far enough,
    // but for a driven scrub, we just want it to be long enough.
    seamlessLoop = gsap.timeline({
      paused: true,
      repeat: -1,
      onRepeat() {
        this._time === this._dur && (this._tTime += this._dur - 0.01);
      }
    }),
    l = items.length + overlap * 2,
    time, i, index;

  // Build the raw sequence of animations
  for (i = 0; i < l; i++) {
    index = i % items.length;
    time = i * spacing;
    rawSequence.add(animateFunc(items[index]), time);
    i <= items.length && seamlessLoop.add("label" + i, time);
  }

  // Set up the seamless loop structure
  rawSequence.time(startTime);
  seamlessLoop.to(rawSequence, {
    time: loopTime,
    duration: loopTime - startTime,
    ease: "none"
  }).fromTo(rawSequence, { time: overlap * spacing + 1 }, {
    time: startTime,
    duration: startTime - (overlap * spacing + 1),
    immediateRender: false,
    ease: "none"
  });

  return seamlessLoop;
}

// 6. Next/Prev Buttons (Optional - Map to Scroll)
const nextBtn = document.querySelector(".next");
const prevBtn = document.querySelector(".prev");

if (nextBtn) {
  nextBtn.addEventListener("click", () => {
    // Scroll down a bit to advance carousel
    window.scrollBy({ top: window.innerHeight * 0.5, behavior: 'smooth' });
  });
}

if (prevBtn) {
  prevBtn.addEventListener("click", () => {
    // Scroll up a bit
    window.scrollBy({ top: -window.innerHeight * 0.5, behavior: 'smooth' });
  });
}
