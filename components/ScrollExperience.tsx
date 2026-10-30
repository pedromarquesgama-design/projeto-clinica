"use client";

import { useEffect, useRef, useState } from "react";

const SEQ1 = { dir: "sem", count: 35 }; // virando de frente sem a carne
const SEQ2_MOBILE = { dir: "com", count: 40 }; // doutor com a carne (mobile)
const SEQ2_DESKTOP = { dir: "com-desktop", count: 87 }; // doutor com a carne (PC & tablet)

const src = (dir: string, i: number) => `/frames/${dir}/scene${String(i + 1).padStart(5, "0")}.jpg`;
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const range = (p: number, a: number, b: number) => clamp((p - a) / (b - a), 0, 1);

// Scroll timeline inside the sticky 3-stage track (0..1)
// 0.00 -> 0.30 : Video 1 scrubs (35 frames)
// 0.30 -> 0.42 : About Us section slides up from bottom
// 0.42 -> 0.60 : About Us stays in view for reading
// 0.60 -> 0.70 : Video 2 section slides up from bottom over About Us
// 0.70 -> 1.00 : Video 2 scrubs (87 frames on PC/tablet, 40 frames on mobile)
const V1_END = 0.30;
const ABOUT_IN_END = 0.42;
const V2_IN_START = 0.60;
const V2_IN_END = 0.70;

