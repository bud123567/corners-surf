// Keep the homepage address clean, including old bookmarks with queries or anchors.
if (window.location.pathname.endsWith('/index.html')) {
  const cleanPath = window.location.pathname.slice(0, -'index.html'.length);
  window.history.replaceState(window.history.state, '', cleanPath + window.location.search + window.location.hash);
}

// Keep bookmarks from the original single-page site working.
const currentPage = window.location.pathname.split('/').pop();
if (currentPage === '' || currentPage === 'index.html') {
  const oldSections = {
    '#lessons': 'lessons.html',
    '#rentals': 'rentals.html',
    '#shop': 'shop.html',
    '#about': 'about.html',
    '#story': 'about.html#story',
    '#gallery': 'gallery.html#gallery',
    '#contact': 'contact.html'
  };
  const destination = oldSections[window.location.hash];
  if (destination) window.location.replace(new URL(destination, window.location.href).href);
}

const toggle = document.querySelector('.menu-toggle');
const menu = document.querySelector('#mobile-menu');
if (toggle && menu) {
  const closeMenu = () => {
    toggle.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
  };
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    menu.hidden = open;
  });
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) {
      closeMenu();
      toggle.focus();
    }
  });
  matchMedia('(min-width:1001px)').addEventListener('change', event => {
    if (event.matches) closeMenu();
  });
}

const lightbox = document.querySelector('#lightbox');
if (lightbox) {
  const photo = lightbox.querySelector('img');
  const caption = lightbox.querySelector('#photo-caption');
  let opener;
  document.querySelectorAll('[data-photo]').forEach(button => button.addEventListener('click', () => {
    opener = button;
    photo.src = button.dataset.photo;
    photo.alt = button.querySelector('img').alt;
    if (caption) caption.textContent = photo.alt;
    lightbox.showModal();
  }));
  lightbox.querySelector('button').addEventListener('click', () => lightbox.close());
  lightbox.addEventListener('click', event => {
    if (event.target === lightbox) {
      const rect = lightbox.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) lightbox.close();
    }
  });
  lightbox.addEventListener('close', () => opener?.focus());
}

// Defer TikTok's heavy player until its selected card approaches the viewport.
const loadTikTok = frame => {
  if (frame && !frame.hasAttribute('src') && frame.dataset.src) frame.src = frame.dataset.src;
};
const tikTokObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const carousel = entry.target;
    carousel.dataset.playerReady = 'true';
    loadTikTok(carousel.querySelector('.coverflow-card[data-position="center"] iframe, .video-slide:not([hidden]) iframe'));
    tikTokObserver.unobserve(carousel);
  });
}, {rootMargin: '200px'});
document.querySelectorAll('.video-carousel').forEach(carousel => tikTokObserver.observe(carousel));

const videoCarousel = document.querySelector('.video-carousel:not(.coverflow)');
if (videoCarousel) {
  const videoSlides = [...videoCarousel.querySelectorAll('.video-slide')];
  const videoChoices = [...videoCarousel.querySelectorAll('[data-slide]')];
  let currentVideo = 0;
  // Only the current slide keeps a player loaded, so hidden videos stop playing.
  const showVideo = index => {
    if (!videoSlides.length) return;
    const next = (index + videoSlides.length) % videoSlides.length;
    if (next === currentVideo) return;
    const previousFrame = videoSlides[currentVideo].querySelector('iframe');
        previousFrame.removeAttribute('src');
    videoSlides[currentVideo].hidden = true;
    currentVideo = next;
    const slide = videoSlides[currentVideo];
    const frame = slide.querySelector('iframe');
    slide.hidden = false;
    loadTikTok(frame);
    videoChoices.forEach((button, i) => button.setAttribute('aria-pressed', String(i === currentVideo)));
    videoCarousel.querySelector('.video-count').textContent = `Video ${currentVideo + 1} of ${videoSlides.length}`;
  };
  videoCarousel.querySelector('.video-prev')?.addEventListener('click', () => showVideo(currentVideo - 1));
  videoCarousel.querySelector('.video-next')?.addEventListener('click', () => showVideo(currentVideo + 1));
  videoChoices.forEach(button => button.addEventListener('click', () => showVideo(Number(button.dataset.slide))));
  videoCarousel.querySelector('.video-controls')?.addEventListener('keydown', event => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    showVideo(currentVideo + (event.key === 'ArrowRight' ? 1 : -1));
    videoChoices[currentVideo]?.focus();
  });
}

// Keep locally hosted clips from playing over each other.
const localClips = [...document.querySelectorAll('.surf-clip video')];
localClips.forEach(clip => clip.addEventListener('play', () => {
  localClips.forEach(other => { if (other !== clip) other.pause(); });
}));

const coverflow = document.querySelector('.coverflow');
if (coverflow) {
  const cards = [...coverflow.querySelectorAll('.coverflow-card')];
  const choices = [...coverflow.querySelectorAll('[data-slide]')];
  let active = 0;
  const rotate = index => {
    const next = (index + cards.length) % cards.length;
    if (next === active) return;
    // Unload the outgoing player instead of downloading it again in the background.
    const outgoing = cards[active].querySelector('iframe');
    outgoing.removeAttribute('src');
    active = next;
    cards.forEach((card, i) => {
      const selected = i === active;
      card.dataset.position = selected ? 'center' : i === (active + 1) % cards.length ? 'right' : 'left';
      const frame = card.querySelector('iframe');
      if (selected) loadTikTok(frame);
      frame.toggleAttribute('inert', !selected);
      frame.tabIndex = selected ? 0 : -1;
      card.querySelector('.coverflow-pick').hidden = selected;
      choices[i]?.setAttribute('aria-pressed', String(selected));
    });
    coverflow.querySelector('#current-video-title').textContent = cards[active].dataset.title;
    coverflow.querySelector('.current-video-link').href = cards[active].dataset.url;

  };
  cards.forEach((card, i) => card.querySelector('button').addEventListener('click', () => {
    rotate(i);
    cards[i].querySelector('iframe').focus({preventScroll:true});
  }));
  choices.forEach((button, i) => button.addEventListener('click', () => rotate(i)));
  coverflow.querySelector('.video-prev')?.addEventListener('click', () => rotate(active - 1));
  coverflow.querySelector('.video-next')?.addEventListener('click', () => rotate(active + 1));
  coverflow.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    rotate(active + (event.key === 'ArrowRight' ? 1 : -1));
    cards[active].querySelector('iframe').focus({preventScroll:true});
  });
}

// Desktop keeps the drifting strip; mobile uses a native swipe carousel.
const brandStrip = document.querySelector('.brand-strip');
if (brandStrip) {
  const track = brandStrip.querySelector('.brand-track');
  const group = brandStrip.querySelector('.brand-group');
  const mobileBrands = matchMedia('(max-width:700px)');
  const updateBrands = () => {
    track.querySelector('[aria-hidden="true"]')?.remove();
    if (!mobileBrands.matches) {
      const duplicate = group.cloneNode(true);
      duplicate.setAttribute('aria-hidden', 'true');
      duplicate.inert = true;
      track.append(duplicate);
    }
    brandStrip.classList.add('is-ready');
  };
  updateBrands();
  mobileBrands.addEventListener('change', updateBrands);
}
