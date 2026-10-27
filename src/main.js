import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import './style.css';
import { createTileWorld } from './tiles/TileWorld.js';

const $ = id => document.getElementById(id);
const root = $('scene');
const game = $('game');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9bc7e0);
scene.fog = new THREE.Fog(0x9bc7e0, 100, 420);

const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 700);

// Free camera controls
const freeCam = {
  enabled: false,
  speed: 18,
  keys: new Set(),
  yaw: 0,
  pitch: 0,
  sensitivity: 0.0025,
  dragging: false,
  lastX: 0,
  lastY: 0
};

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'low-power'
});

renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
root.appendChild(renderer.domElement);
// 3D Tiles world — disabled until a tileset URL is configured.
const TILESET_URL =
  'https://api.plateauview.mlit.go.jp/datacatalog/3dtiles/13101-bldg-lod1-latest/tileset.json';

let tileWorld = null;

if (TILESET_URL) {
  tileWorld = createTileWorld({
    scene,
    camera,
    renderer,
    url: TILESET_URL,
  });
}

scene.add(new THREE.HemisphereLight(0xd9efff, 0x647452, 2));

const sunlight = new THREE.DirectionalLight(0xfff0d5, 2);
sunlight.position.set(-30, 60, -20);
scene.add(sunlight);

function mat(color, roughness = 0.9) {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

function box(parent, size, position, material) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...size), material
  );
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

const grass = mat(0x77956a);
const ballast = mat(0x777c7c);
const sleeperMat = mat(0x52483e);
const railMat = mat(0xb8c3c9, 0.35);
const trainMat = mat(0xdfe8ed, 0.45);
const redMat = mat(0xd52d42, 0.45);
const windowMat = mat(0x31546a, 0.35);
const platformMat = mat(0xb5b4a9);
const yellowMat = mat(0xffd447);
const buildingMats = [
  mat(0xc6b9a3), mat(0xd7d9d4),
  mat(0xb8c7ce), mat(0xd0b9a8),
  mat(0xaaaeb5)
];

// Ground and track — dimensions in metres
box(scene, [200, 0.5, 850], [0, -0.5, 300], grass);

// Ballast bed
box(scene, [3.0, 0.22, 850], [0, -0.18, 300], ballast);

// Japanese 1,067 mm gauge
// Rail width is 0.14 m, so centres are 0.6035 m from the track centre.
for (const x of [-0.6035, 0.6035]) {
  box(scene, [0.14, 0.16, 850], [x, 0, 300], railMat);
}

// Sleepers: 2.4 m long, spaced every 0.6 m
for (let z = -120; z < 730; z += 0.6) {
  box(scene, [2.4, 0.16, 0.34], [0, -0.02, z], sleeperMat);
}

// Overhead railway electrification — dimensions in metres
const poleMat = new THREE.MeshStandardMaterial({
  color: 0x555b60,
  metalness: 0.65,
  roughness: 0.45
});

const wireMat = new THREE.MeshStandardMaterial({
  color: 0x292d31,
  metalness: 0.55,
  roughness: 0.4
});

// Create a cylinder between two 3D points
function addWireSegment(start, end, radius, material) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const direction = new THREE.Vector3().subVectors(b, a);
  const length = direction.length();

  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, 6),
    material
  );

  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize()
  );

  scene.add(mesh);
}

// Support poles and crossarms along the route
for (let z = -100; z < 700; z += 30) {
  for (const x of [-3.2, 3.2]) {
    // Vertical support pole
    box(scene, [0.12, 6.5, 0.12], [x, 3.25, z], poleMat);

    // Crossarm reaches over the railway
    box(scene, [2.8, 0.10, 0.10], [x < 0 ? -1.8 : 1.8, 6.2, z], poleMat);
  }

  // Contact wire above the track
  addWireSegment(
    [0, 5.5, z],
    [0, 5.5, z + 30],
    0.025,
    wireMat
  );

  // Supporting cross-route wire
  addWireSegment(
    [-3.2, 6.2, z],
    [3.2, 6.2, z],
    0.035,
    wireMat
  );
}

