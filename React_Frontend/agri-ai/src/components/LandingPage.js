import { useState, useEffect, useRef} from 'react';
import { useHistory } from 'react-router-dom';
import '../styles/LandingPage.css';
import { useLanguage } from '../context/LanguageContext';

// ─── Data ──────────────────────────────────────────────────────
const CROPS = ['Rice','Maize','Wheat','Cotton','Mango','Banana','Apple','Chickpea','Lentil','Watermelon','Coconut','Coffee'];
const FERTILIZERS = ['Urea','DAP','28-28','20-20','17-17-17','14-35-14','10-26-26','02-32-26'];

const FEATURES = [
  {
    icon: 'ML',
    tag: '01',
    title: 'Ensemble ML Engine',
    desc: 'XGBoost + Random Forest + KNN vote together. Weighted consensus eliminates single-model bias for dramatically higher accuracy.',
    accent: '#c8f55a',
    stat: '94.2%',
    statLabel: 'accuracy',
  },
  {
    icon: 'WX',
    tag: '02',
    title: 'Live Weather Fusion',
    desc: 'Auto-pulls temperature, humidity and rainfall from real-time weather APIs. No manual entry needed for climate parameters.',
    accent: '#5af5c8',
    stat: '<2s',
    statLabel: 'response',
  },
  {
    icon: 'AI',
    tag: '03',
    title: 'AI Crop Advisor',
    desc: 'Gemini-powered guidance for region and season-specific crop planning, with practical recommendations you can act on quickly.',
    accent: '#a78bfa',
    stat: '22',
    statLabel: 'crop types',
  },
  {
    icon: 'PH',
    tag: '04',
    title: 'Soil Health Scoring',
    desc: 'Live NPK + pH radar visualisation. See your soil profile against the ideal range for any crop, updated as you type.',
    accent: '#f5c842',
    stat: '7',
    statLabel: 'parameters',
  },
];

const STATS = [
  { val: '22', label: 'Crop Types', suffix: '+' },
  { val: '8', label: 'Fertilizers', suffix: '+' },
  { val: '3', label: 'ML Models', suffix: '' },
  { val: '94', label: 'Accuracy', suffix: '%' },
];

const HOW_STEPS = [
  { n: '01', title: 'Enter Soil Data', desc: 'Input NPK ratios, pH level and let weather auto-fill temperature, humidity and rainfall.', icon: '01' },
  { n: '02', title: 'Models Predict', desc: 'Three ML algorithms run simultaneously. A weighted vote selects the highest-confidence result.', icon: '02' },
  { n: '03', title: 'Get Your Answer', desc: 'Receive crop or fertilizer recommendation with confidence scores, calendar, and soil radar.', icon: '03' },
];

// ─── Particle Canvas ───────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const mouseRef  = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    let W, H, particles;

    const resize = () => {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
      init();
    };

    const rand = (a, b) => Math.random() * (b - a) + a;

    class Particle {
      constructor() { this.reset(true); }
      reset(init = false) {
        this.x  = rand(0, W);
        this.y  = init ? rand(0, H) : H + 10;
        this.vx = rand(-0.15, 0.15);
        this.vy = rand(-0.4, -0.15);
        this.r  = rand(1, 2.5);
        this.alpha = rand(0.15, 0.55);
        this.color = Math.random() > 0.6 ? '#c8f55a' : Math.random() > 0.5 ? '#5af5c8' : '#ffffff';
        this.life  = 0;
        this.maxLife = rand(200, 500);
      }
      update() {
        const dx = mouseRef.current.x - this.x;
        const dy = mouseRef.current.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const force = (120 - dist) / 120 * 0.02;
          this.vx -= dx / dist * force;
          this.vy -= dy / dist * force;
        }
        this.vx *= 0.99;
        this.vy *= 0.99;
        this.x += this.vx;
        this.y += this.vy;
        this.life++;
        if (this.life > this.maxLife || this.y < -10) this.reset();
      }
      draw() {
        const fade = Math.min(this.life / 60, 1) * Math.min((this.maxLife - this.life) / 60, 1);
        ctx.save();
        ctx.globalAlpha = this.alpha * fade;
        ctx.fillStyle   = this.color;
        ctx.shadowBlur  = 6;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    const init = () => {
      particles = Array.from({ length: 120 }, () => new Particle());
    };

    const drawConnections = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx   = particles[i].x - particles[j].x;
          const dy   = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80) {
            ctx.save();
            ctx.globalAlpha = (1 - dist / 80) * 0.08;
            ctx.strokeStyle = '#c8f55a';
            ctx.lineWidth   = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    };

    const loop = () => {
      ctx.clearRect(0, 0, W, H);
      drawConnections();
      particles.forEach(p => { p.update(); p.draw(); });
      animRef.current = requestAnimationFrame(loop);
    };

    const onMouse = (e) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };

    resize();
    loop();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouse);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
    };
  }, []);

  return <canvas ref={canvasRef} className="lp-particles" />;
}

