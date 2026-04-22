import React, { useRef } from "react";

export default function MagneticButton({ children, className }) {
  const ref = useRef();

  const handleMove = (e) => {
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    ref.current.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
  };

  const reset = () => {
    ref.current.style.transform = "translate(0,0)";
  };

  return (
    <button
      ref={ref}
      className={className}
      onMouseMove={handleMove}
      onMouseLeave={reset}
    >
      {children}
    </button>
  );
}