// Buildings and trees
for (let z = -25; z < 650; z += 19) {
  for (const side of [-1, 1]) {
    const width = 5 + Math.random() * 6;
    const height = 5 + Math.random() * 17;
    const depth = 8 + Math.random() * 7;
    const building = new THREE.Group();

    building.position.set(
      side * (9 + Math.random() * 8), 0, z + Math.random() * 8
    );
    scene.add(building);

    box(building, [width, height, depth],
      [0, height / 2, 0],
      buildingMats[Math.floor(Math.random() * buildingMats.length)]);

    box(building, [width + 0.3, 0.35, depth + 0.3],
      [0, height + 0.15, 0], mat(0x565d65));

    for (let floor = 0; floor < Math.floor(height / 3); floor++) {
      for (const wx of [-0.28, 0.28]) {
        box(building, [0.65, 0.85, 0.06],
          [wx * width, 1.5 + floor * 2.5, side * (depth / 2 + 0.04)],
          windowMat);
      }
    }
  }

  for (const side of [-1, 1]) {
    const tree = new THREE.Group();
    tree.position.set(side * 6.5, 0, z + 8);
    scene.add(tree);
    box(tree, [0.45, 2, 0.45], [0, 1, 0], mat(0x66503a));

    const leaves = new THREE.Mesh(
      new THREE.ConeGeometry(1.6, 4, 7), mat(0x386b4a)
    );
    leaves.position.y = 3.4;
    tree.add(leaves);
  }
}

// Route and stations
const stations = [
  { name: 'Tokyo ', position: 150 },
  { name: 'Kanda', position: 320 },
  { name: 'Akihabara', position: 480 }
];

const safetyTargets = [
  {
    name: 'Signal ahead',
    call: 'Signal green',
    position: 75,
    type: 'signal'
  },
  {
    name: 'Tokyo marker',
    call: 'Stop marker confirmed',
    position: 150,
    type: 'station'
  },
  {
    name: 'Kanda marker',
    call: 'Stop marker confirmed',
    position: 320,
    type: 'station'
  },
  {
    name: 'Akihabara marker',
    call: 'Stop marker confirmed',
    position: 480,
    type: 'station'
  }
];

let safetyTargetIndex = 0;
let safetyScore = 0;
let safetyFeedback = 'Press C when a target is near';
let safetyPointed = false;

// Floating marker above the next safety-check target
const safetyMarker = new THREE.Group();
const markerRing = new THREE.Mesh(
  new THREE.TorusGeometry(1.1, 0.12, 8, 20),
  new THREE.MeshBasicMaterial({ color: 0xffd447 })
);
markerRing.rotation.x = Math.PI / 2;
safetyMarker.add(markerRing);

const markerArrow = new THREE.Mesh(
  new THREE.ConeGeometry(0.55, 1.2, 8),
  new THREE.MeshBasicMaterial({ color: 0xffd447 })
);
markerArrow.position.y = -1.1;
safetyMarker.add(markerArrow);

scene.add(safetyMarker);

const difficulties = {
  Easy:   { tolerance: 8,   timetable: 30, guidance: true },
  Normal: { tolerance: 5,   timetable: 15, guidance: true },
  Medium: { tolerance: 3,   timetable: 8,  guidance: false },
  Hard:   { tolerance: 1.5, timetable: 3,  guidance: false }
};

const route = { speedLimit: 22.22, terminal: 500 };

for (const station of stations) {
  const z = station.position;
  const platformLength = 42;

  // Platforms on both sides of the track
  for (const side of [-1, 1]) {
    box(scene, [3, 0.48, platformLength],
      [side * 4.1, 0.12, z], platformMat);

    // Yellow platform edge
    box(scene, [0.13, 0.035, platformLength],
      [side * 2.75, 0.38, z], yellowMat);

    // Station shelter
    box(scene, [2.5, 0.18, 9],
      [side * 5, 3.1, z - 8], mat(0x4b5963));

    for (const dz of [-11.5, -4.5]) {
      box(scene, [0.15, 3, 0.15],
        [side * 5, 1.6, z + dz], railMat);
    }
  }

  // Stop marker across the track
  box(scene, [3.8, 0.06, 0.45],
    [0, 0.16, z], yellowMat);

  // Station name sign
  box(scene, [4.8, 1.2, 0.2],
    [0, 5, z - 25], mat(0x244b61));
}

// Signal
const signal = new THREE.Group();
signal.position.set(3.2, 0, 75);
scene.add(signal);
box(signal, [0.16, 4.5, 0.16], [0, 2.25, 0], railMat);
box(signal, [0.9, 1.5, 0.35], [0, 4.3, 0], mat(0x263039));

const signalLight = new THREE.Mesh(
  new THREE.SphereGeometry(0.23, 12, 8),
  new THREE.MeshBasicMaterial({ color: 0x38e878 })
);
signalLight.position.set(0, 4.55, 0.2);
signal.add(signalLight);

 // Train model — Yamanote Line E235

 // Custom SketchUp train model
const train = new THREE.Group();
scene.add(train);

