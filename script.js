/* ═══════════════════════════════════════════════════════════════
   SoundWave Music Player — script.js
   Created by Harish Kumar
   ═══════════════════════════════════════════════════════════════ */

/* ────────────────────────────────────────────────────────────────
   MEDIA LIBRARY
   To add your own songs/movies:
     1. Copy your .mp3 file into the songs/ folder
     2. Duplicate one of the objects below
     3. Set  src: "songs/your-filename.mp3"
     4. Update title, artist, album, duration, emoji, color, tags
   ──────────────────────────────────────────────────────────────── */
const media = [];

/* ────────────────────────────────────────────────────────────────
   STATE
   ──────────────────────────────────────────────────────────────── */
let currentIndex = 0;
let isPlaying = false;
let isShuffle = false;
let repeatMode = 0;        // 0 = off, 1 = repeat all, 2 = repeat one
// Load liked songs from localStorage on startup (store by file src path)
const savedLikes = localStorage.getItem('soundwave_liked_songs');
let likedSongs = new Set(savedLikes ? JSON.parse(savedLikes) : []);
const savedPlaylists = localStorage.getItem('soundwave_playlists');
let playlists = savedPlaylists ? JSON.parse(savedPlaylists) : [];
let selectedPlaylist = null;
let currentSongIdForModal = null;
let activeFilter = 'all';    // all | songs | movies | playlists | liked
let dropdownTab = 'all';
let selectedMovie = null;

let audioCtx, analyser, source, dataArray;
let isDragging = false;
let simTimer = null, simCurrent = 0, simDuration = 0;

/* ────────────────────────────────────────────────────────────────
   DOM REFERENCES
   ──────────────────────────────────────────────────────────────── */
const audio = document.getElementById('audioPlayer');
const playBtn = document.getElementById('playBtn');
const playIcon = document.getElementById('playIcon');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const repeatBtn = document.getElementById('repeatBtn');
const heartBtn = document.getElementById('heartBtn');
const progressFill = document.getElementById('progressFill');
const progressTrack = document.getElementById('progressTrack');
const currentTimeEl = document.getElementById('currentTime');
const totalTimeEl = document.getElementById('totalTime');
const volumeSlider = document.getElementById('volumeSlider');
const canvas = document.getElementById('visualizer');
const ctx2d = canvas.getContext('2d');
const mainSearch = document.getElementById('mainSearch');
const searchClear = document.getElementById('searchClear');
const searchDropdown = document.getElementById('searchDropdown');
const dropdownResults = document.getElementById('dropdownResults');
const sidebarSearch = document.getElementById('sidebarSearch');

/* ────────────────────────────────────────────────────────────────
   INIT COUNTS
   ──────────────────────────────────────────────────────────────── */
const songCountEl = document.getElementById('songCount');
const movieCountEl = document.getElementById('movieCount');
if (songCountEl) songCountEl.textContent = '0';
if (movieCountEl) movieCountEl.textContent = '0';

/* ────────────────────────────────────────────────────────────────
   UTILITY HELPERS
   ──────────────────────────────────────────────────────────────── */
