/* ============================================================
   Longitude Policy — Capitol line art + animations
   The Capitol is drawn as evenly spaced fine vertical lines
   whose heights trace the building's silhouette. On load the
   lines "build" upward from the center out; afterwards the
   heights stay fixed and a slow wave of opacity travels
   across the facade, making lines disappear and reappear.
   ============================================================ */

const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Capitol silhouette ----------
   u: distance from the building's center, 0 (center) .. 1 (edge).
   Returns height as a fraction of max height.
   Proportions follow the PDF mock: dominant dome, stubby wings. */
function capitolHeight(u) {
  // Statue of Freedom — a short peak, three lines wide
  if (u < 0.022) return 0.95;
  if (u < 0.045) return 0.88;
  // Tholos (small colonnade under the lantern)
  if (u < 0.07) return 0.84;
  // Dome — wide, round elliptical cap sitting on the drum
  if (u < 0.26) {
    const t = u / 0.26;
    return 0.46 + 0.33 * Math.sqrt(1 - t * t);
  }
  // Drum (colonnaded cylinder below the dome)
  if (u < 0.3) return 0.46;
  if (u < 0.34) return 0.4;
  // Central block with portico
  if (u < 0.52) return 0.34;
  // Connecting corridors (slightly lower)
  if (u < 0.72) return 0.26;
  // House / Senate wings (slightly taller than corridors)
  if (u < 0.985) return 0.3;
  return 0.26;
}

function buildCapitol() {
  const svg = document.getElementById("capitol");
  if (!svg) return;

  const W = 780;
  const H = 600;
  const BASE = 596; // baseline y — building stands on the bottom edge
  const MAX_H = 560; // tallest line (statue)
  const GAP = 8; // even spacing between lines — fewer, more deliberate lines
  const STROKE = 1.7;

  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  // anchor the building to the bottom center so a height-capped
  // mobile hero scales it down instead of cropping the dome
  svg.setAttribute("preserveAspectRatio", "xMidYMax meet");

  const cx = W / 2;
  const half = W / 2 - 4;
  const OFFSET = cx % GAP; // grid aligned so a line sits on the center axis
  const lines = [];

  for (let x = OFFSET; x <= W; x += GAP) {
    const u = Math.abs(x - cx) / half;
    if (u > 1) continue;
    const h = capitolHeight(u) * MAX_H;
    if (h <= 0) continue;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x);
    line.setAttribute("x2", x);
    line.setAttribute("y2", BASE);
    line.setAttribute("y1", BASE - h);
    line.setAttribute("stroke", "#16294a");
    line.setAttribute("stroke-width", STROKE);
    line.setAttribute("opacity", 0); // revealed by the roll-in sweep
    svg.appendChild(line);
    lines.push({ el: line, x, h, u });
  }

  if (REDUCED_MOTION) {
    lines.forEach((l, i) => {
      l.el.setAttribute("opacity", 0.9);
      // static red accents instead of the animated twinkle
      if (i % 13 === 5) {
        l.el.setAttribute("stroke", "#6e1423");
        l.el.setAttribute("stroke-width", 3.2);
      }
    });
    return;
  }

  /* ---------- animation ----------
     The building is drawn line by line from the right page border,
     like a plotter: each line appears in place at full strength —
     no fading, no movement — and the newest line glints gold
     before settling to cream as the next one lands. Once the last
     line is placed, the loop stops and the facade stays static. */
  const SWEEP = 5200; // ms from the first (rightmost) to the last line
  const SETTLED = 0.92; // opacity of every placed line
  const PAPER = "#16294a"; // settled stroke: navy ink on the paper ground
  const RED = "#6e1423";

  let start = null;
  let prevHead = null;

  function frame(now) {
    if (start === null) start = now;
    const t = now - start;
    const cut = W - (t / SWEEP) * W; // the plotting position, moving right to left

    let head = null;
    for (const l of lines) {
      const placed = l.x >= cut;
      l.el.setAttribute("opacity", placed ? SETTLED : 0);
      if (placed && (head === null || l.x < head.x)) head = l;
    }

    if (prevHead && prevHead !== head) {
      prevHead.el.setAttribute("stroke", PAPER);
      prevHead.el.setAttribute("stroke-width", STROKE);
    }
    if (head && t < SWEEP) {
      head.el.setAttribute("stroke", RED);
      head.el.setAttribute("stroke-width", 3.2);
      head.el.setAttribute("opacity", 1);
    } else if (head) {
      head.el.setAttribute("stroke", PAPER);
      head.el.setAttribute("stroke-width", STROKE);
    }
    prevHead = head;

    if (t < SWEEP) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* rAF pauses while the window is hidden or occluded, which can leave
     the drawing frozen mid-sweep; guarantee the finished facade, then
     start the red twinkle */
  setTimeout(() => {
    for (const l of lines) {
      l.el.setAttribute("stroke", PAPER);
      l.el.setAttribute("opacity", SETTLED);
      l.el.style.transition =
        "stroke 0.6s ease, opacity 0.6s ease, stroke-width 0.6s ease";
    }
    startTwinkle(lines, PAPER, RED, SETTLED, STROKE);
  }, SWEEP + 600);
}

