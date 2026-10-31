
import * as THREE from 'three';
import { TilesRenderer } from '3d-tiles-renderer/three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFExtensionsPlugin } from '3d-tiles-renderer/three/plugins';
import { WGS84_ELLIPSOID } from '3d-tiles-renderer/three';

export function createTileWorld({
  scene,
  camera,
  renderer,
  url,
}) {
  const tiles = new TilesRenderer(url);
   const originLat = 35.6812 * THREE.MathUtils.DEG2RAD;
  const originLon = 139.7671 * THREE.MathUtils.DEG2RAD;

  const originFrame = WGS84_ELLIPSOID.getEastNorthUpFrame(
    originLat,
    originLon,
    0,
    new THREE.Matrix4(),
  );

  const inverseOriginFrame = originFrame.clone().invert();

  // Convert the geographic ENU frame (Z-up) to the game's Y-up frame.
  const enuToGame = new THREE.Matrix4().set(
    1, 0, 0, 0,
    0, 0, 1, 0,
    0, -1, 0, 0,
    0, 0, 0, 1,
  );

  tiles.group.matrixAutoUpdate = false;
  tiles.group.matrix.multiplyMatrices(enuToGame, inverseOriginFrame);
  tiles.group.matrixWorldNeedsUpdate = true;

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('/draco/');

  tiles.registerPlugin(
    new GLTFExtensionsPlugin({
      dracoLoader,
      rtc: true,
    }),
  );

  tiles.setCamera(camera);
  tiles.setResolutionFromRenderer(camera, renderer);

  scene.add(tiles.group);

  let disposed = false;

  function update() {
    if (disposed) return;

    camera.updateMatrixWorld();
    tiles.setResolutionFromRenderer(camera, renderer);
    tiles.update();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;

    scene.remove(tiles.group);
    tiles.dispose();
    dracoLoader.dispose();
    tiles.deleteCamera(camera);
  }

  tiles.addEventListener('load-root-tileset', () => {
    console.info('[OpenJRail] 3D Tiles root loaded.');

    const sphere = new THREE.Sphere();
    tiles.getBoundingSphere(sphere);

    if (sphere.isEmpty()) {
      console.warn('[OpenJRail] Tileset has no bounding sphere yet.');
      return;
    }


    console.info('[OpenJRail] Tileset bounding sphere:', {
      center: sphere.center.toArray(),
      radius: sphere.radius,
    });

    console.info(
      '[OpenJRail] Tiles group position:',
      tiles.group.position.toArray(),
    );

    console.info(
      '[OpenJRail] Camera position:',
      camera.position.toArray(),
    );
  });

  tiles.addEventListener('load-tile-set', (event) => {
    console.info('[OpenJRail] Tileset loaded:', event);
  });


tiles.addEventListener('load-model', (event) => {
  console.info('[OpenJRail] Tile model loaded:', event);

  console.info(
    '[OpenJRail] Tile group children:',
    tiles.group.children.length,
  );


let loggedMeshes = 0;
let matchingMeshes = 0;

// Approximate area around the Tokyo end of the route.
const tokyoArea = new THREE.Box3(
  new THREE.Vector3(-150, -10000, -150),
  new THREE.Vector3(150, 10000, 150)
);

tiles.group.updateMatrixWorld(true);

tiles.group.traverse((object) => {
  if (!object.isMesh) return;

  const box = new THREE.Box3().setFromObject(object);
  const geometry = object.geometry;

if (geometry && geometry.attributes.position) {
  const positions = geometry.attributes.position;
  const worldPosition = new THREE.Vector3();

  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < positions.count; i++) {
    worldPosition.fromBufferAttribute(positions, i);
    object.localToWorld(worldPosition);

    if (
      Math.abs(worldPosition.x) < 100 &&
      Math.abs(worldPosition.z) < 100
    ) {
      minY = Math.min(minY, worldPosition.y);
      maxY = Math.max(maxY, worldPosition.y);
    }
  }

  if (minY !== Infinity) {
    console.info('[OpenJRail] Tokyo geometry heights:', {
      minY,
      maxY,
    });
  }
}
  if (box.isEmpty()) return;

  // Check whether the mesh bounds overlap Tokyo,
  // rather than checking only the mesh centre.
  if (box.intersectsBox(tokyoArea)) {
    matchingMeshes++;

    console.info('[OpenJRail] Tokyo-area tile mesh:', {
      name: object.name,
      min: box.min.toArray(),
      max: box.max.toArray(),
    });
  }

  // Also show the first 10 meshes for comparison.
  if (loggedMeshes < 10) {
    console.info('[OpenJRail] Tile mesh sample:', {
      name: object.name,
      min: box.min.toArray(),
      max: box.max.toArray(),
    });

    loggedMeshes++;
  }
});

console.info('[OpenJRail] Tokyo-area matching meshes:', matchingMeshes);

});

  tiles.addEventListener('load-error', (event) => {
    console.error('[OpenJRail] 3D Tiles loading error:', event);
  });

  return {
    tiles,
    update,
    dispose,
  };
}
