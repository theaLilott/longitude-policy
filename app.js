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

/* traveling opacity wave: a dim band sweeps right-to-left across the lines */
function waveOpacity(x, t) {
  const w = 0.5 + 0.5 * Math.sin(t / 1100 + x / 95);
  return 0.1 + 0.85 * Math.pow(w, 1.4);
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
      if (i % 13 === 5) l.el.setAttribute("stroke", "#a4161a");
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
  const RED = "#a4161a";

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

    if (prevHead && prevHead !== head) prevHead.el.setAttribute("stroke", PAPER);
    if (head && t < SWEEP) {
      head.el.setAttribute("stroke", RED);
      head.el.setAttribute("opacity", 1);
    } else if (head) {
      head.el.setAttribute("stroke", PAPER);
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
      l.el.style.transition = "stroke 0.6s ease, opacity 0.6s ease";
    }
    startTwinkle(lines, PAPER, RED, SETTLED);
  }, SWEEP + 600);
}

/* ---------- red twinkle ----------
   After the facade settles, single lines briefly glow red and fade
   back, so a few red lines are always alive in the drawing: the
   building keeps its red lines. */
function startTwinkle(lines, ink, red, settled) {
  setInterval(() => {
    const l = lines[Math.floor(Math.random() * lines.length)];
    l.el.setAttribute("stroke", red);
    l.el.setAttribute("opacity", 1);
    setTimeout(() => {
      l.el.setAttribute("stroke", ink);
      l.el.setAttribute("opacity", settled);
    }, 1600 + Math.random() * 1400);
  }, 700);
}

/* ---------- footer strip: uniform lines with the same
   disappear/reappear wave, echoing the hero motif ---------- */
function buildFooterWave() {
  const svg = document.getElementById("footer-wave");
  if (!svg) return;

  const W = 1600;
  const H = 90;
  const GAP = 6;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("preserveAspectRatio", "none");

  const lines = [];
  for (let x = 3; x < W; x += GAP) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x);
    line.setAttribute("x2", x);
    line.setAttribute("y2", H);
    line.setAttribute("y1", H - 34);
    line.setAttribute("stroke", "#f4efe1");
    line.setAttribute("stroke-width", 1.2);
    line.setAttribute("opacity", 0.25);
    svg.appendChild(line);
    lines.push({ el: line, x });
  }

  if (REDUCED_MOTION) return;

  function frame(now) {
    for (const l of lines) {
      l.el.setAttribute("opacity", (0.35 * waveOpacity(l.x, now)).toFixed(3));
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
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
