import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinnedModel } from 'three/addons/utils/SkeletonUtils.js';


// import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
// import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
// import { clone as cloneSkinnedModel } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/utils/SkeletonUtils.js';

const ANIMATION_FALLBACKS = {
    idle: ['Idle', 'idle', 'Stand', 'Stand_Idle'],
    walk: ['Walk', 'walk', 'Run', 'run', 'Move'],
    run: ['Run', 'run', 'Walk', 'walk', 'Fast_Flying'],
    attack: ['Bite', 'Bite_Front', 'Punch', 'Headbutt', 'Attack'],
    hit: ['HitReact', 'HitRecieve', 'Hit', 'TakeHit'],
    death: ['Death', 'die', 'Dead'],
};

const MODEL_CACHE = new Map();
export class Enemy {
    constructor({ modelUrl, scene, worldGroup, playerPosition, wave, onDeath, onAttack, effectSystem }) {
        this.modelUrl = modelUrl;
        this.scene = scene;
        this.worldGroup = worldGroup;
        this.playerPosition = playerPosition;
        this.wave = wave;
        this.onDeath = onDeath;
        this.onAttack = onAttack;
        this.effectSystem = effectSystem;
        this.group = new THREE.Group();
        this.group.position.set(0, 0, 0);
        this.worldGroup.add(this.group);
        this.isAlive = true;
        this.isDead = false;
        this.hp = Math.max(1, 4 + (wave - 1));
        this.maxHp = this.hp;
        this.speed = 0.28 * (1 + 0.12 * (wave - 1));
        this.attackCooldown = 1.5;
        this.attackTimer = 0;
        this.hitTimer = 0;
        this.hitboxRadius = 0.12;
        this.model = null;
        this.mixer = null;
        this.currentAnimation = null;
        this.loaded = false;
        this.loadModel();
    }

    async loadModel() {
        const cacheKey = this.modelUrl;
        if (!cacheKey) {
            this.createFallbackModel();
            return;
        }

        let source = MODEL_CACHE.get(cacheKey);
        if (!source) {
            const loader = new GLTFLoader();
            try {
                source = await loader.loadAsync(this.modelUrl);
                MODEL_CACHE.set(cacheKey, source);
            } catch (error) {
                console.warn('Enemy model failed to load:', error);
                this.createFallbackModel();
                return;
            }
        }

        const clone = cloneSkinnedModel(source.scene);
        this.model = clone;
        this.model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        this.group.add(this.model);
        this.fitModel();
        this.setupAnimations(source.animations || []);
        this.loaded = true;
    }

    createFallbackModel() {
        const material = new THREE.MeshStandardMaterial({
            color: 0xd64b3f,
            roughness: 0.72,
            metalness: 0.12,
        });
        const darkMaterial = new THREE.MeshStandardMaterial({
            color: 0x171d26,
            roughness: 0.8,
        });
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.28, 4, 8), material);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), material);
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), darkMaterial);
        const fallback = new THREE.Group();

        body.position.y = 0.25;
        head.position.y = 0.56;
        eye.position.set(0, 0.57, 0.115);
        fallback.add(body, head, eye);
        fallback.scale.setScalar(0.9);
        this.model = fallback;
        this.group.add(this.model);
        this.loaded = true;
    }

    fitModel() {
        if (!this.model) return;
        const box = new THREE.Box3().setFromObject(this.model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDimension = Math.max(size.x, size.y, size.z) || 1;
        const targetScale = 0.45 / Math.max(maxDimension, 0.7);
        this.model.scale.setScalar(targetScale);
        this.model.position.y = 0;
        const collider = new THREE.Box3().setFromObject(this.model);
        const center = new THREE.Vector3();
        collider.getCenter(center);
        this.model.position.y -= center.y * targetScale;
    }

    setupAnimations(animations) {
        if (!animations || !animations.length) return;

        const clipNames = animations.map((clip) => clip.name);
        const pick = (names) => names.find((name) => clipNames.includes(name));
        const preferred = [
            pick(ANIMATION_FALLBACKS.idle),
            pick(ANIMATION_FALLBACKS.walk),
            pick(ANIMATION_FALLBACKS.run),
            pick(ANIMATION_FALLBACKS.attack),
            pick(ANIMATION_FALLBACKS.hit),
            pick(ANIMATION_FALLBACKS.death),
        ].filter(Boolean);

        const available = animations.filter((clip) => clip && clip.name && clip.tracks && clip.tracks.length);
        const baseClip = available.find((clip) => clip.name === preferred[0]) ?? available[0];
        if (!baseClip) return;

        this.mixer = new THREE.AnimationMixer(this.model);
        for (const clip of available) {
            const key = clip.name;
            if (this[key]) continue;
            this[key] = this.mixer.clipAction(clip);
        }

        if (this.Idle) {
            this.playAnimation(this.Idle);
        } else {
            this.playAnimation(this.mixer.clipAction(baseClip));
        }
    }

    playAnimation(action) {
        if (!action || !this.mixer) return;
        if (this.currentAnimation === action) return;
        if (this.currentAnimation) {
            this.currentAnimation.stop();
        }
        action.reset();
        action.play();
        this.currentAnimation = action;
    }

    update(delta, targetFound) {
        if (!this.isAlive || !this.model) return;
        if (!targetFound) return;

        const target = this.playerPosition || new THREE.Vector3(0, 0, 0);
        const toTarget = target.clone().sub(this.group.position);
        const distance = toTarget.length();
        if (distance > 0.0001) {
            toTarget.normalize();
            this.group.position.addScaledVector(toTarget, this.speed * delta * 0.6);
            this.group.lookAt(target.x, this.group.position.y, target.z);
        }

        if (this.mixer) {
            this.mixer.update(delta);
        }

        if (this.attackTimer > 0) this.attackTimer -= delta;
        if (this.hitTimer > 0) this.hitTimer -= delta;
        if (distance < 0.24 && this.attackTimer <= 0) {
            this.attackTimer = 1.1;
            if (this.onAttack) {
                this.onAttack();
            }
        }
    }

    takeDamage(amount, hitPosition) {
        if (!this.isAlive) return;
        this.hp -= amount;
        if (hitPosition && this.effectSystem) {
            this.effectSystem.addBurst(hitPosition, 0xffd166, 1.5);
        }
        if (this.hp <= 0) {
            this.die();
        } else if (this.hit) {
            this.hit.play();
        }
    }

    die() {
        if (!this.isAlive || this.isDead) return;
        this.isAlive = false;
        this.isDead = true;
        if (this.deathAnim) {
            this.deathAnim.play();
        }
        if (this.onDeath) {
            this.onDeath(this.group.position.clone());
        }
        this.group.visible = false;
        setTimeout(() => {
            this.worldGroup.remove(this.group);
            if (this.model && this.model.geometry) this.model.geometry.dispose();
        }, 300);
    }
}