function formatTime(s) {
  if (isNaN(s)) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function parseDuration(str) {
  const [m, s] = str.split(':');
  return parseInt(m) * 60 + parseInt(s);
}

function highlight(text, query) {
  if (!query) return text;
  const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(re, '<mark>$1</mark>');
}

/* ────────────────────────────────────────────────────────────────
   SIDEBAR PLAYLIST
   ──────────────────────────────────────────────────────────────── */
function getFilteredMedia() {
  let list = [...media];
  // 'songs' and 'all' both show every track as a flat list
  // 'movies' is handled separately in buildPlaylist (grouped view)
  if (activeFilter === 'liked') list = list.filter(m => likedSongs.has(m.src));

  const q = mainSearch.value.trim().toLowerCase();
  if (q) {
    list = list.filter(m =>
      m.title.toLowerCase().includes(q) ||
      m.artist.toLowerCase().includes(q) ||
      m.tags.some(t => t.toLowerCase().includes(q))
    );
  }
  return list;
}

function buildSongItem(s, q) {
  const realIdx = media.indexOf(s);
  const isActive = realIdx === currentIndex;
  const isLiked = likedSongs.has(s.src);
  const titleHl = highlight(s.title, q);
  const artistHl = highlight(s.artist, q);

  const isPlaylistView = activeFilter === 'playlists' && selectedPlaylist;
  const actionBtn = isPlaylistView
    ? `<button class="song-playlist-remove" onclick="event.stopPropagation(); removeSongFromPlaylist('${s.src.replace(/'/g, "\\'")}')" aria-label="Remove from Playlist">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
       </button>`
    : `<button class="song-playlist-btn" onclick="event.stopPropagation(); openPlaylistModal(${s.id})" aria-label="Add to Playlist">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2"></line>
          <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2"></line>
        </svg>
       </button>`;

  return `
    <div class="song-item ${isActive ? 'active' : ''}" onclick="loadSong(${realIdx})">
      <div class="song-thumb ${s.color}">
        <span style="z-index:1; position:relative">${s.emoji}</span>
        <div class="song-thumb-overlay">
          ${isActive && isPlaying
      ? `<div class="bars"><span></span><span></span><span></span></div>`
      : `<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>`}
        </div>
      </div>
      <div class="song-info">
        <div class="song-title">${titleHl}</div>
        <div class="song-artist">${artistHl}</div>
      </div>
      <button class="song-like-btn ${isLiked ? 'liked' : ''}" onclick="event.stopPropagation(); toggleLike(${s.id})" aria-label="Like">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path class="heart-outline" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
          <path class="heart-fill" fill="currentColor" stroke="none" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
        </svg>
      </button>
      ${actionBtn}
    </div>`;
}

function buildPlaylist() {
  const container = document.getElementById('playlistContainer');
  const q = mainSearch.value.trim();
  const qLower = q.toLowerCase();

  document.getElementById('sidebarLabel').textContent =
    activeFilter === 'all' ? 'All Media' :
      activeFilter === 'songs' ? 'All Songs' :
        activeFilter === 'movies' ? 'Movies' :
          activeFilter === 'playlists' ? 'Playlists' : 'Liked';

  // ── PLAYLISTS view: list of playlists or drill down ─────────────
  if (activeFilter === 'playlists') {
    if (!selectedPlaylist) {
      // Show list of all custom playlists
      let filteredPlaylists = qLower
        ? playlists.filter(p => p.name.toLowerCase().includes(qLower))
        : playlists;

      let html = `
        <div class="playlist-header-action">
          <div class="movie-current-header" style="margin: 0; padding: 0; border: none; font-size: 13px; font-weight: 700; color: var(--text-primary)">Custom Playlists</div>
          <button class="playlist-create-btn" onclick="promptCreatePlaylist()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px;">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create
          </button>
        </div>
      `;

      if (filteredPlaylists.length === 0) {
        container.innerHTML = html + `
          <div class="liked-empty" style="padding: 24px 16px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M19 11H5m14 0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2m14 0V9a2 2 0 0 0-2-2M5 11V9a2 2 0 0 1 2-2m0 0V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7 7h10"/>
            </svg>
            <div class="liked-empty-title">No playlists yet</div>
            <div class="liked-empty-sub">Create your first playlist<br>to group your favorite tracks</div>
          </div>`;
        return;
      }

      container.innerHTML = html + filteredPlaylists.map((pl, idx) => {
        const count = pl.songs.length;
        const escapedName = pl.name.replace(/'/g, "\\'");
        return `
          <div class="playlist-item-card" onclick="selectPlaylist('${escapedName}')">
            <div class="playlist-card-icon">📂</div>
            <div class="playlist-card-info">
              <div class="playlist-card-name">${highlight(pl.name, q)}</div>
              <div class="playlist-card-count">${count} song${count !== 1 ? 's' : ''}</div>
            </div>
            <button class="playlist-card-delete" onclick="event.stopPropagation(); deletePlaylist(${idx})" aria-label="Delete Playlist">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>`;
      }).join('');
      return;
    } else {
      // Drill down into selected custom playlist
      const pl = playlists.find(p => p.name === selectedPlaylist);
      if (!pl) {
        selectedPlaylist = null;
        buildPlaylist();
        return;
      }

      const songs = media.filter(s => pl.songs.includes(s.src));
      const filteredSongs = qLower
        ? songs.filter(s => s.title.toLowerCase().includes(qLower))
        : songs;

      let html = `
        <div class="movie-back-btn" onclick="selectPlaylist(null)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to Playlists
        </div>
        <div class="movie-current-header">📂 ${selectedPlaylist}</div>
      `;

      if (filteredSongs.length === 0) {
        html += `
          <div class="liked-empty" style="padding: 24px 16px;">
            <div class="liked-empty-title">Playlist is empty</div>
            <div class="liked-empty-sub">Tap the + plus icon on any song<br>to add it here</div>
          </div>`;
      } else {
        html += filteredSongs.map(s => buildSongItem(s, q)).join('');
      }

      container.innerHTML = html;
      return;
    }
  }

  // ── MOVIES view: grouped by movie name ──────────────────────────
  if (activeFilter === 'movies') {
    if (!selectedMovie) {
      // Collect unique movie names and their song counts
      const movieMap = new Map();
      for (const s of media) {
        if (s.type !== 'movie') continue;
        const movie = s.artist || 'Unknown';
        if (!movieMap.has(movie)) movieMap.set(movie, 0);
        movieMap.set(movie, movieMap.get(movie) + 1);
      }

      // Filter by query if searching
      let entries = Array.from(movieMap.entries());
      if (qLower) {
        entries = entries.filter(([name]) => name.toLowerCase().includes(qLower));
      }

      if (entries.length === 0) {
        container.innerHTML = `
          <div class="no-results">
            <svg viewBox="0 0 24 24" stroke-width="1.5">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            No movies found
          </div>`;
        return;
      }

      // Render movie items
      container.innerHTML = entries.map(([name, count]) => `
        <div class="movie-folder-item" onclick="selectMovie('${name.replace(/'/g, "\\'")}')">
          <div class="movie-folder-icon">🎬</div>
          <div class="movie-folder-info">
            <div class="movie-folder-name">${highlight(name, q)}</div>
            <div class="movie-folder-count">${count} song${count !== 1 ? 's' : ''}</div>
          </div>
          <div class="movie-folder-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>
      `).join('');
      return;
    } else {
      // A movie is selected. Show its songs and a back button.
      const songs = media.filter(s => s.type === 'movie' && s.artist === selectedMovie);
      const filteredSongs = qLower
        ? songs.filter(s => s.title.toLowerCase().includes(qLower))
        : songs;

      let html = `
        <div class="movie-back-btn" onclick="selectMovie(null)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Movies
        </div>
        <div class="movie-current-header">🎬 ${selectedMovie}</div>
      `;

      if (filteredSongs.length === 0) {
        html += `
          <div class="no-results">
            No songs found in this movie
          </div>`;
      } else {
        html += filteredSongs.map(s => buildSongItem(s, q)).join('');
      }

      container.innerHTML = html;
      return;
    }
  }

  // ── SONGS / ALL / LIKED view: flat list ─────────────────────────
  const list = getFilteredMedia();

  if (list.length === 0) {
    if (activeFilter === 'liked') {
      container.innerHTML = `
        <div class="liked-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
          </svg>
          <div class="liked-empty-title">No liked songs yet</div>
          <div class="liked-empty-sub">Tap the ♥ heart on any song<br>to add it to your Liked list</div>
        </div>`;
    } else {
      container.innerHTML = `
        <div class="no-results">
          <svg viewBox="0 0 24 24" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          No results found
        </div>`;
    }
    return;
  }

  container.innerHTML = list.map(s => buildSongItem(s, q)).join('');
}

window.selectMovie = function (movieName) {
  selectedMovie = movieName;
  buildPlaylist();
};

window.toggleLike = function (songId) {
  const song = media.find(s => s.id === songId);
  if (!song) return;

  if (likedSongs.has(song.src)) {
    likedSongs.delete(song.src);
  } else {
    likedSongs.add(song.src);
  }

  // Persist to localStorage
  localStorage.setItem('soundwave_liked_songs', JSON.stringify(Array.from(likedSongs)));

  // Update player bar heart if this is the current song
  if (media[currentIndex] && media[currentIndex].id === songId) {
    heartBtn.className = likedSongs.has(song.src) ? 'heart-btn liked' : 'heart-btn';
  }

  buildPlaylist();
};

/* ────────────────────────────────────────────────────────────────
   HERO / NOW PLAYING PANEL
   ──────────────────────────────────────────────────────────────── */
function updateHero(song) {
  document.getElementById('heroTitle').textContent = song.title;
  document.getElementById('heroArtist').textContent = song.artist;
  document.getElementById('heroAlbum').textContent = song.album + (song.type === 'movie' ? ' (Movie)' : '');
  document.getElementById('heroEmoji').textContent = song.emoji;
  document.getElementById('heroArt').className = `album-art ${song.color}`;
  document.getElementById('nowLabel').textContent = song.type === 'movie' ? '🎬 Now Playing' : '▶ Now Playing';

  const typeTag = `<span class="tag ${song.type === 'movie' ? 'movie-tag' : ''}">${song.type === 'movie' ? 'Movie' : 'Song'}</span>`;
  document.getElementById('heroTags').innerHTML =
    song.tags.map(t => `<span class="tag ${song.type === 'movie' ? 'movie-tag' : ''}">${t}</span>`).join('') + typeTag;

  document.getElementById('playerTitle').textContent = song.title;
  document.getElementById('playerArtist').textContent = song.artist;
  document.getElementById('miniThumb').className = `mini-thumb ${song.color}`;
  document.getElementById('miniEmoji').textContent = song.emoji;

  heartBtn.className = likedSongs.has(song.src) ? 'heart-btn liked' : 'heart-btn';
}

/* ────────────────────────────────────────────────────────────────
   LOAD & PLAY A TRACK
   ──────────────────────────────────────────────────────────────── */
function loadSong(index) {
  currentIndex = index;
  const song = media[index];
  audio.src = song.src || '';

  updateHero(song);
  buildPlaylist();

  if (isPlaying) startPlayback(song);

  const el = document.querySelector('.song-item.active');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function startPlayback(song) {
  clearInterval(simTimer);

  if (song.src) {
    audio.volume = 1.0;
    audio.play().catch((err) => { console.warn('Play error:', err); });
  } else {
    /* No src — simulated progress bar */
    simCurrent = 0;
    simDuration = parseDuration(song.duration);
    totalTimeEl.textContent = song.duration;
    progressFill.style.width = '0%';
    currentTimeEl.textContent = '0:00';

    simTimer = setInterval(() => {
      if (!isPlaying) return;
      simCurrent++;
      if (simCurrent >= simDuration) {
        clearInterval(simTimer);
        nextBtn.click();
        return;
      }
      progressFill.style.width = (simCurrent / simDuration * 100) + '%';
      currentTimeEl.textContent = formatTime(simCurrent);
    }, 1000);
  }
}

/* ────────────────────────────────────────────────────────────────
   PLAYBACK CONTROLS
   ──────────────────────────────────────────────────────────────── */
playBtn.addEventListener('click', async () => {
  if (media.length === 0) return;
  const song = media[currentIndex];
  isPlaying = !isPlaying;

  if (isPlaying) {
    await startPlayback(song);
  } else {
    if (song.src) audio.pause();
    clearInterval(simTimer);
  }

  updatePlayIcon();
  updateHeroSpin();
  buildPlaylist();
});

prevBtn.addEventListener('click', () => {
  if (media.length === 0) return;
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
  currentIndex = (currentIndex - 1 + media.length) % media.length;
  loadSong(currentIndex);
});

nextBtn.addEventListener('click', () => {
  if (media.length === 0) return;
  if (isShuffle) {
    let n;
    do { n = Math.floor(Math.random() * media.length); } while (n === currentIndex && media.length > 1);
    currentIndex = n;
  } else {
    currentIndex = (currentIndex + 1) % media.length;
  }
  loadSong(currentIndex);
});

shuffleBtn.addEventListener('click', () => {
  isShuffle = !isShuffle;
  shuffleBtn.classList.toggle('active', isShuffle);
});

repeatBtn.addEventListener('click', () => {
  repeatMode = (repeatMode + 1) % 3;
  repeatBtn.classList.toggle('active', repeatMode > 0);
  repeatBtn.title = ['No Repeat', 'Repeat All', 'Repeat One'][repeatMode];
});

heartBtn.addEventListener('click', () => {
  if (media.length === 0) return;
  const song = media[currentIndex];
  window.toggleLike(song.id);
});

/* ────────────────────────────────────────────────────────────────
   AUDIO EVENTS
   ──────────────────────────────────────────────────────────────── */
audio.addEventListener('timeupdate', () => {
  if (isDragging || !audio.src) return;
  const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
  progressFill.style.width = pct + '%';
  currentTimeEl.textContent = formatTime(audio.currentTime);
  totalTimeEl.textContent = formatTime(audio.duration);
});

audio.addEventListener('ended', () => {
  if (repeatMode === 2) { audio.currentTime = 0; audio.play(); return; }
  nextBtn.click();
});

audio.addEventListener('play', () => {
  try {
    setupAudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) { }
});

audio.addEventListener('loadedmetadata', () => {
  if (media[currentIndex]) {
    const durationStr = formatTime(audio.duration);
    media[currentIndex].duration = durationStr;
    totalTimeEl.textContent = durationStr;
    buildPlaylist();
  }
});

/* ────────────────────────────────────────────────────────────────
   PROGRESS BAR — click & drag
   ──────────────────────────────────────────────────────────────── */
progressTrack.addEventListener('click', (e) => {
  const rect = progressTrack.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  if (audio.duration) audio.currentTime = pct * audio.duration;
  progressFill.style.width = (pct * 100) + '%';
});

progressTrack.addEventListener('mousedown', () => { isDragging = true; });
document.addEventListener('mouseup', () => { isDragging = false; });

document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const rect = progressTrack.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  progressFill.style.width = (pct * 100) + '%';
  if (audio.duration) audio.currentTime = pct * audio.duration;
});

/* ────────────────────────────────────────────────────────────────
   VOLUME
   ──────────────────────────────────────────────────────────────── */
if (volumeSlider) {
  volumeSlider.addEventListener('input', () => {
    audio.volume = volumeSlider.value / 100;
  });
}

audio.volume = 1.0;

function toggleMute() {
  audio.muted = !audio.muted;
}

/* ────────────────────────────────────────────────────────────────
   UI HELPERS
   ──────────────────────────────────────────────────────────────── */
function updatePlayIcon() {
  playIcon.innerHTML = isPlaying
    ? '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>'
    : '<polygon points="5 3 19 12 5 21 5 3"/>';
}

function updateHeroSpin() {
  const art = document.getElementById('heroArt');
  isPlaying ? art.classList.add('spinning') : art.classList.remove('spinning');
}

/* ────────────────────────────────────────────────────────────────
   SEARCH — main search bar & dropdown
   ──────────────────────────────────────────────────────────────── */
mainSearch.addEventListener('input', () => {
  searchClear.style.display = mainSearch.value ? 'block' : 'none';
  renderDropdown();
  buildPlaylist(); // filter the list below in real time
});

mainSearch.addEventListener('focus', () => {
  if (mainSearch.value) renderDropdown();
});

document.addEventListener('click', (e) => {
  if (!document.getElementById('searchBarWrap').contains(e.target)) {
    searchDropdown.classList.remove('visible');
  }
});

searchClear.addEventListener('click', () => {
  mainSearch.value = '';
  searchClear.style.display = 'none';
  searchDropdown.classList.remove('visible');
});

document.querySelectorAll('.dropdown-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    dropdownTab = tab.dataset.tab;
    renderDropdown();
  });
});

