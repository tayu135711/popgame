// ======================================
// SOUND - Web Audio Sound Effects
// ======================================
class SoundManager {
    constructor() {
        this.ctx = null;
        this.on = true;
        this.vol = 0.3;
        this.ok = false;

        // Audio element for BGM (MP3)
        this.bgmAudio = null;
        this.createBgmAudio();

        // Track setTimeout IDs for cleanup
        this.pendingTimers = [];
    }

    createBgmAudio() {
        // Create audio element for BGM playback
        if (!this.bgmAudio) {
            this.bgmAudio = new Audio();
            this.bgmAudio.addEventListener('ended', () => {
                // Replay on end for loop
                if (this.bgmAudio && this.bgmAudio.loop) {
                    this.bgmAudio.currentTime = 0;
                    this.bgmAudio.play().catch(e => console.warn('Autoplay failed:', e));
                }
            });
        }
    }
    init() { if (this.ok) return; try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.ok = true; } catch (e) { this.on = false; } }
    ensure() { if (!this.ok) this.init(); if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
    osc(f, t, d, v) {
        if (!this.on || !this.ctx) return;
        const initVol = Math.max(0.001, v || this.vol); // exponentialRamp は0起点不可
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = t; o.frequency.setValueAtTime(f, this.ctx.currentTime);
        g.gain.setValueAtTime(initVol, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + d);
        o.connect(g); g.connect(this.ctx.destination); o.start(); o.stop(this.ctx.currentTime + d);
    }
    noise(d, v) {
        if (!this.on || !this.ctx) return;
        // createBuffer は高コスト → 同じ長さのバッファをキャッシュして再利用
        if (!this._noiseCache) this._noiseCache = new Map();
        const dKey = Math.round(d * 100); // 0.01秒単位でキー
        let buf = this._noiseCache.get(dKey);
        if (!buf) {
            const n = this.ctx.sampleRate * d;
            buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1);
            if (this._noiseCache.size > 10) this._noiseCache.clear();
            this._noiseCache.set(dKey, buf);
        }
        const s = this.ctx.createBufferSource(); s.buffer = buf;
        const g = this.ctx.createGain();
        const initVol = Math.max(0.001, v || this.vol); // exponentialRamp は0起点不可
        g.gain.setValueAtTime(initVol, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + d);
        s.connect(g); g.connect(this.ctx.destination); s.start();
    }
    play(t, _rate) {
        // Note: _rate パラメータは将来のピッチ変更用（現在は未使用）
        if (!this.on) return;
        if (this.vol <= 0) return; // 音量0のときは音を出さない（0への指数ランプ防止）
        try {
            this.ensure();
            const v = this.vol;
            const now = this.ctx.currentTime;

            // Helper to register timer for cleanup
            const _setTimeout = (fn, delay) => {
                const id = setTimeout(fn, delay);
                this.pendingTimers.push(id);
                return id;
            };

            switch (t) {
                case 'cannon':
                    this.osc(100, 'square', 0.1, v * 0.7);
                    this.osc(60, 'sawtooth', 0.3, v * 0.5);
                    this.noise(0.25, v * 0.6);
                    break;
                case 'hit':
                    this.osc(150, 'square', 0.1, v * 0.6);
                    this.noise(0.1, v * 0.4);
                    _setTimeout(() => this.osc(80, 'sawtooth', 0.1, v * 0.4), 50);
                    break;
                case 'pickup':
                    // Creating a cheerful "piko!" sound
                    this.osc(600, 'sine', 0.05, v * 0.3);
                    _setTimeout(() => this.osc(900, 'sine', 0.08, v * 0.3), 60);
                    break;
                case 'load':
                    // Mechanical "gachin!"
                    this.osc(150, 'sawtooth', 0.05, v * 0.4);
                    this.osc(220, 'square', 0.05, v * 0.3);
                    _setTimeout(() => this.osc(440, 'sine', 0.1, v * 0.3), 50);
                    break;
                case 'jump':
                    // Rising "byuun"
                    (() => {
                        const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = 'triangle';
                        o.frequency.setValueAtTime(300, now); o.frequency.linearRampToValueAtTime(550, now + 0.15);
                        g.gain.setValueAtTime(Math.max(0.001, v * 0.2), now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                        o.connect(g); g.connect(this.ctx.destination); o.start(); o.stop(now + 0.15);
                    })();
                    break;
                case 'damage':
                    this.osc(120, 'sawtooth', 0.2, v * 0.6);
                    this.noise(0.15, v * 0.4);
                    break;
                case 'destroy':
                    this.osc(150, 'square', 0.4, v * 0.5);
                    this.osc(80, 'sawtooth', 0.5, v * 0.5);
                    this.noise(0.6, v * 0.4);
                    // Rumbling decay
                    setTimeout(() => this.noise(0.5, v * 0.3), 300);
                    break;
                case 'invade':
                    // Siren-like "wee-woo-wee-woo"
                    (() => {
                        const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = 'square';
                        o.frequency.setValueAtTime(400, now);
                        o.frequency.linearRampToValueAtTime(800, now + 0.2);
                        o.frequency.linearRampToValueAtTime(400, now + 0.4);
                        g.gain.setValueAtTime(v * 0.3, now); g.gain.linearRampToValueAtTime(0, now + 0.4);
                        o.connect(g); g.connect(this.ctx.destination); o.start(); o.stop(now + 0.4);
                    })();
                    break;
                case 'select':
                    this.osc(440, 'sine', 0.05, v * 0.2);
                    break;
                case 'confirm':
                    this.osc(440, 'sine', 0.08, v * 0.3);
                    _setTimeout(() => this.osc(880, 'sine', 0.12, v * 0.3), 60);
                    break;
                case 'countdown':
                    this.osc(600, 'sine', 0.1, v * 0.4);
                    break;
                case 'go':
                    this.osc(880, 'square', 0.4, v * 0.5);
                    setTimeout(() => this.osc(1760, 'sine', 0.3, v * 0.3), 100);
                    break;
                case 'win':
                case 'victory':
                    // Victory fanfare
                    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => {
                        _setTimeout(() => {
                            this.osc(f, 'square', 0.1, v * 0.2);
                            this.osc(f, 'sine', 0.3, v * 0.2);
                        }, i * 120);
                    });
                    break;
                case 'lose':
                    // Sad trombone-ish
                    [440, 415, 392, 370].forEach((f, i) => {
                        _setTimeout(() => {
                            const o = this.ctx.createOscillator(), g = this.ctx.createGain();
                            o.type = 'triangle';
                            o.frequency.setValueAtTime(f, this.ctx.currentTime);
                            g.gain.setValueAtTime(v * 0.3, this.ctx.currentTime);
                            g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
                            o.connect(g); g.connect(this.ctx.destination); o.start(); o.stop(this.ctx.currentTime + 0.4);
                        }, i * 300);
                    });
                    break;
                case 'heal':
                    // Shimmering sound
                    this.osc(523, 'sine', 0.3, v * 0.2);
                    this.osc(659, 'sine', 0.3, v * 0.2);
                    _setTimeout(() => this.osc(1047, 'sine', 0.4, v * 0.2), 100);
                    break;
                case 'engineHit':
                    this.osc(80, 'square', 0.1, v * 0.7);
                    this.noise(0.1, v * 0.4);
                    break;
                case 'cancel':
                    this.osc(300, 'square', 0.08, v * 0.3);
                    _setTimeout(() => this.osc(200, 'square', 0.08, v * 0.3), 80);
                    break;
                case 'powerup':
                    this.osc(600, 'sine', 0.05, v * 0.25);
                    _setTimeout(() => this.osc(800, 'sine', 0.05, v * 0.25), 60);
                    _setTimeout(() => this.osc(1200, 'sine', 0.08, v * 0.25), 120);
                    break;
                case 'throw':
                case 'dash':
                    this.osc(400, 'triangle', 0.08, v * 0.3);
                    _setTimeout(() => this.osc(200, 'triangle', 0.1, v * 0.2), 50);
                    break;
                case 'water':
                    this.noise(0.15, v * 0.35);
                    _setTimeout(() => this.noise(0.1, v * 0.25), 80);
                    break;
                case 'error':
                    this.osc(180, 'sawtooth', 0.1, v * 0.4);
                    _setTimeout(() => this.osc(160, 'sawtooth', 0.1, v * 0.4), 100);
                    break;
                case 'laser':
                    (() => {
                        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
                        o.type = 'sawtooth';
                        o.frequency.setValueAtTime(2000, now);
                        o.frequency.linearRampToValueAtTime(500, now + 0.2);
                        g.gain.setValueAtTime(Math.max(0.001, v * 0.3), now);
                        g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                        o.connect(g); g.connect(this.ctx.destination); o.start(); o.stop(now + 0.2);
                    })();
                    break;
                case 'coin':
                    this.osc(1000, 'sine', 0.05, v * 0.2);
                    _setTimeout(() => this.osc(1500, 'sine', 0.08, v * 0.2), 50);
                    break;
                case 'click':
                case 'cursor':
                    this.osc(500, 'square', 0.02, v * 0.15);
                    break;
                case 'boss_hit':
                    this.osc(100, 'sawtooth', 0.15, v * 0.5);
                    this.noise(0.12, v * 0.35);
                    break;
                case 'shoot':
                    // 仲間の遠距離攻撃音（短いピュッ）
                    this.osc(800, 'square', 0.04, v * 0.25);
                    _setTimeout(() => this.osc(500, 'square', 0.06, v * 0.2), 30);
                    break;
                case 'attack':
                    // 近接攻撃音（ズン）
                    this.osc(120, 'sawtooth', 0.08, v * 0.4);
                    this.noise(0.06, v * 0.3);
                    break;
                case 'start':
                    // リスタート音（確認音と同じ）
                    this.osc(440, 'sine', 0.1, v * 0.4);
                    _setTimeout(() => this.osc(660, 'sine', 0.15, v * 0.4), 80);
                    break;
                case 'charge':
                    // チャージ音（上昇する音）
                    (() => {
                        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
                        o.type = 'sawtooth';
                        o.frequency.setValueAtTime(200, this.ctx.currentTime);
                        o.frequency.linearRampToValueAtTime(800, this.ctx.currentTime + 0.3);
                        g.gain.setValueAtTime(Math.max(0.001, v * 0.3), this.ctx.currentTime);
                        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
                        o.connect(g); g.connect(this.ctx.destination);
                        o.start(); o.stop(this.ctx.currentTime + 0.35);
                    })();
                    break;
            }
        } catch (e) {
            console.warn("Sound Error:", e);
            // 個別のサウンドエラーで全音声を無効化しない（ログのみ）
        }
    }
    // ===== BGM SYSTEM =====
    stopBGM() {
        // Stop synthesized music
        if (this.currentBgmNodes) {
            this.currentBgmNodes.forEach(n => {
                try { n.stop(); n.disconnect(); } catch (e) { }
            });
            this.currentBgmNodes = [];
        }
        if (this.bgmTimer) {
            clearTimeout(this.bgmTimer);
            this.bgmTimer = null;
        }

        // Stop MP3 audio
        if (this.bgmAudio) {
            this.bgmAudio.pause();
            this.bgmAudio.currentTime = 0;
        }

        // Clear all pending timers to prevent memory leak
        this.pendingTimers.forEach(id => clearTimeout(id));
        this.pendingTimers = [];

        this.currentTrack = null;
    }

    playBGM(trackName) {
        if (!this.on) return;
        if (this.vol <= 0) return; // 音量0のときはBGMを再生しない
        this.ensure();
        if (this.currentTrack === trackName) return; // Already playing

        this.stopBGM();
        this.currentTrack = trackName;
        this.currentBgmNodes = [];

        // Try to play MP3 file if available
        const mp3Files = {
            'battle': ['audio/battle_bgm.webm', 'audio/battle_bgm.mp3', 'audio/battle_bgm.ogg'],
            'victory': ['audio/battle_bgm.webm', 'audio/battle_bgm.mp3', 'audio/battle_bgm.ogg'], // Victory uses same battle music
            'boss': ['audio/boss_bgm.webm', 'audio/boss_bgm.mp3', 'audio/boss_bgm.ogg'],  // Stage 5+ boss BGM
            'final_boss': ['audio/final_boss_bgm.webm', 'audio/final_boss_bgm.mp3', 'audio/final_boss_bgm.ogg'],  // Final stage (stage8) BGM
            'ex_stage': ['audio/ex_stage_bgm.webm', 'audio/ex_stage_bgm.mp3', 'audio/ex_stage_bgm.ogg']  // EXステージ専用BGM
        };

        if (mp3Files[trackName]) {
            const filePaths = Array.isArray(mp3Files[trackName])
                ? mp3Files[trackName]
                : [mp3Files[trackName]];

            const tryPlayNext = (index) => {
                if (index >= filePaths.length) {
                    console.warn(`All audio files failed for ${trackName}, falling back to synth`);
                    this.playBGMSynth(trackName);
                    return;
                }

                const filePath = filePaths[index];
                if (!this.bgmAudio) return;

                // Track current attempt to prevent double-skipping
                const currentAttempt = filePath;

                this.bgmAudio.src = filePath;
                this.bgmAudio.loop = true;
                this.bgmAudio.volume = this.vol;

                let hasMovedToNext = false;
                const moveToNext = (reason) => {
                    if (hasMovedToNext || this.bgmAudio.src.indexOf(currentAttempt) === -1) return;
                    hasMovedToNext = true;
                    console.warn(`Skipping ${filePath}: ${reason}`);
                    this.bgmAudio.removeEventListener('canplay', onSuccess);
                    this.bgmAudio.removeEventListener('error', onError);
                    tryPlayNext(index + 1);
                };

                const onSuccess = () => {
                    if (hasMovedToNext) return;
                    this.bgmAudio.removeEventListener('error', onError);
                };

                const onError = (e) => {
                    moveToNext("Load error (File missing or format unsupported)");
                };

                this.bgmAudio.addEventListener('canplay', onSuccess, { once: true });
                this.bgmAudio.addEventListener('error', onError, { once: true });

                this.bgmAudio.play()
                    .catch(err => {
                        // NotAllowedError is usually autoplay policy.
                        // Other errors might mean we should skip.
                        if (err.name === 'NotAllowedError') {
                            console.warn(`Autoplay blocked for ${filePath}. Waiting for user interaction.`);
                        } else {
                            moveToNext(`Play error: ${err.message}`);
                        }
                    });
            };

            tryPlayNext(0);
            return;
        }

        // No MP3, use synthesized music
        this.playBGMSynth(trackName);
    }

    playBGMSynth(trackName) {
        // Synthesized BGM (fallback)
        if (this.vol <= 0) return; // 音量0のときはシンセBGMを再生しない

        // Simple Music Data (Pitch, Duration code)
        // q=quarter, e=eighth, s=sixteenth, h=half, w=whole
        const songBy = {
            'title': {
                bpm: 110,
                instrument: 'square',
                notes: "C4,q,E4,q,G4,q,C5,q, B4,q,G4,q,E4,q,D4,q, C4,q,E4,q,A4,q,C5,q, B4,q,A4,q,G4,h".split(',')
            },
            'battle': {
                bpm: 140,
                instrument: 'sawtooth',
                notes: "C3,e,C3,e,G3,e,C3,e, Eb3,e,Eb3,e,F3,e,G3,e, C3,e,C3,e,G3,e,C3,e, Bb2,e,Bb2,e,C3,q".split(',')
            },
            'boss': {
                bpm: 130,
                instrument: 'sawtooth',
                notes: "C2,s,C2,s,C2,s,C3,e, G2,s,G2,s,G2,s,G3,e, F2,s,F2,s,F2,s,F3,e, Eb2,q,D2,q".split(',')
            },
            'final_boss': {
                bpm: 180,
                instrument: 'square',
                notes: "C2,s,G2,s,C3,s,Eb3,s, D2,s,A2,s,D3,s,F3,s, C2,s,G2,s,C3,s,G3,s, Bb1,s,F2,s,Bb2,s,D3,s, C2,s,G2,s,Eb3,s,G3,s, D2,s,A2,s,F3,s,A3,s".split(',')
            },
            'ex_stage': {
                bpm: 200,
                instrument: 'square',
                notes: "C3,s,E3,s,G3,s,C4,s, B3,s,G3,s,E3,s,D3,s, F3,s,A3,s,C4,s,F4,s, E4,s,C4,s,A3,s,G3,s, D3,s,F#3,s,A3,s,D4,s, C#4,s,A3,s,F#3,s,E3,s, G3,s,B3,s,D4,s,G4,s, F#4,s,D4,s,B3,s,A3,s".split(',')
            },
            'invasion': {
                bpm: 160,
                instrument: 'square',
                notes: "A4,s,E5,s,A4,s,E5,s, C5,s,G5,s,C5,s,G5,s, F#4,s,C#5,s,F#4,s,C#5,s, F4,q,E4,q".split(',')
            },
            'shop': {
                bpm: 90,
                instrument: 'triangle',
                notes: "C4,e,G3,e,E4,e,G3,e, G4,q,E4,q, A4,e,F4,e,C5,e,A4,e, G4,h".split(',')
            },
            'victory': {
                bpm: 120,
                instrument: 'sine',
                loop: false,
                notes: "C4,e,E4,e,G4,e,C5,q, G4,e,C5,q, E5,w".split(',')
            },
            'lose': {
                bpm: 80,
                instrument: 'triangle',
                loop: false,
                notes: "C4,q,B3,q,Bb3,q,A3,w".split(',')
            }
        };

        const song = songBy[trackName];
        if (!song) return;

        let noteIdx = 0;
        const stepTime = (60 / song.bpm) * 1000; // Quarter note ms

        const playStep = () => {
            if (!this.on || this.currentTrack !== trackName) return;

            // Loop logic
            if (noteIdx >= song.notes.length) {
                if (song.loop === false) return; // Stop if not looping
                noteIdx = 0;
            }

            const note = song.notes[noteIdx];
            const durCode = song.notes[noteIdx + 1];
            noteIdx += 2;

            // Duration multiplier
            let mult = 1;
            if (durCode === 'q') mult = 1;
            else if (durCode === 'e') mult = 0.5;
            else if (durCode === 's') mult = 0.25;
            else if (durCode === 'h') mult = 2;
            else if (durCode === 'w') mult = 4;

            if (note !== 'R') {
                // Play logic
                this.playTone(note, (stepTime * mult) / 1000, song.instrument || 'sine');
            }

            this.bgmTimer = setTimeout(playStep, stepTime * mult);
        };

        playStep();
    }

    playTone(noteStr, duration, type = 'sine') {
        if (!this.ctx || this.vol <= 0) return;
        const freqMap = {
            'C': 16.35, 'C#': 17.32, 'D': 18.35, 'Eb': 19.45, 'E': 20.60, 'F': 21.83, 'F#': 23.12, 'G': 24.50, 'G#': 25.96, 'A': 27.50, 'Bb': 29.14, 'B': 30.87
        };
        const match = noteStr.match(/([A-G][b#]?)([0-9])/);
        if (!match) return;

        const note = match[1];
        const octave = parseInt(match[2]);
        const freq = freqMap[note] * Math.pow(2, octave);

        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type;
        o.frequency.value = freq;

        // ADSR Envelope - ノートの長さに合わせて動的に調整
        const now = this.ctx.currentTime;
        const attack  = Math.min(0.05, duration * 0.2);
        const decay   = Math.min(0.1,  duration * 0.3);
        const release = Math.min(0.05, duration * 0.2);
        const sustainStart = Math.max(now + attack + decay, now + duration - release);
        const peakVol    = Math.max(0.001, this.vol * 0.3);
        const sustainVol = Math.max(0.001, this.vol * 0.1);

        g.gain.setValueAtTime(0.001, now);                                    // 0起点はNG→0.001から開始
        g.gain.linearRampToValueAtTime(peakVol, now + attack);                 // Attack
        g.gain.exponentialRampToValueAtTime(sustainVol, now + attack + decay); // Decay
        if (sustainStart > now + attack + decay) {
            g.gain.setValueAtTime(sustainVol, sustainStart);                   // Sustain
        }
        g.gain.linearRampToValueAtTime(0.001, now + duration);                 // Release (0はNG→0.001)

        o.connect(g);
        g.connect(this.ctx.destination);
        o.start();
        o.stop(now + duration + 0.05);

        // Track nodes for stopping
        this.currentBgmNodes.push(o);
        // Cleanup
        setTimeout(() => {
            const idx = this.currentBgmNodes.indexOf(o);
            if (idx > -1) this.currentBgmNodes.splice(idx, 1);
        }, (duration + 0.2) * 1000);
    }
}

window.SoundManager = SoundManager;