const loader = new GLTFLoader();

loader.load(
  '/models/yamanote-e235.glb',
  (gltf) => {
const model = gltf.scene;

// Provisional scale: approximately 1 Three.js unit per metre.
model.scale.setScalar(0.94);
model.position.set(0, 0, 0);

// Measure the scaled model before aligning it.
model.updateMatrixWorld(true);

const box = new THREE.Box3().setFromObject(model);
const size = box.getSize(new THREE.Vector3());
const centre = box.getCenter(new THREE.Vector3());

// Centre the train on the track and put its lowest point at ground level.
model.position.set(
  -centre.x,
  -box.min.y,
  -centre.z
);

model.updateMatrixWorld(true);

console.log('Train dimensions after provisional scaling:', {
  width: size.x.toFixed(3),
  height: size.y.toFixed(3),
  length: size.z.toFixed(3)
});

    train.add(model);
    console.log('Custom train model loaded!');
  },
  (progress) => {
    if (progress.total > 0) {
      console.log(
        `Train loading: ${Math.round(
          progress.loaded / progress.total * 100
        )}%`
      );
    }
  },
  (error) => {
    console.error('Could not load custom train:', error);
  }
);


// Add difficulty selector to the existing header
const difficultyControl = document.createElement('label');
difficultyControl.className = 'difficulty-control';
difficultyControl.innerHTML = `
  <span>DIFFICULTY</span>
  <select id="difficulty">
    <option>Easy</option>
    <option selected>Normal</option>
    <option>Medium</option>
    <option>Hard</option>
  </select>
`;
document.querySelector('.topbar').appendChild(difficultyControl);

// Add a challenge panel
const challengeInfo = document.createElement('div');
challengeInfo.id = 'challenge-info';
challengeInfo.innerHTML = `
  <strong id="target-name">NEXT STOP: MIDORI</strong>
  <span id="target-distance">150 m remaining</span>
  <span id="brake-advice">Braking guidance</span>
  <span id="score-display">SCORE: 0</span>
`;
game.appendChild(challengeInfo);
const safetyPanel = document.createElement('div');
safetyPanel.id = 'safety-panel';
safetyPanel.innerHTML = `
  <strong>SHISA KANKO</strong>
  <span id="safety-target">Next: Signal ahead</span>
  <span id="safety-feedback">Q: Point · C: Call</span>
  <span id="safety-score">Safety points: 0</span>
`;
game.appendChild(safetyPanel);

// Driving state
const state = {
  position: 0,
  speed: 0,
  power: 0,
  brake: 0,
  emergency: false,
  stationIndex: 0,
  awaitingDeparture: false,
  elapsed: 0,
  overspeedSeconds: 0,
  scores: [],
  message: 'READY · Increase power to depart'
};


/* Overspeed warning: low-frequency bass rumble */
let overspeedAudio = null;
let overspeedOscillator = null;
let overspeedGain = null;
let autoOverspeedBrake = false;
let autoOverspeedAppliedBrake = false;

function startOverspeedAudio() {
  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) return;

  if (!overspeedAudio) {
    overspeedAudio = new AudioContextClass();

    overspeedOscillator = overspeedAudio.createOscillator();
    overspeedGain = overspeedAudio.createGain();

    // Low bass tone; headphones may reproduce it more clearly.
    overspeedOscillator.type = 'sine';
    overspeedOscillator.frequency.value = 160;

    overspeedGain.gain.value = 0;

    overspeedOscillator.connect(overspeedGain);
    overspeedGain.connect(overspeedAudio.destination);
    overspeedOscillator.start();
  }

  if (overspeedAudio.state === 'suspended') {
    overspeedAudio.resume();
  }
}

game.addEventListener('pointerdown', startOverspeedAudio);

function updateOverspeedAudio(isOverspeed) {
  if (!overspeedAudio || !overspeedGain) return;

  const now = overspeedAudio.currentTime;
  const targetVolume = isOverspeed ? 25 : 0;

  overspeedGain.gain.cancelScheduledValues(now);
  overspeedGain.gain.setTargetAtTime(
    targetVolume,
    now,
    0.8
  );
}

function setPower(value) {
  if (state.awaitingDeparture) return;
  state.power = THREE.MathUtils.clamp(value, 0, 3);
  state.emergency = false;
}

function setBrake(value) {
  state.brake = THREE.MathUtils.clamp(value, 0, 3);
  state.emergency = false;
  if (state.brake > 0) state.power = 0;
}

function currentDifficulty() {
  return difficulties[$('difficulty').value];
}

