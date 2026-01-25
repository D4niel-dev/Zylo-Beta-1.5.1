(function () {
  // ---- Simple Sound Engine using WebAudio (with graceful fallback) ----
  const SoundEngine = {
    _ctx: null,
    _enabled: true,
    _muted: false,
    _volFx: 0.75,
    _volMusic: 0.6,
    _profile: 'default',
    _duckMusic: false,
    _musicNode: null,
    _musicGain: null,
    _inited: false,
    _buffers: {},
    _sampleBase: '/files/audio/',
    _playOn: { send: true, receive: true, ui: true },

    _ensureCtx() {
      if (this._ctx) return;
      try {
        this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch { }
    },

    // ---- Notification Logic (Mute & DND) ----
    _mutedSources: new Set(),
    _dnd: false,

    _loadNotificationSettings() {
      try {
        const muted = JSON.parse(localStorage.getItem('mutedSources') || '[]');
        this._mutedSources = new Set(muted);
        this._dnd = localStorage.getItem('doNotDisturb') === 'true';
      } catch (e) {
        console.error('Failed to load notification settings', e);
      }
    },

    isMuted(sourceId) {
      if (this._dnd) return true; // DND overrides everything for notifications
      if (!sourceId) return false;
      return this._mutedSources.has(sourceId);
    },

    toggleMuteSource(sourceId) {
      if (this._mutedSources.has(sourceId)) {
        this._mutedSources.delete(sourceId);
      } else {
        this._mutedSources.add(sourceId);
      }
      localStorage.setItem('mutedSources', JSON.stringify([...this._mutedSources]));
      return this._mutedSources.has(sourceId);
    },

    getMuteStatus(sourceId) {
      return this._mutedSources.has(sourceId);
    },

    toggleDND() {
      this._dnd = !this._dnd;
      localStorage.setItem('doNotDisturb', String(this._dnd));
      return this._dnd;
    },

    getDNDStatus() {
      return this._dnd;
    },

    async init() {
      if (this._inited) return;
      this._inited = true;
      this._ensureCtx();
      // Load persisted settings
      this._enabled = localStorage.getItem('enableSound') !== 'false';
      this._muted = localStorage.getItem('muteAll') === 'true';
      const fx = Number(localStorage.getItem('soundVolume')); if (!Number.isNaN(fx)) this._volFx = fx / 100;
      const mu = Number(localStorage.getItem('musicVolume')); if (!Number.isNaN(mu)) this._volMusic = mu / 100;
      this._profile = localStorage.getItem('soundProfile') || 'default';
      this._duckMusic = localStorage.getItem('duckMusic') === 'true';
      this._playOn.send = (localStorage.getItem('playSend') ?? 'true') !== 'false';
      this._playOn.receive = (localStorage.getItem('playReceive') ?? 'true') !== 'false';
      this._playOn.ui = (localStorage.getItem('playUi') ?? 'true') !== 'false';

      this._loadNotificationSettings(); // Load notification prefs

      this._preloadSamples();

      // Expose to window
      window.SoundEngine = this;
      window.toggleMute = (id) => this.toggleMuteSource(id);
      window.toggleDND = () => this.toggleDND();
      window.getMuteStatus = (id) => this.getMuteStatus(id);
      window.getDNDStatus = () => this.getDNDStatus();
    },

    setFromControls() {
      this._enabled = document.getElementById('enableSound')?.checked ?? this._enabled;
      this._muted = document.getElementById('muteAll')?.checked ?? this._muted;
      const fx = Number(document.getElementById('soundVolume')?.value);
      if (!Number.isNaN(fx)) this._volFx = fx / 100;
      const mu = Number(document.getElementById('musicVolume')?.value);
      if (!Number.isNaN(mu)) this._volMusic = mu / 100;
      const prof = document.getElementById('soundProfile')?.value;
      if (prof) this._profile = prof;
      const duck = document.getElementById('duckMusic')?.checked;
      if (typeof duck === 'boolean') this._duckMusic = duck;
      const playSend = document.getElementById('playSend')?.checked;
      if (typeof playSend === 'boolean') this._playOn.send = playSend;
      const playReceive = document.getElementById('playReceive')?.checked;
      if (typeof playReceive === 'boolean') this._playOn.receive = playReceive;
      const playUi = document.getElementById('playUi')?.checked;
      if (typeof playUi === 'boolean') this._playOn.ui = playUi;

      // DND Control
      const dnd = document.getElementById('dndToggle')?.checked;
      if (typeof dnd === 'boolean') {
        this._dnd = dnd;
        localStorage.setItem('doNotDisturb', String(this._dnd));
      }
    },

    play(type, sourceId) {
      if (!this._enabled || this._muted) return;
      this._ensureCtx();
      if (!this._ctx) return;
      if (type === 'send' && !this._playOn.send) return;
      if (type === 'ui' && !this._playOn.ui) return;

      // Special logic for receive: check DND and specific Mute
      if (type === 'receive') {
        if (!this._playOn.receive) return;
        if (this.isMuted(sourceId)) return;
      }

      try {
        const buf = this._buffers[type];
        if (buf) {
          const src = this._ctx.createBufferSource();
          src.buffer = buf;
          const gain = this._ctx.createGain();
          gain.gain.value = this._volFx;
          src.connect(gain).connect(this._ctx.destination);
          src.start();
        } else {
          // Synth fallback
          const now = this._ctx.currentTime;
          const osc = this._ctx.createOscillator();
          const gain = this._ctx.createGain();
          let freq = 440, dur = 0.08, curve = 'sine';
          // Profile- and event-aware defaults
          if (type === 'send') { freq = 660; dur = 0.07; curve = 'triangle'; }
          else if (type === 'receive') { freq = 520; dur = 0.10; curve = 'sine'; }
          else if (type === 'ui') { freq = 400; dur = 0.05; curve = 'square'; }
          switch (this._profile) {
            case 'soft':
              curve = 'sine';
              dur *= 1.2;
              freq *= 0.85;
              break;
            case 'retro':
              curve = 'square';
              dur *= 0.9;
              freq *= 1.05;
              break;
            case 'clicky':
              curve = 'sawtooth';
              dur *= 0.05;
              freq *= 1.2;
              break;
            default:
              // default profile leaves values as-is
              break;
          }
          osc.type = curve;
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(this._volFx * 0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
          osc.connect(gain).connect(this._ctx.destination);
          osc.start(now);
          osc.stop(now + dur + 0.02);
        }
        if (this._duckMusic) this._duckMusicOnce();
      } catch { }
    },

    startMusic() {
      if (this._muted || localStorage.getItem('enableMusic') !== 'true') return;
      this._ensureCtx();
      if (!this._ctx || this._musicNode) return;
      if (this._buffers['bg']) {
        const src = this._ctx.createBufferSource();
        src.buffer = this._buffers['bg'];
        src.loop = true;
        const gain = this._ctx.createGain();
        gain.gain.value = this._volMusic;
        this._musicGain = gain;
        src.connect(gain).connect(this._ctx.destination);
        src.start();
        this._musicNode = src;
        return;
      }
      // Subtle noise pad fallback
      const bufferSize = 2 * this._ctx.sampleRate;
      const noiseBuffer = this._ctx.createBuffer(1, bufferSize, this._ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) output[i] = (Math.random() * 2 - 1) * 0.02;
      const noise = this._ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;
      const filter = this._ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      const gain = this._ctx.createGain();
      gain.gain.value = this._volMusic * 0.2;
      this._musicGain = gain;
      noise.connect(filter).connect(gain).connect(this._ctx.destination);
      noise.start();
      this._musicNode = noise;
    },

    stopMusic() {
      try { this._musicNode?.stop(); } catch { }
      this._musicNode = null;
      this._musicGain = null;
    },

    _duckMusicOnce() {
      try {
        if (!this._musicGain) return;
        const now = this._ctx.currentTime;
        const g = this._musicGain.gain;
        const base = this._volMusic * (this._buffers['bg'] ? 1.0 : 0.2);
        g.cancelScheduledValues(now);
        g.setValueAtTime(base, now);
        g.linearRampToValueAtTime(base * 0.5, now + 0.02);
        g.linearRampToValueAtTime(base, now + 0.25);
      } catch { }
    },

    async _preloadSamples() {
      if (!this._ctx) return;
      const files = {
        send: 'send.mp3',
        receive: 'notification.mp3',
        ui: 'ui.mp3',
        bg: 'bg.mp3',
        login: 'login.mp3',
        logout: 'logout.mp3',
        error: 'error.mp3',
      };
      const entries = Object.entries(files);
      await Promise.all(entries.map(async ([key, name]) => {
        const url = this._sampleBase + name;
        try {
          const resp = await fetch(url, { method: 'GET' });
          if (!resp.ok) return;
          const arr = await resp.arrayBuffer();
          const buf = await this._ctx.decodeAudioData(arr.slice(0));
          this._buffers[key] = buf;
        } catch { }
      }));
    }
  };

  // ---- Profile Effects ----
  function applyAvatarEffect(effect) {
    const avatar = document.getElementById('avatarImage');
    const wrapper = document.querySelector('.avatar-wrapper');
    if (!avatar || !wrapper) return;
    const effects = [
      'avatar-effect-none', 'avatar-effect-glow', 'avatar-effect-pulse', 'avatar-effect-ring', 'avatar-effect-sparkle',
      'avatar-effect-vintage', 'avatar-effect-neon-border', 'avatar-effect-gradient-border', 'avatar-effect-frosted',
      'avatar-effect-holographic', 'avatar-effect-matrix', 'avatar-effect-cyberpunk'
    ];
    avatar.classList.remove(...effects);
    wrapper.classList.remove(...effects);
    switch (effect) {
      case 'glow':
        avatar.classList.add('avatar-effect-glow'); break;
      case 'pulse':
        avatar.classList.add('avatar-effect-pulse'); break;
      case 'ring':
        wrapper.classList.add('avatar-effect-ring'); break;
      case 'sparkle':
        wrapper.classList.add('avatar-effect-sparkle'); break;
      case 'vintage':
        avatar.classList.add('avatar-effect-vintage'); break;
      case 'neon-border':
        avatar.classList.add('avatar-effect-neon-border'); break;
      case 'gradient-border':
        avatar.classList.add('avatar-effect-gradient-border'); break;
      case 'frosted':
        avatar.classList.add('avatar-effect-frosted'); break;
      case 'holographic':
        avatar.classList.add('avatar-effect-holographic'); break;
      case 'matrix':
        avatar.classList.add('avatar-effect-matrix'); break;
      case 'cyberpunk':
        avatar.classList.add('avatar-effect-cyberpunk'); break;
      default:
        avatar.classList.add('avatar-effect-none');
    }
  }

  function applyBannerEffect(effect) {
    const banner = document.querySelector('.profile-banner');
    if (!banner) return;
    const effects = [
      'banner-effect-none', 'banner-effect-blur-overlay', 'banner-effect-gradient-overlay', 'banner-effect-vignette',
      'banner-effect-neon-glow', 'banner-effect-cyber-grid', 'banner-effect-holographic-banner', 'banner-effect-matrix-banner',
      'banner-effect-retro-wave', 'banner-effect-neon-city'
    ];
    banner.classList.remove(...effects);
    switch (effect) {
      case 'blur-overlay':
        banner.classList.add('banner-effect-blur-overlay'); break;
      case 'gradient-overlay':
        banner.classList.add('banner-effect-gradient-overlay'); break;
      case 'vignette':
        banner.classList.add('banner-effect-vignette'); break;
      case 'neon-glow':
        banner.classList.add('banner-effect-neon-glow'); break;
      case 'cyber-grid':
        banner.classList.add('banner-effect-cyber-grid'); break;
      case 'holographic-banner':
        banner.classList.add('banner-effect-holographic-banner'); break;
      case 'matrix-banner':
        banner.classList.add('banner-effect-matrix-banner'); break;
      case 'retro-wave':
        banner.classList.add('banner-effect-retro-wave'); break;
      case 'neon-city':
        banner.classList.add('banner-effect-neon-city'); break;
      default:
        banner.classList.add('banner-effect-none');
    }
  }

  function initProfileEffects() {
    const select = document.getElementById('profileEffectSelect');
    const bannerSelect = document.getElementById('bannerEffectSelect');
    const saved = localStorage.getItem('profileEffect') || 'none';
    const bannerSaved = localStorage.getItem('bannerEffect') || 'none';

    if (select) select.value = saved;
    if (bannerSelect) bannerSelect.value = bannerSaved;

    applyAvatarEffect(saved);
    applyBannerEffect(bannerSaved);

    if (select) {
      select.addEventListener('change', function () {
        const val = this.value;
        localStorage.setItem('profileEffect', val);
        if (typeof persistSettings === 'function') {
          persistSettings({ profileEffect: val });
        }
        applyAvatarEffect(val);
        SoundEngine.play('ui');
      });
    }

    if (bannerSelect) {
      bannerSelect.addEventListener('change', function () {
        const val = this.value;
        localStorage.setItem('bannerEffect', val);
        if (typeof persistSettings === 'function') {
          persistSettings({ bannerEffect: val });
        }
        applyBannerEffect(val);
        SoundEngine.play('ui');
      });
    }
  }

  // ---- Icon fill on active (post-feather replace safety) ----
  function applyActiveIconFill() {
    // Nothing required here; CSS handles it. But ensure feather ran.
    try { if (window.feather) feather.replace(); } catch { }
  }

  // ---- Wire up events ----
  function wireEvents() {
    // Ensure sound engine gets initialized on first interaction
    const activateAudio = () => {
      SoundEngine.init();
      SoundEngine.setFromControls();
      SoundEngine.startMusic();
      document.removeEventListener('click', activateAudio, { capture: true });
    };
    document.addEventListener('click', activateAudio, { capture: true, once: true });

    // Chat send buttons
    document.querySelectorAll('.chat-send-btn').forEach(btn => {
      btn.addEventListener('click', () => SoundEngine.play('send'));
    });

    // Navbar clicks
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        SoundEngine.play('ui');
        setTimeout(applyActiveIconFill, 0); // small defer to ensure active class applied before feather styles
      });
    });

    // Logout SFX
    const attachLogoutSfx = () => {
      document.querySelectorAll('.logout-link, a[href="/login.html"]').forEach(a => {
        a.addEventListener('click', () => SoundEngine.play('logout'));
      });
    };
    attachLogoutSfx();

    // Socket events for incoming messages
    const tryAttachSocket = () => {
      const s = window.socket;
      if (!s || s.__zyloSoundPatched) return;
      try {
        s.on('receive_message', () => SoundEngine.play('receive', 'community'));
        s.on('receive_group_message', (data) => {
          if (data && data.groupId) SoundEngine.play('receive', data.groupId);
          else SoundEngine.play('receive');
        });
        s.on('receive_file', (data) => {
          if (data && data.groupId) SoundEngine.play('receive', data.groupId);
          else SoundEngine.play('receive', 'community');
        });
        s.on('receive_dm', (data) => {
          if (data && data.from) SoundEngine.play('receive', data.from);
          else SoundEngine.play('receive');
        });
        s.__zyloSoundPatched = true;
      } catch { }
    };
    tryAttachSocket();
    // Re-try a few times in case socket is late
    let attempts = 0;
    const iv = setInterval(() => { attempts++; tryAttachSocket(); if (attempts > 10) clearInterval(iv); }, 500);

    // React to settings controls changing at runtime
    ['soundVolume', 'musicVolume', 'muteAll', 'enableSound', 'enableMusic', 'soundProfile', 'duckMusic', 'playSend', 'playReceive', 'playUi', 'dndToggle'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', () => {
        SoundEngine.setFromControls();
        if (id === 'enableMusic' || id === 'musicVolume' || id === 'muteAll') {
          SoundEngine.stopMusic();
          SoundEngine.startMusic();
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initProfileEffects();
    wireEvents();
    applyActiveIconFill();
  });
})();
