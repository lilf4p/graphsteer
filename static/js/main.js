/* GraphSteer project page
 *
 * Every clip below is shown as a short frame sequence taken from the paper figures.
 * To use real videos instead, add `video: { base: "static/videos/x_base.mp4", ours: "static/videos/x_ours.mp4" }`
 * to a clip: the player then switches to two synchronised <video> elements.
 */

const FRAME_DIR = "static/frames/";
const N_FRAMES = 5;
const FRAME_MS = 900;

const R = (t) => `<em>${t}</em>`;

const GALLERY = [
  {
    id: "dog_cog",
    label: "Dog · bench · kite",
    backbone: "CogVideoX-5b",
    prompt: `“A brown dog runs across a park, ${R("to the right of a bench")} and ${R("below a kite")}”`,
    note: "The base model leaves the dog to the left of the bench. With GraphSteer the dog runs to the right of the bench, underneath the kite.",
  },
  {
    id: "duck_wan",
    label: "Duck · flowerpot · butterfly",
    backbone: "Wan2.2-A14B",
    prompt: `“A yellow duck waddles along a path, ${R("to the right of a flowerpot")} and ${R("below a butterfly")}”`,
    note: "Zero-shot on Wan2.2: the base loses the flowerpot and keeps the butterfly on the ground. With GraphSteer the flowerpot stays on the left and the butterfly takes off above the duck, using a scorer never trained on Wan attention.",
  },
  {
    id: "duck_cog",
    label: "Duck · flowerpot · butterfly",
    backbone: "CogVideoX-5b",
    prompt: `“A yellow duck waddles along a path, ${R("to the right of a flowerpot")} and ${R("below a butterfly")}”`,
    note: "In the base clip the flowerpot sits behind the duck instead of to its left. GraphSteer moves the flowerpot to the left of the duck, with the butterfly above.",
  },
  {
    id: "rabbit_cog",
    label: "Rabbit · basket · bird",
    backbone: "CogVideoX-5b",
    prompt: `“A white rabbit hops across a lawn, ${R("to the left of a basket")} and ${R("below a bird")}”`,
    note: "The base model puts the basket on the wrong side, cut off at the left edge. With GraphSteer the basket sits to the right of the rabbit.",
  },
];

const COMPARE = [
  {
    id: "rabbit",
    label: "Rabbit · basket · bird",
    backbone: "CogVideoX-5b",
    prompt: `“A white rabbit hops across a lawn, ${R("to the left of a basket")} and ${R("below a bird")}”`,
    methods: [["base", "Base"], ["videotetris", "VideoTetris"], ["lvd", "LVD"], ["compattn", "Comp-Attn"]],
  },
  {
    id: "horse",
    label: "Horse · scarecrow · barn · balloon",
    backbone: "Wan2.2-A14B",
    prompt: `“A brown horse gallops across a field, ${R("to the right of a scarecrow")}, ${R("to the left of a barn")} and ${R("below a hot air balloon")}”`,
    methods: [["base", "Base"], ["videotetris", "VideoTetris"], ["lvd", "LVD"], ["compattn", "Comp-Attn"], ["ttom", "TTOM"]],
  },
];

const SUBTITLE = { videotetris: "VideoCrafter2", ttom: "Wan2.1-14B" };

const ICON_PLAY = '<svg viewBox="0 0 14 14"><path d="M3 1.5v11l9-5.5z" fill="currentColor"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 14 14"><path d="M3 1.5h3v11H3zM8 1.5h3v11H8z" fill="currentColor"/></svg>';

