'use client';

import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
  targetAlpha: number;
  speed: number;
  dx: number;
  dy: number;
}

export default function GalaxyCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initStars();
    };

    window.addEventListener('resize', handleResize);

    const starCount = Math.floor(Math.min(width, height) / 10) + 30;
    let stars: Star[] = [];

    function initStars() {
      stars = [];
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 1.8 + 0.5,
          alpha: Math.random() * 0.7 + 0.2,
          targetAlpha: Math.random() * 0.8 + 0.2,
          speed: Math.random() * 0.02 + 0.005,
          dx: (Math.random() - 0.5) * 0.15,
          dy: (Math.random() - 0.5) * 0.15,
        });
      }
    }

    initStars();

    function render() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, width, height);

      // Draw faint glowing nebula gradients
      const grad1 = ctx.createRadialGradient(
        width * 0.3,
        height * 0.4,
        10,
        width * 0.3,
        height * 0.4,
        width * 0.5
      );
      grad1.addColorStop(0, 'rgba(236, 72, 153, 0.08)');
      grad1.addColorStop(0.5, 'rgba(168, 85, 247, 0.04)');
      grad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      const grad2 = ctx.createRadialGradient(
        width * 0.7,
        height * 0.6,
        10,
        width * 0.7,
        height * 0.6,
        width * 0.4
      );
      grad2.addColorStop(0, 'rgba(244, 63, 94, 0.06)');
      grad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      // Render stars
      for (const star of stars) {
        if (!prefersReducedMotion) {
          // Drifting
          star.x += star.dx;
          star.y += star.dy;

          if (star.x < 0) star.x = width;
          if (star.x > width) star.x = 0;
          if (star.y < 0) star.y = height;
          if (star.y > height) star.y = 0;

          // Twinkling
          if (Math.abs(star.alpha - star.targetAlpha) < 0.02) {
            star.targetAlpha = Math.random() * 0.8 + 0.2;
          } else {
            star.alpha += (star.targetAlpha - star.alpha) * star.speed;
          }
        }

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 240, 245, ${star.alpha.toFixed(2)})`;
        ctx.shadowColor = 'rgba(251, 113, 133, 0.8)';
        ctx.shadowBlur = star.size > 1.2 ? 6 : 0;
        ctx.fill();
      }

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    }

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0"
    />
  );
}
