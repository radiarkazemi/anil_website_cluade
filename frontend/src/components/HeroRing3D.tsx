import { Canvas, useFrame } from '@react-three/fiber';
import {
  ContactShadows,
  Environment,
  Float,
  PresentationControls,
} from '@react-three/drei';
import { Suspense, useMemo, useRef } from 'react';
import type { Group, Mesh } from 'three';
import * as THREE from 'three';

/** Procedural 18k gold engagement ring — real WebGL geometry + PBR metals. */
function GoldRing() {
  const group = useRef<Group>(null);
  const gem = useRef<Mesh>(null);

  const goldMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#d4af37'),
        metalness: 1,
        roughness: 0.18,
        reflectivity: 1,
        clearcoat: 0.45,
        clearcoatRoughness: 0.12,
        envMapIntensity: 1.35,
      }),
    [],
  );

  const goldDark = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#a67c1a'),
        metalness: 1,
        roughness: 0.28,
        envMapIntensity: 1.1,
      }),
    [],
  );

  const diamondMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#f5fbff'),
        metalness: 0.05,
        roughness: 0.02,
        transmission: 0.72,
        thickness: 1.2,
        ior: 2.4,
        clearcoat: 1,
        clearcoatRoughness: 0,
        envMapIntensity: 2,
        transparent: true,
        opacity: 0.95,
      }),
    [],
  );

  useFrame((_, dt) => {
    if (gem.current) gem.current.rotation.y += dt * 0.35;
  });

  // Band sits in XZ plane; stone on +Y
  return (
    <group ref={group} rotation={[0.35, 0.4, 0]} scale={1.15}>
      {/* Main band */}
      <mesh rotation={[Math.PI / 2, 0, 0]} material={goldMat} castShadow>
        <torusGeometry args={[1.05, 0.16, 48, 96]} />
      </mesh>
      {/* Inner polish rim */}
      <mesh rotation={[Math.PI / 2, 0, 0]} material={goldDark}>
        <torusGeometry args={[1.05, 0.08, 24, 64]} />
      </mesh>

      {/* Prong / setting base */}
      <mesh position={[0, 1.05, 0]} material={goldMat} castShadow>
        <cylinderGeometry args={[0.22, 0.32, 0.28, 24]} />
      </mesh>

      {/* Four prongs */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.22, 1.28, Math.sin(a) * 0.22]}
            rotation={[0.25, a, 0]}
            material={goldMat}
            castShadow
          >
            <cylinderGeometry args={[0.035, 0.045, 0.38, 8]} />
          </mesh>
        );
      })}

      {/* Diamond */}
      <mesh ref={gem} position={[0, 1.42, 0]} material={diamondMat} castShadow>
        <octahedronGeometry args={[0.32, 0]} />
      </mesh>
      {/* Diamond table facet hint */}
      <mesh position={[0, 1.58, 0]} rotation={[Math.PI, 0, 0]} material={diamondMat}>
        <coneGeometry args={[0.18, 0.16, 8]} />
      </mesh>
    </group>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[4, 6, 3]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <spotLight position={[-3, 5, -2]} intensity={0.8} angle={0.45} penumbra={0.6} color="#ffe9b0" />
      <pointLight position={[2, 1, 3]} intensity={0.55} color="#fff6d8" />

      <PresentationControls
        global
        cursor
        snap
        speed={1.2}
        zoom={1}
        polar={[-Math.PI / 5, Math.PI / 4]}
        azimuth={[-Math.PI / 1.4, Math.PI / 1.4]}
      >
        <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.55}>
          <GoldRing />
        </Float>
      </PresentationControls>

      <ContactShadows
        position={[0, -1.35, 0]}
        opacity={0.45}
        scale={8}
        blur={2.4}
        far={3}
        color="#1a1206"
      />
      <Environment preset="studio" />
    </>
  );
}

function CanvasFallback() {
  return (
    <div className="hero-3d-fallback" aria-hidden>
      در حال بارگذاری مدل سه‌بعدی…
    </div>
  );
}

/** True WebGL 3D jewelry hero — drag to orbit. */
export function HeroRing3D() {
  return (
    <div className="hero-ring hero-3d">
      <div className="hero-ring-glow" />
      <div className="hero-orbit-ring" aria-hidden />
      <div className="hero-3d-canvas">
        <Suspense fallback={<CanvasFallback />}>
          <Canvas
            dpr={[1, 1.75]}
            camera={{ position: [0, 0.6, 4.2], fov: 38 }}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
            style={{ width: '100%', height: '100%', touchAction: 'none' }}
          >
            <Scene />
          </Canvas>
        </Suspense>
      </div>
      <div className="hero-ring-hint">بکشید تا بچرخانید · مدل سه‌بعدی واقعی</div>
    </div>
  );
}
