'use strict';

const form = document.getElementById('search-form');
const input = document.getElementById('search-input');
const results = document.getElementById('results');
const resultCount = document.getElementById('result-count');
const emptyState = document.getElementById('empty-state');
const emptyTitle = document.getElementById('empty-title');
const emptyCopy = document.getElementById('empty-copy');

let latestSearch = 0;

function buildSearchUrl(query) {
  return 'https://commons.wikimedia.org/w/api.php?action=query&generator=search' +
    '&gsrsearch=' + encodeURIComponent(query) +
    '&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url&iiurlwidth=500&format=json&origin=*';
}

function setEmptyState(title, message) {
  emptyTitle.textContent = title;
  emptyCopy.textContent = message;
  emptyState.hidden = false;
}

function clearResults() {
  results.innerHTML = '';
}

function imageData(item) {
  const image = item.imageinfo && item.imageinfo[0];
  if (!image || !image.thumburl) return null;

  return {
    src: image.thumburl,
    fullSizeUrl: image.descriptionurl || image.url || image.thumburl,
    title: item.title.replace(/^File:/, '').replace(/_/g, ' ')
  };
}

function renderResults(items, query) {
  clearResults();
  emptyState.hidden = true;

  const usableItems = items.map(imageData).filter(Boolean);

  usableItems.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'image-card';

    const link = document.createElement('a');
    link.className = 'image-card-link';
    link.href = item.fullSizeUrl;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.setAttribute('aria-label', `Open ${item.title} on Wikimedia Commons`);

    const image = document.createElement('img');
    image.src = item.src;
    image.alt = item.title;
    image.loading = 'lazy';

    const caption = document.createElement('p');
    caption.className = 'image-caption';
    caption.textContent = item.title;

    link.appendChild(image);
    card.appendChild(link);
    card.appendChild(caption);
    results.appendChild(card);
  });

  if (usableItems.length === 0) {
    setEmptyState('Nothing turned up this time.', `Try another path from “${query}”.`);
    resultCount.textContent = `No images found for “${query}”`;
    return;
  }

  resultCount.textContent = `${usableItems.length} ${usableItems.length === 1 ? 'image' : 'images'} for “${query}”`;
}

async function searchImages(query) {
  const searchId = ++latestSearch;
  clearResults();
  emptyState.hidden = true;
  results.setAttribute('aria-busy', 'true');
  resultCount.textContent = `Searching for “${query}”…`;

  try {
    const response = await fetch(buildSearchUrl(query));
    if (!response.ok) throw new Error(`Wikimedia Commons returned ${response.status}`);

    const data = await response.json();
    if (searchId !== latestSearch) return;

    const items = data.query && data.query.pages ? Object.values(data.query.pages) : [];
    renderResults(items, query);
  } catch (error) {
    if (searchId !== latestSearch) return;

    clearResults();
    setEmptyState('The trail went quiet.', 'Please check your connection and try that search again.');
    resultCount.textContent = `Unable to find images for “${query}”`;
    console.error('Image search failed:', error);
  } finally {
    if (searchId === latestSearch) results.removeAttribute('aria-busy');
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const query = input.value.trim();
  if (!query) return;

  searchImages(query);
});

document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    input.value = chip.textContent.trim();
    form.requestSubmit();
  });
});
