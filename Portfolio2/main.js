/* ============================================================================
   Motion layer — GSAP + ScrollTrigger
   Every animation is motivated:
     · hero collage  — scattered photos SETTLE into place (arrival)
     · notebook      — the parchi tilts/opens as you read about me (storytelling)
     · scatter->grid — project cards fly in from scatter and lock to grid
     · lab finale    — kinetic type + skill rows reveal in sequence
   Honors prefers-reduced-motion: bails out, leaving a clean static page.
   ============================================================================ */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !window.gsap) {
    // fallback: lay the flipbook pages out as a readable vertical stack
    document.querySelector('.bookshow')?.classList.add('no-flip');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  const ease = 'power3.out';

  /* ---------- HERO: title + scattered cards settle in ---------- */
  gsap.from('[data-hero-title]', { y: 28, opacity: 0, duration: 0.9, ease, delay: 0.05 });
  gsap.from('.hero__eyebrow', { y: 16, opacity: 0, duration: 0.7, ease });
  gsap.from('.hero__sub, .hero__cta', { y: 20, opacity: 0, duration: 0.8, ease, stagger: 0.1, delay: 0.15 });

  // cards arrive from a "tossed onto the table" scatter, then settle to their CSS rotation
  document.querySelectorAll('[data-collage] [data-card]').forEach((card, i) => {
    const rot = (Math.random() * 26 - 13);
    gsap.from(card, {
      x: (Math.random() * 120 - 60),
      y: 80 + Math.random() * 60,
      rotation: rot,
      opacity: 0,
      scale: 0.85,
      duration: 1,
      ease: 'back.out(1.4)',
      delay: 0.3 + i * 0.12,
    });
  });
  gsap.from('[data-collage] .sticker', { scale: 0, opacity: 0, duration: 0.6, ease: 'back.out(2)', stagger: 0.1, delay: 0.9 });

  /* ---------- gentle perpetual float on stickers ---------- */
  gsap.utils.toArray('[data-float]').forEach((el) => {
    gsap.to(el, { y: '+=8', rotation: '+=4', duration: 2 + Math.random(), ease: 'sine.inOut', yoyo: true, repeat: -1 });
  });

  /* ---------- pointer parallax on hero collage ---------- */
  const collage = document.querySelector('[data-collage]');
  if (collage && window.matchMedia('(pointer:fine)').matches) {
    const cards = collage.querySelectorAll('[data-card]');
    collage.addEventListener('pointermove', (e) => {
      const r = collage.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width / 2) / r.width;
      const dy = (e.clientY - r.top - r.height / 2) / r.height;
      cards.forEach((c, i) => {
        const depth = (i + 1) * 8;
        gsap.to(c, { x: dx * depth, y: dy * depth, duration: 0.6, ease: 'power2.out', overwrite: 'auto' });
      });
    });
    collage.addEventListener('pointerleave', () => {
      gsap.to(cards, { x: 0, y: 0, duration: 0.8, ease: 'power2.out' });
    });
  }

  /* ---------- THE FLIPBOOK: pin the book, turn one project per page ----------
     The book tilts in and straightens, then each leaf turns around its spine
     (rotateY 0 -> -180), revealing the next project — a real page flip. The
     z-index of every leaf is recomputed each frame so the stack stays correct
     scrubbing both directions (most-recently-turned page rests on top of the pile). */
  const stage    = document.querySelector('[data-bookstage]');
  const flipbook = document.querySelector('[data-flipbook]');
  const hint     = document.querySelector('[data-bookhint]');
  // reverse() so the array runs cover -> 01 -> 02 ... (DOM order is reversed for paint order)
  const leaves   = flipbook ? [...flipbook.querySelectorAll('.leaf')].reverse() : [];

  if (stage && flipbook && leaves.length) {
    const N = leaves.length;
    gsap.set(flipbook, { transformPerspective: 2800 });
    // CRITICAL: in a preserve-3d context z-index is ignored — sibling paint order
    // comes from 3D depth. Separate the leaves along Z (cover closest to viewer)
    // so coplanar pages never z-fight/bleed. As a leaf turns -180° its +Z rotates
    // to -Z, so turned pages naturally fall behind the page underneath.
    leaves.forEach((lf, i) => gsap.set(lf, { rotateY: 0, z: (N - i) * 6 }));

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: stage,
        start: 'top top',
        end: () => '+=' + Math.round(window.innerHeight * (N * 0.85 + 0.6)),
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        anticipatePin: 1,
      },
    });

    tl.fromTo(flipbook, { rotateY: 16, rotateX: 6, y: 30 },
                        { rotateY: 0, rotateX: 0, y: 0, duration: 1, ease: 'power2.out' }, 0)
      .to(hint, { autoAlpha: 0, duration: 0.4 }, 0.2);

    leaves.forEach((lf, i) => {
      tl.to(lf, { rotateY: -180, ease: 'power1.inOut', duration: 1 }, 0.7 + i * 0.8);
    });
  }

  /* ---------- WORK headings reveal ---------- */
  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      y: 30, opacity: 0, duration: 0.8, ease,
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
  });

  /* ---------- SCATTER -> GRID: cards fly in from scatter, settle to grid,
                and scatter back out when you scroll up (scrubbed) ---------- */
  const items = gsap.utils.toArray('[data-grid-item]');
  if (items.length) {
    // deterministic scatter offsets (stable across refreshes — no re-randomize jumps)
    const scatter = [
      { x: -240, y: 70,  r: -11 }, { x: 0,   y: 130, r: 7 }, { x: 240, y: 70,  r: 11 },
      { x: -200, y: 150, r: -8 },  { x: 30,  y: 90,  r: 5 }, { x: 210, y: 140, r: 9 },
    ];
    const gtl = gsap.timeline({
      scrollTrigger: { trigger: '[data-grid]', start: 'top 88%', end: 'top 42%', scrub: 1 },
    });
    items.forEach((el, i) => {
      const s = scatter[i % scatter.length];
      gtl.fromTo(el,
        { x: s.x, y: s.y, rotation: s.r, scale: 0.82, opacity: 0 },
        { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, ease: 'power3.out' },
        i * 0.06);
    });
  }

  /* ---------- GUIDED TOUR: a fake cursor sweeps nav → projects → contact ---- */
  const tour    = document.querySelector('[data-tour]');
  const tourTip = document.querySelector('[data-tourtip]');
  const guide   = document.querySelector('[data-scrollguide]');
  const gLabel  = document.querySelector('[data-guidelabel]');
  const gArrow  = document.querySelector('[data-guidearrow]');

  const showGuide = () => {
    if (!guide) return;
    gsap.to(guide, { opacity: 1, duration: 0.5, ease: 'power2.out' });
    if (gArrow) gsap.to(gArrow, { y: 4, duration: 0.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  };

  /* ---------- INTRO: a cursor hunts the floating Work/About/Stack words and
     drops each into the navbar, which expands to receive them ---------- */
  const navLinksWrap = document.querySelector('.nav__links');
  const words = gsap.utils.toArray('.floatword');
  const links = gsap.utils.toArray('.nav__links a'); // Work, About, Stack (DOM order matches words)
  if (window.MotionPathPlugin) gsap.registerPlugin(window.MotionPathPlugin);
  const fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  const rnd = (n) => Math.random() * n - n / 2;
  const ctr = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };

  // a curved-path tween-vars builder from the cursor's current spot to a target point
  const curveTo = (t, dur) => {
    const cx = gsap.getProperty(tour, 'x'), cy = gsap.getProperty(tour, 'y');
    const mid = { x: (cx + t.x) / 2 + rnd(90), y: (cy + t.y) / 2 - (30 + Math.random() * 55) };
    return window.MotionPathPlugin
      ? { duration: dur, ease: 'power2.inOut', motionPath: { path: [mid, { x: t.x, y: t.y }], curviness: 1.5 } }
      : { x: t.x, y: t.y, duration: dur, ease: 'power2.inOut' };
  };

  const finishIntro = () => {
    gsap.set(navLinksWrap, { clearProps: 'maxWidth,overflow' });
    gsap.set(links, { autoAlpha: 1, scale: 1, clearProps: 'transform,visibility,opacity' });
    if (tour) gsap.to(tour, { autoAlpha: 0, scale: 0.6, duration: 0.4, ease: 'power2.in', onComplete: showGuide });
    else showGuide();
  };

  if (tour && navLinksWrap && words.length === 3 && links.length === 3 && fine) {
    if (tourTip) tourTip.style.display = 'none';
    gsap.set(navLinksWrap, { maxWidth: 0, overflow: 'hidden' });           // nav starts compact
    gsap.set(links, { autoAlpha: 0, scale: 0.4, transformOrigin: 'center' });
    gsap.set(tour, { autoAlpha: 0, x: window.innerWidth * 0.5, y: window.innerHeight * 0.34, scale: 1 });

    // gentle, bounded drift + breathing while the words wait to be collected
    const drifts = [];
    words.forEach((w) => {
      drifts.push(gsap.to(w, { keyframes: [
        { xPercent: rnd(60), yPercent: rnd(50) }, { xPercent: rnd(60), yPercent: rnd(50) }, { xPercent: 0, yPercent: 0 },
      ], duration: 7 + Math.random() * 3, repeat: -1, ease: 'sine.inOut' }));
      drifts.push(gsap.to(w, { rotation: rnd(14), duration: 3 + Math.random() * 2, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
    });

    // collect one word at a time (built at runtime so positions are never stale)
    let i = 0;
    const collectNext = () => {
      if (i >= words.length) { finishIntro(); return; }
      const w = words[i], link = links[i]; i++;
      gsap.killTweensOf(w);                                   // freeze this word so it's catchable
      const seg = gsap.timeline({ onComplete: collectNext });
      seg.to(tour, curveTo(ctr(w), 0.9))                       // cursor curves to the word
         .to(w, { rotation: 0, scale: 1.12, boxShadow: '0 16px 44px rgba(0,0,0,.22)', duration: 0.25, ease: 'power2.out' }, '<0.12')
         .to(tour, { scale: 0.82, duration: 0.12, yoyo: true, repeat: 1 }, '<')
         .add(() => {                                          // carry word + cursor to the nav slot
           const slot = ctr(link);
           const r = w.getBoundingClientRect();
           gsap.to(w, {
             x: gsap.getProperty(w, 'x') + (slot.x - (r.left + r.width / 2)),
             y: gsap.getProperty(w, 'y') + (slot.y - (r.top + r.height / 2)),
             scale: 0.7, autoAlpha: 0, duration: 0.7, ease: 'power3.inOut',
           });
           gsap.to(tour, curveTo(slot, 0.7));
           gsap.to(link, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(2)', delay: 0.42 }); // pop in
         })
         .to({}, { duration: 1.15 });                          // hold for the carry to finish
    };

    gsap.timeline({ delay: 1 })
      .to(tour, { autoAlpha: 1, duration: 0.4 })
      .to(navLinksWrap, { maxWidth: 360, duration: 0.9, ease: 'back.out(1.4)' }, '<') // expand to receive
      .add(collectNext);
  } else {
    if (links.length) gsap.set(links, { autoAlpha: 1 });
    showGuide();
  }

  /* ---------- SCROLL GUIDE: names the current stop, click = next, theme-aware ---- */
  if (guide && gLabel) {
    const sections = [
      { sel: '#about',   label: 'a quick intro' },
      { sel: '#work',    label: 'flip through my work' },
      { sel: '#more',    label: 'more experiments' },
      { sel: '#lab',     label: 'my stack & contact' },
    ].map((s) => ({ ...s, el: document.querySelector(s.sel) })).filter((s) => s.el);

    sections.forEach((s, i) => {
      const setLabel = () => {
        gLabel.textContent = s.label;
        // last section is the dark lab → invert the guide so it stays legible
        guide.classList.toggle('is-dark', s.sel === '#lab');
        guide.dataset.next = sections[i + 1] ? sections[i + 1].sel : '#contact';
      };
      ScrollTrigger.create({ trigger: s.el, start: 'top 60%', end: 'bottom 40%', onEnter: setLabel, onEnterBack: setLabel });
    });

    guide.addEventListener('click', () => {
      const next = guide.dataset.next || '#work';
      document.querySelector(next)?.scrollIntoView({ behavior: 'smooth' });
    });

    // tuck the guide away while the visitor is inside the pinned flipbook
    const bookshow = document.querySelector('.bookshow');
    if (bookshow) ScrollTrigger.create({
      trigger: bookshow, start: 'top 65%', end: 'bottom 35%',
      onToggle: (self) => gsap.to(guide, { autoAlpha: self.isActive ? 0 : 1, duration: 0.3 }),
    });

    // hide once the footer arrives; bring back on the way up
    const foot = document.querySelector('.foot');
    if (foot) ScrollTrigger.create({
      trigger: foot, start: 'top bottom',
      onEnter: () => gsap.to(guide, { autoAlpha: 0, duration: 0.3 }),
      onLeaveBack: () => gsap.to(guide, { autoAlpha: 1, duration: 0.3 }),
    });
  }

  /* ---------- LAB finale: theme-switch reveal + kinetic skills ---------- */
  // headline rises as a block, then each colored word pops in
  const labTl = gsap.timeline({
    scrollTrigger: { trigger: '#lab', start: 'top 65%', toggleActions: 'play none none reverse' },
  });
  labTl.from('[data-lab-title]', { y: 70, opacity: 0, duration: 0.8, ease })
       .from('[data-lab-title] span', { scale: 0.55, opacity: 0, stagger: 0.09, duration: 0.45, ease: 'back.out(2.2)' }, 0.25);

  // skill rows: category slides in from the left, list fades in — reverts on scroll up
  gsap.utils.toArray('.skillrow').forEach((row) => {
    const tl = gsap.timeline({
      scrollTrigger: { trigger: row, start: 'top 88%', toggleActions: 'play none none reverse' },
    });
    tl.from(row, { y: 30, opacity: 0, duration: 0.5, ease })
      .from(row.querySelector('.cat'),  { x: -26, opacity: 0, duration: 0.5, ease }, 0.05)
      .from(row.querySelector('.list'), { x: 18,  opacity: 0, duration: 0.5, ease }, 0.12);
  });

  // contact headline + socials
  gsap.from('.contact h3', {
    y: 44, opacity: 0, duration: 0.8, ease,
    scrollTrigger: { trigger: '.contact', start: 'top 82%', toggleActions: 'play none none reverse' },
  });
  gsap.from('.social a', {
    y: 24, opacity: 0, duration: 0.5, ease, stagger: 0.08,
    scrollTrigger: { trigger: '.social', start: 'top 90%', toggleActions: 'play none none reverse' },
  });

  // the neon blob drifts + grows as you move through the lab (depth/parallax)
  gsap.to('.lab__blob', {
    y: -140, scale: 1.18, ease: 'none',
    scrollTrigger: { trigger: '#lab', start: 'top bottom', end: 'bottom top', scrub: 1 },
  });

  // one calm neon ball drifts for life (y/scale owned by the scroll parallax above)
  gsap.to('.lab__blob', { x: -80, duration: 11, ease: 'sine.inOut', yoyo: true, repeat: -1 });

  /* ---------- SCATTER → BENTO: cards start scattered (rotated, blurred, small) and
     are magnetically pulled into a tidy bento grid as you scroll INTO the notebook;
     they settle just as the book pins, then stay as the backdrop while it flips.
     Parallax (per-card speed) + stagger + overshoot; reverses on the way up. ---------- */
  const scraps = gsap.utils.toArray('[data-scrap]');
  const bstage = document.querySelector('[data-bookstage]');
  if (scraps.length && bstage) {
    const tl = gsap.timeline({
      scrollTrigger: { trigger: bstage, start: 'top 95%', end: 'top top', scrub: 1, invalidateOnRefresh: true },
    });
    scraps.forEach((s, i) => {
      const ox = ((i * 41) % 120) - 60;             // small horizontal drift -60..60
      const oy = -(440 + ((i * 73) % 380));         // FALL from well above: -440..-820
      const orot = (i % 2 ? 1 : -1) * (5 + ((i * 31) % 9)); // gentle tilt
      const dur = [0.7, 0.85, 1, 1.15, 1.3][i % 5]; // per-card speed → parallax depth
      gsap.set(s, { transformOrigin: 'center' });
      tl.fromTo(s,
        { x: ox, y: oy, rotation: orot, scale: 0.92, autoAlpha: 0, filter: 'blur(5px)' },
        { x: 0, y: 0, rotation: 0, scale: 1, autoAlpha: 1, filter: 'blur(0px)',
          ease: 'back.out(1.25)', duration: dur },     // drop + settle with a small bounce
        i * 0.07); // staggered cascade so they rain down one after another
    });
  }

  /* ---------- smoothness: only the front-facing flipbook video decodes at a time ---------- */
  const bookLeaves = [...document.querySelectorAll('[data-flipbook] .leaf')].reverse(); // cover → 01 → …
  if (bookLeaves.length) {
    const vids = bookLeaves.map((lf) => lf.querySelector('video')).filter(Boolean);
    vids.forEach((v) => { try { v.pause(); } catch (e) {} });
    const syncVideo = () => {
      let front = null;
      for (const lf of bookLeaves) { if (gsap.getProperty(lf, 'rotateY') > -90) { front = lf; break; } }
      const active = front ? front.querySelector('video') : null;
      vids.forEach((v) => {
        if (v === active) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
        else if (!v.paused) v.pause();
      });
    };
    ScrollTrigger.create({
      trigger: '[data-bookstage]', start: 'top bottom', end: 'bottom top',
      onUpdate: syncVideo, onEnter: syncVideo, onEnterBack: syncVideo,
      onLeave: () => vids.forEach((v) => v.pause()),
      onLeaveBack: () => vids.forEach((v) => v.pause()),
    });
  }

  /* ---------- pause the hero reel(s) once they scroll out of view ---------- */
  const heroVids = gsap.utils.toArray('.hero video');
  if (heroVids.length) {
    ScrollTrigger.create({
      trigger: '.hero', start: 'bottom top',
      onEnter: () => heroVids.forEach((v) => v.pause()),
      onLeaveBack: () => heroVids.forEach((v) => { const p = v.play(); if (p && p.catch) p.catch(() => {}); }),
    });
  }

  /* ---------- CONTACT: label → "let's & talk" → email — assembles, holds, and
                replays every ~3s while in view; resets when you scroll away ---------- */
  const cLabel = document.querySelector('.contact .lab__label');
  const ml5 = document.querySelector('.ml5');
  const emailEl = document.querySelector('[data-typewriter]');
  if (ml5 || emailEl) {
    const emailFull = emailEl ? emailEl.textContent.trim() : '';
    let loopT = null, typeT = null;

    const reset = () => {
      if (cLabel) gsap.set(cLabel, { opacity: 0, y: 12 });
      if (ml5) { gsap.set('.ml5 .letters', { opacity: 0 }); gsap.set('.ml5 .line', { opacity: 0, scaleX: 0 }); }
      if (emailEl) { emailEl.textContent = ''; emailEl.classList.remove('is-typing'); }
    };
    const typeEmail = () => {
      if (!emailEl) return;
      emailEl.classList.add('is-typing');
      let i = 0;
      (function tick() {
        emailEl.textContent = emailFull.slice(0, ++i);
        if (i < emailFull.length) typeT = setTimeout(tick, 48);
        else emailEl.classList.remove('is-typing');
      })();
    };
    const playOnce = () => {
      if (cLabel) gsap.to(cLabel, { opacity: 1, y: 0, duration: 0.5, ease });
      if (window.anime && ml5) {
        anime.timeline({ loop: false })
          .add({ targets: '.ml5 .line', opacity: [0.5, 1], scaleX: [0, 1], easing: 'easeInOutExpo', duration: 700, delay: 220 })
          .add({ targets: '.ml5 .line', duration: 600, easing: 'easeOutExpo', translateY: (el, i) => (-0.625 + 0.625 * 2 * i) + 'em' })
          .add({ targets: '.ml5 .ampersand', opacity: [0, 1], scaleY: [0.5, 1], easing: 'easeOutExpo', duration: 600, offset: '-=600' })
          .add({ targets: '.ml5 .letters-left', opacity: [0, 1], translateX: ['0.5em', 0], easing: 'easeOutExpo', duration: 600, offset: '-=300' })
          .add({ targets: '.ml5 .letters-right', opacity: [0, 1], translateX: ['-0.5em', 0], easing: 'easeOutExpo', duration: 600, offset: '-=600' });
      }
      setTimeout(typeEmail, 1000);
    };
    const stop = () => { clearTimeout(loopT); clearTimeout(typeT); };
    const cycle = () => { reset(); playOnce(); loopT = setTimeout(cycle, 6200); }; // sequence + ~3s hold

    reset();
    ScrollTrigger.create({
      trigger: '#contact', start: 'top 72%', end: 'bottom 28%',
      onEnter: () => { stop(); cycle(); },
      onEnterBack: () => { stop(); cycle(); },
      onLeave: () => { stop(); reset(); },
      onLeaveBack: () => { stop(); reset(); },
    });
  }

  /* ============================================================================
     SIGNATURE MOTION (design-motion-principles) — memorable but quiet:
     magnetic CTAs, cursor-tracked card tilt, velocity-skewed marquee.
     Pointer-fine devices only; the whole file is already gated by reduced-motion.
     ============================================================================ */
  if (window.matchMedia('(hover:hover) and (pointer:fine)').matches) {

    // 1 — magnetic buttons: the CTA leans toward the cursor, then springs home
    gsap.utils.toArray('.btn, .nav__cta').forEach((el) => {
      el.style.transition = 'box-shadow .25s ease, background .2s ease'; // let GSAP own transform
      const xTo = gsap.quickTo(el, 'x', { duration: 0.45, ease: 'power3' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.45, ease: 'power3' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.3);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.45);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });

    // 2 — project cards tilt in 3D toward the cursor (lift handled here, not CSS)
    gsap.utils.toArray('.pcard').forEach((card) => {
      card.style.transition = 'box-shadow .35s ease, border-color .35s ease';
      gsap.set(card, { transformPerspective: 850, transformOrigin: 'center' });
      const rX = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3' });
      const rY = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3' });
      const yT = gsap.quickTo(card, 'y', { duration: 0.5, ease: 'power3' });
      card.addEventListener('pointerenter', () => yT(-8));
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        rY(((e.clientX - r.left) / r.width - 0.5) * 9);
        rX(-((e.clientY - r.top) / r.height - 0.5) * 9);
      });
      card.addEventListener('pointerleave', () => { rX(0); rY(0); yT(0); });
    });
  }

  // 3 — kinetic marquee: skews with scroll velocity (skew the band, not the moving track)
  const marquee = document.querySelector('.marquee');
  if (marquee) {
    ScrollTrigger.create({
      onUpdate: (self) => {
        const sk = gsap.utils.clamp(-15, 15, self.getVelocity() / -55);
        gsap.to(marquee, { skewX: sk, duration: 0.4, ease: 'power2', overwrite: 'auto' });
      },
    });
  }

  // keep ScrollTrigger honest after fonts/media load
  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
