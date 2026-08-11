import { Canvas, useFrame } from '@react-three/fiber';
import {
  ContactShadows,
  Environment,
  Lightformer,
  MeshRefractionMaterial,
  PresentationControls,
  useEnvironment,
} from '@react-three/drei';
import { EffectComposer, Bloom, SMAA, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Group } from 'three';
import { BlendFunction } from 'postprocessing';

/** Comfort-fit 18k band — LatheGeometry (real jewelry cross-section). */
function useBandGeometry() {
  return useMemo(() => {
    const pts: THREE.Vector2[] = [];
    const major = 1.08;
    // Outer rounded face
    for (let i = 0; i <= 20; i++) {
      const a = -Math.PI / 2 + (Math.PI * i) / 20;
      pts.push(new THREE.Vector2(major + 0.155 * Math.cos(a), 0.58 * Math.sin(a)));
    }
    // Top bevel toward inside
    for (let i = 1; i <= 8; i++) {
      const t = i / 8;
      pts.push(new THREE.Vector2(major - 0.02 - 0.14 * t, 0.58 + 0.04 * Math.sin(t * Math.PI)));
    }
    // Inner comfort-fit scoop (concave)
    for (let i = 0; i <= 28; i++) {
      const a = Math.PI / 2 + (Math.PI * i) / 28;
      const indent = 0.055 * Math.sin(((a - Math.PI / 2) / Math.PI) * Math.PI);
      pts.push(
        new THREE.Vector2(major - 0.175 - indent * Math.abs(Math.cos(a)), 0.52 * Math.sin(a)),
      );
    }
    // Bottom bevel back
    for (let i = 1; i <= 8; i++) {
      const t = i / 8;
      pts.push(new THREE.Vector2(major - 0.16 + 0.14 * t, -0.58 - 0.04 * Math.sin((1 - t) * Math.PI)));
    }
    const geo = new THREE.LatheGeometry(pts, 192);
    geo.computeVertexNormals();
    return geo;
  }, []);
}

function goldMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#e0b84a'),
    metalness: 1,
    roughness: 0.12,
    envMapIntensity: 1.6,
    clearcoat: 0.55,
    clearcoatRoughness: 0.08,
    reflectivity: 1,
    sheen: 0.4,
    sheenRoughness: 0.3,
    sheenColor: new THREE.Color('#fff1c2'),
  });
}

function GoldBand({ material }: { material: THREE.MeshPhysicalMaterial }) {
  const geo = useBandGeometry();
  return (
    <mesh geometry={geo} material={material} castShadow receiveShadow />
  );
}

