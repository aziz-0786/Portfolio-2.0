/* ==========================================================
   Abdul Aziz — Portfolio interactions
   Graceful degradation: every animated thing has a sane
   static fallback if a CDN script fails or motion is reduced.
   ========================================================== */

document.getElementById('year').textContent = new Date().getFullYear();

var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
var isSmall = window.innerWidth < 760;

/* ---------------------------------------------------------
   Nav: scrolled state + mobile menu toggle
   --------------------------------------------------------- */
(function () {
  var nav = document.getElementById('nav');
  var onScroll = function () {
    if (window.scrollY > 12) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var toggle = document.getElementById('navToggle');
  var menu = document.getElementById('mobileMenu');
  var backdrop = document.getElementById('mobileBackdrop');

  function closeMenu() {
    toggle.classList.remove('open');
    menu.classList.remove('open');
    backdrop.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
  function openMenu() {
    toggle.classList.add('open');
    menu.classList.add('open');
    backdrop.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  toggle.addEventListener('click', function () {
    menu.classList.contains('open') ? closeMenu() : openMenu();
  });
  backdrop.addEventListener('click', closeMenu);
  menu.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', closeMenu);
  });
})();

/* ---------------------------------------------------------
   Scroll progress bar (vanilla, no GSAP dependency)
   --------------------------------------------------------- */
(function () {
  var bar = document.getElementById('scrollBar');
  function update() {
    var h = document.documentElement;
    var scrollTop = h.scrollTop || document.body.scrollTop;
    var height = h.scrollHeight - h.clientHeight;
    var pct = height > 0 ? (scrollTop / height) * 100 : 0;
    bar.style.width = pct + '%';
  }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

/* ---------------------------------------------------------
   Floating WhatsApp FAB — show after hero is scrolled past
   --------------------------------------------------------- */
(function () {
  var fab = document.getElementById('fabWhatsapp');
  var hero = document.getElementById('home');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) fab.classList.remove('show');
        else fab.classList.add('show');
      });
    }, { threshold: 0.15 });
    io.observe(hero);
  } else {
    fab.classList.add('show');
  }
})();

/* ---------------------------------------------------------
   Tilt-on-hover for cards (pointer:fine devices only)
   --------------------------------------------------------- */
(function () {
  if (isTouch || reduceMotion) return;
  var tiltEls = document.querySelectorAll('.tilt, #imageFrame');
  tiltEls.forEach(function (el) {
    var bounds;
    function onMove(e) {
      bounds = el.getBoundingClientRect();
      var x = (e.clientX - bounds.left) / bounds.width - 0.5;
      var y = (e.clientY - bounds.top) / bounds.height - 0.5;
      el.style.transform = 'perspective(800px) rotateY(' + (x * 10) + 'deg) rotateX(' + (-y * 10) + 'deg) translateZ(0)';
    }
    function onLeave() {
      el.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg)';
    }
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
  });
})();

/* ---------------------------------------------------------
   GSAP scroll reveals + hero intro + timeline progress
   Falls back silently to "everything visible" if GSAP
   failed to load from the CDN.
   --------------------------------------------------------- */
(function () {
  if (typeof gsap === 'undefined') return; // content already visible by default — safe no-op

  if (typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);

  var dur = reduceMotion ? 0.01 : 0.8;
  var ease = 'power3.out';

  // Hero intro sequence (orchestrated, not scattered)
  var heroEls = document.querySelectorAll('.hero [data-reveal]');
  gsap.set(heroEls, { opacity: 0, y: reduceMotion ? 0 : 24 });
  gsap.to(heroEls, {
    opacity: 1, y: 0, duration: dur, ease: ease,
    stagger: reduceMotion ? 0 : 0.12, delay: 0.15
  });

  if (typeof ScrollTrigger !== 'undefined') {
    // Generic section reveals (everything outside hero)
    var groups = document.querySelectorAll('section:not(.hero) [data-reveal]');
    groups.forEach(function (el) {
      gsap.set(el, { opacity: 0, y: reduceMotion ? 0 : 28 });
      gsap.to(el, {
        opacity: 1, y: 0, duration: dur, ease: ease,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      });
    });

    // Pillar / project card stagger by parent grid
    ['.pillar-grid', '.project-grid'].forEach(function (sel) {
      var grid = document.querySelector(sel);
      if (!grid) return;
      var cards = grid.children;
      gsap.set(cards, { opacity: 0, y: reduceMotion ? 0 : 30 });
      gsap.to(cards, {
        opacity: 1, y: 0, duration: dur, ease: ease, stagger: 0.1,
        scrollTrigger: { trigger: grid, start: 'top 85%', once: true }
      });
    });

    // Timeline progress line tied to scroll through the timeline block
    var track = document.querySelector('.timeline');
    var progress = document.getElementById('timelineProgress');
    if (track && progress) {
      gsap.to(progress, {
        height: '100%', ease: 'none',
        scrollTrigger: {
          trigger: track, start: 'top 70%', end: 'bottom 60%', scrub: true
        }
      });
    }

    // Skill tag rows: subtle stagger-in per group
    document.querySelectorAll('.tag-row').forEach(function (row) {
      var tags = row.children;
      gsap.set(tags, { opacity: 0, y: reduceMotion ? 0 : 10 });
      gsap.to(tags, {
        opacity: 1, y: 0, duration: 0.5, ease: ease, stagger: 0.03,
        scrollTrigger: { trigger: row, start: 'top 92%', once: true }
      });
    });
  }
})();