function getDropdownResults(q) {
  if (!q) return [];
  const lower = q.toLowerCase();
  return media.filter(m =>
    m.title.toLowerCase().includes(lower) ||
    m.artist.toLowerCase().includes(lower) ||
    m.album.toLowerCase().includes(lower) ||
    m.tags.some(t => t.toLowerCase().includes(lower))
  );
}

function renderDropdown() {
  const q = mainSearch.value.trim();
  if (!q) { searchDropdown.classList.remove('visible'); return; }

  let results = getDropdownResults(q);
  if (dropdownTab === 'songs') results = results.filter(r => r.type === 'song');
  if (dropdownTab === 'movies') results = results.filter(r => r.type === 'movie');

  searchDropdown.classList.add('visible');

  if (results.length === 0) {
    dropdownResults.innerHTML = `
      <div class="dropdown-empty">
        <svg viewBox="0 0 24 24" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        No results for "<strong>${q}</strong>"
      </div>`;
    return;
  }

  dropdownResults.innerHTML = results.map(r => {
    const idx = media.indexOf(r);
    const titleHl = highlight(r.title, q);
    const badge = r.type === 'song'
      ? `<span class="result-badge badge-song">SONG</span>`
      : `<span class="result-badge badge-movie">MOVIE</span>`;

    return `
      <div class="result-item" onclick="pickResult(${idx})">
        <div class="result-thumb ${r.color}">${r.emoji}</div>
        <div class="result-info">
          <div class="result-title">${titleHl}</div>
          <div class="result-sub">${r.artist} · ${r.album}</div>
        </div>
        ${badge}
      </div>`;
  }).join('');
}

