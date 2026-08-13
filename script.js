(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const toast = $('.toast');
  const toastMessage = $('.toast-message', toast || document);
  let toastTimer;
  const showToast = (message) => {
    if (!toast) return;
    if (toastMessage) toastMessage.textContent = message;
    else toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  };

  // Keep every dated post feed newest-first, while preserving original order for ties.
  $$('.post-feed').forEach((feed) => {
    const posts = $$('.social-post', feed);
    posts
      .map((post, index) => ({ post, index, date: post.dataset.date || '0001-01-01' }))
      .sort((a, b) => b.date.localeCompare(a.date) || a.index - b.index)
      .forEach(({ post }) => feed.appendChild(post));
  });

  // Reveal animation.
  const revealItems = $$('.reveal');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('visible'));
  }

  // Navigation.
  const navToggle = $('.nav-toggle');
  const navMenu = $('.nav-menu');
  navToggle?.addEventListener('click', () => {
    const open = !navMenu?.classList.contains('open');
    navMenu?.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', String(open));
  });
  $$('.nav-menu a').forEach((link) => link.addEventListener('click', () => {
    navMenu?.classList.remove('open');
    navToggle?.setAttribute('aria-expanded', 'false');
  }));

  const allSectionLinks = [...$$('.nav-menu a'), ...$$('.sidebar-links a')];
  const sectionIds = [...new Set(allSectionLinks.map((a) => a.getAttribute('href')).filter((href) => href?.startsWith('#')))];
  const navTargets = sectionIds.map((href) => $(href)).filter(Boolean);
  const orderedNavTargets = [...navTargets];
  const sidebarNav = $('.sidebar-nav');
  let currentActiveSection = '';

  const keepActiveSidebarLinkVisible = (link) => {
    if (!sidebarNav || !link || getComputedStyle(sidebarNav).display === 'none') return;
    const navRect = sidebarNav.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    const topSafe = navRect.top + 92;
    const bottomSafe = navRect.bottom - 18;
    if (linkRect.top < topSafe) {
      sidebarNav.scrollBy({ top: linkRect.top - topSafe - 10, behavior: 'smooth' });
    } else if (linkRect.bottom > bottomSafe) {
      sidebarNav.scrollBy({ top: linkRect.bottom - bottomSafe + 10, behavior: 'smooth' });
    }
  };

  const setActiveSection = (id) => {
    if (!id) return;
    const changed = currentActiveSection !== id;
    currentActiveSection = id;
    let activeSidebarLink = null;
    allSectionLinks.forEach((link) => {
      const active = link.getAttribute('href') === `#${id}`;
      link.classList.toggle('active', active);
      if (active) {
        link.setAttribute('aria-current', 'page');
        if (link.closest('.sidebar-links')) activeSidebarLink = link;
      } else {
        link.removeAttribute('aria-current');
      }
    });
    if (changed) keepActiveSidebarLinkVisible(activeSidebarLink);
  };

  // Track the section crossing a visual reading line inside the viewport. Using
  // getBoundingClientRect avoids stale offset calculations and stays accurate for
  // sections whose height changes after galleries or details are opened.
  const updateActiveNav = () => {
    if (!orderedNavTargets.length) return;
    const viewportHeight = Math.max(window.innerHeight || 0, 1);
    const readingLine = Math.min(Math.max(viewportHeight * 0.32, 150), 340);
    const pageBottom = window.scrollY + viewportHeight >= document.documentElement.scrollHeight - 8;
    let active = null;

    if (pageBottom) {
      active = orderedNavTargets[orderedNavTargets.length - 1];
    } else {
      for (const section of orderedNavTargets) {
        const rect = section.getBoundingClientRect();
        if (rect.top <= readingLine && rect.bottom > readingLine) {
          active = section;
          break;
        }
      }

      // Between sections (or during layout transitions), use the section whose box
      // is nearest to the reading line so the highlight never gets stuck.
      if (!active) {
        let bestDistance = Number.POSITIVE_INFINITY;
        for (const section of orderedNavTargets) {
          const rect = section.getBoundingClientRect();
          const distance = rect.top > readingLine
            ? rect.top - readingLine
            : readingLine - rect.bottom;
          if (distance < bestDistance) {
            bestDistance = distance;
            active = section;
          }
        }
      }
    }

    setActiveSection(active?.id);
  };

  allSectionLinks.forEach((link) => {
    link.addEventListener('click', () => {
      const href = link.getAttribute('href');
      if (href?.startsWith('#')) setActiveSection(href.slice(1));
    });
  });

  // Scroll progress + back to top.
  const progressBar = $('.scroll-progress span');
  const backToTop = $('.back-to-top');
  let scrollFrame = 0;
  const updateScrollUI = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? (window.scrollY / max) * 100 : 0;
    if (progressBar) progressBar.style.width = `${progress}%`;
    backToTop?.classList.toggle('visible', window.scrollY > 680);
    updateActiveNav();
  };
  const queueScrollUI = () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      updateScrollUI();
    });
  };
  addEventListener('scroll', queueScrollUI, { passive: true });
  addEventListener('resize', queueScrollUI, { passive: true });
  updateScrollUI();
  backToTop?.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));

  // Gentle magnetic buttons on mouse devices.
  if (matchMedia('(pointer:fine)').matches) {
    $$('.magnetic').forEach((element) => {
      element.addEventListener('pointermove', (event) => {
        const rect = element.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) * 0.09;
        const y = (event.clientY - rect.top - rect.height / 2) * 0.09;
        element.style.transform = `translate(${x}px, ${y}px)`;
      });
      element.addEventListener('pointerleave', () => { element.style.transform = ''; });
    });
  }

  // Use assets/icon.png everywhere an avatar appears, while retaining initials as a fallback.
  $$('.avatar-frame').forEach((frame) => {
    const image = $('.avatar-image', frame);
    if (!image) return;
    const markReady = () => frame.classList.add('avatar-image-ready');
    const markFailed = () => frame.classList.remove('avatar-image-ready');
    if (image.complete) {
      if (image.naturalWidth > 0) markReady();
      else markFailed();
    }
    image.addEventListener('load', markReady, { once: true });
    image.addEventListener('error', markFailed, { once: true });
  });

  // Non-button content/title links get a compact source cue and external-link arrow.
  const inlineSourceLabel = (link) => {
    try {
      const host = new URL(link.href, location.href).hostname.toLowerCase();
      if (host.includes('credly.com')) return 'Credential';
      if (host.includes('dgs.edu.hk')) return 'School Website';
      if (host.includes('kyoto-u.ac.jp')) return 'Conference Website';
      if (host.includes('github.io')) return 'Project Website';
      if (host.includes('linkedin.com')) return 'LinkedIn';
      if (host.includes('youtu.be') || host.includes('youtube.com')) return 'YouTube';
      return 'Website';
    } catch {
      return 'Link';
    }
  };

  [...new Set([...$$('a.content-link:not(.source-link)'), ...$$('a.text-link')])].forEach((link) => {
    if (link.closest('.post-links, .contact-actions, .share-sheet, nav, .sidebar-nav')) return;
    if ($('.inline-link-note', link)) return;
    const textNodes = [...link.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE);
    const lastText = textNodes[textNodes.length - 1];
    if (lastText) lastText.textContent = lastText.textContent.replace(/\s*↗\s*$/, '');
    const note = document.createElement('span');
    note.className = 'inline-link-note';
    note.textContent = `${inlineSourceLabel(link)} ↗`;
    link.appendChild(note);
  });

  // Overlay / modal state.
  const shareSheet = $('.share-sheet');
  const moreSheet = $('.more-sheet');
  const lightbox = $('.lightbox');
  const postBackdrop = $('.post-window-backdrop');
  let expandedPost = null;
  let expandedPlaceholder = null;
  let lastModalTrigger = null;
  let currentShareUrl = '';
  let currentMoreUrl = '';
  let currentMorePost = null;

  const syncBodyLock = () => {
    const modalOpen = [shareSheet, moreSheet, lightbox].some((layer) => layer && !layer.hidden);
    document.body.classList.toggle('modal-open', Boolean(modalOpen || expandedPost));
  };

  const openModal = (layer, trigger = document.activeElement) => {
    if (!layer) return;
    lastModalTrigger = trigger instanceof HTMLElement ? trigger : null;
    layer.hidden = false;
    layer.setAttribute('aria-hidden', 'false');
    syncBodyLock();
    requestAnimationFrame(() => $('.modal-window-control:not([aria-disabled="true"])', layer)?.focus());
  };

  const closeModal = (layer, restoreFocus = true) => {
    if (!layer) return;
    layer.hidden = true;
    layer.setAttribute('aria-hidden', 'true');
    $('.modal-window', layer)?.classList.remove('modal-zoomed');
    syncBodyLock();
    if (restoreFocus) lastModalTrigger?.focus?.();
  };

  const copyText = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
  };

  // Post window controls: before expansion only the green control is active.
  const setPostControlState = (post, isExpanded) => {
    $$('.window-control', $('.interactive-traffic-lights', post) || post).forEach((button) => {
      const action = button.dataset.windowAction;
      const enabled = isExpanded || action === 'expand';
      button.setAttribute('aria-disabled', enabled ? 'false' : 'true');
      if (enabled) button.removeAttribute('tabindex');
      else button.setAttribute('tabindex', '-1');
      if (action === 'expand') {
        button.setAttribute('aria-label', isExpanded ? 'Restore this post' : 'Expand this post');
      }
    });
  };

  const expandPost = (post) => {
    if (!post || expandedPost === post) return;
    if (expandedPost) restoreExpandedPost(false);
    expandedPost = post;
    expandedPlaceholder = document.createElement('div');
    expandedPlaceholder.className = 'post-window-placeholder';
    expandedPlaceholder.style.height = `${post.getBoundingClientRect().height}px`;
    post.parentNode.insertBefore(expandedPlaceholder, post);
    document.body.appendChild(post);
    post.classList.add('post-expanded');
    post.scrollTop = 0;
    setPostControlState(post, true);
    if (postBackdrop) {
      postBackdrop.hidden = false;
      requestAnimationFrame(() => postBackdrop.classList.add('visible'));
    }
    syncBodyLock();
  };

  function restoreExpandedPost(restoreFocus = true) {
    if (!expandedPost) return;
    const post = expandedPost;
    const focusTarget = $('[data-window-action="expand"]', post);
    post.classList.remove('post-expanded');
    if (expandedPlaceholder?.parentNode) {
      expandedPlaceholder.parentNode.insertBefore(post, expandedPlaceholder);
      expandedPlaceholder.remove();
    }
    expandedPlaceholder = null;
    expandedPost = null;
    setPostControlState(post, false);
    if (postBackdrop) {
      postBackdrop.classList.remove('visible');
      window.setTimeout(() => {
        if (!expandedPost) postBackdrop.hidden = true;
      }, 220);
    }
    syncBodyLock();
    if (restoreFocus) focusTarget?.focus();
  }

  $$('.social-post').forEach((post) => {
    setPostControlState(post, false);
    $$('.window-control', $('.interactive-traffic-lights', post) || post).forEach((button) => {
      button.addEventListener('click', () => {
        if (button.getAttribute('aria-disabled') === 'true') return;
        const action = button.dataset.windowAction;
        if (action === 'expand') {
          if (expandedPost === post) restoreExpandedPost();
          else expandPost(post);
        } else if ((action === 'close' || action === 'minimize') && expandedPost === post) {
          restoreExpandedPost();
        }
      });
    });
  });
  postBackdrop?.addEventListener('click', () => restoreExpandedPost());

  // Modal traffic-light controls. Red and amber close; green toggles the window size.
  $$('.modal-layer').forEach((layer) => {
    layer.addEventListener('click', (event) => {
      if (event.target !== layer) return;
      if (layer === lightbox) closeLightbox();
      else closeModal(layer);
    });
    $$('.modal-window-control', layer).forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.modalAction;
        if (action === 'zoom') {
          $('.modal-window', layer)?.classList.toggle('modal-zoomed');
          return;
        }
        if (action === 'close' || action === 'minimize') {
          if (layer === lightbox) closeLightbox();
          else closeModal(layer);
        }
      });
    });
  });

  // Numbered galleries: 1.jpg / 2.png / 3.webp ...
  // Accept both lower- and upper-case extensions because photos exported from
  // cameras/phones commonly arrive as .JPG or .PNG. This keeps every post,
  // including the TBICS paper post, on the exact same gallery loader.
  const extensions = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'JPG', 'JPEG', 'PNG', 'WEBP', 'AVIF', 'GIF'];
  const tryImage = (base, number) => new Promise((resolve) => {
    let extensionIndex = 0;
    const probe = () => {
      if (extensionIndex >= extensions.length) return resolve(null);
      const src = `${base}/${number}.${extensions[extensionIndex++]}`;
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => resolve(src);
      image.onerror = probe;
      image.src = src;
    };
    probe();
  });

  const lightboxImage = $('.lightbox img');
  const lightboxCaption = $('.lightbox-caption');
  const lightboxWindowTitle = $('.lightbox-window-title');
  const lightboxPrev = $('.lightbox-prev');
  const lightboxNext = $('.lightbox-next');
  let lightboxState = null;

  const setLightbox = (index) => {
    if (!lightboxState || !lightboxImage) return;
    const { images, title } = lightboxState;
    lightboxState.index = (index + images.length) % images.length;
    const current = lightboxState.index;
    lightboxImage.src = images[current];
    lightboxImage.alt = `${title} — photo ${current + 1}`;
    if (lightboxCaption) lightboxCaption.textContent = `${title} · ${current + 1} / ${images.length}`;
    if (lightboxWindowTitle) lightboxWindowTitle.textContent = `${current + 1} of ${images.length}`;
  };
  const openLightbox = (images, index, title, trigger) => {
    if (!lightbox || !images.length) return;
    lightboxState = { images, index, title };
    setLightbox(index);
    openModal(lightbox, trigger);
  };
  function closeLightbox() {
    if (!lightbox) return;
    closeModal(lightbox);
    lightboxState = null;
    if (lightboxImage) lightboxImage.removeAttribute('src');
  }
  lightboxPrev?.addEventListener('click', () => setLightbox((lightboxState?.index ?? 0) - 1));
  lightboxNext?.addEventListener('click', () => setLightbox((lightboxState?.index ?? 0) + 1));

  const galleryControllers = new WeakMap();
  async function setupGallery(shell) {
    const folder = shell.dataset.folder;
    const maxImages = Math.max(1, Math.min(60, Number(shell.dataset.maxImages) || 30));
    const stage = $('.gallery-stage', shell);
    const dots = $('.carousel-dots', shell.closest('.social-post'));
    const counter = $('.gallery-counter', shell);
    const prev = $('.gallery-prev', shell);
    const next = $('.gallery-next', shell);
    if (!folder || !stage) return;

    const images = [];
    // Probe the whole numbered range instead of stopping at the first missing
    // number. A missing 2.jpg should not prevent 3.jpg / 4.jpg from appearing.
    // Promise.all also prevents one gallery from feeling slower than another.
    const numberedSources = await Promise.all(
      Array.from({ length: maxImages }, (_, index) => tryImage(folder, index + 1))
    );
    numberedSources.forEach((src) => { if (src) images.push(src); });
    if (!images.length) return;

    shell.classList.add('has-images');
    if (images.length > 1) shell.classList.add('multiple');
    stage.innerHTML = '';
    if (dots) dots.innerHTML = '';
    const title = $('.post-heading span', shell.closest('.social-post'))?.textContent.trim() || 'Portfolio post';
    let current = 0;

    // Touch devices briefly reveal the carousel arrows, then fade them away again.
    // This mirrors a native mobile gallery: controls are discoverable without
    // permanently covering the photo.
    const touchGallery = window.matchMedia('(hover: none)').matches || window.matchMedia('(pointer: coarse)').matches;
    let controlsTimer = 0;
    const showTouchControls = (duration = 1800) => {
      if (!touchGallery || images.length < 2) return;
      shell.classList.add('controls-visible');
      window.clearTimeout(controlsTimer);
      controlsTimer = window.setTimeout(() => shell.classList.remove('controls-visible'), duration);
    };

    const go = (index) => {
      current = (index + images.length) % images.length;
      $$('.gallery-slide', stage).forEach((slide, idx) => slide.classList.toggle('active', idx === current));
      if (dots) $$('button', dots).forEach((dot, idx) => dot.classList.toggle('active', idx === current));
      if (counter) counter.textContent = `${current + 1} / ${images.length}`;
      showTouchControls(1500);
    };

    images.forEach((src, index) => {
      const slide = document.createElement('div');
      slide.className = `gallery-slide${index === 0 ? ' active' : ''}`;
      const img = document.createElement('img');
      img.src = src;
      img.alt = `${title} — photo ${index + 1}`;
      img.loading = index === 0 ? 'eager' : 'lazy';
      img.decoding = 'async';
      img.draggable = false;
      img.addEventListener('dragstart', (event) => event.preventDefault());
      img.addEventListener('contextmenu', (event) => event.preventDefault());
      slide.appendChild(img);
      stage.appendChild(slide);

      if (dots && images.length > 1) {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = index === 0 ? 'active' : '';
        dot.setAttribute('aria-label', `Show photo ${index + 1}`);
        dot.addEventListener('click', () => go(index));
        dots.appendChild(dot);
      }
    });

    prev?.addEventListener('click', () => go(current - 1));
    next?.addEventListener('click', () => go(current + 1));
    if (counter) counter.textContent = `1 / ${images.length}`;

    // Show controls briefly when the gallery first becomes usable. Any later
    // touch/swipe/navigation resets the timer, so the arrows never stay on top
    // of the image indefinitely on phones and tablets.
    if (touchGallery && images.length > 1) {
      requestAnimationFrame(() => showTouchControls(1900));
      shell.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'touch' || event.pointerType === 'pen') showTouchControls(1800);
      }, { passive: true });
    }

    let touchStartX = null;
    shell.addEventListener('touchstart', (event) => {
      touchStartX = event.touches[0]?.clientX ?? null;
      showTouchControls(1800);
    }, { passive: true });
    shell.addEventListener('touchend', (event) => {
      if (touchStartX === null || images.length < 2) return;
      const endX = event.changedTouches[0]?.clientX ?? touchStartX;
      const delta = endX - touchStartX;
      if (Math.abs(delta) > 42) go(current + (delta < 0 ? 1 : -1));
      touchStartX = null;
    }, { passive: true });

    shell.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') { event.preventDefault(); go(current + 1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); go(current - 1); }
    });

    galleryControllers.set(shell, { images, go, current: () => current, title });
  }
  $$('.media-shell').forEach(setupGallery);

  // Deter casual image saving and dragging from post media.
  document.addEventListener('contextmenu', (event) => {
    if (event.target instanceof HTMLImageElement && event.target.closest('.media-shell, .lightbox')) {
      event.preventDefault();
    }
  });
  document.addEventListener('dragstart', (event) => {
    if (event.target instanceof HTMLImageElement && event.target.closest('.media-shell, .lightbox')) {
      event.preventDefault();
    }
  });

  // Use a fixed-viewBox SVG for the large double-like heart. The text glyph
  // used previously could render with a different aspect ratio on mobile fonts,
  // making the heart look stretched during the scale animation.
  $$('.double-like').forEach((pop) => {
    if ($('svg', pop)) return;
    pop.textContent = '';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M12 21.35 10.55 20.03C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35Z');
    svg.appendChild(path);
    pop.appendChild(svg);
  });

  // Like / save / comment / share interactions.
  const safeStorage = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch {} }
  };

  function setLike(post, liked, animate = true) {
    const button = $('.like-button', post);
    const status = $('.like-status', post);
    if (!button) return;
    button.classList.toggle('liked', liked);
    button.setAttribute('aria-label', liked ? 'Unlike this post' : 'Like this post');
    if (status) status.textContent = liked ? 'Liked' : 'A selected portfolio moment';
    safeStorage.set(`kelvin-like:${post.dataset.postId}`, liked ? '1' : '0');
    if (liked && animate) {
      const pop = $('.double-like', post);
      pop?.classList.remove('pop');
      requestAnimationFrame(() => pop?.classList.add('pop'));
    }
  }

  const sharePost = (post, trigger) => {
    const id = post.dataset.postId;
    const title = $('.post-heading span', post)?.textContent.trim() || 'Kelvin Li portfolio';
    const url = `${location.href.split('#')[0]}#${id}`;
    currentShareUrl = url;
    const titleEl = $('.share-post-title');
    if (titleEl) titleEl.textContent = title;
    const email = $('.share-email');
    if (email) {
      const subject = encodeURIComponent(`Kelvin Li — ${title}`);
      const body = encodeURIComponent(`${title}\n\n${url}`);
      email.href = `mailto:kelvin@gmail.com?subject=${subject}&body=${body}`;
    }
    openModal(shareSheet, trigger);
  };

  const animateCopySuccess = (button, { defaultIcon, defaultLabel, successLabel }) => {
    if (!button) return;
    const icon = $('.share-action-icon', button);
    const label = $('strong', button);
    button.classList.remove('copied');
    void button.offsetWidth;
    button.classList.add('copied');
    if (icon) icon.textContent = '✓';
    if (label) label.textContent = successLabel;
    window.clearTimeout(button._copyResetTimer);
    button._copyResetTimer = window.setTimeout(() => {
      button.classList.remove('copied');
      if (icon) icon.textContent = defaultIcon;
      if (label) label.textContent = defaultLabel;
    }, 1550);
  };

  const contactCopyButton = $('.contact-copy-email-card');
  contactCopyButton?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    await copyText('kelvin@gmail.com');
    const icon = $('.contact-method-icon', button);
    const small = $('.contact-method-copy small', button);
    const strong = $('.contact-method-copy strong', button);
    const meta = $('.contact-method-copy em', button);
    const indicator = $('.contact-copy-indicator', button);

    button.classList.remove('copied');
    void button.offsetWidth;
    button.classList.add('copied');
    if (icon) icon.innerHTML = '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"></path></svg>';
    if (small) small.textContent = 'Copied';
    if (strong) strong.textContent = 'Email copied';
    if (meta) meta.textContent = 'kelvin@gmail.com';
    if (indicator) indicator.textContent = '✓';
    window.clearTimeout(button._copyResetTimer);
    button._copyResetTimer = window.setTimeout(() => {
      button.classList.remove('copied');
      if (icon) icon.innerHTML = '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="11" height="11" rx="2"></rect><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"></path></svg>';
      if (small) small.textContent = 'Quick action';
      if (strong) strong.textContent = 'Copy email';
      if (meta) meta.textContent = 'kelvin@gmail.com';
      if (indicator) indicator.textContent = '⌘C';
    }, 1650);
    showToast('Email address copied');
  });

  $('.share-copy-link')?.addEventListener('click', async (event) => {
    if (!currentShareUrl) return;
    // Preserve the button reference before await: Event.currentTarget is cleared
    // once the async handler yields, which previously prevented the success animation.
    const button = event.currentTarget;
    await copyText(currentShareUrl);
    animateCopySuccess(button, {
      defaultIcon: '↗',
      defaultLabel: 'Copy post link',
      successLabel: 'Post link copied'
    });
    showToast('Post link copied');
  });

  $('.share-copy-email')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    await copyText('kelvin@gmail.com');
    animateCopySuccess(button, {
      defaultIcon: '@',
      defaultLabel: 'Copy email address',
      successLabel: 'Email copied'
    });
    showToast('Email address copied');
  });

  const openMoreActions = (post, trigger) => {
    const id = post.dataset.postId;
    const title = $('.post-heading span', post)?.textContent.trim() || 'Portfolio post';
    currentMoreUrl = `${location.href.split('#')[0]}#${id}`;
    currentMorePost = post;
    const label = $('.more-post-title');
    if (label) label.textContent = title;
    openModal(moreSheet, trigger);
  };
  $('.more-open-post')?.addEventListener('click', () => {
    const post = currentMorePost;
    closeModal(moreSheet, false);
    if (post) expandPost(post);
  });
  $('.more-copy-link')?.addEventListener('click', async (event) => {
    if (!currentMoreUrl) return;
    const button = event.currentTarget;
    await copyText(currentMoreUrl);
    const original = button.textContent;
    button.classList.remove('copied');
    void button.offsetWidth;
    button.classList.add('copied');
    button.textContent = '✓ Post link copied';
    window.setTimeout(() => { button.classList.remove('copied'); button.textContent = original; }, 1450);
    showToast('Post link copied');
  });

  $$('.social-post').forEach((post) => {
    const id = post.dataset.postId;
    const likeButton = $('.like-button', post);
    const bookmarkButton = $('.bookmark-button', post);
    const commentButton = $('.comment-button', post);
    const shareButton = $('.share-button', post);
    const media = $('.media-shell', post);
    const commentPanel = $('.comment-panel', post);
    const commentForm = $('.comment-form', post);
    const commentList = $('.comment-list', post);

    setLike(post, safeStorage.get(`kelvin-like:${id}`) === '1', false);
    const saved = safeStorage.get(`kelvin-save:${id}`) === '1';
    bookmarkButton?.classList.toggle('saved', saved);

    likeButton?.addEventListener('click', () => setLike(post, !likeButton.classList.contains('liked')));
    media?.addEventListener('dblclick', () => setLike(post, true));

    bookmarkButton?.addEventListener('click', () => {
      const next = !bookmarkButton.classList.contains('saved');
      bookmarkButton.classList.toggle('saved', next);
      safeStorage.set(`kelvin-save:${id}`, next ? '1' : '0');
      showToast(next ? 'Saved' : 'Removed from saved');
    });

    commentButton?.addEventListener('click', () => {
      if (!commentPanel) return;
      const isHidden = commentPanel.hasAttribute('hidden');
      if (isHidden) {
        commentPanel.removeAttribute('hidden');
        $('.comment-form input', commentPanel)?.focus();
      } else {
        commentPanel.setAttribute('hidden', '');
      }
    });

    commentForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = $('input', commentForm);
      const value = input?.value.trim();
      if (!value || !commentList) return;
      const item = document.createElement('p');
      item.className = 'comment-item';
      const name = document.createElement('strong');
      name.textContent = 'You';
      item.append(name, document.createTextNode(value));
      commentList.appendChild(item);
      input.value = '';
      showToast('Comment added');
    });

    shareButton?.addEventListener('click', () => sharePost(post, shareButton));
    $('.more-button', post)?.addEventListener('click', (event) => openMoreActions(post, event.currentTarget));
  });

  // Keyboard shortcuts and orderly dismissal.
  addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (lightbox && !lightbox.hidden) { closeLightbox(); return; }
      if (shareSheet && !shareSheet.hidden) { closeModal(shareSheet); return; }
      if (moreSheet && !moreSheet.hidden) { closeModal(moreSheet); return; }
      if (expandedPost) { restoreExpandedPost(); return; }
      navMenu?.classList.remove('open');
      navToggle?.setAttribute('aria-expanded', 'false');
    }
    if (lightboxState && lightbox && !lightbox.hidden) {
      if (event.key === 'ArrowRight') setLightbox(lightboxState.index + 1);
      if (event.key === 'ArrowLeft') setLightbox(lightboxState.index - 1);
    }
  });
})();
