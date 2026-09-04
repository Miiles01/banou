gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  direction: 'vertical',
  gestureDirection: 'vertical',
  smooth: true,
  mouseMultiplier: 1,
  smoothTouch: false,
  touchMultiplier: 2,
});

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});

gsap.ticker.lagSmoothing(0);

const header = document.getElementById('siteHeader');
const navToggle = document.getElementById('navToggle');

navToggle?.addEventListener('click', () => {
  header.classList.toggle('nav-open');
});

document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      lenis.scrollTo(target, { offset: -80 });
    }
    header.classList.remove('nav-open');
  });
});

// Block reveal (fade + rise) for whole sections/cards
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// Word-by-word title entrance (GSAP SplitText)
gsap.registerPlugin(SplitText);

function splitWords(el) {
  return SplitText.create(el, { type: 'words' });
}

const heroTitle = document.querySelector('.hero h1');
if (heroTitle) {
  gsap.from(splitWords(heroTitle).words, {
    opacity: 0, y: 15,
    stagger: 0.06, duration: 0.5,
    ease: 'power2.out'
  });
}

const scrollTitles = document.querySelectorAll('.section-head h2, .cta-band h2, .dish-info h3');
const titleWordsByEl = new Map();
scrollTitles.forEach(el => {
  const words = splitWords(el).words;
  gsap.set(words, { opacity: 0, y: 15 });
  titleWordsByEl.set(el, words);
});

const titleObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const words = titleWordsByEl.get(entry.target);
      if (words) {
        gsap.to(words, {
          opacity: 1, y: 0,
          stagger: 0.06, duration: 0.5,
          ease: 'power2.out'
        });
      }
      titleObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.4 });

scrollTitles.forEach(el => titleObserver.observe(el));

// Line-by-line stagger for the info cards
const infoCards = document.querySelectorAll('.info-card');
if (infoCards.length) {
  gsap.set(infoCards, { opacity: 0, y: 30 });

  const infoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        gsap.to(infoCards, {
          y: 0, opacity: 1,
          stagger: 0.2, duration: 0.8,
          ease: 'power2.out'
        });
        infoObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  infoObserver.observe(document.querySelector('.infos-grid'));
}

// Brand line — each word lights up from dim to full color as you scroll past it
const brandText = document.querySelector('.brand-text');
if (brandText) {
  gsap.to(splitWords(brandText).words, {
    color: '#f4ede0',
    stagger: 0.1,
    scrollTrigger: {
      trigger: brandText,
      start: 'top center',
      end: 'bottom center',
      scrub: true
    }
  });
}

// The two scroll-pin effects below measure real element/viewport sizes
// (clientWidth, innerWidth, offsetWidth) to compute their scroll distances.
// window.innerWidth can briefly read 0 right at "load" in some embedded/preview
// browser hosts, so wait a tick past load (rAF x2) before measuring anything.
function whenReady(fn) {
  function settle() {
    requestAnimationFrame(() => requestAnimationFrame(fn));
  }
  if (document.readyState === 'complete') {
    settle();
  } else {
    window.addEventListener('load', settle);
  }
}

whenReady(initPinEffects);

