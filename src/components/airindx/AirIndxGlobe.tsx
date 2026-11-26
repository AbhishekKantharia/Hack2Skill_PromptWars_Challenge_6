'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import type { AirIndxMarker, ZoomCommand } from '@/types/airindx';

const GLOBE_RADIUS = 1.85;
const MIN_DISTANCE = 3.4;
const MAX_DISTANCE = 7.2;

interface GlobeProps {
  markers: AirIndxMarker[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  zoomCommand: ZoomCommand;
  reducedMotion: boolean;
  rotationPaused: boolean;
}

export function latLonToVector3(lat: number, lon: number, radius: number) {
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
    const nextDistance = THREE.MathUtils.clamp(
      camera.position.length() - zoomCommand.direction * 0.55,
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
  glowRef,
}: {
  marker: AirIndxMarker;
  selected: boolean;
  onSelect: (id: string) => void;
  glowRef: (mesh: THREE.Mesh | null) => void;
}) {
  const position = useMemo(
    () => latLonToVector3(marker.lat, marker.lon, GLOBE_RADIUS * 1.025),
    [marker.lat, marker.lon]
  );

  useEffect(
    () => () => {
      document.body.style.cursor = '';
    },
    []
  );

  return (
    <group position={position}>
      <mesh>
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
        <sphereGeometry args={[selected ? 0.15 : 0.12, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Earth({
  markers,
  selectedId,
  onSelect,
  reducedMotion,
}: Omit<GlobeProps, 'zoomCommand' | 'rotationPaused'>) {
  const [dayMap, nightMap, specularMap, normalMap] = useTexture([
    '/airindx/earth_atmos_2048.jpg',
    '/airindx/earth_lights_2048.png',
    '/airindx/earth_specular_2048.jpg',
    '/airindx/earth_normal_2048.jpg',
  ]);
  const glowRefs = useRef<Array<THREE.Mesh | null>>([]);

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    glowRefs.current.forEach((mesh, index) => {
      if (!mesh) return;
      const marker = markers[index];
      const phase = marker ? marker.lat : index;
      mesh.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2.4 + phase) * 0.1);
    });
  });

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
      {markers.map((marker, index) => (
        <AqiMarker
          key={marker.id}
          marker={marker}
          selected={marker.id === selectedId}
          onSelect={onSelect}
          glowRef={(mesh) => {
            glowRefs.current[index] = mesh;
          }}
        />
      ))}
    </group>
  );
}

export function AirIndxGlobe({
  markers,
  selectedId,
  onSelect,
  zoomCommand,
  reducedMotion,
  rotationPaused,
}: GlobeProps) {
  return (
    <div
      role="img"
      aria-label={`Interactive 3D Earth with ${markers.length} city air quality markers. Use the keyboard location list for marker selection.`}
      className="h-full w-full"
    >
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0.4, 0.25, 5.4], fov: 42, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[5, 3, 4]} intensity={2.1} color="#ffffff" />
        <directionalLight position={[-5, -2, -4]} intensity={0.6} color="#4f8cff" />
        <Suspense fallback={null}>
          <Earth
            markers={markers}
            selectedId={selectedId}
            onSelect={onSelect}
            reducedMotion={reducedMotion}
          />
        </Suspense>
        <CameraRig zoomCommand={zoomCommand} />
        <OrbitControls
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          autoRotate={!reducedMotion && !rotationPaused}
          autoRotateSpeed={0.32}
          rotateSpeed={0.45}
          zoomSpeed={0.7}
          minDistance={MIN_DISTANCE}
          maxDistance={MAX_DISTANCE}
        />
      </Canvas>
    </div>
  );
}