// ─── Magnetic Button ───────────────────────────────────────────
function MagneticBtn({ children, className, onClick, strength = 0.35 }) {
  const ref = useRef(null);

  const onMove = (e) => {
    const el   = ref.current;
    const rect = el.getBoundingClientRect();
    const cx   = rect.left + rect.width  / 2;
    const cy   = rect.top  + rect.height / 2;
    const dx   = (e.clientX - cx) * strength;
    const dy   = (e.clientY - cy) * strength;
    el.style.transform = `translate(${dx}px,${dy}px) scale(1.04)`;
  };

  const onLeave = () => {
    const el = ref.current;
    el.style.transform = '';
    el.style.transition = 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)';
    setTimeout(() => { if (el) el.style.transition = ''; }, 500);
  };

  return (
    <button ref={ref} className={className} onClick={onClick}
      onMouseMove={onMove} onMouseLeave={onLeave}>
      {children}
    </button>
  );
}

// ─── Counter animation ─────────────────────────────────────────
function AnimCounter({ target, suffix, duration = 1800 }) {
  const [val, setVal] = useState(0);
  const ref           = useRef(null);
  const started       = useRef(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const num   = parseInt(target, 10);
        const start = performance.now();
        const tick  = (now) => {
          const t = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - t, 4);
          setVal(Math.round(ease * num));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{val}{suffix}</span>;
}

// ─── Scroll reveal hook ────────────────────────────────────────
function useReveal(threshold = 0.15) {
  const ref     = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVis(true); obs.disconnect(); }
    }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, vis];
}