function scoreStation(station, missed = false) {
  const difficulty = currentDifficulty();
  const error = Math.abs(state.position - station.position);

  const accuracy = missed
    ? 0
    : Math.max(0, 50 * (1 - error / difficulty.tolerance));

  const scheduledTime = station.position / 12;
  const lateness = Math.abs(state.elapsed - scheduledTime);
  const punctuality = Math.max(
    0, 25 * (1 - lateness / difficulty.timetable)
  );

  const safety = Math.max(0, 25 - state.overspeedSeconds * 2);
  const total = missed ? 0 : Math.round(accuracy + punctuality + safety);

  state.scores.push(total);

  state.message = missed
    ? `MISSED ${station.name} · 0 POINTS`
    : `${station.name} · ${total}/100 POINTS`;

  return total;
}

// Main reservoir pressure simulation
let mainReservoirPressure = 870;
let mrRecoveryStartPressure = 870;
let mrRecoveryStartTime = 0;
let mrRecoveryDuration = 20000;

let previousBrakeLevel = 0;
let previousEmergencyState = false;

function updateHUD() {
  const kmh = state.speed * 3.6;
  const gaugeSpeed = Math.max(0, Math.min(120, kmh));

// Brake air-pressure gauge
// Main reservoir pressure: drops when braking.
const now = performance.now();

const brakeApplied =
  state.brake > previousBrakeLevel ||
  (state.emergency && !previousEmergencyState);

if (brakeApplied) {
  const pressureDrop = 5 + Math.random() * 10;

  mainReservoirPressure = Math.max(
    0,
    mainReservoirPressure - pressureDrop
  );

  mrRecoveryStartPressure = mainReservoirPressure;
  mrRecoveryStartTime = now;
  mrRecoveryDuration = 10000 + Math.random() * 20000;
}

previousBrakeLevel = state.brake;
previousEmergencyState = state.emergency;

// Recover smoothly to 870 kPa.
if (mainReservoirPressure < 870) {
  const elapsed = now - mrRecoveryStartTime;
  const progress = Math.min(1, elapsed / mrRecoveryDuration);

  mainReservoirPressure =
    mrRecoveryStartPressure +
    (870 - mrRecoveryStartPressure) * progress;
}

const mrPressure = mainReservoirPressure;
  // Brake cylinder pressure targets (kPa).
  const brakeTargets = [0, 40, 85, 135];

  // Regenerative braking takes priority above 20 km/h.
  const regenerativePriority = state.speed * 3.6 > 20;

  const bcPressure = state.emergency
    ? 475
    : regenerativePriority
      ? 0
      : brakeTargets[state.brake] ?? 0;

  // Both needles use the new 0–1000 kPa dial scale.
const mrAngle = 240 + (mrPressure / 1000) * 240;
const bcAngle = 240 + (bcPressure / 1000) * 240;

  const mrNeedle = $('mr-needle');
  const bcNeedle = $('bc-needle');

  if (mrNeedle) {
    mrNeedle.setAttribute(
      'transform',
      `rotate(${mrAngle} 80 76)`
    );
  }

  if (bcNeedle) {
    bcNeedle.setAttribute(
      'transform',
      `rotate(${bcAngle} 80 76)`
    );
  }

  if ($('mr-pressure-value')) {
    $('mr-pressure-value').textContent = mrPressure;
  }

  if ($('bc-pressure-value')) {
    $('bc-pressure-value').textContent = bcPressure;
  }

const needleAngle = -135 + (gaugeSpeed / 120) * 270;

$('speed-needle').setAttribute(
  'transform',
  `rotate(${needleAngle} 100 100)`
);

$('gauge-digital-speed').textContent = Math.round(kmh);

const limitKmh = route.speedLimit * 3.6;
$('speed-limit').textContent = Math.round(limitKmh);

document.querySelector('.speed-limit-sign')?.classList.toggle(
  'overspeed',
  kmh > limitKmh + 0.5
);

  const station = stations[state.stationIndex];
  const distance = station
    ? station.position - state.position
    : 0;

  $('distance').textContent =
    `${Math.round(state.position)} m`;

  $('power-value').textContent =
    state.power === 0 ? 'N' : `P${state.power}`;

  $('brake-value').textContent =
    state.emergency ? 'EB' : state.brake;

document.querySelectorAll('.notch-option').forEach(button => {
  const mode = button.dataset.mode;
  const notch = Number(button.dataset.notch);

  const active =
    (mode === 'power' && state.power === notch) ||
    (mode === 'neutral' && state.power === 0 &&
      state.brake === 0 && !state.emergency) ||
    (mode === 'brake' && state.power === 0 &&
      state.brake === notch) ||
    (mode === 'brake' && notch === 4 && state.emergency);

  button.classList.toggle('active', active);
});

  const totalScore = state.scores.length
    ? Math.round(state.scores.reduce((a, b) => a + b, 0)
        / state.scores.length)
    : 0;

  $('score-display').textContent = `AVERAGE SCORE: ${totalScore}`;

  if (station) {
    $('target-name').textContent = `NEXT STOP: ${station.name}`;
    $('target-distance').textContent =
      `${Math.round(Math.max(0, distance))} m remaining`;

    const brakingDistance = state.speed * state.speed / (2 * 0.8);
    const advice = currentDifficulty().guidance
      ? `Ideal braking estimate: ${Math.round(brakingDistance)} m`
      : 'Manage your own braking';

    $('brake-advice').textContent = state.awaitingDeparture
      ? 'STOP COMPLETE · Press E to depart'
      : advice;
  } else {
    $('target-name').textContent = 'ROUTE COMPLETE';
    $('target-distance').textContent = 'All stations processed';
    $('brake-advice').textContent = 'Reset to drive again';
  }

  if (state.emergency) {
    state.message = 'EMERGENCY BRAKE APPLIED';
  } else if (kmh > route.speedLimit * 3.6 + 0.5) {
    state.message = 'OVERSPEED — REDUCE SPEED';
  } else if (state.awaitingDeparture) {
    state.message = `${station?.name} · Press E to depart`;
  }

  $('message').textContent = state.message;

const safetyTarget = safetyTargets[safetyTargetIndex];

$('safety-target').textContent = safetyTarget
  ? `Check: ${safetyTarget.name} · ${Math.round(safetyTarget.position - state.position)} m`
  : 'All safety checks completed';

$('safety-feedback').textContent = safetyFeedback;
$('safety-score').textContent = `Safety points: ${safetyScore}`;
}

