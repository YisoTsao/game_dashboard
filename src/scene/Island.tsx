import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, useState, type RefObject } from 'react';
import type { Group } from 'three';
import { GRASS_SIDE, STATUS_COLORS, STATUS_EMOJI, worstLevel } from '../theme';
import type { Game, ServiceKey, ServiceStatus } from '../types';
import { SERVICE_KEYS } from '../types';
import { ToonMesh } from './ToonMesh';

interface Props {
  game: Game;
  statuses?: Record<ServiceKey, ServiceStatus>;
  position: [number, number, number];
  index: number;
  selected: boolean;
  onSelect: () => void;
  /** DOM node the HTML labels mount into. */
  labelRoot: RefObject<HTMLElement | null>;
}

/** A floating island. Flags around the rim show each service; the balloon shows the worst status. */
export function Island({ game, statuses, position, index, selected, onSelect, labelRoot }: Props) {
  const ref = useRef<Group>(null);
  const [hover, setHover] = useState(false);

  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const t = clock.elapsedTime + index * 1.3;
    g.position.y = position[1] + Math.sin(t * 0.9) * 0.12;
    g.rotation.y += ((hover || selected ? 0.25 : 0) - g.rotation.y) * 0.05 + 0.0015;
    const target = selected ? 1.12 : hover ? 1.06 : 1;
    g.scale.setScalar(g.scale.x + (target - g.scale.x) * 0.15);
  });

  const levels = SERVICE_KEYS.map((k) => statuses?.[k]?.level ?? 'unknown');
  const used = game.services;
  const overall = statuses ? worstLevel(levels) : 'unknown';

  return (
    <group
      ref={ref}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = '';
      }}
    >
      {/* grass top */}
      <ToonMesh color={game.color} position={[0, 0, 0]}>
        <cylinderGeometry args={[1.25, 1.15, 0.35, 9]} />
      </ToonMesh>
      {/* earth underside */}
      <ToonMesh color={GRASS_SIDE} position={[0, -0.75, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[1.12, 1.2, 9]} />
      </ToonMesh>
      {/* a little house so web apps and games read differently */}
      {game.kind === 'web' ? <Tent /> : <Tree />}

      {/* service flags */}
      {SERVICE_KEYS.map((k, i) => {
        if (!used[k]) return null;
        const a = (i / SERVICE_KEYS.length) * Math.PI * 2 + 0.4;
        const level = statuses?.[k]?.level ?? 'unknown';
        return <Flag key={k} angle={a} color={STATUS_COLORS[level]} />;
      })}

      {/* overall balloon */}
      <Balloon color={STATUS_COLORS[overall]} />

      <Html portal={labelRoot as RefObject<HTMLElement>} position={[0, -1.45, 0]} center distanceFactor={9} zIndexRange={[10, 0]}>
        <div className={`island-label ${selected ? 'is-selected' : ''}`} onClick={onSelect}>
          <span className="dot" style={{ background: STATUS_COLORS[overall] }}>
            {STATUS_EMOJI[overall]}
          </span>
          {game.name}
          {!game.confirmed && <span className="unconfirmed" title="Service mapping not confirmed yet">?</span>}
        </div>
      </Html>
    </group>
  );
}

function Flag({ angle, color }: { angle: number; color: string }) {
  const r = 1.0;
  return (
    <group position={[Math.cos(angle) * r, 0.17, Math.sin(angle) * r]} rotation={[0, -angle, 0]}>
      <ToonMesh color="#6B4A2B" position={[0, 0.35, 0]} outline={0.02}>
        <cylinderGeometry args={[0.025, 0.025, 0.7, 6]} />
      </ToonMesh>
      <ToonMesh color={color} position={[0, 0.58, 0.14]} rotation={[0, Math.PI / 2, 0]} outline={0.025}>
        <boxGeometry args={[0.28, 0.2, 0.03]} />
      </ToonMesh>
    </group>
  );
}

function Tree() {
  return (
    <group position={[-0.25, 0.17, -0.1]}>
      <ToonMesh color="#7A5230" position={[0, 0.3, 0]} outline={0.03}>
        <cylinderGeometry args={[0.08, 0.11, 0.6, 7]} />
      </ToonMesh>
      <ToonMesh color="#4E9A56" position={[0, 0.8, 0]}>
        <icosahedronGeometry args={[0.42, 0]} />
      </ToonMesh>
      <ToonMesh color="#5DB066" position={[0.35, 0.35, 0.25]} outline={0.03}>
        <icosahedronGeometry args={[0.22, 0]} />
      </ToonMesh>
    </group>
  );
}

function Tent() {
  return (
    <group position={[-0.2, 0.17, -0.1]}>
      <ToonMesh color="#FFF6E5" position={[0, 0.25, 0]} outline={0.03}>
        <boxGeometry args={[0.6, 0.5, 0.5]} />
      </ToonMesh>
      <ToonMesh color="#E5534B" position={[0, 0.72, 0]} rotation={[0, Math.PI / 4, 0]} outline={0.03}>
        <coneGeometry args={[0.52, 0.45, 4]} />
      </ToonMesh>
    </group>
  );
}

function Balloon({ color }: { color: string }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = Math.sin(clock.elapsedTime * 1.4) * 0.08;
  });
  return (
    <group ref={ref} position={[0.45, 0.17, 0.1]}>
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 1.4, 4]} />
        <meshBasicMaterial color="#2B2118" />
      </mesh>
      <ToonMesh color={color} position={[0, 1.55, 0]} scale={[1, 1.15, 1]}>
        <sphereGeometry args={[0.28, 16, 12]} />
      </ToonMesh>
    </group>
  );
}