function pickResult(idx) {
  loadSong(idx);
  isPlaying = true;
  startPlayback(media[idx]);
  updatePlayIcon();
  updateHeroSpin();
  buildPlaylist();
  mainSearch.value = '';
  searchClear.style.display = 'none';
  searchDropdown.classList.remove('visible');
}

/* ────────────────────────────────────────────────────────────────
   SIDEBAR SEARCH & FILTER TABS
   ──────────────────────────────────────────────────────────────── */
sidebarSearch.addEventListener('input', buildPlaylist);

document.querySelectorAll('.filter-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeFilter = tab.dataset.filter;
    selectedMovie = null; // Reset movie selection when changing filters
    selectedPlaylist = null; // Reset playlist selection when changing filters
    buildPlaylist();
  });
});

/* ────────────────────────────────────────────────────────────────
   WEB AUDIO API — NOTE: We do NOT use createMediaElementSource
   because it hijacks the audio element and can cause silent playback.
   The visualizer uses animated simulation bars instead.
   ──────────────────────────────────────────────────────────────── */
function setupAudioContext() {
  // No-op: audio plays natively through the <audio> element.
  // Visualizer animation is handled independently.
}

/* ────────────────────────────────────────────────────────────────
   VISUALIZER — canvas bar animation
   ──────────────────────────────────────────────────────────────── */
