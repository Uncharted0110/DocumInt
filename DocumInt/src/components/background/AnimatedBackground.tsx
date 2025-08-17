import React, { useEffect, useRef } from "react";

const AnimatedBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let stars: {
      x: number;
      y: number;
      r: number;
      baseAlpha: number;
      phase: number;
      freq: number;
    }[] = [];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      initStars();
    };

    const initStars = () => {
      const rect = canvas.getBoundingClientRect();
      const area = rect.width * rect.height;
      const count = Math.max(150, Math.min(900, Math.floor(area * 0.00025)));
      stars = Array.from({ length: count }).map(() => ({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        r: 0.4 + Math.random() * 1.2,
        baseAlpha: 0.35 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        freq: 0.002 + Math.random() * 0.008, // twinkle frequency
      }));
    };

    let t = 0;
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      // Dark blue gradient sky
      const g = ctx.createLinearGradient(0, 0, 0, rect.height);
      g.addColorStop(0, "#0b1020");
      g.addColorStop(0.5, "#0a1328");
      g.addColorStop(1, "#0f172a");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Stars with subtle twinkle
      for (const s of stars) {
        const alpha = s.baseAlpha * (0.7 + 0.3 * Math.sin(t * s.freq + s.phase));
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      t += 16; // ms-ish; used for twinkle only (no drift to keep stars "in place")
      rafRef.current = requestAnimationFrame(draw);
    };

    const onResize = () => {
      resize();
    };

    resize();
    window.addEventListener("resize", onResize);
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      role="presentation"
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
};

export default AnimatedBackground;