// Vertical notched controller
document.querySelectorAll('.notch-option').forEach(button => {
  button.addEventListener('click', () => {
    const mode = button.dataset.mode;
    const notch = Number(button.dataset.notch);

    if (mode === 'power') {
      setBrake(0);
      setPower(notch);
    } else if (mode === 'neutral') {
      setPower(0);
      setBrake(0);
    } else if (mode === 'brake' && notch >= 1 && notch <= 3) {
    setPower(0);
    setBrake(notch);
    }
  });
});

function resetRun() {
  state.position = 0;
  state.speed = 0;
  state.power = 0;
  state.brake = 0;
  state.emergency = false;
  state.stationIndex = 0;
  state.awaitingDeparture = false;
  state.elapsed = 0;
  state.overspeedSeconds = 0;
  state.scores = [];
  state.message = 'READY · Increase power to depart';
}

$('reset').addEventListener('click', resetRun);

// Free camera: P toggles it; WASD moves; right mouse looks around.
function toggleFreeCam() {
  freeCam.enabled = !freeCam.enabled;
  freeCam.keys.clear();
  freeCam.dragging = false;

  if (freeCam.enabled) {
    // Start looking in the direction the camera currently faces.
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    freeCam.yaw = Math.atan2(direction.x, -direction.z);
    freeCam.pitch = Math.asin(
      THREE.MathUtils.clamp(direction.y, -1, 1)
    );

    game.classList.add('free-camera-active');
    state.message = 'FREE CAMERA · WASD move · Right-click drag to look · P to exit';
  } else {
    game.classList.remove('free-camera-active');
    state.message = 'DRIVING CAMERA RESTORED';
  }
}

function updateFreeCam(dt) {
  if (!freeCam.enabled) return;

  const forward = new THREE.Vector3(
    -Math.sin(freeCam.yaw),
    0,
    -Math.cos(freeCam.yaw)
  );

  const right = new THREE.Vector3(
    Math.cos(freeCam.yaw),
    0,
    -Math.sin(freeCam.yaw)
  );

  const movement = new THREE.Vector3();

  if (freeCam.keys.has('KeyW')) movement.add(forward);
  if (freeCam.keys.has('KeyS')) movement.sub(forward);
  if (freeCam.keys.has('KeyD')) movement.add(right);
  if (freeCam.keys.has('KeyA')) movement.sub(right);

  // Vertical free-camera movement
if (freeCam.keys.has('Space')) movement.y += 1;
if (freeCam.keys.has('ShiftLeft') || freeCam.keys.has('ShiftRight')) {
  movement.y -= 1;
}

  if (movement.lengthSq() > 0) {
    movement.normalize();
    camera.position.addScaledVector(movement, freeCam.speed * dt);
  }

  const lookDirection = new THREE.Vector3(
    -Math.sin(freeCam.yaw) * Math.cos(freeCam.pitch),
    Math.sin(freeCam.pitch),
    -Math.cos(freeCam.yaw) * Math.cos(freeCam.pitch)
  );

  camera.lookAt(
    camera.position.clone().add(lookDirection)
  );
}