function drawVisualizer() {
  requestAnimationFrame(drawVisualizer);

  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  ctx2d.clearRect(0, 0, canvas.width, canvas.height);

  if (analyser) analyser.getByteFrequencyData(dataArray);

  const barCount = 48;
  const barW = (canvas.width / barCount) - 2;
  const colors = ['#7c5cbf', '#9370db', '#a07fe8', '#b08ff8'];

  for (let i = 0; i < barCount; i++) {
    let val;
    if (analyser) {
      val = dataArray[Math.floor(i * dataArray.length / barCount)] / 255;
    } else if (isPlaying) {
      val = 0.1 + Math.sin(Date.now() * 0.002 + i * 0.4) * 0.15 + Math.random() * 0.2;
    } else {
      val = 0.04 + Math.sin(i * 0.3) * 0.03;
    }

    const h = Math.max(4, val * canvas.height * 0.88);
    const x = i * (barW + 2);
    const y = canvas.height - h;
    const r = Math.min(barW / 2, 3);

    ctx2d.fillStyle = colors[Math.min(Math.floor(val * 3), 3)];
    ctx2d.globalAlpha = 0.85;
    ctx2d.beginPath();
    ctx2d.moveTo(x + r, y);
    ctx2d.lineTo(x + barW - r, y);
    ctx2d.quadraticCurveTo(x + barW, y, x + barW, y + r);
    ctx2d.lineTo(x + barW, canvas.height);
    ctx2d.lineTo(x, canvas.height);
    ctx2d.lineTo(x, y + r);
    ctx2d.quadraticCurveTo(x, y, x + r, y);
    ctx2d.fill();
  }
  ctx2d.globalAlpha = 1;
}

