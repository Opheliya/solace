window.addEventListener('DOMContentLoaded', () => {
  // Element references
  const themeToggleBtn = document.getElementById('theme-toggle');
  const body = document.body;

  const playBtn = document.getElementById('play');
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');
  const progress = document.getElementById('progress');
  const currentTimeEl = document.getElementById('current-time');
  const durationEl = document.getElementById('duration');
  const title = document.querySelector('.title');
  const artist = document.querySelector('.artist');

  const artContainer = document.querySelector('.art-container');
  const artImg = document.querySelector('.art');
  let artVideo = null;

  const searchBtn = document.getElementById('search-btn');
  const songSearchInput = document.getElementById('song-search');
  const searchResultsDiv = document.getElementById('search-results');

  const moodButtons = document.querySelectorAll('.mood-buttons button');
  const languageSelect = document.getElementById('language-select');
  const lyricsPre = document.getElementById('lyrics');
  const voiceSearchBtn = document.getElementById('voice-search-btn');

  // State
  let isPlaying = false;
  let audio = new Audio();
  let songs = [];
  let currentSongIndex = 0;
  let currentMood = '';

  // Mood mapping
  const moodSearchMap = {
    happy: ['joyful', 'upbeat', 'sunny', 'cheerful'],
    sad: ['melancholy', 'blue', 'sad', 'heartbreak'],
    chill: ['relaxing', 'chill', 'calm', 'smooth'],
    energetic: ['party', 'dance', 'energetic', 'powerful'],
  };

  const moodBackgrounds = {
    happy: 'url("https://source.unsplash.com/1600x900/?happy,joyful")',
    sad: 'url("https://source.unsplash.com/1600x900/?sad,rain")',
    chill: 'url("https://source.unsplash.com/1600x900/?chill,calm")',
    energetic: 'url("https://source.unsplash.com/1600x900/?energetic,party")',
    default: 'url("https://source.unsplash.com/1600x900/?music,abstract")',
  };

  // Theme toggle
  themeToggleBtn.addEventListener('click', () => {
    if (body.classList.contains('light-theme')) {
      body.classList.replace('light-theme', 'dark-theme');
      themeToggleBtn.textContent = 'Switch to Light';
    } else {
      body.classList.replace('dark-theme', 'light-theme');
      themeToggleBtn.textContent = 'Switch to Dark';
    }
  });

  function updateMoodBackground(mood) {
    body.style.backgroundImage = moodBackgrounds[mood] || moodBackgrounds.default;
  }

  // Replace album art image with a looping video (if URL provided) or fallback to image
  function setArtMedia(song) {
    if (artVideo) {
      artVideo.pause();
      artContainer.removeChild(artVideo);
      artVideo = null;
    }
    artImg.style.display = 'none';

    // For demonstration, if you have a video url property on song use that; else fallback
    if (song.videoSrc) {
      artVideo = document.createElement('video');
      artVideo.src = song.videoSrc;
      artVideo.autoplay = true;
      artVideo.loop = true;
      artVideo.muted = true;
      artVideo.playsInline = true;
      artVideo.style.width = '100%';
      artVideo.style.borderRadius = '24px';
      artContainer.appendChild(artVideo);
    } else {
      if(artVideo){
        artVideo.style.display = 'none';
      }
      artImg.style.display = 'block';
      artImg.src = song.img || 'default-album.jpg';
    }
  }

  // Load song and lyrics
  function loadSong(song) {
    title.textContent = song.title;
    artist.textContent = song.artist || 'Unknown Artist';
    setArtMedia(song);
    audio.src = song.src;
    fetchLyrics(song.artist, song.title);
    updateMoodBackground(currentMood);
  }

  async function fetchLyrics(artistName, trackName) {
    lyricsPre.textContent = "Loading lyrics...";
    if (!artistName || !trackName) {
      lyricsPre.textContent = "Lyrics unavailable.";
      return;
    }
    try {
      const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artistName)}/${encodeURIComponent(trackName)}`);
      if (!response.ok) throw new Error("Lyrics not found");
      const data = await response.json();
      if (!data.lyrics) throw new Error("No lyrics");
      lyricsPre.textContent = data.lyrics;
    } catch (error) {
      console.warn('Lyrics error:', error);
      lyricsPre.textContent = "Lyrics not found.";
    }
  }

  // Play/pause controls
  function playSong() {
    isPlaying = true;
    playBtn.textContent = '⏸️';
    audio.play();
  }

  function pauseSong() {
    isPlaying = false;
    playBtn.textContent = '▶️';
    audio.pause();
  }

  playBtn.addEventListener('click', () => {
    if (isPlaying) pauseSong();
    else playSong();
  });

  prevBtn.addEventListener('click', () => {
    if (songs.length === 0) return;
    currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    loadSong(songs[currentSongIndex]);
    playSong();
  });

  nextBtn.addEventListener('click', () => {
    if (songs.length === 0) return;
    currentSongIndex = (currentSongIndex + 1) % songs.length;
    loadSong(songs[currentSongIndex]);
    playSong();
  });

  audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    const progressPercent = (audio.currentTime / audio.duration) * 100;
    progress.value = progressPercent || 0;

    let curMin = Math.floor(audio.currentTime / 60);
    let curSec = Math.floor(audio.currentTime % 60);
    let durMin = Math.floor(audio.duration / 60);
    let durSec = Math.floor(audio.duration % 60);

    currentTimeEl.textContent = `${curMin}:${curSec < 10 ? '0' : ''}${curSec}`;
    durationEl.textContent = `${durMin}:${durSec < 10 ? '0' : ''}${durSec}`;
  });

  progress.addEventListener('input', () => {
    audio.currentTime = (progress.value / 100) * audio.duration;
  });

  // Mood buttons listener
  moodButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      currentMood = btn.getAttribute('data-mood');
      updateMoodBackground(currentMood);
      searchSongs();
    });
  });

  // Search button click & Enter key handling
  searchBtn.addEventListener('click', () => {
    currentMood = '';
    updateMoodBackground('');
    searchSongs();
  });

  songSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      currentMood = '';
      updateMoodBackground('');
      searchSongs();
    }
  });

  // Search songs logic
  async function searchSongs() {
    const language = languageSelect.value;
    const queryInput = songSearchInput.value.trim();

    const moodTerms = currentMood ? moodSearchMap[currentMood]?.join(' ') : '';
    let query = [queryInput, moodTerms, language !== 'english' ? language : ''].filter(Boolean).join(' ');

    if (!query) {
      alert('Please enter a search term or select a mood');
      return;
    }

    searchResultsDiv.textContent = 'Searching songs...';

    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=20`);
      const data = await res.json();

      if (data.resultCount === 0) {
        searchResultsDiv.textContent = 'No songs found.';
        return;
      }

      songs = data.results.map(track => ({
        title: track.trackName,
        artist: track.artistName,
        id: track.trackId,
        img: track.artworkUrl100.replace('100x100', '300x300'),
        src: track.previewUrl,
        videoSrc: null, // put here your video urls if have, otherwise null
      }));

      renderSearchResults();
    } catch (e) {
      console.error(e);
      searchResultsDiv.textContent = 'Error fetching songs, please try again.';
    }
  }

  // Show search results
  function renderSearchResults() {
    searchResultsDiv.innerHTML = '';

    songs.forEach((song, idx) => {
      const div = document.createElement('div');
      div.className = 'song-item';
      div.innerHTML = `
        <img src="${song.img}" alt="${song.title}" />
        <span>${song.title} - ${song.artist}</span>
        <button data-index="${idx}">Play</button>
      `;
      searchResultsDiv.appendChild(div);
    });

    document.querySelectorAll('.song-item button').forEach(btn => {
      btn.addEventListener('click', evt => {
        const idx = evt.target.getAttribute('data-index');
        currentSongIndex = idx;
        loadSong(songs[idx]);
        playSong();
      });
    });
  }

  // Voice search
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    voiceSearchBtn.addEventListener('click', () => {
      voiceSearchBtn.textContent = "🎙️ Listening...";
      recognition.start();
    });

    recognition.addEventListener('result', e => {
      const speechText = e.results[0][0].transcript;
      songSearchInput.value = speechText;
      recognition.stop();
      voiceSearchBtn.textContent = "🎤";
      currentMood = '';
      updateMoodBackground('');
      searchSongs();
    });

    recognition.addEventListener('error', err => {
      console.error('Voice recognition error:', err);
      voiceSearchBtn.textContent = "🎤";
      alert('Voice recognition error. Please try again.');
    });

    recognition.addEventListener('end', () => {
      voiceSearchBtn.textContent = "🎤";
    });
  } else {
    voiceSearchBtn.style.display = "none";
  }

  // On load, update background to default
  updateMoodBackground('');
});