renderer.domElement.addEventListener('contextmenu', event => {
  if (freeCam.enabled) event.preventDefault();
});

renderer.domElement.addEventListener('pointerdown', event => {
  if (!freeCam.enabled || event.button !== 2) return;

  event.preventDefault();
  freeCam.dragging = true;
  freeCam.lastX = event.clientX;
  freeCam.lastY = event.clientY;

  renderer.domElement.setPointerCapture(event.pointerId);
});

renderer.domElement.addEventListener('pointermove', event => {
  if (!freeCam.enabled || !freeCam.dragging) return;

  const dx = event.clientX - freeCam.lastX;
  const dy = event.clientY - freeCam.lastY;

  freeCam.lastX = event.clientX;
  freeCam.lastY = event.clientY;

  freeCam.yaw -= dx * freeCam.sensitivity;
  freeCam.pitch -= dy * freeCam.sensitivity;

  freeCam.pitch = THREE.MathUtils.clamp(
    freeCam.pitch,
    -Math.PI / 2 + 0.01,
    Math.PI / 2 - 0.01
  );
});

renderer.domElement.addEventListener('pointerup', event => {
  if (event.button === 2) freeCam.dragging = false;
});

renderer.domElement.addEventListener('pointercancel', () => {
  freeCam.dragging = false;
});

window.addEventListener('blur', () => {
  freeCam.keys.clear();
  freeCam.dragging = false;
});

// Keyboard controls
window.addEventListener('keydown', event => {
    startOverspeedAudio();

  if (['Space', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
    event.preventDefault();
  }
   if (event.code === 'KeyP' && !event.repeat) {
    toggleFreeCam();
    return;
  }

  if (freeCam.enabled) {
    if (
      ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight']
        .includes(event.code)
    ) {
      event.preventDefault();
      freeCam.keys.add(event.code);
    }
    return;
  }

  if (event.repeat) return;

  switch (event.code) {
    case 'KeyW':
    case 'ArrowUp':
      if (state.brake === 0) setPower(state.power + 1);
      if (state.power === 0) setBrake(state.brake - 1)
      break;
    case 'KeyS':
    case 'ArrowDown':
        if (state.power > 0) {
    setPower(state.power - 1);
  } else {
    setBrake(state.brake + 1);
  }
      break;
    case 'KeyX':
      setPower(0);
      setBrake(0);
      break;
    case 'Space':
      setBrake(Math.max(2, state.brake));
      break;
    case 'KeyB':
      // Emergency braking when B is held
      break;
    case 'KeyE':
      if (state.awaitingDeparture) {
        state.awaitingDeparture = false;
        state.stationIndex++;
        state.power = 0;
        state.brake = 0;
        state.message = 'DEPARTURE · Proceed to next station';
      }
      break;
case 'KeyQ': {
  const target = safetyTargets[safetyTargetIndex];

  if (!target) {
    safetyFeedback = 'All checks completed!';
  } else if (Math.abs(state.position - target.position) <= 35) {
    safetyPointed = true;
    safetyFeedback = `Pointing at ${target.name} — press C`;
  } else {
    safetyFeedback = 'Move closer to the target first';
  }
  break;
}

case 'KeyC': {
  const target = safetyTargets[safetyTargetIndex];

  if (!target) {
    safetyFeedback = 'All safety checks completed!';
    break;
  }

  const distance = target.position - state.position;

  if (distance < -5) {
    safetyFeedback = 'Missed target — call too late';
  } else if (distance > 35) {
    safetyFeedback = 'Target too far away';
  } else {
    safetyScore += 10;
    safetyFeedback = `✓ ${target.call}`;
    safetyTargetIndex++;
  }

  break;
}
  }
});

window.addEventListener('keyup', event => {
  freeCam.keys.delete(event.code);
});

window.addEventListener('keydown', event => {
  if (event.code === 'KeyB' && !event.repeat) {
    state.power = 0;
    state.brake = 0;
    state.emergency = true;
    state.emergencyMeterTime = 0;
  }
});

window.addEventListener('keyup', event => {
  if (event.code === 'KeyB') {
    state.power = 0;
    state.brake = 0;
    state.emergency = false;
  }
});

// Resize handling
function resize() {
  const width = root.clientWidth;
  const height = root.clientHeight;
  if (!width || !height) return;

  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

new ResizeObserver(resize).observe(game);
resize();

// Main loop
let previousTime = performance.now();

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - previousTime) / 1000, 0.04);
  previousTime = now;

  state.elapsed += dt;

  
