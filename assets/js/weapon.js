import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class WeaponSystem {
  constructor({ scene, modelUrl, camera, overlayScene, onFire, onReload }) {
    this.scene = scene;
    this.overlayScene = overlayScene;
    this.modelUrl = modelUrl;
    this.camera = camera;
    this.onFire = onFire;
    this.onReload = onReload;

    this.group = new THREE.Group();
    this.group.position.set(0, -0.2, -0.6); // Adjusted for better screen view
    this.group.renderOrder = 1000;

    this.armRig = null;
    this.weaponMount = null;

    // Overlay Camera for FPS view HUD
    this.overlayCamera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.01,
      100,
    );
    this.overlayScene.add(this.overlayCamera);
    this.overlayScene.add(new THREE.AmbientLight(0xffffff, 2.5));

    const weaponLight = new THREE.DirectionalLight(0xffffff, 3.0);
    weaponLight.position.set(1, 2, 2);
    this.overlayScene.add(weaponLight);

    this.overlayCamera.add(this.group);

    // Stats & Ammo
    this.magazineSize = 30;
    this.ammo = this.magazineSize;
    this.maxAmmo = this.magazineSize;
    this.cooldown = 0.12;
    this.fireTimer = 0;
    this.reloading = false;

    // Animations
    this.model = null;
    this.mixer = null;
    this.idleAction = null;
    this.shootAction = null;
    this.reloadAction = null;
    this.loaded = false;

    this.loadModel();
  }

  async loadModel() {
    if (!this.modelUrl) {
      this.createFallbackModel();
      return;
    }

    try {
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(this.modelUrl);

      // Model loaded successfully -> Add only the loaded GLB model
      this.model = gltf.scene;
      this.model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.frustumCulled = false;
          child.renderOrder = 1000;
        }
      });

      this.group.add(this.model);
      this.fitToView();
      this.setupAnimations(gltf.animations || []);
      this.loaded = true;
    } catch (error) {
      console.warn(
        "Weapon GLB model failed to load, initializing fallback rig:",
        error,
      );
      this.createFallbackModel();
    }
  }

  createFallbackModel() {
    // Only builds fallback primitive shapes if GLB file fails to load
    const skinMaterial = new THREE.MeshStandardMaterial({
      color: 0xf3d3bd,
      roughness: 0.8,
    });
    const sleeveMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a5b72,
      roughness: 0.7,
    });
    const darkMetal = new THREE.MeshStandardMaterial({
      color: 0x252b33,
      roughness: 0.5,
      metalness: 0.8,
    });
    const gripMaterial = new THREE.MeshStandardMaterial({
      color: 0x11151a,
      roughness: 0.9,
    });

    const fallbackGroup = new THREE.Group();

    // Primitive Arm
    const upperArm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.045, 0.22, 6, 12),
      sleeveMaterial,
    );
    upperArm.position.set(0.18, -0.06, -0.28);
    upperArm.rotation.z = -0.8;
    upperArm.rotation.x = 0.35;

    const lowerArm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.04, 0.22, 6, 12),
      skinMaterial,
    );
    lowerArm.position.set(0.31, -0.18, -0.18);
    lowerArm.rotation.z = -0.5;
    lowerArm.rotation.x = 0.28;

    // Primitive Gun
    const receiver = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.1, 0.35),
      darkMetal,
    );
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.25, 12),
      darkMetal,
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, 0.28);

    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.15, 0.08),
      gripMaterial,
    );
    grip.position.set(0, -0.09, 0.05);

    fallbackGroup.add(upperArm, lowerArm, receiver, barrel, grip);
    this.group.add(fallbackGroup);
    this.model = fallbackGroup;
    this.loaded = true;
  }

  fitToView() {
    if (!this.model) return;

    const box = new THREE.Box3().setFromObject(this.model);
    const size = new THREE.Vector3();
    box.getSize(size);

    const maxDimension = Math.max(size.x, size.y, size.z) || 1;

    // Scale model down so it fits in FPS perspective
    const scale = 0.35 / maxDimension;
    this.model.scale.setScalar(scale);

    // Rotate gun to point forward into the screen (-Z direction)
    // Adjust Math.PI * 1.75 if your 3D model faces backward/sideways by default
    this.model.rotation.set(0, Math.PI * 2, 0);

    const center = new THREE.Vector3();
    box.getCenter(center);

    // Position gun at bottom-right corner of the screen
    this.model.position.set(
      0.5 - center.x * scale, // Move right
      -0.25 - center.y * scale, // Move down
      -0.5 - center.z * scale, // Push forward into depth
    );
  }

  setupAnimations(animations) {
    if (!animations || !animations.length || !this.model) return;
    this.mixer = new THREE.AnimationMixer(this.model);

    const idleClip =
      animations.find((clip) => /idle|stand/i.test(clip.name)) || animations[0];
    const shootClip = animations.find((clip) =>
      /fire|shoot|attack/i.test(clip.name),
    );
    const reloadClip = animations.find((clip) =>
      /reload|load/i.test(clip.name),
    );

    if (idleClip) this.idleAction = this.mixer.clipAction(idleClip);
    if (shootClip) this.shootAction = this.mixer.clipAction(shootClip);
    if (reloadClip) this.reloadAction = this.mixer.clipAction(reloadClip);

    if (this.idleAction) this.idleAction.play();
  }

  update(delta) {
    if (this.mixer) this.mixer.update(delta);
    if (this.fireTimer > 0) this.fireTimer -= delta;
  }

  render(renderer) {
    renderer.render(this.overlayScene, this.overlayCamera);
  }

  triggerFire() {
    if (this.reloading || this.fireTimer > 0 || this.ammo <= 0) {
      if (this.ammo <= 0 && !this.reloading) {
        if (this.onFire) this.onFire("empty");
      }
      return false;
    }

    this.ammo -= 1;
    this.fireTimer = this.cooldown;

    if (this.shootAction) {
      this.shootAction.reset();
      this.shootAction.play();
    }

    if (this.onFire) {
      this.onFire("shot");
    }

    return true;
  }

  reload() {
    if (this.reloading || this.ammo === this.maxAmmo) return;
    this.reloading = true;

    if (this.reloadAction) {
      this.reloadAction.reset();
      this.reloadAction.play();
    }

    setTimeout(() => {
      this.ammo = this.maxAmmo;
      this.reloading = false;
      if (this.onReload) this.onReload();
    }, 700);
  }

  getAmmoState() {
    return `${this.ammo}/${this.maxAmmo}`;
  }
}