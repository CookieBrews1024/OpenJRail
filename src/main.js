import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import './style.css';

const $ = id => document.getElementById(id);
const root = $('scene');
const game = $('game');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9bc7e0);
scene.fog = new THREE.Fog(0x9bc7e0, 100, 420);

const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 700);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'low-power'
});

renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
root.appendChild(renderer.domElement);

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

// Ground and track
box(scene, [200, 0.5, 850], [0, -0.5, 300], grass);
box(scene, [4.2, 0.22, 850], [0, -0.18, 300], ballast);

for (const x of [-1.12, 1.12]) {
  box(scene, [0.14, 0.16, 850], [x, 0, 300], railMat);
}

for (let z = -120; z < 730; z += 2) {
  box(scene, [3.2, 0.16, 0.34], [0, -0.02, z], sleeperMat);
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

// Route and stations: all distances are metres along the track.
const stations = [
  { name: 'Midori', position: 150 },
  { name: 'Hikari Park', position: 320 },
  { name: 'Sakura Terminal', position: 480 }
];

const safetyTargets = [
  {
    name: 'Signal ahead',
    call: 'Signal green',
    position: 75,
    type: 'signal'
  },
  {
    name: 'Midori marker',
    call: 'Stop marker confirmed',
    position: 150,
    type: 'station'
  },
  {
    name: 'Hikari Park marker',
    call: 'Stop marker confirmed',
    position: 320,
    type: 'station'
  },
  {
    name: 'Sakura Terminal marker',
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
  '/public/models/yamanote-e235.glb',
  (gltf) => {
    const model = gltf.scene;

    // Adjust these if the imported model is too large or small.
    model.scale.setScalar(1.75);

    // Keep the model centred on the track.
    model.position.set(0, 0, 0);

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

function setPower(value) {
  if (state.awaitingDeparture) return;
  state.power = THREE.MathUtils.clamp(value, 0, 4);
  state.emergency = false;
}

function setBrake(value) {
  state.brake = THREE.MathUtils.clamp(value, 0, 4);
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

function updateHUD() {
  const kmh = state.speed * 3.6;
  const station = stations[state.stationIndex];
  const distance = station
    ? station.position - state.position
    : 0;

  $('speed').textContent = Math.round(kmh);
  $('speed-bar').style.width =
    `${Math.min(100, kmh / 80 * 100)}%`;

  $('distance').textContent =
    `${Math.round(state.position)} m`;

  $('power-value').textContent =
    state.power === 0 ? 'N' : `P${state.power}`;

  $('brake-value').textContent =
    state.emergency ? 'EB' : state.brake;

  $('power-notch').textContent =
    state.power === 0 ? 'N' : `P${state.power}`;

  $('brake-notch').textContent =
    state.emergency ? 'EB' : state.brake;

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

// Controller buttons
$('power-up').addEventListener('click', () => {
  if (state.brake === 0) setPower(state.power + 1);
});
$('power-down').addEventListener('click', () => setPower(state.power - 1));
$('brake-up').addEventListener('click', () => setBrake(state.brake + 1));
$('brake-down').addEventListener('click', () => setBrake(state.brake - 1));

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

// Keyboard controls
window.addEventListener('keydown', event => {
  if (['Space', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
    event.preventDefault();
  }
  if (event.repeat) return;

  switch (event.code) {
    case 'KeyW':
    case 'ArrowUp':
      if (state.brake === 0) setPower(state.power + 1);
      break;
    case 'KeyS':
    case 'ArrowDown':
      setPower(state.power - 1);
      break;
    case 'KeyX':
      setPower(0);
      setBrake(0);
      break;
    case 'Space':
      setBrake(Math.max(2, state.brake));
      break;
    case 'KeyB':
      state.power = 0;
      state.brake = 4;
      state.emergency = true;
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
    const station = stations[state.stationIndex];
    const difficulty = currentDifficulty();

    const traction = state.power * 0.55;
    const braking = state.emergency ? 3.5 : state.brake * 0.7;
    const resistance = 0.025 + state.speed * 0.002;
    const acceleration = traction - braking - resistance;

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

  const target = new THREE.Vector3(0, 1.4, state.position + 7);
  const desiredCamera = new THREE.Vector3(0, 5.5, state.position - 13);

  camera.position.lerp(desiredCamera, 1 - Math.exp(-4 * dt));
  camera.lookAt(target);

  updateHUD();
  renderer.render(scene, camera);
}

requestAnimationFrame(animate);
