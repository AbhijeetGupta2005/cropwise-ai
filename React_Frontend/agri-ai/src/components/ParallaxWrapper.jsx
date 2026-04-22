import React from "react";

export default function ParallaxWrapper({ speed, children }) {
  return (
    <div data-parallax={speed} style={{ willChange: "transform" }}>
      {children}
    </div>
  );
}