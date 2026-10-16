import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MAX_WAVES, type Wave } from '../game/waves';

export interface WaterLook {
  deep: string;
  shallow: string;
  foam: string;
  sky: string;
  sunDir: [number, number, number];
  sunColor: string;
  opacity: number;
  glint: number;
  sparkle: number;
  foamAmount?: number;
}

const vert = /* glsl */ `
  uniform float uTime;
  uniform float uAmbient;
  uniform vec4 uWaves[${MAX_WAVES}];
  varying vec3 vWorld;
  varying float vH;
  varying float vCrest;
  #include <fog_pars_vertex>

  float heightAt(vec2 p, out float crest) {
    float h = uAmbient * (sin(p.x * 0.55 + uTime * 1.1) * 0.5
      + sin(p.y * 0.42 - uTime * 1.4) * 0.6
      + sin((p.x + p.y) * 0.9 + uTime * 2.1) * 0.25);
    crest = 0.0;
    for (int i = 0; i < ${MAX_WAVES}; i++) {
      vec4 w = uWaves[i];
      if (w.z <= 0.0) continue;
      float d = (p.y - w.x) / w.y;
      float g = exp(-d * d);
      // crista levemente ondulada no eixo x
      float wob = 1.0 + 0.15 * sin(p.x * 0.6 + uTime * 1.5 + w.x);
      h += w.z * g * wob;
      crest = max(crest, g * w.w);
    }
    return h;
  }

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    float crest;
    float h = heightAt(world.xz, crest);
    world.y += h;
    vWorld = world.xyz;
    vH = h;
    vCrest = crest;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const frag = /* glsl */ `
  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uFoam;
  uniform vec3 uSky;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uOpacity;
  uniform float uGlint;
  uniform float uSparkle;
  uniform float uFoamAmt;
  varying vec3 vWorld;
  varying float vH;
  varying float vCrest;
  #include <fog_pars_fragment>

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  void main() {
    vec3 dx = dFdx(vWorld);
    vec3 dy = dFdy(vWorld);
    vec3 n = normalize(cross(dx, dy));
    if (n.y < 0.0) n = -n;
    // micro-ondulações animadas
    vec2 p = vWorld.xz;
    float r1 = noise(p * 1.6 + vec2(uTime * 0.6, uTime * 0.4));
    float r2 = noise(p * 3.1 - vec2(uTime * 0.5, -uTime * 0.7));
    n = normalize(n + vec3((r1 - 0.5) * 0.35, 0.0, (r2 - 0.5) * 0.35));

    vec3 V = normalize(cameraPosition - vWorld);
    float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0);
    vec3 col = mix(uDeep, uShallow, clamp(0.45 + vH * 1.4 + r1 * 0.2, 0.0, 1.0));
    col = mix(col, uSky, fres * 0.55);

    vec3 H = normalize(normalize(uSunDir) + V);
    float spec = pow(max(dot(n, H), 0.0), 140.0) * uGlint;
    col += uSunColor * spec;

    // brilhos cartunescos
    float sp = smoothstep(0.86, 0.97, noise(p * 2.2 + uTime * 0.3) * noise(p * 4.0 - uTime * 0.2) * 1.6);
    col += vec3(1.0) * sp * uSparkle;

    // espuma na crista das ondas
    float foam = smoothstep(0.35, 0.9, vCrest) * smoothstep(0.3, 0.7, r2 + 0.3);
    col = mix(col, uFoam, foam * uFoamAmt);

    gl_FragColor = vec4(col, mix(uOpacity, 1.0, fres * 0.6 + foam * 0.8));
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

interface Props {
  look: WaterLook;
  width: number;
  length: number;
  segX: number;
  segZ: number;
  ambient: number;
  getWaves?: () => Wave[];
  /** Mantém a malha centralizada neste Z (mares infinitos). */
  followZ?: () => number;
  centerZ?: number;
  y?: number;
}

export function WaterSurface({ look, width, length, segX, segZ, ambient, getWaves, followZ, centerZ = 0, y = 0 }: Props) {
  const mesh = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(width, length, segX, segZ);
    g.rotateX(-Math.PI / 2);
    return g;
  }, [width, length, segX, segZ]);

  const mat = useMemo(() => {
    const waves = Array.from({ length: MAX_WAVES }, () => new THREE.Vector4(0, 1, 0, 0));
    return new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: look.opacity < 1,
      fog: true,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uTime: { value: 0 },
          uAmbient: { value: ambient },
          uWaves: { value: waves },
          uDeep: { value: new THREE.Color(look.deep) },
          uShallow: { value: new THREE.Color(look.shallow) },
          uFoam: { value: new THREE.Color(look.foam) },
          uSky: { value: new THREE.Color(look.sky) },
          uSunDir: { value: new THREE.Vector3(...look.sunDir) },
          uSunColor: { value: new THREE.Color(look.sunColor) },
          uOpacity: { value: look.opacity },
          uGlint: { value: look.glint },
          uSparkle: { value: look.sparkle },
          uFoamAmt: { value: look.foamAmount ?? 0.75 },
        },
      ]),
    });
  }, [look, ambient]);

  const step = length / segZ;
  useFrame((state) => {
    const u = mat.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    const arr = u.uWaves.value as THREE.Vector4[];
    const ws = getWaves ? getWaves() : [];
    for (let i = 0; i < MAX_WAVES; i++) {
      const w = ws[i];
      if (w) arr[i].set(w.z, w.width, w.height * w.fade, Math.min(1, w.strength * w.fade));
      else arr[i].set(0, 1, 0, 0);
    }
    if (followZ && mesh.current) {
      const z = followZ();
      mesh.current.position.z = Math.round(z / step) * step;
    }
  });

  return <mesh ref={mesh} geometry={geo} material={mat} position={[0, y, centerZ]} frustumCulled={false} />;
}

/** Relógio compartilhado entre shader e CPU (boiar no mesmo ritmo). */
export function waterClock(state: { clock: THREE.Clock }) {
  return state.clock.elapsedTime;
}
