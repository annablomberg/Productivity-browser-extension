import plantSvg from "../assets/pixel_plant_animated.svg";

export function Plant() {
  return <img src={plantSvg} alt="Animated plant" width={160} height={160} />;
}


/* import { useLayoutEffect, useRef } from "react";
import plantSvg from "./assets/pixel_plant_animated.svg?raw";

type PlantProps = {
  health: number; // 0–100
  size?: number;
};

export function Plant({ health, size = 160 }: PlantProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const svg = containerRef.current?.querySelector("svg");
    if (!svg) return;

    const clampedHealth = Math.max(0, Math.min(100, health));

    // The supplied SVG is fully dead by 14 seconds.
    // Avoid 16 seconds, where the animation loops back to life.
    const time = (1 - clampedHealth / 100) * 14;

    svg.pauseAnimations();
    svg.setCurrentTime(time);

    svg.style.width = "100%";
    svg.style.height = "100%";
  }, [health]);

  return (
    <div
      ref={containerRef}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: plantSvg }}
    />
  );
} */