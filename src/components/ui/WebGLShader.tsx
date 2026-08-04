import { useEffect, useRef } from 'react';
import type * as ThreeNS from 'three';
import { cn } from '@/lib/cn';

/**
 * Animated RGB-split wave, rendered as a raw WebGL fragment shader.
 *
 * Adapted from the 21st.dev component. Four things changed, all of them
 * forced by this codebase rather than by taste:
 *
 * 1. `absolute`, not `fixed`. The original pins the canvas to the viewport,
 *    which is correct for a single-page demo and wrong here: a fixed canvas
 *    would sit behind every route in the app, not just the hero, and would
 *    still be painting while someone read a specification table.
 *
 * 2. three.js is imported dynamically. It is ~600 KB, and `/` currently scores
 *    Perf 100 with a 0.6s LCP. A static import would put the whole library on
 *    the critical path of the landing route to draw a background. Loading it
 *    after mount costs nothing visible — the canvas is already black.
 *
 * 3. It stops when off-screen. The original animates forever via
 *    requestAnimationFrame; browsers throttle background tabs but not a
 *    scrolled-past canvas, so the GPU would keep drawing under the footer.
 *
 * 4. It honours `prefers-reduced-motion` by rendering one frame and stopping.
 *    The project's motion contract is two-layer (CSS + JS), and an animation
 *    driven entirely by rAF is invisible to the CSS half.
 *
 * `"use client"` from the original is omitted: this is Vite with React Router,
 * not Next, so there is no server/client boundary for it to mark.
 */
export function WebGLShader({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let animationId: number | null = null;
    let renderer: ThreeNS.WebGLRenderer | null = null;
    let mesh: ThreeNS.Mesh | null = null;
    let scene: ThreeNS.Scene | null = null;
    let observer: IntersectionObserver | null = null;
    let onResize: (() => void) | null = null;

    void (async () => {
      const THREE = await import('three');
      if (disposed) return;

      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const vertexShader = `
        attribute vec3 position;
        void main() {
          gl_Position = vec4(position, 1.0);
        }
      `;

      const fragmentShader = `
        precision highp float;
        uniform vec2 resolution;
        uniform float time;
        uniform float xScale;
        uniform float yScale;
        uniform float distortion;

        void main() {
          vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);

          float d = length(p) * distortion;

          float rx = p.x * (1.0 + d);
          float gx = p.x;
          float bx = p.x * (1.0 - d);

          float r = 0.05 / abs(p.y + sin((rx + time) * xScale) * yScale);
          float g = 0.05 / abs(p.y + sin((gx + time) * xScale) * yScale);
          float b = 0.05 / abs(p.y + sin((bx + time) * xScale) * yScale);

          gl_FragColor = vec4(r, g, b, 1.0);
        }
      `;

      scene = new THREE.Scene();
      renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
      // Capped at 2. The original uses devicePixelRatio unbounded, which on a
      // 3x phone renders nine times the pixels of a 1x screen for a blurred
      // gradient nobody is inspecting.
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(new THREE.Color(0x000000));

      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, -1);

      const uniforms = {
        resolution: { value: [canvas.clientWidth, canvas.clientHeight] },
        time: { value: 0.0 },
        xScale: { value: 1.0 },
        yScale: { value: 0.5 },
        distortion: { value: 0.05 },
      };

      const position = [
        -1.0, -1.0, 0.0, 1.0, -1.0, 0.0, -1.0, 1.0, 0.0, 1.0, -1.0, 0.0, -1.0, 1.0, 0.0, 1.0, 1.0,
        0.0,
      ];

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(position), 3));

      const material = new THREE.RawShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms,
        side: THREE.DoubleSide,
      });

      mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      // Sized from the element, not the window: the canvas fills its section,
      // and the hero is not always the full viewport height.
      const resize = () => {
        if (!renderer) return;
        const width = canvas.clientWidth || window.innerWidth;
        const height = canvas.clientHeight || window.innerHeight;
        renderer.setSize(width, height, false);
        uniforms.resolution.value = [width, height];
      };
      resize();
      onResize = resize;
      window.addEventListener('resize', resize);

      const draw = () => {
        if (!renderer || !scene) return;
        renderer.render(scene, camera);
      };

      if (prefersReduced) {
        // One frame, held. The wave is still there; it simply does not move.
        draw();
        return;
      }

      let running = false;
      const tick = () => {
        if (disposed) return;
        uniforms.time.value += 0.01;
        draw();
        animationId = requestAnimationFrame(tick);
      };

      const start = () => {
        if (running || disposed) return;
        running = true;
        tick();
      };
      const stop = () => {
        running = false;
        if (animationId) cancelAnimationFrame(animationId);
        animationId = null;
      };

      if (typeof IntersectionObserver === 'undefined') {
        start();
      } else {
        observer = new IntersectionObserver(
          ([entry]) => (entry?.isIntersecting ? start() : stop()),
          { threshold: 0 }
        );
        observer.observe(canvas);
      }
    })();

    return () => {
      disposed = true;
      if (animationId) cancelAnimationFrame(animationId);
      observer?.disconnect();
      if (onResize) window.removeEventListener('resize', onResize);
      if (mesh) {
        scene?.remove(mesh);
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
        else mesh.material.dispose();
      }
      renderer?.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className={cn('block size-full', className)} />;
}
