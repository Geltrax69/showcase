/* Lockscreen animation collection — sequencing & interaction.
   Staging order per play: background fades in first (solo focal point),
   then the character enters, then clock + hint stagger in (≤50ms apart). */

const VARIANTS = ["drift", "rise", "materialize", "arc"];
const VARIANT_META = {
  drift:       "Drift In — anticipation pull-back, then a spring overshoot settle.",
  rise:        "Rise — dips first (anticipation), lands with a subtle squash.",
  materialize: "Materialize — blur-to-sharp focus pull, quiet staging.",
  arc:         "Arc — curved entry path with rotation; arcs beat straight lines.",
};

const stage    = document.getElementById("stage");
const bg       = document.getElementById("bg");
const person   = document.getElementById("person");
const personImg= document.getElementById("personImg");
const clockEl  = document.getElementById("clock");
const timeEl   = document.getElementById("time");
const dateEl   = document.getElementById("date");
const hintEl   = document.getElementById("hint");
const noteEl   = document.getElementById("variantNote");
const desktop  = document.getElementById("desktop");
const menuClock= document.getElementById("menuClock");

let current = "drift";
let unlocked = false;
let timers = [];
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;

const later = (ms, fn) => { timers.push(setTimeout(fn, RM ? 0 : ms)); };
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

/* ---------------- clock ---------------- */
function tickClock() {
  const now = new Date();
  let h = now.getHours() % 12;
  if (h === 0) h = 12;
  const m = String(now.getMinutes()).padStart(2, "0");
  const t = `${h}:${m}`;
  timeEl.textContent = t;
  menuClock.textContent = t;
  dateEl.textContent = now.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}
tickClock();
setInterval(tickClock, 1000);

/* ---------------- entrance sequence ---------------- */
function play() {
  clearTimers();
  stage.classList.remove("unlocking", "play",
    "v-drift", "v-rise", "v-materialize", "v-arc");
  bg.classList.remove("dim");
  person.classList.remove("enter");
  personImg.classList.remove("idle");
  clockEl.classList.remove("show");
  hintEl.classList.remove("show");

  void stage.offsetWidth;               // restart CSS animations
  stage.classList.add("play", "v-" + current);

  later(650, () => {                    // staging: bg had the stage solo…
    bg.classList.add("dim");            // …dim it, bring in the character
    void person.offsetWidth;
    person.classList.add("enter");
  });
  later(1850, () => personImg.classList.add("idle"));   // secondary action
  later(1950, () => clockEl.classList.add("show"));
  later(1990, () => hintEl.classList.add("show"));      // 40ms stagger ✓

  document.querySelectorAll(".variant-btn[data-variant]").forEach(b =>
    b.classList.toggle("active", b.dataset.variant === current));
  noteEl.textContent = VARIANT_META[current];
  noteEl.classList.add("show");
  later(5200, () => noteEl.classList.remove("show"));
}

/* ---------------- unlock / lock ---------------- */
function unlock() {
  if (unlocked) return;
  unlocked = true;
  clearTimers();
  stage.classList.add("unlocking");     // ease-in exits, ≤300ms
  later(480, () => {
    stage.hidden = true;
    desktop.hidden = false;
    requestAnimationFrame(() => desktop.classList.add("show"));
  });
}

function lock() {
  if (!unlocked) return;
  unlocked = false;
  desktop.classList.remove("show");
  later(200, () => {
    desktop.hidden = true;
    stage.hidden = false;
    play();
  });
}

stage.addEventListener("click", () => { if (!unlocked) unlock(); });
document.getElementById("lockBtn").addEventListener("click", lock);
document.getElementById("replayBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  if (!unlocked) play();
});

document.querySelectorAll(".variant-btn[data-variant]").forEach(btn => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    current = btn.dataset.variant;
    if (!unlocked) play();
    else document.querySelectorAll(".variant-btn[data-variant]").forEach(b =>
      b.classList.toggle("active", b === btn));
  });
});

addEventListener("keydown", (e) => {
  if (unlocked) { if (e.key === "Escape") lock(); return; }
  const i = ["1", "2", "3", "4"].indexOf(e.key);
  if (i >= 0) { current = VARIANTS[i]; play(); return; }
  if (e.key === "r" || e.key === "R") { play(); return; }
  unlock();                              // any other key unlocks
});

/* ---------------- parallax (secondary action, lerped) ---------------- */
let tx = 0, ty = 0, cx = 0, cy = 0;
addEventListener("mousemove", (e) => {
  tx = e.clientX / innerWidth - 0.5;
  ty = e.clientY / innerHeight - 0.5;
});
(function parallax() {
  cx += (tx - cx) * 0.055;
  cy += (ty - cy) * 0.055;
  if (!RM && !unlocked) {
    bg.style.setProperty("--bgx", `${(-cx * 16).toFixed(2)}px`);
    bg.style.setProperty("--bgy", `${(-cy * 12).toFixed(2)}px`);
    person.style.setProperty("--px", `${(cx * 22).toFixed(2)}px`);
    person.style.setProperty("--py", `${(cy * 14).toFixed(2)}px`);
  }
  requestAnimationFrame(parallax);
})();

play();
