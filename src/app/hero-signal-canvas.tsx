"use client";

import { useEffect, useRef } from "react";

type ThreeModule = typeof import("three");

function createPointPositions(count: number) {
  const positions = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const band = index % 4;
    const angle = index * 0.42;
    const radius = 1.2 + band * 0.42;

    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = (band - 1.5) * 0.48 + Math.sin(index * 0.27) * 0.2;
    positions[index * 3 + 2] = Math.sin(angle) * radius;
  }

  return positions;
}

function createLinePositions(points: Float32Array) {
  const segments: number[] = [];
  const count = points.length / 3;

  for (let index = 0; index < count - 1; index += 1) {
    if (index % 3 === 2) {
      continue;
    }

    const next = index + 1;
    segments.push(
      points[index * 3],
      points[index * 3 + 1],
      points[index * 3 + 2],
      points[next * 3],
      points[next * 3 + 1],
      points[next * 3 + 2],
    );
  }

  return new Float32Array(segments);
}

export function HeroSignalCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    let animationFrame = 0;
    let disposed = false;
    let cleanupScene: (() => void) | undefined;

    async function mountScene() {
      const THREE: ThreeModule = await import("three");
      if (disposed || !canvas) {
        return;
      }

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        canvas,
        powerPreference: "high-performance",
      });
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
      const group = new THREE.Group();
      const points = createPointPositions(76);
      const pointGeometry = new THREE.BufferGeometry();
      const lineGeometry = new THREE.BufferGeometry();
      const pointMaterial = new THREE.PointsMaterial({
        color: 0x0f6a55,
        size: 0.035,
        transparent: true,
        opacity: 0.88,
      });
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x0f6a55,
        transparent: true,
        opacity: 0.16,
      });

      pointGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(points, 3),
      );
      lineGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(createLinePositions(points), 3),
      );
      group.add(new THREE.Points(pointGeometry, pointMaterial));
      group.add(new THREE.LineSegments(lineGeometry, lineMaterial));
      scene.add(group);
      camera.position.set(0, 0.15, 5.4);

      const resize = () => {
        const rect = canvas.getBoundingClientRect();
        const width = Math.max(1, rect.width);
        const height = Math.max(1, rect.height);

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
      };

      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(canvas);
      resize();

      const animate = () => {
        group.rotation.y += 0.0028;
        group.rotation.x = Math.sin(performance.now() * 0.0003) * 0.06;
        renderer.render(scene, camera);
        animationFrame = window.requestAnimationFrame(animate);
      };

      if (!reduceMotion) {
        animate();
      }

      cleanupScene = () => {
        resizeObserver.disconnect();
        window.cancelAnimationFrame(animationFrame);
        pointGeometry.dispose();
        lineGeometry.dispose();
        pointMaterial.dispose();
        lineMaterial.dispose();
        renderer.dispose();
      };
    }

    void mountScene();

    return () => {
      disposed = true;
      cleanupScene?.();
    };
  }, []);

  return <canvas ref={canvasRef} className="hero-signal-canvas" />;
}