function initPinEffects() {

// These two pins are created in the same order they appear in the DOM
// (dishes -> testimonials). GSAP measures each new trigger's "natural"
// position against the current layout, which includes the pin-spacers of
// any pins created before it — creating them out of DOM order would measure
// a later section's position before an earlier pin-spacer has grown to its
// full scrubbed height, undercounting its start and causing visual overlap.

// "Nos plats populaires" — GSAP scroll-pin horizontal card effect, desktop/tablet only.
// Cards travel across the viewport as the section is pinned and scrolled; each card gets
// a trailing "lag" kick (proportional to scroll speed) as it enters the frame.
// On mobile this whole block is skipped — plain native touch-scroll carousel, no motion, no arrows.
if (window.matchMedia('(min-width: 721px)').matches) {
  const dishesPin = document.getElementById('dishesPin');
  const dishCardsTrack = document.getElementById('dishCards');
  const dishCardEls = dishCardsTrack ? dishCardsTrack.querySelectorAll('.dish-card') : [];

  if (dishesPin && dishCardsTrack && dishCardEls.length) {
    const distance = dishCardsTrack.clientWidth - window.innerWidth;

    const scrollTween = gsap.to(dishCardsTrack, {
      x: -distance,
      ease: 'none',
      scrollTrigger: {
        trigger: dishesPin,
        pin: true,
        scrub: true,
        start: 'top top',
        end: '+=' + distance
      }
    });

    let transformBetweenTwoTicks = 0;
    let oldTransform = 0;
    function dishTick() {
      const currentTransform = gsap.getProperty(dishCardsTrack, 'x');
      transformBetweenTwoTicks = currentTransform - oldTransform;
      oldTransform = currentTransform;
    }

    function transformDishCard(el) {
      gsap.fromTo(el, {
        xPercent: -transformBetweenTwoTicks * 3
      }, {
        xPercent: 0,
        ease: 'power3.out',
        duration: 0.7
      });
    }

    dishCardEls.forEach(card => {
      ScrollTrigger.create({
        trigger: card,
        containerAnimation: scrollTween,
        start: 'left 100%',
        end: 'right 0%',
        onEnter: () => transformDishCard(card.children[0]),
        onEnterBack: () => transformDishCard(card.children[0])
      });
    });

    ScrollTrigger.create({
      trigger: document.getElementById('plats'),
      onEnter: () => gsap.ticker.add(dishTick),
      onLeave: () => gsap.ticker.remove(dishTick),
      onEnterBack: () => gsap.ticker.add(dishTick),
      onLeaveBack: () => gsap.ticker.remove(dishTick)
    });
  }
}

// "Ce que disent nos clients" — 3D dual-deck scroll-pin effect, desktop/tablet only.
// Two overlapping decks (portraits / quote cards) flip through in 3D as the section
// is pinned and scrolled. On mobile this is skipped — plain stacked cards instead.
if (window.matchMedia('(min-width: 721px)').matches) {
  const testimonialPinHeight = document.getElementById('testimonialPinHeight');
  const testimonialStage = document.getElementById('testimonialStage');
  const testiMediasA = document.getElementById('testiMediasA');
  const testiMediasB = document.getElementById('testiMediasB');

  if (testimonialPinHeight && testimonialStage && testiMediasA && testiMediasB) {
    const itemsA = testiMediasA.querySelectorAll('.testi-media');
    const itemsB = testiMediasB.querySelectorAll('.testi-media');
    const stepsCount = itemsA.length;
    let currentStep = -1;

    gsap.timeline({
      scrollTrigger: {
        trigger: testimonialPinHeight,
        start: 'top top',
        end: 'bottom bottom',
        pin: testimonialStage,
        scrub: true,
        onUpdate: self => {
          const step = Math.round(self.progress * (stepsCount - 1));
          if (step !== currentStep) {
            setTestiVisible(step);
            currentStep = step;
          }
        }
      }
    });

    gsap.set(testiMediasA, { xPercent: -60 });
    gsap.set(testiMediasB, { xPercent: 60 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: testimonialPinHeight,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true
      }
    });

    for (let i = 0; i < stepsCount - 1; i++) {
      const dirA = i % 2 === 0 ? 1 : -1;

      tl.to(testiMediasA, { xPercent: dirA * 60, rotateY: '+=180', duration: 1, ease: 'power2.inOut' });
      tl.to(testiMediasA, { z: -150, duration: 0.5, yoyo: true, repeat: 1, ease: 'power2.inOut' }, '<');
      tl.to(testiMediasB, { xPercent: -dirA * 60, rotateY: '-=180', duration: 1, ease: 'power2.inOut' }, '<');
      tl.to(testiMediasB, { z: 150, duration: 0.5, yoyo: true, repeat: 1, ease: 'power2.inOut' }, '<');

      const rx = (Math.random() - 0.5) * 40;
      const rz = (Math.random() - 0.5) * 40;
      tl.to([testiMediasA, testiMediasB], {
        rotateX: rx, rotateZ: rz, scale: 1.1,
        duration: 0.5, repeat: 1, yoyo: true, ease: 'power2.in'
      }, '<');
    }

    function setTestiVisible(index) {
      itemsA.forEach((m, i) => m.style.visibility = i === index ? 'visible' : 'hidden');
      itemsB.forEach((m, i) => m.style.visibility = i === index ? 'visible' : 'hidden');
    }
  }
}

ScrollTrigger.refresh();

} // end initPinEffects

// Gallery items appear one after another as the grid scrolls into view
const galleryItems = document.querySelectorAll('.gallery-item');
if (galleryItems.length) {
  gsap.set(galleryItems, { opacity: 0, y: 30 });

  const galleryObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        gsap.to(galleryItems, {
          y: 0, opacity: 1,
          stagger: 0.15, duration: 0.7,
          ease: 'power2.out'
        });
        galleryObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  galleryObserver.observe(document.querySelector('.gallery-grid'));
}

// Gallery lightbox
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxClose = document.getElementById('lightboxClose');

document.querySelectorAll('.gallery-item').forEach(item => {
  item.addEventListener('click', () => {
    lightboxImg.src = item.dataset.full;
    lightboxImg.alt = item.querySelector('img').alt;
    lightbox.classList.add('is-open');
    lenis.stop();
  });
});

function closeLightbox() {
  lightbox.classList.remove('is-open');
  lenis.start();
}

lightboxClose?.addEventListener('click', closeLightbox);
lightbox?.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox();
});

// --- Promo Video Logic ---
const promoVideo = document.getElementById('promoVideo');
const playBtn = document.getElementById('playBtn');

if (promoVideo && playBtn) {
  playBtn.addEventListener('click', () => {
    if (promoVideo.paused) {
      promoVideo.play();
      playBtn.style.opacity = '0';
      playBtn.style.pointerEvents = 'none';
      promoVideo.setAttribute('controls', 'true');
    }
  });

  promoVideo.addEventListener('pause', () => {
    playBtn.style.opacity = '1';
    playBtn.style.pointerEvents = 'auto';
    promoVideo.removeAttribute('controls');
  });
}
