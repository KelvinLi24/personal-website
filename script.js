const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
let width = 0;
let height = 0;
let mouse = { x: null, y: null };

function resizeCanvas() {
  width = canvas.width = window.innerWidth * window.devicePixelRatio;
  height = canvas.height = window.innerHeight * window.devicePixelRatio;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  createParticles();
}

function createParticles() {
  const count = Math.min(110, Math.floor(window.innerWidth / 13));
  particles = Array.from({ length: count }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    vx: (Math.random() - 0.5) * 0.45,
    vy: (Math.random() - 0.5) * 0.45,
    size: Math.random() * 2.1 + 0.7,
    hue: Math.random() > 0.5 ? 190 : 270
  }));
}

function drawParticles() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  particles.forEach((p, i) => {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0 || p.x > window.innerWidth) p.vx *= -1;
    if (p.y < 0 || p.y > window.innerHeight) p.vy *= -1;

    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 7);
    gradient.addColorStop(0, `hsla(${p.hue}, 100%, 70%, .9)`);
    gradient.addColorStop(1, `hsla(${p.hue}, 100%, 70%, 0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 7, 0, Math.PI * 2);
    ctx.fill();

    for (let j = i + 1; j < particles.length; j++) {
      const q = particles[j];
      const dx = p.x - q.x;
      const dy = p.y - q.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 135) {
        ctx.strokeStyle = `rgba(85, 230, 255, ${0.12 * (1 - dist / 135)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }
    }

    if (mouse.x !== null) {
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 160) {
        ctx.strokeStyle = `rgba(255, 92, 200, ${0.18 * (1 - dist / 160)})`;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.stroke();
      }
    }
  });
  requestAnimationFrame(drawParticles);
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('pointermove', (event) => {
  mouse = { x: event.clientX, y: event.clientY };
  const glow = document.querySelector('.cursor-glow');
  if (glow) {
    glow.style.left = `${event.clientX}px`;
    glow.style.top = `${event.clientY}px`;
  }
});
window.addEventListener('pointerleave', () => { mouse = { x: null, y: null }; });
resizeCanvas();
drawParticles();

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.14 });

document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-menu');
navToggle.addEventListener('click', () => {
  const open = navMenu.classList.toggle('open');
  document.body.classList.toggle('menu-open', open);
  navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
});

document.querySelectorAll('.nav-menu a').forEach((link) => {
  link.addEventListener('click', () => {
    navMenu.classList.remove('open');
    document.body.classList.remove('menu-open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

const sections = [...document.querySelectorAll('main section[id]')];
const navLinks = [...document.querySelectorAll('.nav-menu a')];
window.addEventListener('scroll', () => {
  const current = sections.findLast((section) => window.scrollY >= section.offsetTop - 140);
  navLinks.forEach((link) => link.classList.toggle('active', current && link.getAttribute('href') === `#${current.id}`));
  document.querySelector('.back-to-top').classList.toggle('show', window.scrollY > 650);
});

document.querySelector('.back-to-top').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));


// Dynamic light-follow effect on cards.
document.querySelectorAll('.hero-card, .project-card, .award-card, .qualification-card, .language-card, .experience-card, .teaching-card').forEach((card) => {
  card.addEventListener('pointermove', (event) => {
    const rect = card.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty('--mx', `${x}%`);
    card.style.setProperty('--my', `${y}%`);
  });
});

// Gentle magnetic button/logo movement.
document.querySelectorAll('.magnetic').forEach((el) => {
  el.addEventListener('pointermove', (event) => {
    const rect = el.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    el.style.transform = `translate(${x * 0.08}px, ${y * 0.08}px)`;
  });
  el.addEventListener('pointerleave', () => {
    el.style.transform = '';
  });
});