export default function ScrollExperience() {
  const trackRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLElement>(null);
  const canvas1Ref = useRef<HTMLCanvasElement>(null);
  const canvas2Ref = useRef<HTMLCanvasElement>(null);
  const ctx1Ref = useRef<CanvasRenderingContext2D | null>(null);
  const ctx2Ref = useRef<CanvasRenderingContext2D | null>(null);

  // Direct DOM refs to avoid 60fps React re-renders while scrolling
  const sec1Ref = useRef<HTMLElement>(null);
  const aboutSecRef = useRef<HTMLElement>(null);
  const sec2Ref = useRef<HTMLElement>(null);
  const aboutVisualRef = useRef<HTMLDivElement>(null);
  const aboutImgRef = useRef<HTMLImageElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const images1 = useRef<HTMLImageElement[]>([]);
  const images2Mobile = useRef<HTMLImageElement[]>([]);
  const images2Desktop = useRef<HTMLImageElement[]>([]);
  const isDesktopRef = useRef<boolean>(true);

  const targetProgress = useRef(0);
  const smoothProgress = useRef(0);
  const lastDrawn1 = useRef(-1);
  const lastDrawn2 = useRef(-1);

  const [loaded, setLoaded] = useState(0);
  const [navSolid, setNavSolid] = useState(false);
  const [contactVisible, setContactVisible] = useState(false);

  // Discrete visibility states (only trigger React render when a threshold is crossed)
  const [showPhrase1, setShowPhrase1] = useState(true);
  const [showPhrase2, setShowPhrase2] = useState(false);
  const [aboutActive, setAboutActive] = useState(false);
  const [showV2Editorial, setShowV2Editorial] = useState(false);
  const [showHint, setShowHint] = useState(true);

  const stateCache = useRef({
    navSolid: false,
    showPhrase1: true,
    showPhrase2: false,
    aboutActive: false,
    showV2Editorial: false,
    showHint: true,
  });

  function drawSingleImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
    if (!img || !img.complete || !img.naturalWidth) return;
    const { width: cw, height: ch } = ctx.canvas;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const s = Math.max(cw / iw, ch / ih);
    const w = iw * s;
    const h = ih * s;
    ctx.drawImage(img, (cw - w) / 2, (ch - h) * 0.2, w, h);
  }

  function drawSequenceFrame(
    ctx: CanvasRenderingContext2D,
    frames: HTMLImageElement[],
    t: number,
    lastRef: React.MutableRefObject<number>,
    force = false
  ) {
    if (!frames.length) return;
    const idx = Math.round(clamp(t, 0, 1) * (frames.length - 1));
    if (!force && idx === lastRef.current) return;
    const img = frames[idx];
    if (!img || !img.complete || !img.naturalWidth) return;
    lastRef.current = idx;
    drawSingleImage(ctx, img);
  }

  function applyFrame(pr: number, force = false) {
    const a = images1.current;
    const b = isDesktopRef.current ? images2Desktop.current : images2Mobile.current;

    // 1. Draw only the active video canvas
    if (pr <= ABOUT_IN_END + 0.02) {
      const ctx1 = ctx1Ref.current;
      if (ctx1 && a.length) {
        drawSequenceFrame(ctx1, a, range(pr, 0, V1_END), lastDrawn1, force);
      }
    }

    if (pr >= V2_IN_START - 0.02) {
      const ctx2 = ctx2Ref.current;
      if (ctx2 && b.length) {
        drawSequenceFrame(ctx2, b, range(pr, V2_IN_END, 1), lastDrawn2, force);
      }
    }

    // 2. Update section transforms directly on DOM (GPU-accelerated translate3d, 0 React re-renders)
    const slideAbout = range(pr, V1_END, ABOUT_IN_END);
    const slideV2 = range(pr, V2_IN_START, V2_IN_END);
    const aboutHold = range(pr, ABOUT_IN_END, V2_IN_START);

    if (sec1Ref.current) {
      sec1Ref.current.style.transform = `translate3d(0, ${(-slideAbout * 18).toFixed(2)}%, 0) scale(${(
        1 -
        slideAbout * 0.04
      ).toFixed(4)})`;
    }

    if (aboutSecRef.current) {
      const y = (1 - slideAbout) * 100 - slideV2 * 14;
      const sc = 1 - slideV2 * 0.03;
      aboutSecRef.current.style.transform = `translate3d(0, ${y.toFixed(2)}%, 0) scale(${sc.toFixed(4)})`;
    }

    if (aboutVisualRef.current) {
      aboutVisualRef.current.style.transform = `translate3d(0, ${((0.5 - aboutHold) * 10).toFixed(1)}px, 0)`;
    }

    if (aboutImgRef.current) {
      aboutImgRef.current.style.transform = `scale(${(
        1.08 -
        slideAbout * 0.05 +
        aboutHold * 0.04
      ).toFixed(4)})`;
    }

    if (sec2Ref.current) {
      sec2Ref.current.style.transform = `translate3d(0, ${((1 - slideV2) * 100).toFixed(2)}%, 0)`;
    }

    if (progressRef.current) {
      progressRef.current.style.transform = `scaleX(${pr.toFixed(4)})`;
    }

    // 3. Only trigger React state updates when discrete thresholds flip
    const cache = stateCache.current;
    const nextP1 = pr >= 0 && pr < 0.15;
    const nextP2 = pr >= 0.15 && pr < 0.34;
    const nextAbout = pr >= 0.33 && pr < 0.68;
    const nextV2 = pr >= 0.71 && pr <= 1.01;
    const nextHint = pr < V1_END;

    if (cache.showPhrase1 !== nextP1) {
      cache.showPhrase1 = nextP1;
      setShowPhrase1(nextP1);
    }
    if (cache.showPhrase2 !== nextP2) {
      cache.showPhrase2 = nextP2;
      setShowPhrase2(nextP2);
    }
    if (cache.aboutActive !== nextAbout) {
      cache.aboutActive = nextAbout;
      setAboutActive(nextAbout);
    }
    if (cache.showV2Editorial !== nextV2) {
      cache.showV2Editorial = nextV2;
      setShowV2Editorial(nextV2);
    }
    if (cache.showHint !== nextHint) {
      cache.showHint = nextHint;
      setShowHint(nextHint);
    }
  }

  function loadSequenceInto(
    seq: { dir: string; count: number },
    targetArr: HTMLImageElement[],
    onEachLoaded?: () => void
  ) {
    if (targetArr.length === seq.count) return;
    for (let i = 0; i < seq.count; i++) {
      const img = new Image();
      img.decoding = "async";
      const finish = () => {
        onEachLoaded?.();
      };
      img.onload = () => {
        if (typeof img.decode === "function") {
          img.decode().then(finish).catch(finish);
        } else {
          finish();
        }
      };
      img.onerror = finish;
      img.src = src(seq.dir, i);
      targetArr[i] = img;
    }
  }

  // Preload & pre-decode all frames into GPU memory so mobile & desktop never stall mid-scroll
  useEffect(() => {
    const isDesktop = window.innerWidth >= 768;
    isDesktopRef.current = isDesktop;
    const seq2 = isDesktop ? SEQ2_DESKTOP : SEQ2_MOBILE;
    const target2 = isDesktop ? images2Desktop.current : images2Mobile.current;

    const total = SEQ1.count + seq2.count;
    let done = 0;
    const markDone = () => {
      done++;
      setLoaded(Math.min(100, Math.round((done / total) * 100)));
      if (done === 1 || done === SEQ1.count || done === total) {
        applyFrame(smoothProgress.current, true);
      }
    };

    loadSequenceInto(SEQ1, images1.current, markDone);
    loadSequenceInto(seq2, target2, markDone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Smooth inertial RAF scrub loop + resize listener
  useEffect(() => {
    let lastW = 0;
    let lastH = 0;
    let rafId = 0;
    let running = false;

    const initContexts = () => {
      if (canvas1Ref.current && !ctx1Ref.current) {
        ctx1Ref.current = canvas1Ref.current.getContext("2d", { alpha: false });
      }
      if (canvas2Ref.current && !ctx2Ref.current) {
        ctx2Ref.current = canvas2Ref.current.getContext("2d", { alpha: false });
      }
    };

    const resize = (force = false) => {
      const w = innerWidth;
      const h = innerHeight;
      // Ignore small height-only resizes caused by mobile browser address bar hiding/showing
      if (!force && Math.abs(w - lastW) < 2 && Math.abs(h - lastH) < 160) {
        return;
      }
      lastW = w;
      lastH = h;

      const nowDesktop = w >= 768;
      if (nowDesktop !== isDesktopRef.current) {
        isDesktopRef.current = nowDesktop;
        lastDrawn2.current = -1;
        const seq2 = nowDesktop ? SEQ2_DESKTOP : SEQ2_MOBILE;
        const target2 = nowDesktop ? images2Desktop.current : images2Mobile.current;
        if (target2.length === 0) {
          loadSequenceInto(seq2, target2, () => {
            applyFrame(smoothProgress.current, true);
          });
        }
      }

      const maxDpr = w < 768 ? 1.5 : 2;
      const dpr = Math.min(devicePixelRatio || 1, maxDpr);
      [canvas1Ref.current, canvas2Ref.current].forEach((c) => {
        if (!c) return;
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      });
      initContexts();
      if (ctx1Ref.current) ctx1Ref.current.imageSmoothingQuality = "medium";
      if (ctx2Ref.current) ctx2Ref.current.imageSmoothingQuality = "medium";
      applyFrame(smoothProgress.current, true);
    };

    const tick = () => {
      const target = targetProgress.current;
      const current = smoothProgress.current;
      const diff = target - current;

      if (Math.abs(diff) > 0.0002) {
        // Fast 1x real-time response (0.48 avoids slow-motion drag while keeping frame stepping fluid)
        smoothProgress.current = current + diff * 0.48;
        applyFrame(smoothProgress.current, false);
        rafId = requestAnimationFrame(tick);
      } else {
        smoothProgress.current = target;
        applyFrame(target, false);
        running = false;
      }
    };

    const startLoop = () => {
      if (!running) {
        running = true;
        rafId = requestAnimationFrame(tick);
      }
    };

    const onScroll = () => {
      const track = trackRef.current;
      const max = track
        ? track.offsetHeight - innerHeight
        : document.documentElement.scrollHeight - innerHeight;
      targetProgress.current = max > 0 ? clamp(scrollY / max, 0, 1) : 0;

      const nextNavSolid = scrollY > 40;
      if (stateCache.current.navSolid !== nextNavSolid) {
        stateCache.current.navSolid = nextNavSolid;
        setNavSolid(nextNavSolid);
      }

      startLoop();
    };

    const handleResize = () => resize(false);

    resize(true);
    const track = trackRef.current;
    const maxInit = track ? track.offsetHeight - innerHeight : 1;
    const initP = maxInit > 0 ? clamp(scrollY / maxInit, 0, 1) : 0;
    targetProgress.current = initP;
    smoothProgress.current = initP;
    applyFrame(initP, true);

    addEventListener("resize", handleResize, { passive: true });
    addEventListener("scroll", onScroll, { passive: true });

    const contactEl = contactRef.current;
    let observer: IntersectionObserver | null = null;
    if (contactEl && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setContactVisible(true);
            }
          });
        },
        { threshold: 0.18 }
      );
      observer.observe(contactEl);
    }

    return () => {
      removeEventListener("resize", handleResize);
      removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
      observer?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollToTrackFraction = (f: number) => {
    const track = trackRef.current;
    if (!track) return;
    const max = track.offsetHeight - innerHeight;
    window.scrollTo({ top: max * f, behavior: "smooth" });
  };

  const scrollToContact = () => {
    const el = document.getElementById("contato");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* Fixed Navbar */}
      <header className={`navbar ${navSolid ? "navbar-scrolled" : ""}`}>
        <div className="navbar-inner">
          <button
            type="button"
            onClick={() => scrollToTrackFraction(0)}
            className="navbar-brand"
            aria-label="Início - Instituto Gibran"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo.png" alt="Instituto Gibran" className="navbar-logo" />
            <div className="navbar-brand-text">
              <strong>INSTITUTO GIBRAN</strong>
              <span>Dr. Kalil Gibran</span>
            </div>
          </button>

          <nav className="navbar-links">
            <button type="button" onClick={() => scrollToTrackFraction(0)}>
              Início
            </button>
            <button type="button" onClick={() => scrollToTrackFraction(0.48)}>
              Sobre Nós
            </button>
            <button type="button" onClick={() => scrollToTrackFraction(0.78)}>
              Filosofia
            </button>
            <button type="button" onClick={scrollToContact}>
              Contato
            </button>
          </nav>

          <a
            href="https://wa.me/5573981711127"
            target="_blank"
            rel="noopener noreferrer"
            className="navbar-cta"
          >
            Agendar Consulta
          </a>
        </div>
      </header>

      <main className="page-wrapper">
        {/* Sticky Scroll-Driven Experience Track */}
        <div ref={trackRef} className="scroll-root">
          <div className="stage">
            {/* Section 1: First video sequence */}
            <section
              ref={sec1Ref}
              className="video-section"
              style={{
                zIndex: 1,
                transform: "translate3d(0, 0%, 0) scale(1)",
              }}
            >
              <canvas ref={canvas1Ref} />
              <div className="shade" />

              <h1 className={`phrase phrase-first ${showPhrase1 ? "show" : ""}`}>
                O SEU
                <br />
                CORPO É
                <br />
                REFLEXO
                <br />
                DOS SEUS
                <br />
                HÁBITOS.
              </h1>

              <div className={`phrase small ${showPhrase2 ? "show" : ""}`}>
                <div className="story-eyebrow">
                  <span className="story-eyebrow-text">ATENÇÃO</span>
                  <span className="story-eyebrow-line" aria-hidden="true" />
                </div>

                <div className="story-headline">
                  É SÓ A
                  <br />
                  <span className="story-headline-anchor">IDADE.</span>
                </div>

                <span className="story-divider" aria-hidden="true" />

                <p className="story-copy">
                  Frase clássica para ignorar a queda hormonal ou o declínio androgênico natural que
                  começa a partir dos 30 anos.
                </p>
              </div>
            </section>

            {/* Section 2 (Middle): About Us in the style of the reference */}
            <section
              ref={aboutSecRef}
              className={`video-section about-section ${aboutActive ? "about-active" : ""}`}
              style={{
                zIndex: 2,
                transform: "translate3d(0, 100%, 0) scale(1)",
              }}
            >
              <div className="about-ambient-glow" aria-hidden="true" />
              <div className="about-container">
                {/* Left collage */}
                <div
                  ref={aboutVisualRef}
                  className="about-visual"
                  style={{
                    transform: "translate3d(0, 5px, 0)",
                  }}
                >
                  <div className="about-photo-main">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      ref={aboutImgRef}
                      src="/images/doctor.png"
                      alt="Dr. Kalil Gibran"
                      style={{
                        transform: "scale(1.08)",
                      }}
                    />
                  </div>

                  <div className="about-badge">
                    <span className="badge-num">30+</span>
                    <span className="badge-label">
                      ANOS: INÍCIO DO
                      <br />
                      DECLÍNIO HORMONAL
                    </span>
                  </div>

                  <div className="about-photo-secondary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/images/logo.png" alt="Instituto Gibran" className="about-logo-img" />
                    <div className="about-brand-caption">
                      <strong>Instituto Gibran</strong>
                      <span>Medicina Integrativa Avançada</span>
                    </div>
                  </div>
                </div>

                {/* Right editorial copy */}
                <div className="about-content">
                  <span className="about-eyebrow">SOBRE O INSTITUTO GIBRAN</span>

                  <h2 className="about-heading">
                    A forma mais precisa de <span className="about-heading-gold">recuperar</span>{" "}
                    sua <span className="about-heading-gold">vitalidade e alta performance</span>
                  </h2>

                  <p className="about-description">
                    Liderado pelo <strong>Dr. Kalil Gibran</strong>, o Instituto Gibran atua com
                    Medicina Integrativa Avançada e Nutrologia Resolutiva. Nosso objetivo é
                    investigar a raiz metabólica e hormonal de cada paciente, devolvendo energia,
                    composição corporal e longevidade com rigor científico.
                  </p>

                  <h3 className="about-subhead">Especialidades &amp; Protocolos Exclusivos</h3>

                  <ul className="about-list">
                    <li>
                      <span className="check-icon">✓</span> Reposição &amp; Otimização Hormonal
                    </li>
                    <li>
                      <span className="check-icon">✓</span> Emagrecimento &amp; Alta Performance
                    </li>
                    <li>
                      <span className="check-icon">✓</span> Nutrologia &amp; Metabolismo Avançado
                    </li>
                    <li>
                      <span className="check-icon">✓</span> Medicina Integrativa &amp; Longevidade
                    </li>
                  </ul>

                  <a
                    href="https://wa.me/5573981711127"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="about-cta"
                  >
                    AGENDAR CONSULTA <span className="arrow">→</span>
                  </a>
                </div>
              </div>
            </section>

            {/* Section 3: Second video slides up from bottom over About Us */}
            <section
              ref={sec2Ref}
              className="video-section section-two"
              style={{
                zIndex: 3,
                transform: "translate3d(0, 100%, 0)",
              }}
            >
              <canvas ref={canvas2Ref} />
              <div className="shade" />

              <div className={`phrase v2-editorial ${showV2Editorial ? "show" : ""}`}>
                <h2 className="v2-headline">
                  <span className="v2-stanza-top">
                    A CARNE
                    <br />
                    TEM QUE SER
                    <br />
                    <span className="v2-highlight">GORDA.</span>
                  </span>

                  <span className="v2-divider" aria-hidden="true" />

                  <span className="v2-stanza-bottom">
                    A MULHER
                    <br />
                    TEM QUE SER
                    <br />
                    MAGRA.
                  </span>
                </h2>

                <span className="v2-divider" aria-hidden="true" />

                <p className="v2-subtext">
                  SAÚDE, FORÇA
                  <br />
                  E LONGEVIDADE
                  <br />
                  EM EQUILÍBRIO.
                </p>

                <a
                  href="https://wa.me/5573981711127"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="v2-cta"
                >
                  <span>AGENDAR CONSULTA</span>
                  <span className="v2-cta-arrow" aria-hidden="true">
                    →
                  </span>
                </a>
              </div>
            </section>

            {/* Scroll prompt ONLY during the first video */}
            <div
              className={`hint ${loaded === 100 && showHint ? "show" : ""}`}
              style={{ zIndex: 10 }}
            >
              <span className="hint-rule" aria-hidden="true" />
              <span className="hint-text">CONTINUE ROLANDO A PÁGINA</span>
              <span className="hint-rule" aria-hidden="true" />
            </div>

            <div
              ref={progressRef}
              className="progress"
              style={{ transform: "scaleX(0)", zIndex: 10 }}
            />
            {loaded < 100 && (
              <div className="loader" style={{ zIndex: 20 }}>
                Carregando {loaded}%
              </div>
            )}
          </div>
        </div>

        {/* Contact & Location Section */}
        <section
          id="contato"
          ref={contactRef}
          className={`contact-section ${contactVisible ? "contact-visible" : ""}`}
        >
          <div className="contact-container">
            <div className="contact-info">
              <span className="contact-eyebrow">ATENDIMENTO &amp; LOCALIZAÇÃO</span>
              <h2 className="contact-heading">
                Entre em <em>Contato</em>
              </h2>
              <p className="contact-subtext">
                Agende seu acompanhamento personalizado com o <strong>Dr. Kalil Gibran</strong> e
                descubra protocolos médicos desenhados para sua saúde metabólica, hormonal e
                longevidade.
              </p>

              <div className="contact-cards">
                {/* WhatsApp Card */}
                <a
                  href="https://wa.me/5573981711127"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact-card"
                >
                  <div className="contact-card-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
                      />
                    </svg>
                  </div>
                  <div className="contact-card-body">
                    <span className="contact-card-label">WHATSAPP OFICIAL</span>
                    <strong className="contact-card-value">(73) 98171-1127</strong>
                    <span className="contact-card-action">Toque para iniciar conversa →</span>
                  </div>
                </a>

                {/* Instagram Card */}
                <a
                  href="https://instagram.com/drkalilgibran"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact-card"
                >
                  <div className="contact-card-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                    </svg>
                  </div>
                  <div className="contact-card-body">
                    <span className="contact-card-label">INSTAGRAM</span>
                    <strong className="contact-card-value">@drkalilgibran · @institutogibrann</strong>
                    <span className="contact-card-action">Acompanhe conteúdos diários →</span>
                  </div>
                </a>

                {/* Address Card */}
                <div className="contact-card">
                  <div className="contact-card-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 21s-7-5.75-7-11a7 7 0 1 1 14 0c0 5.25-7 11-7 11z"
                      />
                      <circle cx="12" cy="10" r="2.5" />
                    </svg>
                  </div>
                  <div className="contact-card-body">
                    <span className="contact-card-label">ENDEREÇO</span>
                    <strong className="contact-card-value">
                      Instituto Gibran — Medicina Integrativa
                    </strong>
                    <span className="contact-card-address">
                      Eunápolis &amp; Itabela — Bahia, Brasil
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Google Maps Integration */}
            <div className="contact-map-wrapper">
              <div className="contact-map-frame">
                <iframe
                  title="Localização Instituto Gibran - Google Maps"
                  src="https://maps.google.com/maps?q=Eun%C3%A1polis%20-%20BA,%20Brasil&t=&z=14&ie=UTF8&iwloc=&output=embed"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="site-footer">
          <div className="footer-container">
            <div className="footer-brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo.png" alt="Instituto Gibran" className="footer-logo" />
              <div>
                <strong>INSTITUTO GIBRAN</strong>
                <span>Núcleo de Medicina Integrativa Avançada · Dr. Kalil Gibran</span>
              </div>
            </div>

            <div className="footer-socials">
              <a
                href="https://wa.me/5573981711127"
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
              <a
                href="https://instagram.com/drkalilgibran"
                target="_blank"
                rel="noopener noreferrer"
              >
                @drkalilgibran
              </a>
              <a
                href="https://instagram.com/institutogibrann"
                target="_blank"
                rel="noopener noreferrer"
              >
                @institutogibrann
              </a>
            </div>
          </div>

          <div className="footer-bottom">
            <p>
              © {new Date().getFullYear()} Instituto Gibran &amp; Dr. Kalil Gibran. Todos os
              direitos reservados.
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
