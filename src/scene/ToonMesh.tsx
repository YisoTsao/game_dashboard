import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { BackSide, BufferGeometry, Mesh, ShaderMaterial, Color } from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { INK } from '../theme';
import { toonGradient } from './toon';

interface Props {
  color: string;
  children: ReactNode; // the geometry
  /** Outline thickness in world units. 0 turns it off. */
  outline?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
}

const hullCache = new WeakMap<BufferGeometry, BufferGeometry>();

/** Same shape with smooth normals, so pushing vertices outward leaves no cracks at hard edges. */
function hullGeometry(src: BufferGeometry): BufferGeometry {
  let g = hullCache.get(src);
  if (!g) {
    const c = src.clone();
    for (const name of Object.keys(c.attributes)) if (name !== 'position') c.deleteAttribute(name);
    g = mergeVertices(c);
    g.computeVertexNormals();
    hullCache.set(src, g);
  }
  return g;
}

function outlineMaterial(thickness: number) {
  return new ShaderMaterial({
    side: BackSide,
    uniforms: { thickness: { value: thickness }, color: { value: new Color(INK) } },
    vertexShader: /* glsl */ `
      uniform float thickness;
      void main() {
        vec3 p = position + normal * thickness;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      void main() { gl_FragColor = vec4(color, 1.0); }`,
  });
}

/**
 * A mesh with cel shading and a thick ink outline: the base look of every object.
 * The outline is an "inverted hull": a copy of the shape pushed outward and drawn back faces only.
 */
export function ToonMesh({ color, children, outline = 0.05, ...rest }: Props) {
  const main = useRef<Mesh>(null);
  const hull = useRef<Mesh>(null);

  useLayoutEffect(() => {
    if (!main.current || !hull.current || outline <= 0) return;
    hull.current.geometry = hullGeometry(main.current.geometry);
    const mat = outlineMaterial(outline);
    hull.current.material = mat;
    return () => mat.dispose();
  }, [outline]);

  return (
    <group {...rest}>
      <mesh ref={main} castShadow receiveShadow>
        {children}
        <meshToonMaterial color={color} gradientMap={toonGradient()} />
      </mesh>
      {outline > 0 && <mesh ref={hull} raycast={() => null} />}
    </group>
  );
}