/* ---------- red twinkle ----------
   After the facade settles, single lines briefly glow red, slightly
   thicker so they stand out, and fade back; a few red lines are
   always alive in the drawing: the building keeps its red lines. */
function startTwinkle(lines, ink, red, settled, baseWidth) {
  setInterval(() => {
    const l = lines[Math.floor(Math.random() * lines.length)];
    l.el.setAttribute("stroke", red);
    l.el.setAttribute("opacity", 1);
    l.el.setAttribute("stroke-width", 3.2);
    setTimeout(() => {
      l.el.setAttribute("stroke", ink);
      l.el.setAttribute("opacity", settled);
      l.el.setAttribute("stroke-width", baseWidth);
    }, 1600 + Math.random() * 1400);
  }, 700);
}

/* ---------- footer strip ----------
   Clear white longitude lines on the navy band, with the same red
   twinkle as the Capitol. Drawn at 1 svg unit = 1 css px (viewBox
   matches the element width) so line thickness and spacing stay
   identical on every screen size, and rebuilt on resize. */
function buildFooterWave() {
  const svg = document.getElementById("footer-wave");
  if (!svg) return;

  const WHITE = "#f4efe1"; // the footer's cream text tone, not pure white
  const RED = "#a4161a"; // brighter than the wine so it reads on navy
  let lines = [];

  function draw() {
    const W = Math.max(320, Math.round(svg.clientWidth || 1600));
    const H = 90;
    const GAP = 10;
    svg.innerHTML = "";
    lines = [];
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

    let i = 0;
    for (let x = 5; x < W; x += GAP, i++) {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", x);
      line.setAttribute("x2", x);
      line.setAttribute("y2", H);
      line.setAttribute("y1", H - 34);
      line.setAttribute("stroke", WHITE);
      line.setAttribute("stroke-width", 1.6);
      line.setAttribute("opacity", 0.72);
      if (REDUCED_MOTION && i % 13 === 5) {
        // static red accents instead of the twinkle
        line.setAttribute("stroke", RED);
        line.setAttribute("stroke-width", 3);
      } else if (!REDUCED_MOTION) {
        line.style.transition =
          "stroke 0.6s ease, opacity 0.6s ease, stroke-width 0.6s ease";
      }
      svg.appendChild(line);
      lines.push(line);
    }
  }

  draw();
  let t = null;
  window.addEventListener("resize", () => {
    clearTimeout(t);
    t = setTimeout(draw, 200);
  });

  if (!REDUCED_MOTION) {
    setInterval(() => {
      const l = lines[Math.floor(Math.random() * lines.length)];
      if (!l) return;
      l.setAttribute("stroke", RED);
      l.setAttribute("stroke-width", 3.2);
      setTimeout(() => {
        l.setAttribute("stroke", WHITE);
        l.setAttribute("stroke-width", 1.6);
      }, 1600 + Math.random() * 1400);
    }, 900);
  }
}

/* ---------- mobile nav toggle ---------- */
function initNavToggle() {
  const nav = document.querySelector(".nav");
  const btn = document.querySelector(".nav-toggle");
  if (!nav || !btn) return;

  btn.addEventListener("click", () => {
    const open = nav.classList.toggle("nav-open");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  });
  // close the menu when a link is chosen
  nav.querySelectorAll(".nav-links a").forEach((a) =>
    a.addEventListener("click", () => {
      nav.classList.remove("nav-open");
      btn.setAttribute("aria-expanded", "false");
    })
  );
}

/* ---------- scroll-driven steps rail ----------
   The red line travels down the 1-2-3 rail as you scroll, and each
   number fills in when the line reaches it. */
function initStepsRail() {
  const steps = [...document.querySelectorAll(".step")];
  if (!steps.length) return;

  if (REDUCED_MOTION) {
    steps.forEach((s) => {
      s.style.setProperty("--fill", 1);
      s.classList.add("lit");
    });
    return;
  }

  let ticking = false;

  function update() {
    ticking = false;
    const trigger = window.innerHeight * 0.72;
    for (const s of steps) {
      const r = s.getBoundingClientRect();
      const segTop = r.top + 44;
      const segH = Math.max(1, r.height - 48);
      const fill = Math.min(1, Math.max(0, (trigger - segTop) / segH));
      s.style.setProperty("--fill", fill.toFixed(3));
      s.classList.toggle("lit", r.top + 20 < trigger);
    }
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  update();
}

/* ---------- scroll reveal ----------
   Sections (and their staggered children) animate in every time
   they enter the viewport, not just on the first pass. */
function initReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        e.target.classList.toggle("visible", e.isIntersecting);
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -5% 0px" }
  );
  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
}

buildCapitol();
buildFooterWave();
initReveal();
initNavToggle();
initStepsRail();