function Setting({ material }: { material: THREE.MeshPhysicalMaterial }) {
  return (
    <group position={[0, 0.92, 0]}>
      {/* Gallery / head */}
      <mesh material={material} castShadow position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.3, 0.38, 0.2, 48]} />
      </mesh>
      <mesh material={material} castShadow position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.24, 0.28, 0.1, 48]} />
      </mesh>
      {/* Shoulders / cathedral bridges */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          material={material}
          castShadow
          position={[side * 0.55, -0.15, 0]}
          rotation={[0, 0, side * -0.55]}
        >
          <boxGeometry args={[0.55, 0.14, 0.18]} />
        </mesh>
      ))}
      {/* Six claw prongs */}
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        const r = 0.26;
        return (
          <group key={i} position={[Math.cos(a) * r, 0.28, Math.sin(a) * r]} rotation={[0.15, a, 0]}>
            <mesh material={material} castShadow>
              <cylinderGeometry args={[0.022, 0.032, 0.38, 12]} />
            </mesh>
            <mesh material={material} castShadow position={[0, 0.2, 0]}>
              <sphereGeometry args={[0.028, 12, 12]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Diamond() {
  const envMap = useEnvironment({ preset: 'city' });
  // Solid closed meshes refract correctly; faceted look comes from refraction + lighting
  return (
    <group position={[0, 1.34, 0]}>
      <mesh castShadow rotation={[0, Math.PI / 8, 0]} scale={[1, 1.15, 1]}>
        <octahedronGeometry args={[0.3, 0]} />
        <MeshRefractionMaterial
          envMap={envMap}
          bounces={5}
          aberrationStrength={0.02}
          ior={2.417}
          fresnel={1.2}
          toneMapped={false}
          color="#f4f9ff"
        />
      </mesh>
      {/* Girdle ring for brilliant silhouette */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.275, 0.018, 12, 48]} />
        <MeshRefractionMaterial
          envMap={envMap}
          bounces={3}
          aberrationStrength={0.01}
          ior={2.2}
          fresnel={1}
          toneMapped={false}
          color="#eef6ff"
        />
      </mesh>
    </group>
  );
}

function SparkleBurst() {
  const ref = useRef<THREE.Points>(null);
  const { positions, sizes } = useMemo(() => {
    const n = 48;
    const positions = new Float32Array(n * 3);
    const sizes = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.9 + Math.random() * 1.4;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = (Math.random() - 0.3) * 1.6;
      positions[i * 3 + 2] = Math.sin(a) * r;
      sizes[i] = 0.5 + Math.random();
    }
    return { positions, sizes };
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.elapsedTime * 0.05;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color="#fff6d0"
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function Jewelry() {
  const group = useRef<Group>(null);
  const gold = useMemo(() => goldMaterial(), []);

  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.12;
  });

  return (
    <group ref={group} rotation={[0.42, 0.55, 0]} scale={1.2}>
      <GoldBand material={gold} />
      <Setting material={gold} />
      <Diamond />
    </group>
  );
}

function StudioLights() {
  return (
    <>
      <ambientLight intensity={0.25} />
      <spotLight
        position={[5, 8, 4]}
        angle={0.35}
        penumbra={0.7}
        intensity={2.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        color="#fff4dc"
      />
      <spotLight position={[-5, 4, -3]} angle={0.5} penumbra={1} intensity={1.1} color="#9ec8ff" />
      <pointLight position={[0, 2.5, 2]} intensity={0.7} color="#ffe9a8" />
      <Environment resolution={256}>
        <Lightformer intensity={3} position={[0, 4, 0]} scale={[8, 1, 1]} form="ring" color="#ffe6a8" />
        <Lightformer intensity={1.5} position={[4, 1, -2]} scale={[3, 4, 1]} color="#ffffff" />
        <Lightformer intensity={1.2} position={[-4, 2, 1]} scale={[3, 3, 1]} color="#b8d4ff" />
        <Lightformer intensity={0.8} position={[0, -2, -4]} scale={[6, 2, 1]} color="#ffd27a" />
      </Environment>
    </>
  );
}

function PostFX() {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom luminanceThreshold={0.72} intensity={0.55} levels={7} mipmapBlur />
      <Vignette offset={0.25} darkness={0.55} />
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={new THREE.Vector2(0.0004, 0.0004)}
      />
      <SMAA />
    </EffectComposer>
  );
}

function Scene() {
  return (
    <>
      <color attach="background" args={['#00000000']} />
      <StudioLights />
      <PresentationControls
        global
        cursor
        snap={false}
        speed={1.05}
        zoom={1}
        polar={[-Math.PI / 6, Math.PI / 3]}
        azimuth={[-Math.PI, Math.PI]}
      >
        <Jewelry />
      </PresentationControls>
      <SparkleBurst />
      <ContactShadows
        position={[0, -1.45, 0]}
        opacity={0.55}
        scale={10}
        blur={2.8}
        far={4}
        color="#120c04"
      />
      <PostFX />
    </>
  );
}

function CanvasFallback() {
  return (
    <div className="hero-3d-fallback" aria-hidden>
      در حال ساخت مدل طلا…
    </div>
  );
}

/** Photoreal WebGL jewelry hero — lathed gold band + refractive diamond. */
export function HeroRing3D() {
  return (
    <div className="hero-ring hero-3d">
      <div className="hero-ring-glow hero-3d-glow" />
      <div className="hero-orbit-ring" aria-hidden />
      <div className="hero-3d-canvas">
        <Suspense fallback={<CanvasFallback />}>
          <Canvas
            dpr={[1, 2]}
            camera={{ position: [0, 0.85, 4.6], fov: 32, near: 0.1, far: 50 }}
            gl={{
              antialias: true,
              alpha: true,
              powerPreference: 'high-performance',
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.15,
            }}
            shadows
            style={{ width: '100%', height: '100%', touchAction: 'none' }}
          >
            <Scene />
          </Canvas>
        </Suspense>
      </div>
      <div className="hero-ring-hint">بکشید تا بچرخانید · طلای ۱۸ عیار · الماس تراش‌خورده</div>
    </div>
  );
}