if (!state.awaitingDeparture && state.stationIndex < stations.length) {
  // Automatic overspeed protection
  const targetSpeed = Math.max(0, route.speedLimit - 5 / 3.6);

  if (!state.emergency && state.speed > route.speedLimit) {
    autoOverspeedBrake = true;
  }

  if (autoOverspeedBrake && !state.emergency) {
    state.power = 0;

    // Apply a gentle brake without increasing a stronger player brake.
    if (state.brake === 0) {
      state.brake = 1;
      autoOverspeedAppliedBrake = true;
    }

    // Release the automatic brake 5 km/h below the limit.
    if (state.speed <= targetSpeed) {
      autoOverspeedBrake = false;

      if (autoOverspeedAppliedBrake && state.brake === 1) {
        state.brake = 0;
      }

      autoOverspeedAppliedBrake = false;
    }
  }

  updateOverspeedAudio(
    state.speed > route.speedLimit && !state.emergency
  );

  const station = stations[state.stationIndex];

    const difficulty = currentDifficulty();

    const traction = state.power * 0.55;
    const braking = state.emergency ? 3.5 : state.brake * 0.7;
    const resistance = 0.025 + state.speed * 0.002;
    const acceleration = traction - braking - resistance;
// Measure how abruptly acceleration changes (jerk)
state.previousAcceleration ??= acceleration;

state.jerk =
  (acceleration - state.previousAcceleration) / Math.max(dt, 0.001);

state.previousAcceleration = acceleration;

// G-force reading based on the train's acceleration
state.gForce = acceleration / 9.81;

    state.speed = Math.max(
      0,
      Math.min(route.speedLimit + 3, state.speed + acceleration * dt)
    );

    state.position += state.speed * dt;
    state.overspeedSeconds +=
      state.speed > route.speedLimit ? dt : 0;

    const error = Math.abs(state.position - station.position);

    if (state.speed < 0.35 && error <= difficulty.tolerance) {
      state.speed = 0;
      state.power = 0;
      state.brake = 0;
      state.emergency = false;
      state.awaitingDeparture = true;
      scoreStation(station);
    } else if (state.position > station.position + difficulty.tolerance) {
      scoreStation(station, true);
      state.stationIndex++;
    }
  } else if (state.stationIndex >= stations.length) {
    state.speed = 0;
    state.power = 0;
  }

const activeSafetyTarget = safetyTargets[safetyTargetIndex];