/* ---------------------------------------------------------
   Three.js hero agent-network canvas
   Lightweight: Points + LineSegments only, no models.
   Node/segment counts scale down on mobile for perf.
   Pauses render loop when hero leaves viewport.
   --------------------------------------------------------- */
(function () {
  var canvas = document.getElementById('agentCanvas');
  if (!canvas) return;
  if (typeof THREE === 'undefined') return; // CDN failed — CSS gradient hero still looks fine
  if (reduceMotion) return; // respect reduced motion: no animated canvas

  var hero = document.getElementById('home');
  var nodeCount = isSmall ? 22 : 52;
  var maxLinkDist = isSmall ? 130 : 170;

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmall ? 1.5 : 2));

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2000);
  camera.position.z = 480;

  function size() {
    var w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  size();
  window.addEventListener('resize', size);

  // Nodes: random positions in a wide flat volume behind the copy
  var nodes = [];
  var spread = { x: 900, y: 520, z: 260 };
  for (var i = 0; i < nodeCount; i++) {
    nodes.push({
      pos: new THREE.Vector3(
        (Math.random() - 0.5) * spread.x,
        (Math.random() - 0.5) * spread.y,
        (Math.random() - 0.5) * spread.z
      ),
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 0.25,
        (Math.random() - 0.5) * 0.25,
        (Math.random() - 0.5) * 0.15
      ),
      pulse: Math.random() * Math.PI * 2
    });
  }

  var pointGeo = new THREE.BufferGeometry();
  var posAttr = new Float32Array(nodeCount * 3);
  pointGeo.setAttribute('position', new THREE.BufferAttribute(posAttr, 3));

  var pointMat = new THREE.PointsMaterial({
    color: 0xff8a3d, size: 5.5, transparent: true, opacity: 0.9, sizeAttenuation: true
  });
  var points = new THREE.Points(pointGeo, pointMat);
  scene.add(points);

  var lineGeo = new THREE.BufferGeometry();
  var maxLines = nodeCount * 6;
  var linePos = new Float32Array(maxLines * 2 * 3);
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
  var lineMat = new THREE.LineBasicMaterial({ color: 0x00d9c0, transparent: true, opacity: 0.18 });
  var lines = new THREE.LineSegments(lineGeo, lineMat);
  scene.add(lines);

  var clock = new THREE.Clock();
  var running = true;

  function animate() {
    if (!running) return;
    requestAnimationFrame(animate);
    var dt = Math.min(clock.getDelta(), 0.05);
    var t = clock.elapsedTime;

    var lineIdx = 0;
    for (var i = 0; i < nodeCount; i++) {
      var n = nodes[i];
      n.pos.addScaledVector(n.vel, dt * 18);
      if (Math.abs(n.pos.x) > spread.x / 2) n.vel.x *= -1;
      if (Math.abs(n.pos.y) > spread.y / 2) n.vel.y *= -1;
      if (Math.abs(n.pos.z) > spread.z / 2) n.vel.z *= -1;

      posAttr[i * 3] = n.pos.x;
      posAttr[i * 3 + 1] = n.pos.y;
      posAttr[i * 3 + 2] = n.pos.z;
    }

    for (var a = 0; a < nodeCount; a++) {
      for (var b = a + 1; b < nodeCount; b++) {
        if (lineIdx >= maxLines) break;
        var dx = nodes[a].pos.x - nodes[b].pos.x;
        var dy = nodes[a].pos.y - nodes[b].pos.y;
        var dz = nodes[a].pos.z - nodes[b].pos.z;
        var d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < maxLinkDist) {
          var base = lineIdx * 6;
          linePos[base] = nodes[a].pos.x;
          linePos[base + 1] = nodes[a].pos.y;
          linePos[base + 2] = nodes[a].pos.z;
          linePos[base + 3] = nodes[b].pos.x;
          linePos[base + 4] = nodes[b].pos.y;
          linePos[base + 5] = nodes[b].pos.z;
          lineIdx++;
        }
      }
    }
    // zero out unused line slots so old segments don't linger
    for (var k = lineIdx; k < maxLines; k++) {
      var z = k * 6;
      linePos[z] = linePos[z + 1] = linePos[z + 2] = 0;
      linePos[z + 3] = linePos[z + 4] = linePos[z + 5] = 0;
    }

    pointGeo.attributes.position.needsUpdate = true;
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.setDrawRange(0, lineIdx * 2);

    // gentle camera drift, like the whole graph breathing
    camera.position.x = Math.sin(t * 0.08) * 30;
    camera.position.y = Math.cos(t * 0.06) * 18;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }

  // Subtle parallax toward mouse position (desktop only)
  if (!isTouch) {
    window.addEventListener('mousemove', function (e) {
      var nx = (e.clientX / window.innerWidth - 0.5);
      var ny = (e.clientY / window.innerHeight - 0.5);
      gsapSafeSet(scene.rotation, 'y', nx * 0.15);
      gsapSafeSet(scene.rotation, 'x', -ny * 0.1);
    });
  }
  function gsapSafeSet(obj, prop, val) {
    if (typeof gsap !== 'undefined') {
      gsap.to(obj, { [prop]: val, duration: 1.2, ease: 'power2.out', overwrite: true });
    } else {
      obj[prop] = val;
    }
  }

  // Pause rendering when hero is off-screen (saves battery on long pages)
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !running) { running = true; animate(); }
        if (!entry.isIntersecting) running = false;
      });
    }, { threshold: 0.01 }).observe(hero);
  }

  animate();
})();