// ─── Spinning Ticker ───────────────────────────────────────────
function Ticker({ items, speed = 40 }) {
  const doubled = [...items, ...items];
  return (
    <div className="lp-ticker">
      <div className="lp-ticker__track" style={{ animationDuration: `${speed}s` }}>
        {doubled.map((item, i) => (
          <span key={i} className="lp-ticker__item">
            <span className="lp-ticker__dot">+</span> {item}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── 3D Tilt Card ─────────────────────────────────────────────
function TiltCard({ children, className, intensity = 12 }) {
  const ref = useRef(null);

  const onMove = (e) => {
    const el   = ref.current;
    const rect = el.getBoundingClientRect();
    const x    = (e.clientX - rect.left) / rect.width  - 0.5;
    const y    = (e.clientY - rect.top)  / rect.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${x * intensity}deg) rotateX(${-y * intensity}deg) translateZ(8px)`;
    el.style.boxShadow = `${-x * 20}px ${y * 20}px 50px rgba(0,0,0,0.5), 0 0 40px rgba(200,245,90,0.08)`;
  };

  const onLeave = () => {
    const el = ref.current;
    el.style.transform  = '';
    el.style.boxShadow  = '';
    el.style.transition = 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.6s ease';
    setTimeout(() => { if (el) el.style.transition = ''; }, 600);
  };

  return (
    <div ref={ref} className={className} onMouseMove={onMove} onMouseLeave={onLeave}>
      {children}
    </div>
  );
}

// ─── Glitch Text ───────────────────────────────────────────────
function GlitchText({ children }) {
  return (
    <span className="lp-glitch" data-text={children}>
      {children}
    </span>
  );
}

// ─── Main Component ────────────────────────────────────────────
function LandingPage() {
  const history  = useHistory();
  const { t } = useLanguage();
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [mousePos,  setMousePos]  = useState({ x: 0, y: 0 });
  const [heroRef,   heroVis]      = useReveal(0.1);
  const [statsRef,  statsVis]     = useReveal(0.2);
  const [featRef,   featVis]      = useReveal(0.1);
  const [howRef,    howVis]       = useReveal(0.1);
  const [ctaRef,    ctaVis]       = useReveal(0.2);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    const onMouse  = (e) => setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    window.addEventListener('scroll', onScroll);
    window.addEventListener('mousemove', onMouse);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMouse);
    };
  }, []);

  const parallaxStyle = {
    transform: `translate(${(mousePos.x - 0.5) * -18}px, ${(mousePos.y - 0.5) * -12}px)`,
    transition: 'transform 0.1s linear',
  };

  return (
    <div className="lp">
      <ParticleCanvas />

      {/* Mesh gradient bg */}
      <div className="lp-mesh" style={parallaxStyle} />
      <div className="lp-noise" />

      {/* ── NAV ── */}
      <nav className={`lp-nav ${scrolled ? 'lp-nav--scrolled' : ''}`}>
        <div className="lp-nav__logo" onClick={() => history.push('/')}>
          <span className="lp-nav__logo-hex">CW</span>
          <span>CropWise <em>AI</em></span>
        </div>

        <ul className={`lp-nav__links ${menuOpen ? 'lp-nav__links--open' : ''}`}>
          <li><a href="#features" onClick={() => setMenuOpen(false)}>{t('navFeatures')}</a></li>
          <li><a href="#how" onClick={() => setMenuOpen(false)}>{t('navHow')}</a></li>
          <li><a href="#crops" onClick={() => setMenuOpen(false)}>{t('navCrops')}</a></li>
        </ul>

        <div className="lp-nav__right">
          <MagneticBtn className="lp-nav__cta" onClick={() => history.push('/crop')}>
            {t('navOpenApp')} <span className="lp-nav__cta-arrow">></span>
          </MagneticBtn>
        </div>

        <button className={`lp-burger ${menuOpen ? 'lp-burger--open' : ''}`} onClick={() => setMenuOpen(o => !o)}>
          <span /><span /><span />
        </button>
      </nav>

      {/* ── HERO ── */}
      <section className="lp-hero" ref={heroRef}>
        <div className={`lp-hero__inner ${heroVis ? 'lp-vis' : ''}`}>

          <div className="lp-hero__eyebrow">
            <span className="lp-hero__eyebrow-dot" />
            <span>{t('heroEyebrow')}</span>
            <span className="lp-hero__eyebrow-dot" />
          </div>

          <h1 className="lp-hero__title">
            <span className="lp-hero__title-line lp-hero__title-line--1">{t('heroGrow')}</span>
            <span className="lp-hero__title-line lp-hero__title-line--2">{t('heroSmarter')}</span>
            <span className="lp-hero__title-line lp-hero__title-line--3">
              <GlitchText>{t('heroField')}</GlitchText>
            </span>
          </h1>

          <p className="lp-hero__sub">
            {t('heroSub')}
          </p>

          <div className="lp-hero__actions">
            <MagneticBtn className="lp-btn lp-btn--primary" onClick={() => history.push('/crop')} strength={0.25}>
              <span className="lp-btn__shimmer" />
              <span>{t('heroCropBtn')}</span>
              <span className="lp-btn__arrow">></span>
            </MagneticBtn>

            <MagneticBtn className="lp-btn lp-btn--ghost" onClick={() => history.push('/fertilizer')} strength={0.25}>
              {t('heroFertilizerBtn')}
            </MagneticBtn>
          </div>

          {/* Floating crop orbit */}

          <div className="lp-hero__scroll-hint">
            <div className="lp-hero__scroll-line" />
            <span>scroll</span>
          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <Ticker items={[...CROPS, ...FERTILIZERS.map(f => `Fertilizer: ${f}`)]} speed={35} />

      {/* ── STATS ── */}
      <section className="lp-stats" ref={statsRef}>
        <div className={`lp-stats__grid ${statsVis ? 'lp-vis' : ''}`}>
          {STATS.map((s, i) => (
            <div key={i} className="lp-stat" style={{ '--delay': `${i * 0.1}s` }}>
              <div className="lp-stat__val">
                {statsVis ? <AnimCounter target={s.val} suffix={s.suffix} /> : `0${s.suffix}`}
              </div>
              <div className="lp-stat__label">{({
                'Crop Types': t('statsCropTypes'),
                'Fertilizers': t('statsFertilizers'),
                'ML Models': t('statsModels'),
                'Accuracy': t('statsAccuracy'),
              }[s.label] || s.label)}</div>
              <div className="lp-stat__line" />
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="lp-features" id="features" ref={featRef}>
        <div className="lp-features__header">
          <div className="lp-label">{t('featuresLabel')}</div>
          <h2 className="lp-section-title">
            {t('featuresTitleA')}<br /><em>{t('featuresTitleB')}</em>
          </h2>
        </div>

        <div className={`lp-features__grid ${featVis ? 'lp-vis' : ''}`}>
          {FEATURES.map((f, i) => (
            <TiltCard key={i} className="lp-feat-card" intensity={10}>
              <div className="lp-feat-card__top">
                <span className="lp-feat-card__tag">{f.tag}</span>
                <span className="lp-feat-card__stat-wrap">
                  <span className="lp-feat-card__stat" style={{ color: f.accent }}>{f.stat}</span>
                  <span className="lp-feat-card__stat-label">{f.statLabel}</span>
                </span>
              </div>
              <h3 className="lp-feat-card__title" style={{ '--accent': f.accent }}>{f.title}</h3>
              <p className="lp-feat-card__desc">{f.desc}</p>
              <div className="lp-feat-card__glow" style={{ background: f.accent }} />
              <div className="lp-feat-card__border" style={{ '--accent': f.accent }} />
            </TiltCard>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="lp-how" id="how" ref={howRef}>
        <div className="lp-label">{t('processLabel')}</div>
        <h2 className="lp-section-title">{t('processTitleA')} <em>{t('processTitleB')}</em></h2>

        <div className={`lp-how__steps ${howVis ? 'lp-vis' : ''}`}>
          {HOW_STEPS.map((s, i) => (
            <div key={i} className="lp-how__step" style={{ '--delay': `${i * 0.15}s` }}>
              <div className="lp-how__step-num">{s.n}</div>
              <div className="lp-how__step-icon">{s.icon}</div>
              <h3 className="lp-how__step-title">{s.title}</h3>
              <p className="lp-how__step-desc">{s.desc}</p>
              {i < HOW_STEPS.length - 1 && <div className="lp-how__connector" />}
            </div>
          ))}
        </div>
      </section>

      {/* ── CROP SHOWCASE ── */}
      <section className="lp-crops" id="crops">
        <div className="lp-label">{t('cropsLabel')}</div>
        <h2 className="lp-section-title">{t('cropsTitleA')} <em>{t('cropsTitleB')}</em></h2>
        <div className="lp-crops__scroll">
          <div className="lp-crops__track">
            {[...CROPS, ...CROPS].map((c, i) => (
              <div key={i} className="lp-crop-pill">
                <span className="lp-crop-pill__dot" />
                {c}
              </div>
            ))}
          </div>
        </div>
        <div className="lp-crops__ferts">
          {FERTILIZERS.map((f, i) => (
            <TiltCard key={i} className="lp-fert-card" intensity={8}>
              <span className="lp-fert-card__icon">FT</span>
              <span className="lp-fert-card__name">{f}</span>
            </TiltCard>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="lp-cta" ref={ctaRef}>
        <div className={`lp-cta__inner ${ctaVis ? 'lp-vis' : ''}`}>
          <div className="lp-cta__bg-grid" aria-hidden="true" />
          <div className="lp-label" style={{ justifyContent: 'center' }}>{t('ctaLabel')}</div>
          <h2 className="lp-cta__title">
            {t('ctaTitleA')}<br />
            <em>{t('ctaTitleB')}</em>
          </h2>
          <p className="lp-cta__sub">{t('ctaSub')}</p>
          <div className="lp-cta__btns">
            <MagneticBtn className="lp-btn lp-btn--primary lp-btn--xl" onClick={() => history.push('/crop')}>
              <span className="lp-btn__shimmer" />
              {t('ctaCropBtn')}
            </MagneticBtn>
            <MagneticBtn className="lp-btn lp-btn--ghost lp-btn--xl" onClick={() => history.push('/fertilizer')}>
              {t('ctaFertilizerBtn')}
            </MagneticBtn>
          </div>
          <div className="lp-cta__badges">
            {[t('badgeMl'), t('badgeWeather'), t('badgeSignup'), t('badgeFree')].map((b, i) => (
              <span key={i} className="lp-badge">{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-footer__logo" onClick={() => history.push('/')}>
          <span className="lp-footer__logo-hex">CW</span>
          CropWise <em>AI</em>
        </div>
        <p className="lp-footer__copy">
          {t('footerBuiltWith')} | {new Date().getFullYear()} CropWise AI
        </p>
        <div className="lp-footer__links">
          <button onClick={() => history.push('/crop')}>{t('footerCrops')}</button>
          <button onClick={() => history.push('/fertilizer')}>{t('footerFertilizer')}</button>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
