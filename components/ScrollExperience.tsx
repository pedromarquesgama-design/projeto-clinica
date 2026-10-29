"use client";

import { useEffect, useRef, useState } from "react";

const SEQS = [
  { dir: "sem", count: 35 }, // virando de frente sem a carne
  { dir: "com", count: 40 }, // doutor com a carne
];
const src = (dir: string, i: number) => `/frames/${dir}/scene${String(i + 1).padStart(5, "0")}.jpg`;
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const range = (p: number, a: number, b: number) => clamp((p - a) / (b - a), 0, 1);

// Scroll timeline inside the sticky 3-stage track (0..1)
// 0.00 -> 0.30 : Video 1 scrubs (35 frames)
// 0.30 -> 0.42 : About Us section slides up from bottom
// 0.42 -> 0.60 : About Us stays in view for reading
// 0.60 -> 0.70 : Video 2 section slides up from bottom over About Us
// 0.70 -> 1.00 : Video 2 scrubs (40 frames) and ends right as Contact section appears
const V1_END = 0.30;
const ABOUT_IN_END = 0.42;
const V2_IN_START = 0.60;
const V2_IN_END = 0.70;

export default function ScrollExperience() {
  const trackRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLElement>(null);
  const canvas1Ref = useRef<HTMLCanvasElement>(null);
  const canvas2Ref = useRef<HTMLCanvasElement>(null);
  const images = useRef<HTMLImageElement[][]>([[], []]);
  const progress = useRef(0);
  const [p, setP] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [navSolid, setNavSolid] = useState(false);
  const [contactVisible, setContactVisible] = useState(false);

  // Preload frames
  useEffect(() => {
    const total = SEQS.reduce((s, q) => s + q.count, 0);
    let done = 0;
    SEQS.forEach((q, si) => {
      for (let i = 0; i < q.count; i++) {
        const img = new Image();
        img.onload = img.onerror = () => {
          done++;
          setLoaded(Math.round((done / total) * 100));
          if (done === total) draw();
        };
        img.src = src(q.dir, i);
        images.current[si][i] = img;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function drawFrame(ctx: CanvasRenderingContext2D, img: HTMLImageElement | undefined) {
    if (!img || !img.complete || !img.naturalWidth) return;
    const { width: cw, height: ch } = ctx.canvas;
    const iw = img.naturalWidth,
      ih = img.naturalHeight;
    ctx.clearRect(0, 0, cw, ch);
    const s = Math.max(cw / iw, ch / ih);
    const w = iw * s;
    const h = ih * s;
    ctx.drawImage(img, (cw - w) / 2, (ch - h) * 0.2, w, h);
  }

  function draw() {
    const pr = progress.current;
    const a = images.current[0];
    const b = images.current[1];

    const c1 = canvas1Ref.current;
    const ctx1 = c1?.getContext("2d");
    if (ctx1 && a.length) {
      const fa = Math.round(range(pr, 0, V1_END) * (a.length - 1));
      drawFrame(ctx1, a[fa]);
    }

    const c2 = canvas2Ref.current;
    const ctx2 = c2?.getContext("2d");
    if (ctx2 && b.length) {
      const fb = Math.round(range(pr, V2_IN_END, 1) * (b.length - 1));
      drawFrame(ctx2, b[fb]);
    }
  }

  // Scroll + resize
  useEffect(() => {
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      [canvas1Ref.current, canvas2Ref.current].forEach((c) => {
        if (!c) return;
        c.width = innerWidth * dpr;
        c.height = innerHeight * dpr;
      });
      draw();
    };
    let raf = 0;
    const onScroll = () => {
      const track = trackRef.current;
      const max = track ? track.offsetHeight - innerHeight : document.documentElement.scrollHeight - innerHeight;
      progress.current = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        draw();
        setP(progress.current);
        if (scrollY > 4) setHasScrolled(true);
        setNavSolid(scrollY > 40);
      });
    };
    resize();
    onScroll();
    addEventListener("resize", resize);
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
      removeEventListener("resize", resize);
      removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
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

  const show = (a: number, b: number) => (p >= a && p < b ? "show" : "");
  const slideAbout = range(p, V1_END, ABOUT_IN_END);
  const slideV2 = range(p, V2_IN_START, V2_IN_END);
  const aboutActive = p >= 0.33 && p < 0.68;
  const aboutHold = range(p, ABOUT_IN_END, V2_IN_START);

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
              className="video-section"
              style={{
                zIndex: 1,
                transform: `translateY(${-slideAbout * 18}%) scale(${1 - slideAbout * 0.04})`,
                filter: `brightness(${1 - slideAbout * 0.45})`,
              }}
            >
              <canvas ref={canvas1Ref} />
              <div className="shade" />

              <h1 className={`phrase phrase-first ${show(0, 0.15)}`}>
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

              <div className={`phrase small ${show(0.15, 0.34)}`}>
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
              className={`video-section about-section ${aboutActive ? "about-active" : ""}`}
              style={{
                zIndex: 2,
                transform: `translateY(${(1 - slideAbout) * 100 - slideV2 * 14}%) scale(${1 - slideV2 * 0.03
                  })`,
                filter: `brightness(${1 - slideV2 * 0.35})`,
              }}
            >
              <div className="about-ambient-glow" aria-hidden="true" />
              <div className="about-container">
                {/* Left collage */}
                <div
                  className="about-visual"
                  style={{
                    transform: `translateY(${(0.5 - aboutHold) * 10}px)`,
                  }}
                >
                  <div className="about-photo-main">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/images/doctor.png"
                      alt="Dr. Kalil Gibran"
                      style={{
                        transform: `scale(${1.08 - slideAbout * 0.05 + aboutHold * 0.04})`,
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
              className="video-section section-two"
              style={{
                zIndex: 3,
                transform: `translateY(${(1 - slideV2) * 100}%)`,
              }}
            >
              <canvas ref={canvas2Ref} />
              <div className="shade" />

              <div className={`phrase v2-editorial ${show(0.71, 1.01)}`}>
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
              className={`hint ${loaded === 100 && p < V1_END ? "show" : ""}`}
              style={{ zIndex: 10 }}
            >
              <span className="hint-rule" aria-hidden="true" />
              <span className="hint-text">CONTINUE ROLANDO A PÁGINA</span>
              <span className="hint-rule" aria-hidden="true" />
            </div>

            <div className="progress" style={{ transform: `scaleX(${p})`, zIndex: 10 }} />
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