/* ────────────────────────────────────────────────────────────────
   KEYBOARD SHORTCUTS
   Space     → play / pause
   ← →       → previous / next track
   ↑ ↓       → volume up / down
   F         → focus search bar
   ──────────────────────────────────────────────────────────────── */
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (media.length === 0) return;

  switch (e.code) {
    case 'Space': e.preventDefault(); playBtn.click(); break;
    case 'ArrowRight': nextBtn.click(); break;
    case 'ArrowLeft': prevBtn.click(); break;
    case 'ArrowUp':
      if (volumeSlider) {
        volumeSlider.value = Math.min(100, +volumeSlider.value + 5);
        audio.volume = volumeSlider.value / 100;
      }
      break;
    case 'ArrowDown':
      if (volumeSlider) {
        volumeSlider.value = Math.max(0, +volumeSlider.value - 5);
        audio.volume = volumeSlider.value / 100;
      }
      break;
    case 'KeyF':
      e.preventDefault();
      mainSearch.focus();
      break;
  }
});

/* ────────────────────────────────────────────────────────────────
   INIT — run on page load
   ──────────────────────────────────────────────────────────────── */

// Rotate colors
function getColorClass(index) {
  return `color-${(index % 12) + 1}`;
}

// Emojis for songs and movies
const songEmojis = ['🎵', '🎶', '🎧', '🎸', '🎹', '🎷', '🎺', '🎻', '🎤', '🎙️'];
const movieEmojis = ['🎬', '🎥', '🍿', '🎟️', '📽️', '🎭', '🎞️', '⭐'];

function getEmoji(index, type) {
  if (type === 'movie') return movieEmojis[index % movieEmojis.length];
  return songEmojis[index % songEmojis.length];
}

// Clean display name from filename (remove extension, underscores, hyphens)
function cleanName(str) {
  let name = str.replace(/\.[^.]+$/, '');
  name = name.replace(/[_-]/g, ' ').replace(/\s+/g, ' ');
  return name.trim();
}

// Supported audio extensions
const AUDIO_EXTENSIONS = ['.mp3', '.mpeg', '.m4a', '.wav', '.ogg', '.flac', '.aac'];

function isAudioFile(filename) {
  if (!filename) return false;
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  return AUDIO_EXTENSIONS.includes(ext);
}

function getFilename(href) {
  if (!href) return '';
  // Strip trailing slash if present
  let cleanHref = href.endsWith('/') ? href.slice(0, -1) : href;
  // Get part after last slash
  const parts = cleanHref.split('/');
  return parts[parts.length - 1] || '';
}

// Dynamically fetch and parse directory listings from the server
async function scanSongsFromServer() {
  try {
    if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
      throw new Error('Not running on HTTP/HTTPS server');
    }

    const response = await fetch('songs/');
    if (!response.ok) throw new Error('Failed to fetch songs directory listing');
    const htmlText = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    const links = Array.from(doc.querySelectorAll('a'))
      .map(a => a.getAttribute('href'))
      .filter(href => href && !href.startsWith('..') && !href.startsWith('/') && !href.startsWith('?'));

    const folders = [];
    const rootSongs = [];

    for (const href of links) {
      // Decode the href first (Python http.server encodes spaces as %20 etc.)
      const decoded = decodeURIComponent(href);
      if (decoded.endsWith('/')) {
        folders.push(getFilename(decoded));  // Store plain folder name
      } else if (isAudioFile(decoded)) {
        rootSongs.push(getFilename(decoded));
      }
    }

    const dynamicConfig = [];

    if (rootSongs.length > 0) {
      dynamicConfig.push({
        movie: '',
        songs: rootSongs
      });
    }

    for (const folder of folders) {
      try {
        // encodeURIComponent encodes spaces as %20 — correct single encoding
        const subResponse = await fetch('songs/' + encodeURIComponent(folder) + '/');
        if (!subResponse.ok) continue;
        const subHtmlText = await subResponse.text();
        const subDoc = parser.parseFromString(subHtmlText, 'text/html');

        const subSongs = Array.from(subDoc.querySelectorAll('a'))
          .map(a => decodeURIComponent(a.getAttribute('href') || ''))
          .filter(href => href && isAudioFile(href))
          .map(href => getFilename(href));

        if (subSongs.length > 0) {
          dynamicConfig.push({
            movie: folder,
            songs: subSongs
          });
        }
      } catch (err) {
        console.warn(`Failed to scan subfolder ${folder}:`, err);
      }
    }

    if (dynamicConfig.length > 0) {
      console.log('Successfully scanned songs dynamically from local server:', dynamicConfig);
      return dynamicConfig;
    }
  } catch (e) {
    console.log('Dynamic server scan not available, falling back to static config. Reason:', e.message);
  }
  return null;
}

