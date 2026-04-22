export function initAdvancedEffects() {
  initParallax();
  initParticles();
  initCursorLight();
}

/* ================= PARALLAX ================= */
function initParallax() {
  const layers = document.querySelectorAll("[data-parallax]");

  window.addEventListener("mousemove", (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;

    layers.forEach((layer) => {
      const speed = layer.getAttribute("data-parallax");
      const moveX = x * speed * 20;
      const moveY = y * speed * 20;

      layer.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
    });
  });
}

/* ================= PARTICLES ================= */
function initParticles() {
  const canvas = document.querySelector(".lp-particles");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let particles = [];

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  for (let i = 0; i < 100; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(200,245,90,0.7)";
      ctx.fill();
    });

    // connect lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 100) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = "rgba(200,245,90,0.1)";
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(draw);
  }

  draw();
}

/* ================= CURSOR LIGHT ================= */
function initCursorLight() {
  document.addEventListener("mousemove", (e) => {
    document.documentElement.style.setProperty("--mouse-x", `${e.clientX}px`);
    document.documentElement.style.setProperty("--mouse-y", `${e.clientY}px`);
  });
}