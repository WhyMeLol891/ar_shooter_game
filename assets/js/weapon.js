import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

export class WeaponSystem {
    constructor({ scene, modelUrl, camera, overlayScene, onFire, onReload }) {
        this.scene = scene;
        this.overlayScene = overlayScene;
        this.modelUrl = modelUrl;
        this.camera = camera;
        this.onFire = onFire;
        this.onReload = onReload;
        this.group = new THREE.Group();
        this.group.position.set(0, -0.25, -1.25);
        this.group.renderOrder = 1000;
        this.armRig = null;
        this.weaponMount = null;
        this.overlayCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 100);
        this.overlayScene.add(this.overlayCamera);
        this.overlayScene.add(new THREE.AmbientLight(0xffffff, 2.4));
        const weaponLight = new THREE.DirectionalLight(0xffffff, 2.8);
        weaponLight.position.set(1, 2, 2);
        this.overlayScene.add(weaponLight);
        this.createArmRig();
        this.overlayCamera.add(this.group);
        this.magazineSize = 30;
        this.ammo = this.magazineSize;
        this.maxAmmo = this.magazineSize;
        this.cooldown = 0.12;
        this.fireTimer = 0;
        this.reloading = false;
        this.model = null;
        this.mixer = null;
        this.idleAction = null;
        this.shootAction = null;
        this.reloadAction = null;
        this.loaded = false;
        this.loadModel();
    }

    createArmRig() {
        const armRig = new THREE.Group();
        const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xf3d3bd, roughness: 0.8 });
        const sleeveMaterial = new THREE.MeshStandardMaterial({ color: 0x4a5b72, roughness: 0.7 });

        const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.22, 6, 12), sleeveMaterial);
        upperArm.position.set(0.18, -0.06, -0.28);
        upperArm.rotation.z = -0.8;
        upperArm.rotation.x = 0.35;

        const lowerArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.22, 6, 12), skinMaterial);
        lowerArm.position.set(0.31, -0.18, -0.18);
        lowerArm.rotation.z = -0.7;
        lowerArm.rotation.x = 0.28;

        const hand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.12), skinMaterial);
        hand.position.set(0.41, -0.28, -0.08);
        hand.rotation.z = -0.2;

        this.weaponMount = new THREE.Group();
        this.weaponMount.position.set(0.44, -0.22, -0.08);
        this.weaponMount.rotation.set(0.18, 0.1, 0.18);

        armRig.add(upperArm, lowerArm, hand, this.weaponMount);
        this.armRig = armRig;
        this.group.add(armRig);
    }

    async loadModel() {
        if (!this.modelUrl) {
            this.createFallbackModel();
            return;
        }

        try {
            const loader = new GLTFLoader();
            const gltf = await loader.loadAsync(this.modelUrl);
            this.model = gltf.scene;
            this.model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.frustumCulled = false;
                    child.renderOrder = 1000;
                }
            });
            if (this.weaponMount) {
                this.weaponMount.add(this.model);
            } else {
                this.group.add(this.model);
            }
            this.fitToView();
            this.setupAnimations(gltf.animations || []);
            this.loaded = true;
        } catch (error) {
            console.warn('Weapon model failed to load:', error);
            this.createFallbackModel();
        }
    }

    createFallbackModel() {
        const darkMetal = new THREE.MeshStandardMaterial({ color: 0x252b33, roughness: 0.5, metalness: 0.8 });
        const gripMaterial = new THREE.MeshStandardMaterial({ color: 0x11151a, roughness: 0.9 });
        const fallback = new THREE.Group();
        const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.62), darkMetal);
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 12), darkMetal);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.28, 0.13), gripMaterial);

        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.02, 0.48);
        grip.position.set(0, -0.19, 0.12);
        fallback.add(receiver, barrel, grip);
        if (this.weaponMount) {
            this.weaponMount.add(fallback);
        } else {
            this.group.add(fallback);
        }
        this.model = fallback;
        this.loaded = true;
    }

    fitToView() {
        if (!this.model) return;
        const box = new THREE.Box3().setFromObject(this.model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDimension = Math.max(size.x, size.y, size.z) || 1;
        const scale = 0.15 / maxDimension;
        this.model.scale.setScalar(scale);
        this.model.rotation.set(0.2, Math.PI, 0.05);
        const center = new THREE.Vector3();
        box.getCenter(center);
        this.model.position.set(
            0.18 - center.x * scale,
            -0.14 - center.y * scale,
            -center.z * scale,
        );
    }

    setupAnimations(animations) {
        if (!animations || !animations.length || !this.model) return;
        this.mixer = new THREE.AnimationMixer(this.model);
        const names = new Set(animations.map((clip) => clip.name));
        const idleClip = animations.find((clip) => /idle|stand/i.test(clip.name)) || animations[0];
        const shootClip = animations.find((clip) => /fire|shoot|attack/i.test(clip.name));
        const reloadClip = animations.find((clip) => /reload|load/i.test(clip.name));
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
                if (this.onFire) this.onFire('empty');
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
            this.onFire('shot');
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