// Load songs from config object
function loadFromConfigData(configData) {
  if (!configData || !Array.isArray(configData)) return;

  let idCounter = 1;
  const items = [];

  for (const entry of configData) {
    const movieName = (entry.movie || '').trim();

    for (const filename of (entry.songs || [])) {
      const songTitle = cleanName(filename);

      // Use custom URL (e.g. Blob URL for direct import) if available, otherwise build relative path
      let src = '';
      if (entry.songUrls && entry.songUrls[filename]) {
        src = entry.songUrls[filename];
      } else {
        const repoBase =
        entry.repo === 1
        ? 'https://harishkumar-234.github.io/Isai-Mayam-Songs-1'
        : entry.repo === 2
        ? 'https://harishkumar-234.github.io/Isai-Mayam-Songs-2'
        : 'https://harishkumar-234.github.io/Isai-Mayam-Songs';

        src = movieName
        ? `${repoBase}/${encodeURIComponent(movieName)}/${encodeURIComponent(filename)}`
        : `${repoBase}/${encodeURIComponent(filename)}`;
      }

      items.push({
        id: idCounter,
        type: movieName ? 'movie' : 'song',
        title: songTitle,
        artist: movieName || 'Single Track',
        album: movieName || 'Single Track',
        duration: '--:--',
        emoji: getEmoji(idCounter, movieName ? 'movie' : 'song'),
        color: getColorClass(idCounter),
        tags: movieName ? [movieName] : ['Song'],
        src: src
      });
      idCounter++;
    }
  }

  if (items.length > 0) {
    media.length = 0;
    media.push(...items);
  }
}

