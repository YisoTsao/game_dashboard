import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { useMemo, useRef, type RefObject } from 'react';
import type { Group } from 'three';
import type { Game, StatusReport } from '../types';
import { Island } from './Island';
import { ToonMesh } from './ToonMesh';

interface Props {
  games: Game[];
  report?: StatusReport;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  labelRoot: RefObject<HTMLElement | null>;
}

/** Lays islands out on a gentle arc so they all fit in one view. */
function layout(n: number): [number, number, number][] {
  const perRow = n <= 4 ? n : Math.ceil(n / 2);
  return Array.from({ length: n }, (_, i) => {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const count = row === 0 ? perRow : n - perRow;
    const x = (col - (count - 1) / 2) * 3.6;
    const z = row * 4.4 - (n > perRow ? 2.2 : 0);
    const y = Math.sin(i * 1.7) * 0.25;
    return [x, y, z];
  });
}

export function Scene({ games, report, selectedId, onSelect, labelRoot }: Props) {
  const positions = useMemo(() => layout(games.length), [games.length]);
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 11, 10], fov: 44 }}
      onPointerMissed={() => onSelect(null)}
      gl={{ antialias: true }}
    >
      <ambientLight intensity={1.1} />
      <directionalLight position={[6, 10, 6]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
      <Clouds />
      <CameraFit />
      {games.map((g, i) => (
        <Island
          key={g.id}
          game={g}
          index={i}
          statuses={report?.games[g.id]}
          report={report}
          position={positions[i]}
          selected={selectedId === g.id}
          onSelect={() => onSelect(g.id)}
          labelRoot={labelRoot}
        />
      ))}
      <OrbitControls
        enablePan={false}
        minDistance={7}
        maxDistance={32}
        minPolarAngle={0.35}
        maxPolarAngle={1.25}
        target={[0, 0, 0]}
      />
    </Canvas>
  );
}

function Clouds() {
  const ref = useRef<Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.position.x = Math.sin(performance.now() / 9000) * 0.8;
  });
  const clouds = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        // Behind and below the islands only, so none drift in front of the camera.
        const a = Math.PI + (i / 6) * Math.PI;
        return { pos: [Math.cos(a) * 12, -3 + (i % 3) * 1.2, Math.sin(a) * 9 - 2] as [number, number, number], s: 0.9 + (i % 3) * 0.3 };
      }),
    [],
  );
  return (
    <group ref={ref}>
      {clouds.map((c, i) => (
        <group key={i} position={c.pos} scale={c.s}>
          {[
            [0, 0, 0, 0.8],
            [0.8, -0.1, 0.1, 0.6],
            [-0.8, -0.15, 0, 0.55],
            [0.3, 0.4, -0.1, 0.55],
          ].map(([x, y, z, r], j) => (
            <ToonMesh key={j} color="#FFFFFF" position={[x, y, z]} outline={0.04}>
              <sphereGeometry args={[r, 14, 10]} />
            </ToonMesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** Pulls the camera back on narrow screens so every island stays in view. */
function CameraFit() {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / size.height;
    const k = Math.max(1, 1.5 / aspect);
    camera.position.set(0, 11 * k, 10 * k);
    camera.lookAt(0, 0, 0);
  }, [camera, size]);
  return null;
}
