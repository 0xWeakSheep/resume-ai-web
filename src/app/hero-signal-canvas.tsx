"use client";

import { useEffect, useRef, useState } from "react";

type ThreeModule = typeof import("three");

const FACT_COUNT = 46;
const SIGNAL_COUNT = 12;
const MATCH_COUNT = 10;
const PULSE_COUNT = 6;

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function buildFactPositions() {
  const rand = seededRandom(20260718);
  const positions = new Float32Array(FACT_COUNT * 3);

  for (let index = 0; index < FACT_COUNT; index += 1) {
    positions[index * 3] = -1.35 + (rand() - 0.5) * 2;
    positions[index * 3 + 1] = (rand() - 0.5) * 2.3;
    positions[index * 3 + 2] = (rand() - 0.5) * 1.3;
  }

  return positions;
}

function buildSignalPositions() {
  const rand = seededRandom(977);
  const positions = new Float32Array(SIGNAL_COUNT * 3);

  for (let index = 0; index < SIGNAL_COUNT; index += 1) {
    const angle = -1.25 + (index / (SIGNAL_COUNT - 1)) * 2.5;
    const radius = 1.08;
    positions[index * 3] = 1.55 + Math.cos(angle) * radius;
    positions[index * 3 + 1] = Math.sin(angle) * radius * 1.15;
    positions[index * 3 + 2] = (rand() - 0.5) * 0.5;
  }

  return positions;
}

function buildMatchPairs() {
  const pairs: Array<[number, number]> = [];

  for (let index = 0; index < MATCH_COUNT; index += 1) {
    pairs.push([(index * 5 + 3) % FACT_COUNT, index % SIGNAL_COUNT]);
  }

  return pairs;
}

function buildLinePositions(
  facts: Float32Array,
  signals: Float32Array,
  pairs: Array<[number, number]>,
) {
  const segments = new Float32Array(pairs.length * 6);

  pairs.forEach(([factIndex, signalIndex], index) => {
    segments[index * 6] = facts[factIndex * 3];
    segments[index * 6 + 1] = facts[factIndex * 3 + 1];
    segments[index * 6 + 2] = facts[factIndex * 3 + 2];
    segments[index * 6 + 3] = signals[signalIndex * 3];
    segments[index * 6 + 4] = signals[signalIndex * 3 + 1];
    segments[index * 6 + 5] = signals[signalIndex * 3 + 2];
  });

  return segments;
}