// Toast notification utility
function showToast(message) {
  let toast = document.getElementById('toastNotification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastNotification';
    toast.className = 'toast-msg';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span class="toast-icon">✨</span> <span>${message}</span>`;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

// Folder Import Handler
function handleFolderImport(files) {
  const rootSongs = [];
  const folderMap = {};

  for (const file of files) {
    const relativePath = file.webkitRelativePath || file.name;
    const parts = relativePath.split('/');

    if (!isAudioFile(file.name)) continue;

    let movieName = '';
    let fileName = file.name;

    // Try to find the "songs" folder segment to determine movie folder
    const songsIndex = parts.indexOf('songs');
    if (songsIndex !== -1) {
      if (parts.length > songsIndex + 2) {
        movieName = parts[songsIndex + 1];
        fileName = parts[songsIndex + 2];
      } else if (parts.length === songsIndex + 2) {
        movieName = '';
        fileName = parts[songsIndex + 1];
      }
    } else {
      // If selected parent folder of movies directly
      if (parts.length > 1) {
        movieName = parts[parts.length - 2];
        fileName = parts[parts.length - 1];
      }
    }

    const objectURL = URL.createObjectURL(file);

    if (movieName) {
      if (!folderMap[movieName]) {
        folderMap[movieName] = [];
      }
      folderMap[movieName].push({ filename: fileName, src: objectURL });
    } else {
      rootSongs.push({ filename: fileName, src: objectURL });
    }
  }

  const configData = [];
  if (rootSongs.length > 0) {
    const urls = {};
    rootSongs.forEach(s => { urls[s.filename] = s.src; });
    configData.push({
      movie: '',
      songs: rootSongs.map(s => s.filename),
      songUrls: urls
    });
  }

  for (const movieName of Object.keys(folderMap).sort()) {
    const songs = folderMap[movieName];
    const urls = {};
    songs.forEach(s => { urls[s.filename] = s.src; });
    configData.push({
      movie: movieName,
      songs: songs.map(s => s.filename),
      songUrls: urls
    });
  }

  if (configData.length === 0) {
    alert('No supported audio files found in the selected folder. Supported extensions: ' + AUDIO_EXTENSIONS.join(', '));
    return;
  }

  // Load from configuration
  loadFromConfigData(configData);

  // Update counts
  const songCountEl = document.getElementById('songCount');
  const movieCountEl = document.getElementById('movieCount');
  if (songCountEl) songCountEl.textContent = media.length;
  if (movieCountEl) {
    const uniqueMovies = new Set(
      media.filter(m => m.type === 'movie').map(m => m.artist)
    );
    movieCountEl.textContent = uniqueMovies.size;
  }

  // Reload UI with imported songs
  buildPlaylist();
  if (media.length > 0) loadSong(0);

  showToast(`Successfully imported ${media.length} songs from folder!`);
}

async function init() {
  try {

    const CONFIG_URLS = [
      'https://harishkumar-234.github.io/Isai-Mayam-Songs/songs-config.js',
      'https://harishkumar-234.github.io/Isai-Mayam-Songs-1/songs-config.js',
      'https://harishkumar-234.github.io/Isai-Mayam-Songs-2/songs-config.js'
    ];

    let mergedConfig = [];

    for (const url of CONFIG_URLS) {

      try {

        window.SONGS_CONFIG = [];

        const response = await fetch(
          url + '?t=' + Date.now()
        );

        if (!response.ok) {
          console.warn('Cannot load:', url);
          continue;
        }

        const jsText = await response.text();

        eval(jsText);

        if (Array.isArray(window.SONGS_CONFIG)) {
          mergedConfig.push(...window.SONGS_CONFIG);
        }

      } catch (err) {
        console.error(err);
      }
    }

    console.log('Merged Config:', mergedConfig);

    loadFromConfigData(mergedConfig);

    console.log('Media Count:', media.length);

    if (songCountEl) {
      songCountEl.textContent = media.length;
    }

    if (movieCountEl) {
      const uniqueMovies = new Set(
        media
          .filter(m => m.type === 'movie')
          .map(m => m.artist)
      );

      movieCountEl.textContent = uniqueMovies.size;
    }

    buildPlaylist();

    if (media.length > 0) {
      loadSong(0);
    }

    drawVisualizer();

  } catch (err) {
    console.error('INIT ERROR:', err);
  }
}

init();

// Setup event listeners for local folder import
const importBtn = document.getElementById('importFolderBtn');
const folderPicker = document.getElementById('folderPicker');

if (importBtn && folderPicker) {
  importBtn.addEventListener('click', () => {
    folderPicker.click();
  });

  folderPicker.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFolderImport(e.target.files);
    }
  });
}

/* ────────────────────────────────────────────────────────────────
   CUSTOM PLAYLISTS SYSTEM
   ──────────────────────────────────────────────────────────────── */
window.openPlaylistModal = function (songId) {
  currentSongIdForModal = songId;
  const song = media.find(s => s.id === songId);
  if (!song) return;

  const modal = document.getElementById('playlistModal');
  const listContainer = document.getElementById('modalPlaylistsList');
  const inputEl = document.getElementById('newPlaylistInput');
  inputEl.value = '';

  if (playlists.length === 0) {
    listContainer.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 13px; padding: 12px 0;">No playlists created yet</div>';
  } else {
    listContainer.innerHTML = playlists.map(pl => {
      const isAlreadyAdded = pl.songs.includes(song.src);
      return `
        <div class="modal-playlist-item" onclick="${isAlreadyAdded ? '' : `addSongToPlaylist('${pl.name.replace(/'/g, "\\'")}', '${song.src.replace(/'/g, "\\'")}')`}">
          <span class="modal-playlist-name">📂 ${pl.name}</span>
          <span class="modal-playlist-count">${isAlreadyAdded ? 'Already Added' : `${pl.songs.length} song${pl.songs.length !== 1 ? 's' : ''}`}</span>
        </div>
      `;
    }).join('');
  }

  modal.classList.add('active');
};

window.closePlaylistModal = function () {
  document.getElementById('playlistModal').classList.remove('active');
  currentSongIdForModal = null;
};

window.createNewPlaylistFromModal = function () {
  const inputEl = document.getElementById('newPlaylistInput');
  const name = inputEl.value.trim();
  if (!name) return alert('Please enter a playlist name.');

  if (playlists.some(p => p.name.toLowerCase() === name.toLowerCase())) {
    return alert('A playlist with that name already exists.');
  }

  const song = media.find(s => s.id === currentSongIdForModal);
  if (!song) return;

  playlists.push({
    name: name,
    songs: [song.src]
  });

  localStorage.setItem('soundwave_playlists', JSON.stringify(playlists));
  closePlaylistModal();
  buildPlaylist();
};

window.addSongToPlaylist = function (playlistName, songSrc) {
  const pl = playlists.find(p => p.name === playlistName);
  if (pl && !pl.songs.includes(songSrc)) {
    pl.songs.push(songSrc);
    localStorage.setItem('soundwave_playlists', JSON.stringify(playlists));
  }
  closePlaylistModal();
  buildPlaylist();
};

window.removeSongFromPlaylist = function (songSrc) {
  if (!selectedPlaylist) return;
  const pl = playlists.find(p => p.name === selectedPlaylist);
  if (pl) {
    pl.songs = pl.songs.filter(src => src !== songSrc);
    localStorage.setItem('soundwave_playlists', JSON.stringify(playlists));
    buildPlaylist();
  }
};

window.deletePlaylist = function (index) {
  if (confirm(`Are you sure you want to delete "${playlists[index].name}"?`)) {
    playlists.splice(index, 1);
    localStorage.setItem('soundwave_playlists', JSON.stringify(playlists));
    buildPlaylist();
  }
};

window.promptCreatePlaylist = function () {
  const name = prompt('Enter a name for the new playlist:');
  if (name === null) return; // Cancelled
  const trimmed = name.trim();
  if (!trimmed) return alert('Playlist name cannot be empty.');

  if (playlists.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) {
    return alert('A playlist with that name already exists.');
  }

  playlists.push({
    name: trimmed,
    songs: []
  });

  localStorage.setItem('soundwave_playlists', JSON.stringify(playlists));
  buildPlaylist();
};

window.selectPlaylist = function (playlistName) {
  selectedPlaylist = playlistName;
  buildPlaylist();
};



