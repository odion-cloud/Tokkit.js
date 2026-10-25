/**
 * TokKit.js Documentation Application Logic
 * Clean, lightweight, VitePress-inspired SPA router.
 */

// Search Database - All 21 Section IDs Matching Documentation Sections
const SEARCH_INDEX = [
  { id: 'intro', title: 'Introduction', category: 'Guide', snippet: 'TypeScript client for TikTok internal Web & Short Drama APIs.' },
  { id: 'quick-start', title: 'Getting Started', category: 'Guide', snippet: 'Install @odion-cloud/tokkit.js and initialize your first session in seconds.' },
  { id: 'architecture', title: 'Architecture', category: 'Guide', snippet: 'Multi-runtime engine supporting Node.js, Web, Bun, and Deno.' },
  { id: 'drama-overview', title: 'Short Drama Overview', category: 'Short Drama', snippet: 'Official TikTok /shortdrama portal with ranking, trending, and latest releases.' },
  { id: 'drama-trending', title: 'Trending & Ranking', category: 'Short Drama', snippet: 'Fetch top trending and top ranked short drama miniseries.' },
  { id: 'drama-latest', title: 'Latest Releases', category: 'Short Drama', snippet: 'Discover newly released short dramas with cursor pagination.' },
  { id: 'drama-filters', title: 'Genres & Themes', category: 'Short Drama', snippet: 'Filter dramas across 18 genres and 28 themes using tagIDList.' },
  { id: 'drama-episodes', title: 'Episode Playlists', category: 'Short Drama', snippet: 'Full episode playlists 1..N with direct playback URLs and cover art.' },
  { id: 'drama-playback', title: 'Direct Playback', category: 'Short Drama', snippet: 'Direct HTML5 streaming video URLs without authentication or cookies.' },
  { id: 'fyp', title: 'For You Page', category: 'Feeds', snippet: 'Stream algorithmic recommendation For You Page (FYP) video posts.' },
  { id: 'explore', title: 'Explore Feed', category: 'Feeds', snippet: 'Browse 21 categories including Comedy, Gaming, Food, and Sports.' },
  { id: 'live', title: 'Live Streams', category: 'Feeds', snippet: 'Discover active live broadcasts with RTMP and FLV pull stream URLs.' },
  { id: 'music', title: 'Music & Sounds', category: 'Feeds', snippet: 'Search soundtrack clips and audio files with direct MP4/MP3 streams.' },
  { id: 'video-resolver', title: 'Stream Resolver', category: 'Endpoints', snippet: 'Resolve direct MP4 CDN links and watermark-free video downloads.' },
  { id: 'users', title: 'User Profiles', category: 'Endpoints', snippet: 'Fetch user statistics, follower counts, bio, avatar, and badges.' },
  { id: 'comments', title: 'Comments', category: 'Endpoints', snippet: 'Fetch top-level comments and nested reply threads with pagination.' },
  { id: 'hashtags', title: 'Hashtags', category: 'Endpoints', snippet: 'Retrieve challenge metadata, view counts, and video lists by hashtag.' },
  { id: 'oembed', title: 'oEmbed', category: 'Endpoints', snippet: 'Standard oEmbed JSON endpoint for responsive TikTok video embeds.' },
  { id: 'api-reference', title: 'API Reference', category: 'Reference', snippet: 'Complete table of client methods, signatures, parameters, and types.' },
  { id: 'errors', title: 'Error Handling', category: 'Reference', snippet: 'Handle TikTok WAF bot blocks, rate limits, and custom error classes.' },
  { id: 'signing', title: 'Request Signing', category: 'Reference', snippet: 'Built-in pure JavaScript signing and custom x-bogus / msToken signers.' }
];

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSidebar();
  initCopyButtons();
  initSearch();
  initRouter();
});

// ==========================================================================
// Theme Management
// ==========================================================================
function initTheme() {
  const themeToggle = document.getElementById('theme-toggle');
  const savedTheme = localStorage.getItem('tokkit-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('tokkit-theme', next);
    });
  }
}

// ==========================================================================
// Sidebar & Mobile Drawer
// ==========================================================================
function initSidebar() {
  const toggleBtn = document.getElementById('menu-toggle');
  const sidebar = document.querySelector('.docs-sidebar');

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });

    // Close on click outside on mobile
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 860 && sidebar.classList.contains('open')) {
        if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
          sidebar.classList.remove('open');
        }
      }
    });
  }
}

// ==========================================================================
// Copy to Clipboard
// ==========================================================================
function initCopyButtons() {
  document.querySelectorAll('.code-copy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const box = btn.closest('.code-block-box');
      const code = box?.querySelector('pre code')?.innerText || '';
      if (!code) return;

      try {
        await navigator.clipboard.writeText(code);
        const originalText = btn.innerHTML;
        btn.innerHTML = '✓';
        btn.classList.add('copied');

        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.classList.remove('copied');
        }, 1800);
      } catch (err) {
        console.error('Copy failed:', err);
      }
    });
  });
}

