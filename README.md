# 🎵 SoundWave Music Player
### Created by Harish Kumar

A Spotify-inspired offline music & movie OST player built with pure HTML, CSS, and JavaScript.

---

## 📁 Project Structure

```
soundwave/
├── index.html                  ← Main HTML page
├── style.css                   ← All styling (dark theme, layout, animations)
├── script.js                   ← All functionality (playback, search, visualizer)
├── START_SERVER_WINDOWS.bat    ← Double-click to run on Windows
├── START_SERVER_MAC_LINUX.sh   ← Double-click to run on Mac / Linux
├── songs/                      ← Put your MP3 files here
│   └── (your .mp3 files go here)
└── README.md                   ← This file
```

---

## 🚀 How to Run (IMPORTANT — Read This First)

> ⚠️ Do NOT open index.html by double-clicking it directly.
> Browsers block local MP3 files for security when opened that way.
> You MUST use the server launcher below.

### ▶ Windows
1. Double-click **START_SERVER_WINDOWS.bat**
2. Your browser opens automatically at http://localhost:8000
3. Songs will now play! ✅

### ▶ Mac / Linux
1. Double-click **START_SERVER_MAC_LINUX.sh**
   *(If it doesn't run, right-click → Open Terminal → type: bash START_SERVER_MAC_LINUX.sh)*
2. Your browser opens automatically at http://localhost:8000
3. Songs will now play! ✅

### Requirement
The launcher needs **Python** (free) installed on your computer.
Download from: https://www.python.org/downloads/
*(Most Macs and Linux already have it built in)*

---

## 🎵 How to Add Your Own Songs

1. Copy your `.mp3` files into the `songs/` folder
2. Open `script.js` in any text editor (Notepad, VS Code, etc.)
3. Find the `const media = [...]` array at the top
4. Fill in the `src` field for each track:

```js
{
  id: 1,
  type: 'song',                      // 'song' or 'movie'
  title: 'My Song Title',
  artist: 'Artist Name',
  album: 'Album Name',
  duration: '3:45',
  emoji: '🎵',                       // Any emoji as cover art
  color: 'color-1',                  // color-1 through color-12
  tags: ['Pop', 'Happy'],
  src: 'songs/my-song-file.mp3'      // ← Your MP3 filename here
}
```

5. Save `script.js`, then launch via the .bat or .sh file as above

---

## ⌨️ Keyboard Shortcuts

| Key     | Action           |
|---------|------------------|
| Space   | Play / Pause     |
| →       | Next track       |
| ←       | Previous track   |
| ↑       | Volume up        |
| ↓       | Volume down      |
| F       | Focus search bar |

---

## ✨ Features

- 🎨 Dark Spotify-inspired theme
- ▶️ Play / Pause / Next / Previous
- 🔀 Shuffle & 🔁 Repeat (Off / All / One)
- 🔊 Volume slider & mute
- 📊 Real-time audio visualizer
- 🔍 Live search (songs, movies, artists, genres)
- 📋 Filter tabs (All / Songs / Movies / Liked)
- ❤️ Like / favourite tracks
- 💿 Spinning album art

---

© 2026 Harish Kumar — SoundWave Music Player. All rights reserved.