export function HeroSignalCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    let disposed = false;
    let cleanupScene: (() => void) | undefined;

    async function mountScene() {
      if (!canvas) {
        return;
      }

      let THREE: ThreeModule;
      try {
        THREE = await import("three");
      } catch {
        if (!disposed) {
          setFallback(true);
        }
        return;
      }
      if (disposed) {
        return;
      }

      try {
        const motionQuery = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        );
        let reduceMotion = motionQuery.matches;

        const renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          canvas,
          powerPreference: "high-performance",
        });
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
        camera.position.set(0, 0.1, 6.2);

        const accent = new THREE.Color(
          getComputedStyle(document.documentElement)
            .getPropertyValue("--accent")
            .trim() || "#166c56",
        );

        const root = new THREE.Group();
        scene.add(root);

        // 职业事实节点
        const factPositions = buildFactPositions();
        const factGeometry = new THREE.BufferGeometry();
        factGeometry.setAttribute(
          "position",
          new THREE.BufferAttribute(factPositions, 3),
        );
        const factMaterial = new THREE.PointsMaterial({
          color: accent,
          size: 0.055,
          sizeAttenuation: true,
          transparent: true,
          opacity: 0.92,
        });
        root.add(new THREE.Points(factGeometry, factMaterial));

        // JD 需求信号
        const signalPositions = buildSignalPositions();
        const signalGeometry = new THREE.BufferGeometry();
        signalGeometry.setAttribute(
          "position",
          new THREE.BufferAttribute(signalPositions, 3),
        );
        const signalMaterial = new THREE.PointsMaterial({
          color: accent,
          size: 0.05,
          sizeAttenuation: true,
          transparent: true,
          opacity: 0.85,
        });
        root.add(new THREE.Points(signalGeometry, signalMaterial));

        const ringGeometry = new THREE.RingGeometry(0.09, 0.105, 40);
        const ringMaterial = new THREE.MeshBasicMaterial({
          color: accent,
          transparent: true,
          opacity: 0.4,
          side: THREE.DoubleSide,
        });
        const rings: InstanceType<ThreeModule["Mesh"]>[] = [];
        for (let index = 0; index < SIGNAL_COUNT; index += 1) {
          const ring = new THREE.Mesh(ringGeometry, ringMaterial);
          ring.position.set(
            signalPositions[index * 3],
            signalPositions[index * 3 + 1],
            signalPositions[index * 3 + 2],
          );
          rings.push(ring);
          root.add(ring);
        }

        // 匹配路径
        const pairs = buildMatchPairs();
        const lineGeometry = new THREE.BufferGeometry();
        lineGeometry.setAttribute(
          "position",
          new THREE.BufferAttribute(
            buildLinePositions(factPositions, signalPositions, pairs),
            3,
          ),
        );
        const lineMaterial = new THREE.LineBasicMaterial({
          color: accent,
          transparent: true,
          opacity: 0.13,
        });
        root.add(new THREE.LineSegments(lineGeometry, lineMaterial));

        // 沿路径流动的匹配脉冲
        const pulseGeometry = new THREE.BufferGeometry();
        const pulsePositions = new Float32Array(PULSE_COUNT * 3);
        pulseGeometry.setAttribute(
          "position",
          new THREE.BufferAttribute(pulsePositions, 3),
        );
        const pulseMaterial = new THREE.PointsMaterial({
          color: accent,
          size: 0.075,
          sizeAttenuation: true,
          transparent: true,
          opacity: 0.95,
        });
        root.add(new THREE.Points(pulseGeometry, pulseMaterial));

        const pulsePairs = pairs.slice(0, PULSE_COUNT);

        // 指针 / 触摸驱动
        let targetTiltX = 0;
        let targetTiltY = 0;
        let tiltX = 0;
        let tiltY = 0;
        let drift = 0;

        const onPointerMove = (event: PointerEvent) => {
          const rect = canvas.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) {
            return;
          }
          const nx =
            ((event.clientX - rect.left) / rect.width - 0.5) * 2;
          const ny =
            ((event.clientY - rect.top) / rect.height - 0.5) * 2;
          targetTiltY = Math.max(-1, Math.min(1, nx)) * 0.22;
          targetTiltX = Math.max(-1, Math.min(1, ny)) * 0.12;
        };
        window.addEventListener("pointermove", onPointerMove, {
          passive: true,
        });

        // 尺寸自适应 + DPR 限制
        const resize = () => {
          const rect = canvas.getBoundingClientRect();
          const width = Math.max(1, rect.width);
          const height = Math.max(1, rect.height);
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          // 宽屏把信号图谱推向右侧，给左侧文案留呼吸空间
          root.position.x = camera.aspect > 1.15 ? 0.85 : 0;
          camera.updateProjectionMatrix();
          renderer.render(scene, camera);
        };
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(canvas);

        // 页面隐藏 / 离屏时暂停
        let rafId = 0;
        let inView = true;
        let pageVisible = !document.hidden;

        const tick = (now: number) => {
          drift += 0.0016;
          tiltX += (targetTiltX - tiltX) * 0.045;
          tiltY += (targetTiltY - tiltY) * 0.045;
          root.rotation.y = -0.15 + drift + tiltY;
          root.rotation.x = tiltX + Math.sin(now * 0.00028) * 0.03;

          const progress = (now * 0.00012) % 1;
          pulsePairs.forEach(([factIndex, signalIndex], index) => {
            const u = (progress + index / PULSE_COUNT) % 1;
            const ax = factPositions[factIndex * 3];
            const ay = factPositions[factIndex * 3 + 1];
            const az = factPositions[factIndex * 3 + 2];
            pulsePositions[index * 3] =
              ax + (signalPositions[signalIndex * 3] - ax) * u;
            pulsePositions[index * 3 + 1] =
              ay + (signalPositions[signalIndex * 3 + 1] - ay) * u;
            pulsePositions[index * 3 + 2] =
              az + (signalPositions[signalIndex * 3 + 2] - az) * u;
          });
          const positionAttribute = pulseGeometry.getAttribute("position");
          positionAttribute.needsUpdate = true;

          lineMaterial.opacity =
            0.1 + 0.05 * (0.5 + 0.5 * Math.sin(now * 0.0006));
          pulseMaterial.opacity = 0.7 + 0.25 * Math.sin(now * 0.0011);

          renderer.render(scene, camera);
        };

        const shouldRun = () => !reduceMotion && inView && pageVisible;

        const loop = (now: number) => {
          rafId = 0;
          tick(now);
          if (shouldRun()) {
            rafId = window.requestAnimationFrame(loop);
          }
        };

        const syncLoop = () => {
          if (shouldRun()) {
            if (!rafId) {
              rafId = window.requestAnimationFrame(loop);
            }
          } else if (rafId) {
            window.cancelAnimationFrame(rafId);
            rafId = 0;
          }
        };

        const intersectionObserver = new IntersectionObserver((entries) => {
          inView = entries[0]?.isIntersecting ?? true;
          syncLoop();
        });
        intersectionObserver.observe(canvas);

        const onVisibilityChange = () => {
          pageVisible = !document.hidden;
          syncLoop();
        };
        document.addEventListener("visibilitychange", onVisibilityChange);

        const onMotionChange = () => {
          reduceMotion = motionQuery.matches;
          if (reduceMotion) {
            renderer.render(scene, camera);
          }
          syncLoop();
        };
        motionQuery.addEventListener("change", onMotionChange);

        resize();
        syncLoop();

        cleanupScene = () => {
          if (rafId) {
            window.cancelAnimationFrame(rafId);
            rafId = 0;
          }
          window.removeEventListener("pointermove", onPointerMove);
          document.removeEventListener("visibilitychange", onVisibilityChange);
          motionQuery.removeEventListener("change", onMotionChange);
          resizeObserver.disconnect();
          intersectionObserver.disconnect();
          factGeometry.dispose();
          factMaterial.dispose();
          signalGeometry.dispose();
          signalMaterial.dispose();
          ringGeometry.dispose();
          ringMaterial.dispose();
          lineGeometry.dispose();
          lineMaterial.dispose();
          pulseGeometry.dispose();
          pulseMaterial.dispose();
          renderer.dispose();
          renderer.forceContextLoss();
        };
      } catch {
        if (!disposed) {
          setFallback(true);
        }
      }
    }

    void mountScene();

    return () => {
      disposed = true;
      cleanupScene?.();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="hero-signal-canvas"
      aria-hidden="true"
      style={{
        pointerEvents: "none",
        ...(fallback
          ? {
              background:
                "radial-gradient(42rem 26rem at 72% 42%, var(--accent-soft), transparent 70%)",
            }
          : null),
      }}
    />
  );
}