// ==========================================================================
// Search Modal & Autocomplete
// ==========================================================================
function initSearch() {
  const modalBackdrop = document.getElementById('search-modal-backdrop');
  const searchInput = document.getElementById('search-modal-input');
  const resultsList = document.getElementById('search-results-list');
  const triggerInputs = [
    document.getElementById('header-search-input')
  ].filter(Boolean);

  function openSearch() {
    if (modalBackdrop && searchInput) {
      modalBackdrop.classList.add('open');
      searchInput.value = '';
      renderSearchResults('');
      setTimeout(() => searchInput.focus(), 50);
    }
  }

  function closeSearch() {
    if (modalBackdrop) {
      modalBackdrop.classList.remove('open');
    }
  }

  triggerInputs.forEach(input => {
    input.addEventListener('click', (e) => {
      e.preventDefault();
      openSearch();
    });
  });

  // Hotkey listener: Ctrl+K or /
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openSearch();
    } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
      e.preventDefault();
      openSearch();
    } else if (e.key === 'Escape' && modalBackdrop?.classList.contains('open')) {
      closeSearch();
    }
  });

  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeSearch();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderSearchResults(e.target.value);
    });
  }

  function renderSearchResults(query) {
    if (!resultsList) return;
    const q = query.trim().toLowerCase();
    const filtered = !q
      ? SEARCH_INDEX.slice(0, 7)
      : SEARCH_INDEX.filter(item =>
          item.title.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.snippet.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q)
        );

    if (filtered.length === 0) {
      resultsList.innerHTML = `<li style="padding: 1.5rem; text-align: center; color: var(--text-3)">No matching guides found for "${query}"</li>`;
      return;
    }

    resultsList.innerHTML = filtered.map(item => `
      <li class="search-result-item" data-id="${item.id}">
        <span style="font-size: 0.72rem; font-family: var(--font-mono); color: var(--brand-light); text-transform: uppercase">${item.category}</span>
        <span class="search-result-title">${item.title}</span>
        <span class="search-result-snippet">${item.snippet}</span>
      </li>
    `).join('');

    resultsList.querySelectorAll('.search-result-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-id');
        closeSearch();
        navigateTo(id);
      });
    });
  }
}

// ==========================================================================
// SPA Navigation Router & Link Interception
// ==========================================================================
function initRouter() {
  window.addEventListener('hashchange', handleRoute);

  // Global link interception for all internal hash links
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;

    const hash = link.getAttribute('href').replace('#', '');
    if (!hash) return;

    const targetEl = document.getElementById(hash);
    if (targetEl) {
      e.preventDefault();
      navigateTo(hash);
      if (window.innerWidth <= 860) {
        document.querySelector('.docs-sidebar')?.classList.remove('open');
      }
    }
  });

  // Initial route
  handleRoute();
}

function handleRoute() {
  const hash = window.location.hash.replace('#', '') || 'intro';
  navigateTo(hash, false);
}

function navigateTo(routeId, updateHash = true) {
  const sections = document.querySelectorAll('.doc-section');
  let targetEl = document.getElementById(routeId);
  let targetSection = null;

  if (targetEl) {
    if (targetEl.classList.contains('doc-section')) {
      targetSection = targetEl;
    } else {
      targetSection = targetEl.closest('.doc-section');
    }
  }

  if (!targetSection) {
    targetSection = document.getElementById('intro');
    targetEl = targetSection;
  }

  // Switch visible section
  sections.forEach(sec => sec.style.display = 'none');
  if (targetSection) {
    targetSection.style.display = 'block';
    updateActiveSidebar(targetSection.id);
    updateActiveTopNav(targetSection.id);

    // Scroll to heading or top of section
    if (targetEl && targetEl !== targetSection) {
      setTimeout(() => targetEl.scrollIntoView({ behavior: 'smooth' }), 20);
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  if (updateHash) {
    if (window.location.hash !== `#${routeId}`) {
      history.pushState(null, '', `#${routeId}`);
    }
  }
}

function updateActiveSidebar(sectionId) {
  // Remove existing nested sublinks
  document.querySelectorAll('.sidebar-sublinks').forEach(el => el.remove());

  document.querySelectorAll('.sidebar-link:not(.nested)').forEach(link => {
    const href = link.getAttribute('href');
    if (href === `#${sectionId}`) {
      link.classList.add('active');
      link.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

      // Generate indented sublinks under the active link from the section's h2 headings!
      const targetSection = document.getElementById(sectionId);
      if (targetSection) {
        const headings = targetSection.querySelectorAll('h2');
        if (headings.length > 0) {
          const subUl = document.createElement('ul');
          subUl.className = 'sidebar-sublinks';
          subUl.style.listStyle = 'none';
          subUl.style.display = 'flex';
          subUl.style.flexDirection = 'column';

          headings.forEach(h => {
            const id = h.id || h.innerText.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            h.id = id;
            const li = document.createElement('li');
            li.innerHTML = `<a href="#${id}" class="sidebar-link nested">${h.innerText}</a>`;
            subUl.appendChild(li);
          });

          link.parentElement.appendChild(subUl);
        }
      }
    } else {
      link.classList.remove('active');
    }
  });
}

function updateActiveTopNav(sectionId) {
  document.querySelectorAll('.site-header .nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (sectionId === 'api-reference') {
      if (href === '#api-reference') link.classList.add('active');
      else link.classList.remove('active');
    } else {
      if (href === '#intro') link.classList.add('active');
      else link.classList.remove('active');
    }
  });
}
