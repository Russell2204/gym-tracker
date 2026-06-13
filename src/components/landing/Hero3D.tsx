'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import type { Group } from 'three';

/** Блин штанги: плоский цилиндр с фаской-тором. */
function Plate({ x, radius, color }: { x: number; radius: number; color: string }) {
  return (
    <group position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
      <mesh>
        <cylinderGeometry args={[radius, radius, 0.22, 48]} />
        <meshStandardMaterial color={color} metalness={0.85} roughness={0.3} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.045, 16, 48]} />
        <meshStandardMaterial color="#1a1d23" metalness={0.9} roughness={0.25} />
      </mesh>
    </group>
  );
}

function Barbell() {
  const ref = useRef<Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.25;
  });

  return (
    <group ref={ref} rotation={[0.35, 0, -0.12]}>
      {/* гриф */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, 6.4, 32]} />
        <meshStandardMaterial color="#c8ccd4" metalness={1} roughness={0.22} />
      </mesh>
      {/* замки */}
      {[-2.15, 2.15].map((x) => (
        <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.14, 0.14, 0.45, 32]} />
          <meshStandardMaterial color="#9aa1ab" metalness={1} roughness={0.3} />
        </mesh>
      ))}
      {/* блины: тяжёлые внутри, лёгкие снаружи */}
      <Plate x={-2.55} radius={1.15} color="#23272f" />
      <Plate x={-2.8} radius={0.85} color="#4e7dff" />
      <Plate x={-3.0} radius={0.6} color="#8b5cf6" />
      <Plate x={2.55} radius={1.15} color="#23272f" />
      <Plate x={2.8} radius={0.85} color="#4e7dff" />
      <Plate x={3.0} radius={0.6} color="#8b5cf6" />
    </group>
  );
}

export default function Hero3D() {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0.6, 7.5], fov: 42 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.35} />
      <pointLight position={[6, 6, 6]} intensity={120} color="#4e7dff" />
      <pointLight position={[-6, -3, 4]} intensity={90} color="#8b5cf6" />
      <pointLight position={[0, 5, -6]} intensity={60} color="#ffffff" />
      <Float speed={1.6} rotationIntensity={0.35} floatIntensity={0.9}>
        <Barbell />
      </Float>
    </Canvas>
  );
}
