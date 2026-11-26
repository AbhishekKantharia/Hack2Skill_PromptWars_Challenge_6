'use client';

import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import type { AirIndxMarker } from '@/types/airindx';

const GLOBE_RADIUS = 1.85;
const MIN_DISTANCE = 3.4;
const MAX_DISTANCE = 7.2;

export interface ZoomCommand {
  direction: 1 | -1;
  nonce: number;
}

interface GlobeProps {
  markers: AirIndxMarker[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  zoomCommand: ZoomCommand;
}

function latLonToVector3(lat: number, lon: number, radius: number) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function CameraRig({ zoomCommand }: { zoomCommand: ZoomCommand }) {
  const { camera } = useThree();

  useEffect(() => {
    if (zoomCommand.nonce === 0) return;
    const distance = camera.position.length();
    const nextDistance = THREE.MathUtils.clamp(
      distance + zoomCommand.direction * -0.55,
      MIN_DISTANCE,
      MAX_DISTANCE
    );
    camera.position.setLength(nextDistance);
    camera.updateProjectionMatrix();
  }, [camera, zoomCommand]);

  return null;
}

function AqiMarker({
  marker,
  selected,
  onSelect,
}: {
  marker: AirIndxMarker;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const glowRef = useRef<THREE.Mesh>(null);
  const position = useMemo(
    () => latLonToVector3(marker.lat, marker.lon, GLOBE_RADIUS * 1.025),
    [marker.lat, marker.lon]
  );

  useFrame(({ clock }) => {
    if (!glowRef.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 2.4 + marker.lat) * 0.1;
    glowRef.current.scale.setScalar(pulse);
  });

  return (
    <group position={position}>
      <mesh
        onClick={(event) => {
          event.stopPropagation();
          onSelect(marker.id);
        }}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = '';
        }}
      >
        <sphereGeometry args={[selected ? 0.082 : 0.063, 18, 18]} />
        <meshBasicMaterial color={marker.colorHex} toneMapped={false} />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[selected ? 0.16 : 0.12, 18, 18]} />
        <meshBasicMaterial
          color={marker.colorHex}
          transparent
          opacity={selected ? 0.3 : 0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function Earth({ markers, selectedId, onSelect }: Omit<GlobeProps, 'zoomCommand'>) {
  const [dayMap, nightMap, specularMap, normalMap] = useTexture([
    '/airindx/earth_atmos_2048.jpg',
    '/airindx/earth_lights_2048.png',
    '/airindx/earth_specular_2048.jpg',
    '/airindx/earth_normal_2048.jpg',
  ]);

  return (
    <group>
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 96, 96]} />
        <meshPhongMaterial
          map={dayMap}
          normalMap={normalMap}
          specularMap={specularMap}
          emissiveMap={nightMap}
          emissive="#d8f3ff"
          emissiveIntensity={0.42}
          shininess={18}
        />
      </mesh>
      <mesh scale={1.035}>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshBasicMaterial
          color="#22d3ee"
          transparent
          opacity={0.075}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {markers.map((marker) => (
        <AqiMarker
          key={marker.id}
          marker={marker}
          selected={marker.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}

export function AirIndxGlobe({ markers, selectedId, onSelect, zoomCommand }: GlobeProps) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0.4, 0.25, 5.4], fov: 42, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 3, 4]} intensity={2.1} color="#ffffff" />
      <directionalLight position={[-5, -2, -4]} intensity={0.6} color="#4f8cff" />
      <Suspense fallback={null}>
        <Earth markers={markers} selectedId={selectedId} onSelect={onSelect} />
      </Suspense>
      <CameraRig zoomCommand={zoomCommand} />
      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        autoRotate
        autoRotateSpeed={0.32}
        rotateSpeed={0.45}
        zoomSpeed={0.7}
        minDistance={MIN_DISTANCE}
        maxDistance={MAX_DISTANCE}
      />
    </Canvas>
  );
}
