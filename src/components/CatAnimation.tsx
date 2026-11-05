import { useRef, useLayoutEffect } from "react";
import catSvg from "../assets/mochi_cat_animated.svg?raw"

type CatState = 1 | 2 | 3;

type CatAnimationProps = {
  state: CatState;
};

const moods = {
  1: "state-stress",
  2: "state-walk",
  3: "state-dance",
} as const;

export function CatAnimation({ state }: CatAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const svg = containerRef.current?.querySelector("svg");
    if (!svg) return;

    svg.setAttribute("width", "160");
    svg.setAttribute("height", "160");

    for (const id of Object.values(moods)) {
      const group = svg.querySelector<SVGGElement>(`#${id}`);
      if (!group) continue;

      group.querySelector(":scope > animate")?.remove();

      group.style.transition = "opacity 200ms ease";
      group.style.opacity = id === moods[state] ? "1" : "0";
    }
  }, [state]);

  return (
    <div
      className="centered-animation"
      ref={containerRef}
      style={{ width: 160, height: 160 }}
      dangerouslySetInnerHTML={{ __html: catSvg }}
    />
  );
}
