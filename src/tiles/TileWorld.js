
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

  tiles.group.traverse((object) => {
    if (object.isMesh) {
      const box = new THREE.Box3().setFromObject(object);

      console.info('[OpenJRail] Tile mesh:', {
        name: object.name,
        position: object.getWorldPosition(new THREE.Vector3()).toArray(),
        boundsEmpty: box.isEmpty(),
        min: box.min.toArray(),
        max: box.max.toArray(),
      });
    }
  });
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