/* ---------------------------------------------------------------- player */
class DuoPlayer {
  constructor(root) {
    this.root = root;
    this.screens = [root.querySelector(".player.base .screen"), root.querySelector(".player.ours .screen")];
    this.controls = root.querySelector(".controls");
    this.idx = 0;
    this.playing = true;
    this.visible = false;
    this.timer = null;
    this.mode = "frames";

    this.controls.innerHTML = `
      <button class="play" type="button" aria-label="Pause">${ICON_PAUSE}</button>
      <div class="scrub"></div>
      <span class="frame-label"></span>`;
    this.btn = this.controls.querySelector(".play");
    this.scrub = this.controls.querySelector(".scrub");
    this.label = this.controls.querySelector(".frame-label");
    this.btn.addEventListener("click", () => this.toggle());
    root.style.setProperty("--dur", FRAME_MS + "ms");

    new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      this.schedule();
    }, { threshold: 0.25 }).observe(root);
  }

  /** sources: { base: [urls] | "x.mp4", ours: [urls] | "x.mp4" } */
  load(sources) {
    clearTimeout(this.timer);
    this.idx = 0;
    this.mode = typeof sources.base === "string" ? "video" : "frames";
    this.videos = null;

    if (this.mode === "video") {
      this.videos = this.screens.map((s, k) => {
        s.innerHTML = `<video muted loop playsinline preload="metadata" src="${[sources.base, sources.ours][k]}"></video>`;
        return s.firstChild;
      });
      this.videos[0].addEventListener("loadedmetadata", () => {
        const v = this.videos[0];
        this.root.style.setProperty("--ar", `${v.videoWidth}/${v.videoHeight}`);
      });
      this.scrub.innerHTML = "";
      this.label.textContent = "";
      this.schedule();
      return;
    }

    const lists = [sources.base, sources.ours];
    this.n = lists[0].length;
    this.screens.forEach((s, k) => {
      s.innerHTML = lists[k].map((u, i) => `<img src="${u}" alt="" ${i ? 'loading="lazy"' : ""}>`).join("");
    });
    const first = this.screens[0].querySelector("img");
    const setAr = () => first.naturalWidth && this.root.style.setProperty("--ar", `${first.naturalWidth}/${first.naturalHeight}`);
    first.complete ? setAr() : first.addEventListener("load", setAr, { once: true });

    this.scrub.innerHTML = Array.from({ length: this.n }, (_, i) => `<button type="button" aria-label="Frame ${i + 1}"></button>`).join("");
    this.scrub.querySelectorAll("button").forEach((b, i) =>
      b.addEventListener("click", () => { this.show(i); this.pause(); }));
    this.show(0);
    this.schedule();
  }

  show(i) {
    this.idx = i;
    this.screens.forEach((s) => s.querySelectorAll("img").forEach((im, k) => im.classList.toggle("on", k === i)));
    this.scrub.querySelectorAll("button").forEach((b, k) => {
      b.classList.toggle("done", k < i);
      b.classList.remove("cur");
      if (k === i) { void b.offsetWidth; b.classList.add("cur"); }
    });
    this.label.textContent = `frame ${i + 1}/${this.n}`;
  }

  schedule() {
    clearTimeout(this.timer);
    const run = this.playing && this.visible;
    this.root.classList.toggle("paused", !run);
    if (this.mode === "video") {
      this.videos.forEach((v) => (run ? v.play().catch(() => {}) : v.pause()));
      if (run) this.videos[1].currentTime = this.videos[0].currentTime;
      return;
    }
    if (!run) return;
    this.timer = setTimeout(() => { this.show((this.idx + 1) % this.n); this.schedule(); }, FRAME_MS);
  }

  pause() { this.playing = false; this.btn.innerHTML = ICON_PLAY; this.btn.ariaLabel = "Play"; this.schedule(); }
  play() { this.playing = true; this.btn.innerHTML = ICON_PAUSE; this.btn.ariaLabel = "Pause"; this.show(this.idx); this.schedule(); }
  toggle() { this.playing ? this.pause() : this.play(); }
}

const frames = (prefix) => Array.from({ length: N_FRAMES }, (_, i) => `${FRAME_DIR}${prefix}_${i}.jpg`);
const clipSources = (c) => c.video ? c.video : { base: frames(`${c.id}_base`), ours: frames(`${c.id}_ours`) };

function bind(root, data) {
  root.querySelectorAll("[data-bind]").forEach((el) => {
    const k = el.dataset.bind;
    if (k in data) el.innerHTML = data[k];
  });
}

/* ---------------------------------------------------------------- teaser */
const teaserRoot = document.querySelector(".teaser-section .duo");
const teaser = new DuoPlayer(teaserRoot);
teaser.load(clipSources(GALLERY[0]));

/* ---------------------------------------------------------------- gallery */
const galleryRoot = document.getElementById("gallery-duo");
const gallery = new DuoPlayer(galleryRoot);
const tabs = document.getElementById("gallery-tabs");
const galleryItems = GALLERY.slice(1).concat(GALLERY.slice(0, 1)); // start on a clip that is not the teaser
tabs.innerHTML = galleryItems.map((c, i) => `
  <button class="chip${i ? "" : " active"}" type="button" data-i="${i}">
    <img class="thumb" src="${FRAME_DIR}${c.id}_ours_2.jpg" alt="">${c.label} <small>${c.backbone}</small>
  </button>`).join("");