if (activeSafetyTarget) {
  safetyMarker.visible = true;
  safetyMarker.position.set(
    0,
    6,
    activeSafetyTarget.position
  );

  // Automatically skip targets passed without a call
  if (state.position > activeSafetyTarget.position + 35) {
    safetyFeedback = `Missed: ${activeSafetyTarget.name}`;
    safetyTargetIndex++;
    safetyPointed = false;
  }
} else {
  safetyMarker.visible = false;
}
  train.position.z = state.position;

   if (freeCam.enabled) {
    updateFreeCam(dt);
  } else {
    const target = new THREE.Vector3(0, 1.4, state.position + 7);
    const desiredCamera = new THREE.Vector3(0, 5.5, state.position - 13);

    camera.position.lerp(desiredCamera, 1 - Math.exp(-4 * dt));
    camera.lookAt(target);
  }

 
  // G-force meter: normal braking is green; emergency braking
  const fill = $('gforce-fill');
  const value = $('gforce-value');

  if (fill && value) {
    state.displayGForce ??= 0;

    if (state.emergency) {
      state.emergencyMeterTime ??= 0;
      if (state.speed > 0.1) {
        state.emergencyMeterTime += dt;
      } else {
        state.emergencyMeterTime = 0;
      }

      // Green fills first, then yellow, then red.
      const greenEnd = 0.74;
const yellowEnd = 0.89;
const fillSpeed = 0.925;
const t = state.emergencyMeterTime;
if (state.speed <= 0.1) {
  state.displayGForce = Math.min(
    state.displayGForce,
    1
  );
}

const greenDuration = greenEnd / fillSpeed;
const yellowDuration = (yellowEnd - greenEnd) / fillSpeed;
const redDuration = (1 - yellowEnd) / fillSpeed;

let level;

if (t < greenDuration) {
  level = fillSpeed * t;
} else if (t < greenDuration + yellowDuration) {
  level = greenEnd + fillSpeed * (t - greenDuration);
} else {
  level = yellowEnd + fillSpeed *
    Math.min(redDuration, t - greenDuration - yellowDuration);
}

level = Math.min(1, level);

      const drainSpeed = 1.5;

      if (state.speed <= 0.1) {
        state.displayGForce = Math.max(
          0,
          state.displayGForce - drainSpeed * dt
        );
      } else {
        state.displayGForce = level;
      }

      const displayLevel = state.displayGForce;
      fill.style.height = `${displayLevel * 100}%`;

      // Keep the colour zones aligned to the FULL meter height.
fill.style.background = `
  linear-gradient(
    to top,
    #19b85a 0%,
    #19b85a 74%,
    #ffd52a 74%,
    #ffd52a 89%,
    #ff3030 89%,
    #ff3030 100%
  )
`;

fill.style.backgroundSize = `100% ${100 / Math.max(level, 0.01)}%`;
fill.style.backgroundPosition = 'bottom';
fill.style.backgroundRepeat = 'no-repeat';

      value.textContent = `${(displayLevel * 0.5).toFixed(2)} G`;
    } else {
      // Normal braking/acceleration never fills beyond the green zone.
      const jerkIntensity = Math.min(
        1,
        Math.abs(state.jerk ?? 0) * 0.12
      );

        const targetG = state.speed <= 0.1
          ? 0
          : Math.min(0.74, jerkIntensity);
        const response = state.speed <= 0.1
        ? 2.2
        : targetG > state.displayGForce ? 8 : 2.2;
      const blend = 1 - Math.exp(-response * dt);

      state.displayGForce +=
        (targetG - state.displayGForce) * blend;

      const level = Math.max(
        0,
        Math.min(0.74, state.displayGForce)
      );

      fill.style.height = `${level * 100}%`;
      fill.style.background = '#19b85a';

      value.textContent = `${(level * 0.5).toFixed(2)} G`;
    }
  }

  updateHUD();
  tileWorld?.update();
  renderer.render(scene, camera);
}

requestAnimationFrame(animate);


function buildBrakePressureScale() {
  const svg = document.querySelector(".brake-pressure-gauge");
  if (!svg) return;

  const ticks = svg.querySelector("#pressure-ticks");
  const labels = svg.querySelector("#pressure-labels");
  const band = svg.querySelector("#reservoir-normal-band");
  if (!ticks || !labels || !band) return;

  const ns = "http://www.w3.org/2000/svg";
  const cx = 80, cy = 76;
  const angleFor = value => (150 + value * 0.24) * Math.PI / 180;
  const point = (r, a) => ({
    x: cx + r * Math.cos(a),
    y: cy + r * Math.sin(a)
  });

  ticks.replaceChildren();
  labels.replaceChildren();

  // Red operating band from 780 to 900 kPa.
  const a1 = angleFor(780), a2 = angleFor(900);
  const p1 = point(49, a1), p2 = point(49, a2);
  const p3 = point(43, a2), p4 = point(43, a1);

  band.setAttribute("d",
    `M ${p1.x} ${p1.y} A 49 49 0 0 1 ${p2.x} ${p2.y} ` +
    `L ${p3.x} ${p3.y} A 43 43 0 0 0 ${p4.x} ${p4.y} Z`
  );

  // 20 kPa between ticks; longer ticks every 100 kPa.
  for (let value = 0; value <= 1000; value += 20) {
    const major = value % 100 === 0;
    const angle = angleFor(value);
    const start = point(major ? 38 : 43, angle);
    const end = point(49, angle);
    const line = document.createElementNS(ns, "line");

    line.setAttribute("x1", start.x);
    line.setAttribute("y1", start.y);
    line.setAttribute("x2", end.x);
    line.setAttribute("y2", end.y);
    line.setAttribute("stroke", "#f4f4f4");
    line.setAttribute("stroke-width", major ? 2.2 : 1);
    ticks.appendChild(line);
  }

  // Labels every 200 kPa; 500 at the top stays unlabeled.
  for (let value = 0; value <= 1000; value += 200) {
    const p = point(29, angleFor(value));
    const text = document.createElementNS(ns, "text");

    text.setAttribute("x", p.x);
    text.setAttribute("y", p.y);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("class", "pressure-label");
    text.textContent = value;
    labels.appendChild(text);
  }
}

buildBrakePressureScale();

