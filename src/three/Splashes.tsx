import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Particle {
  p: THREE.Vector3;
  v: THREE.Vector3;
  life: number;
  max: number;
  size: number;
}

interface Ripple {
  x: number;
  z: number;
  y: number;
  age: number;
  max: number;
  size: number;
}

/** API global simples para disparar respingos de qualquer lugar. */
export const splashBus = {
  burst: (_x: number, _y: number, _z: number, _power: number, _count?: number) => {},
  ripple: (_x: number, _y: number, _z: number, _size: number) => {},
};

export function Splashes({ max = 420, color = '#ffffff' }: { max?: number; color?: string }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const ringMesh = useRef<THREE.InstancedMesh>(null);
  const parts = useRef<Particle[]>([]);
  const ripples = useRef<Ripple[]>([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const geo = useMemo(() => new THREE.IcosahedronGeometry(0.06, 0), []);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color, roughness: 0.1, metalness: 0, emissive: '#bff3ff', emissiveIntensity: 0.35, transparent: true, opacity: 0.92 }),
    [color],
  );
  const ringGeo = useMemo(() => {
    const g = new THREE.RingGeometry(0.8, 1, 40);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const ringMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.3, depthWrite: false }),
    [],
  );
  const RMAX = 24;

  useEffect(() => {
    splashBus.burst = (x, y, z, power, count) => {
      const n = count ?? Math.round(8 + power * 16);
      for (let i = 0; i < n; i++) {
        if (parts.current.length >= max) parts.current.shift();
        const a = Math.random() * Math.PI * 2;
        const sp = (0.6 + Math.random() * 1.6) * (0.5 + power);
        parts.current.push({
          p: new THREE.Vector3(x + (Math.random() - 0.5) * 0.3, y, z + (Math.random() - 0.5) * 0.3),
          v: new THREE.Vector3(Math.cos(a) * sp * 0.6, 1.8 + Math.random() * 2.2 * (0.4 + power), Math.sin(a) * sp * 0.6 + 0.6),
          life: 0,
          max: 0.5 + Math.random() * 0.5,
          size: 0.6 + Math.random() * 1.1 * (0.5 + power * 0.6),
        });
      }
    };
    splashBus.ripple = (x, y, z, size) => {
      if (ripples.current.length >= RMAX) ripples.current.shift();
      ripples.current.push({ x, y, z, age: 0, max: 1.1, size });
    };
    return () => {
      splashBus.burst = () => {};
      splashBus.ripple = () => {};
    };
  }, [max]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const m = mesh.current;
    if (m) {
      const list = parts.current;
      let n = 0;
      for (let i = list.length - 1; i >= 0; i--) {
        const q = list[i];
        q.life += dt;
        if (q.life >= q.max || (q.p.y < -0.2 && q.v.y < 0)) {
          list.splice(i, 1);
          continue;
        }
        q.v.y -= 9.8 * dt;
        q.p.addScaledVector(q.v, dt);
      }
      for (const q of list) {
        const k = 1 - q.life / q.max;
        dummy.position.copy(q.p);
        dummy.scale.setScalar(q.size * (0.4 + k * 0.8));
        dummy.updateMatrix();
        m.setMatrixAt(n++, dummy.matrix);
      }
      m.count = n;
      m.instanceMatrix.needsUpdate = true;
    }
    const r = ringMesh.current;
    if (r) {
      const list = ripples.current;
      let n = 0;
      for (let i = list.length - 1; i >= 0; i--) {
        list[i].age += dt;
        if (list[i].age > list[i].max) list.splice(i, 1);
      }
      for (const q of list) {
        const k = q.age / q.max;
        dummy.position.set(q.x, q.y + 0.03, q.z);
        dummy.scale.setScalar(q.size * (0.3 + k * 1.4));
        dummy.updateMatrix();
        r.setMatrixAt(n++, dummy.matrix);
      }
      r.count = n;
      r.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={mesh} args={[geo, mat, max]} frustumCulled={false} />
      <instancedMesh ref={ringMesh} args={[ringGeo, ringMat, RMAX]} frustumCulled={false} />
    </>
  );
}