function selectGallery(i) {
  const c = galleryItems[i];
  tabs.querySelectorAll(".chip").forEach((b, k) => b.classList.toggle("active", k === i));
  bind(galleryRoot, c);
  gallery.load(clipSources(c));
  if (!gallery.playing) gallery.play();
}
tabs.addEventListener("click", (e) => { const b = e.target.closest(".chip"); if (b) selectGallery(+b.dataset.i); });
selectGallery(0);

/* ---------------------------------------------------------------- comparison */
const cmpRoot = document.getElementById("cmp-duo");
const cmp = new DuoPlayer(cmpRoot);
const cmpPrompts = document.getElementById("cmp-prompts");
const cmpMethods = document.getElementById("cmp-methods");
let cmpP = 0, cmpM = 0;

cmpPrompts.innerHTML = COMPARE.map((c, i) => `
  <button class="chip${i ? "" : " active"}" type="button" data-i="${i}">
    <img class="thumb" src="${FRAME_DIR}cmp_${c.id}_ours_2.jpg" alt="">${c.label} <small>${c.backbone}</small>
  </button>`).join("");

function renderCmp() {
  const c = COMPARE[cmpP];
  cmpPrompts.querySelectorAll(".chip").forEach((b, k) => b.classList.toggle("active", k === cmpP));
  cmpMethods.innerHTML = c.methods.map(([, name], i) =>
    `<button class="chip${i === cmpM ? " active" : ""}" type="button" data-i="${i}">GraphSteer vs. ${name}</button>`).join("");
  const [key, name] = c.methods[cmpM];
  bind(cmpRoot, { backbone: c.backbone, prompt: c.prompt, other: SUBTITLE[key] ? `${name} <span style="opacity:.7;font-weight:500">(${SUBTITLE[key]})</span>` : name });
  cmp.load({ base: frames(`cmp_${c.id}_${key}`), ours: frames(`cmp_${c.id}_ours`) });
  if (!cmp.playing) cmp.play();
}
cmpPrompts.addEventListener("click", (e) => { const b = e.target.closest(".chip"); if (b) { cmpP = +b.dataset.i; cmpM = 0; renderCmp(); } });
cmpMethods.addEventListener("click", (e) => { const b = e.target.closest(".chip"); if (b) { cmpM = +b.dataset.i; renderCmp(); } });
renderCmp();

/* ---------------------------------------------------------------- misc UI */
const nav = document.getElementById("nav");
addEventListener("scroll", () => nav.classList.toggle("scrolled", scrollY > 8), { passive: true });

// reveal + bar animations
const revealTargets = document.querySelectorAll(".section .container > *, .step, .card, .stat");
revealTargets.forEach((el) => el.classList.add("reveal"));
const io = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add("in-view"); io.unobserve(e.target); }
}), { threshold: 0.12 });
revealTargets.forEach((el) => io.observe(el));

// count-up on stats
const counter = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (!e.isIntersecting) return;
  counter.unobserve(e.target);
  const el = e.target, to = parseFloat(el.dataset.count), t0 = performance.now(), D = 1100;
  const step = (t) => {
    const p = Math.min(1, (t - t0) / D), v = to * (1 - Math.pow(1 - p, 3));
    el.textContent = v.toFixed(3);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}), { threshold: 0.6 });
if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
  document.querySelectorAll("[data-count]").forEach((el) => counter.observe(el));

// lightbox
const lb = document.getElementById("lightbox");
document.querySelectorAll(".zoomable img").forEach((img) => img.addEventListener("click", () => {
  lb.querySelector("img").src = img.src;
  lb.hidden = false;
}));
lb.addEventListener("click", () => (lb.hidden = true));
addEventListener("keydown", (e) => { if (e.key === "Escape") lb.hidden = true; });

// disabled "soon" links
document.querySelectorAll(".btn.soon").forEach((a) => a.addEventListener("click", (e) => e.preventDefault()));

// copy bibtex
document.getElementById("copy-bib").addEventListener("click", async (e) => {
  try {
    await navigator.clipboard.writeText(document.getElementById("bib-text").textContent);
    e.target.textContent = "Copied!";
  } catch { e.target.textContent = "Select & copy"; }
  setTimeout(() => (e.target.textContent = "Copy"), 1600);
});
