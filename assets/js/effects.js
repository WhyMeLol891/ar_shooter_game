export class EffectSystem {
    constructor(scene) {
        this.scene = scene;
        this.effects = [];
    }

    addBurst(position, color = 0xffcc66, scale = 1) {
        const geometry = new THREE.SphereGeometry(0.02 * scale, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        this.scene.add(mesh);
        this.effects.push({ mesh, velocity: new THREE.Vector3((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02), life: 0.5, maxLife: 0.5, mat: material });
    }

    addSmoke(position, color = 0x888888) {
        const geometry = new THREE.SphereGeometry(0.03, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        this.scene.add(mesh);
        this.effects.push({ mesh, velocity: new THREE.Vector3(0.0, 0.02, 0.0), life: 0.8, maxLife: 0.8, mat: material });
    }

    addTracer(start, end, color = 0xffaa00) {
        const geometry = new THREE.BufferGeometry().setFromPoints([start.clone(), end.clone()]);
        const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8 });
        const line = new THREE.Line(geometry, material);
        this.scene.add(line);
        this.effects.push({ line, life: 0.16, maxLife: 0.16, mat: material });
    }

    update(delta) {
        const active = [];
        for (const effect of this.effects) {
            if (effect.velocity) {
                if (effect.mesh) {
                    effect.mesh.position.addScaledVector(effect.velocity, delta * 60);
                    effect.velocity.multiplyScalar(0.92);
                }
            }
            effect.life -= delta;
            if (effect.mesh && effect.mat) {
                effect.mat.opacity = Math.max(0, effect.life / effect.maxLife);
            }
            if (effect.line && effect.mat) {
                effect.mat.opacity = Math.max(0, effect.life / effect.maxLife);
            }
            if (effect.life > 0) {
                active.push(effect);
            } else {
                if (effect.mesh) this.scene.remove(effect.mesh);
                if (effect.line) this.scene.remove(effect.line);
                if (effect.mesh && effect.mesh.geometry) effect.mesh.geometry.dispose();
                if (effect.mesh && effect.mesh.material) effect.mesh.material.dispose();
                if (effect.line && effect.line.geometry) effect.line.geometry.dispose();
                if (effect.line && effect.line.material) effect.line.material.dispose();
            }
        }
        this.effects = active;
    }
}
