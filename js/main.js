(function () {
  const { figure } = SPR;
  const Wd = WORLD;
  const cv = document.getElementById('game');
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const $ = (id) => document.getElementById(id);
  const CFG = window.CONFIG || {};

  // ---------- 画面サイズに合わせる ----------
  function fit() {
    let s = Math.min(innerWidth / Wd.W, innerHeight / Wd.H);
    s = Math.max(1, Math.floor(s * 2) / 2);
    const st = $('stage');
    st.style.transform = `scale(${s})`;
    st.style.left = `${(innerWidth - Wd.W * s) / 2}px`;
    st.style.top = `${(innerHeight - Wd.H * s) / 2}px`;
    st.style.position = 'absolute';
  }
  addEventListener('resize', fit); fit();

  // ---------- 音（矩形波） ----------
  let ac = null, soundOn = true;
  function ensureAudio() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } } if (ac && ac.state === 'suspended') ac.resume(); }
  function tone(freq, t0, dur, vol = 0.06, type = 'square') {
    if (!ac || !soundOn || !freq) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + dur);
  }
  function play(seq, step = 0.12) { ensureAudio(); if (!ac) return; const t = ac.currentTime; seq.forEach((f, i) => tone(f, t + i * step, step * 0.9)); }
  const SFX = {
    start: () => play([660, 660, 0, 660, 0, 523, 660, 0, 784], 0.11),
    coin: () => play([988, 1319], 0.08),
    blow: () => { ensureAudio(); if (!ac) return; const t = ac.currentTime; for (let i = 0; i < 6; i++) tone(180 + i * 40, t + i * 0.03, 0.08, 0.04, 'sawtooth'); },
    wrong: () => play([200, 150], 0.14),
    fanfare: () => play([523, 659, 784, 1047, 0, 784, 1047], 0.13),
    step: () => play([330], 0.05),
    up: () => play([392, 523, 659, 784, 1047, 1319], 0.07),
    jump: () => play([330, 440, 587], 0.035),
    stomp: () => play([523, 262], 0.05),
    bump: () => play([130, 110], 0.05),
    hurt: () => play([392, 330, 262, 196], 0.07),
    flag: () => play([1047, 988, 880, 784, 698, 659, 587, 523], 0.05),
    clear: () => play([523, 659, 784, 1047, 0, 880, 1047, 0, 1319], 0.12),
    tick: () => play([1568], 0.02),
  };

  // ---------- BGM（ハッピーバースデーを8bitで） ----------
  // [メロディ, 拍, ベース]
  const SONG = [
    [392, .75, 131], [392, .25, 0], [440, 1, 131], [392, 1, 131], [523, 1, 131], [494, 2, 98],
    [392, .75, 98], [392, .25, 0], [440, 1, 98], [392, 1, 98], [587, 1, 98], [523, 2, 131],
    [392, .75, 131], [392, .25, 0], [784, 1, 131], [659, 1, 131], [523, 1, 87], [494, 1, 87], [440, 2, 87],
    [698, .75, 87], [698, .25, 0], [659, 1, 131], [523, 1, 131], [587, 1, 98], [523, 2, 131], [0, 1, 0],
  ];
  const BGM = {
    on: false, fast: false, i: 0, t: 0,
    start() { ensureAudio(); if (!ac) return; this.on = true; this.fast = false; this.i = 0; this.t = ac.currentTime + 0.1; },
    stop() { this.on = false; },
    pump() {
      if (!this.on || !ac) return;
      const beat = this.fast ? 0.16 : 0.24;
      if (this.t < ac.currentTime) this.t = ac.currentTime + 0.05; // 裏に回って戻ったとき
      while (this.t < ac.currentTime + 0.3) {
        const [n, d, b] = SONG[this.i % SONG.length];
        tone(n, this.t, d * beat * 0.85, 0.035);
        tone(b, this.t, Math.min(d, 1) * beat * 0.8, 0.06, 'triangle');
        this.t += d * beat; this.i++;
      }
    },
  };
  $('btn-sound').onclick = () => { soundOn = !soundOn; $('btn-sound').textContent = soundOn ? '♪ ON' : '♪ OFF'; if (soundOn) { ensureAudio(); SFX.coin(); } };

  // ---------- 状態 ----------
  let state = 'title', f = 0;
  const actors = {};
  function resetActors() {
    Wd.FAMILY.forEach((sp) => { actors[sp.key] = { sp, x: sp.slot, walking: false, shown: false }; });
  }
  resetActors();

  function show(id) {
    ['s-title', 's-run', 's-intro', 's-candles', 's-quiz', 's-end'].forEach((s) => $(s).classList.toggle('hidden', s !== id));
  }

  // ---------- タイトル ----------
  let blockHit = false, blockY = 0, blockVy = 0;
  function drawTitle() {
    Wd.background(ctx, f);
    Wd.pipe(ctx, 200, Wd.GY - 28);
    const by = Wd.GY - 96 + blockY;
    Wd.qblock(ctx, 52, by, f, blockHit);
    if (blockVy) { blockY += blockVy; blockVy += 1; if (blockY >= 0) { blockY = 0; blockVy = 0; } }
    figure(ctx, 60, Wd.GY, actors.mom.sp, f);
  }

  // ---------- 登場 ----------
  const ORDER = ['dad', 'bro', 'boy', 'sis', 'mom'];
  let introIdx = -1, introWait = 0, introDone = false, introOrder = ORDER;
  // keys に入っている人だけ歩いて登場する。ほかは最初から並んでいる
  function startIntro(keys = ORDER) {
    state = 'intro'; show('s-intro');
    introIdx = -1; introWait = 0; introDone = false;
    introOrder = ORDER.filter((k) => keys.includes(k));
    ORDER.forEach((k) => {
      const a = actors[k]; a.walking = false;
      if (keys.includes(k)) { a.x = k === 'mom' ? -40 : 300; a.shown = false; } else { a.x = a.sp.slot; a.shown = true; }
    });
    nextEntrant();
  }
  function nextEntrant() {
    introIdx++;
    $('namebox').classList.remove('show');
    if (introIdx >= introOrder.length) { introDone = true; introWait = 18; return; }
    const a = actors[introOrder[introIdx]];
    a.walking = true;
    a.speed = Math.max(2, Math.abs(a.sp.slot - a.x) / 26);
  }
  function tickIntro() {
    if (introDone) { if (--introWait <= 0) startCandles(); return; }
    const a = actors[introOrder[introIdx]];
    if (a.walking) {
      const dir = Math.sign(a.sp.slot - a.x);
      a.x += dir * a.speed;
      if (f % 4 === 0) SFX.step();
      if (Math.abs(a.sp.slot - a.x) <= a.speed) { a.x = a.sp.slot; a.walking = false; a.shown = true; introWait = 14; $('namebox').textContent = a.sp.name; $('namebox').classList.add('show'); Wd.coin(a.x - 6, Wd.GY - 60); SFX.coin(); }
    } else if (--introWait <= 0) nextEntrant();
  }
  function drawFamily(skipHidden) {
    // 手前のものを後に描く（歩いてくる人は手前）
    const list = ORDER.map((k) => actors[k]).filter((a) => !skipHidden || a.shown || a.walking);
    list.sort((p, q) => (p.walking ? 1 : 0) - (q.walking ? 1 : 0));
    const HOP = [0, 3, 5, 6, 6, 5, 3];
    list.forEach((a, i) => {
      let hop = 0;
      if (celebrate > 0) { const ph = (f + i * 2) % 14; hop = ph < 7 ? HOP[ph] : 0; }
      figure(ctx, Math.round(a.x), Wd.GY - hop, a.sp, f, { walking: a.walking });
    });
  }
  function drawIntro() {
    Wd.background(ctx, f);
    Wd.pipe(ctx, 200, Wd.GY - 28);
    drawFamily(true);
  }
  $('btn-skip').onclick = () => { ORDER.forEach((k) => { actors[k].x = actors[k].sp.slot; actors[k].walking = false; actors[k].shown = true; }); introDone = true; introWait = 6; $('namebox').classList.remove('show'); };

  // ---------- 横スクロールのステージ ----------
  let result = null, runAcc = 0, sayTimer = 0;
  const RUN = makeRun({
    ctx, Wd, SFX, CFG, BGM,
    say(text) {
      const el = $('runmsg'); el.textContent = text; el.classList.add('show');
      clearTimeout(sayTimer); sayTimer = setTimeout(() => el.classList.remove('show'), 2600);
    },
    clear(on) { $('clear').classList.toggle('hidden', !on); },
    onClear(res) {
      result = res;
      setTimeout(() => {
        $('runmsg').classList.remove('show'); Wd.particles.length = 0;
        // ブロックをたたき忘れた家族は、ここで歩いて登場する
        startIntro(ORDER.filter((k) => k !== 'mom' && !res.joined.includes(k)));
      }, 600);
    },
  });
  function startRun() { Wd.particles.length = 0; state = 'run'; show('s-run'); $('clear').classList.add('hidden'); runAcc = 0; RUN.start(); }

  // ---------- ろうそく ----------
  let candles = [], charging = false, charge = 0, candlesDoneWait = 0, pressAt = 0, celebrate = 0;
  function startCandles() {
    state = 'candles'; show('s-candles');
    candles = Wd.cakeLayout().map((c) => ({ ...c, lit: true, smoke: 0 }));
    charge = 0; charging = false; candlesDoneWait = 0; celebrate = 0; $('cheer').classList.add('hidden'); updateCandleUI();
  }
  function updateCandleUI() {
    const left = candles.filter((c) => c.lit).length;
    $('candle-left').textContent = left ? `のこり ${left}` : 'ぜんぶ きえた!';
    $('breath').style.width = `${Math.min(100, charge * 100)}%`;
  }
  function blow() {
    const n = Math.max(1, Math.round(charge * 10));
    let k = 0;
    // 息は左から順に届く
    candles.filter((c) => c.lit).sort((a, b) => a.x - b.x).slice(0, n).forEach((c) => { c.lit = false; c.smoke = 12; k++; });
    charge = 0; SFX.blow(); updateCandleUI();
    if (k && !candles.some((c) => c.lit)) {
      // 全部消えた。家族が跳ねて、花火が上がって、「おめでとう!!」
      candlesDoneWait = 66; celebrate = 66;
      Wd.confetti(80); SFX.fanfare();
      setTimeout(() => $('cheer').classList.remove('hidden'), 250);
    }
  }
  function tickCandles() {
    if (charging) { charge = Math.min(1, (performance.now() - pressAt) / 1500); updateCandleUI(); }
    candles.forEach((c) => { if (c.smoke > 0) c.smoke--; });
    if (celebrate > 0) {
      celebrate--;
      if (f % 4 === 0) Wd.burst(30 + Math.random() * 180, 30 + Math.random() * 120, 16);
      if (f % 6 === 0) SFX.coin();
    }
    if (candlesDoneWait) { if (--candlesDoneWait <= 0) startQuiz(); }
  }
  function drawCandles() {
    Wd.background(ctx, f);
    Wd.cake(ctx, f, candles);
    drawFamily(false);
    if (celebrate > 62) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(0, 0, Wd.W, Wd.H); }
  }
  const stage = $('stage');
  const press = (e) => {
    if (e.target && e.target.closest && e.target.closest('button')) return;
    if (state === 'run') { RUN.press(); if (e.cancelable) e.preventDefault(); return; }
    if (state !== 'candles' || candlesDoneWait) return; if (e.target && e.target.closest && e.target.closest('button')) return; charging = true; pressAt = performance.now(); if (e.cancelable) e.preventDefault(); };
  const release = () => { if (state === 'run') { RUN.release(); return; } if (state !== 'candles' || !charging) return; charging = false; charge = Math.min(1, (performance.now() - pressAt) / 1500); blow(); };
  stage.addEventListener('pointerdown', press); stage.addEventListener('touchstart', press, { passive: false }); stage.addEventListener('mousedown', press);
  ['pointerup', 'pointercancel', 'touchend', 'mouseup'].forEach((ev) => addEventListener(ev, release));
  addEventListener('keydown', (e) => { if ((e.code === 'Space' || e.code === 'ArrowUp') && !e.repeat && state === 'run') { e.preventDefault(); RUN.press(); } });
  addEventListener('keyup', (e) => { if ((e.code === 'Space' || e.code === 'ArrowUp') && state === 'run') RUN.release(); });

  // ---------- 年齢クイズ ----------
  const AGE = CFG.age || 45;
  const WRONG = ['ざんねん!', 'もういちど。', 'よく かんがえて。', `ヒント: ${AGE - 1} の つぎ`, `${AGE} さい!`];
  let wrongCount = 0, quizDoneWait = 0;
  function startQuiz() {
    state = 'quiz'; show('s-quiz'); wrongCount = 0; quizDoneWait = 0;
    $('quiz-answer').textContent = '';
    const nums = [...new Set([AGE - 5, AGE - 2, AGE - 1, AGE, AGE + 1, AGE + 2, AGE + 5, AGE + 10])].sort(() => Math.random() - 0.5);
    const box = $('choices'); box.innerHTML = '';
    nums.forEach((n) => {
      const b = document.createElement('button'); b.textContent = n;
      b.onclick = () => answer(n, b); box.appendChild(b);
    });
  }
  function answer(n, btn) {
    if (quizDoneWait) return;
    const a = $('quiz-answer');
    if (n === AGE) {
      a.textContent = `せいかい! ${n} さい おめでとう!`;
      SFX.fanfare(); Wd.confetti(80);
      for (let i = 0; i < 6; i++) setTimeout(() => Wd.coin(90 + i * 12, 200, `+${AGE}`), i * 80);
      quizDoneWait = 40;
      Array.from($('choices').children).forEach((b) => { if (b !== btn) b.classList.add('no'); });
    } else {
      a.textContent = WRONG[Math.min(wrongCount, WRONG.length - 1)]; wrongCount++;
      a.classList.remove('shake'); void a.offsetWidth; a.classList.add('shake');
      btn.classList.add('no'); SFX.wrong();
    }
  }
  function tickQuiz() { if (quizDoneWait && --quizDoneWait <= 0) startEnd(); }
  function drawQuiz() { Wd.background(ctx, f); drawFamily(false); }

  // ---------- メッセージ ----------
  function startEnd() {
    state = 'end'; show('s-end');
    const m = $('message'); m.innerHTML = '';
    const lines = CFG.message || [];
    const ps = lines.map(() => { const p = document.createElement('p'); m.appendChild(p); return p; });
    let li = 0, k = 0;
    const tm = setInterval(() => {
      if (li >= lines.length) { clearInterval(tm); return; }
      ps[li].textContent = lines[li].slice(0, ++k);
      if (k >= lines[li].length) { li++; k = 0; }
    }, 55);
    $('from').textContent = CFG.from || '';
    $('result').textContent = result ? `COIN ${result.coins}/${AGE}  SCORE ${String(result.score).padStart(6, '0')}` : '';
    $('perfect').classList.toggle('hidden', !(result && result.coins >= AGE));
    Wd.confetti(80); SFX.fanfare();
  }
  function tickEnd() {
    if (f % 18 === 0) Wd.burst(40 + Math.random() * 160, 40 + Math.random() * 100, 20);
    if (f % 90 === 0) Wd.confetti(30);
  }
  function drawEnd() {
    Wd.background(ctx, f);
    drawFamily(false);
    // 横断幕
    ctx.fillStyle = '#000'; ctx.fillRect(30, 262, 180, 26);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f8b800'; ctx.font = '10px "DotGothic16"'; ctx.fillText(`${CFG.name || 'おかあさん'}`, 120, 274);
    ctx.fillStyle = '#fff'; ctx.font = '9px "Press Start 2P"'; ctx.fillText(`${CFG.date || '9.25'}  ${AGE}`, 120, 284);
    ctx.textAlign = 'left';
  }
  $('btn-again').onclick = () => { result = null; state = 'title'; show('s-title'); blockHit = false; resetActors(); Wd.particles.length = 0; };

  // ---------- 開始 ----------
  $('btn-start').onclick = () => {
    ensureAudio(); SFX.start(); $('btn-sound').textContent = soundOn ? '♪ ON' : '♪ OFF';
    blockHit = true; blockVy = -4; Wd.coin(56, Wd.GY - 100, String(AGE)); Wd.confetti(30);
    setTimeout(startRun, 900);
  };

  // ---------- ループ（描画60fps、ロジック12fps） ----------
  let acc = 0, last = performance.now();
  function loop(now) {
    // アプリを切り替えて戻ってきたとき、止まっていた分を一気に進めない。
    // 進めると「おめでとう」などの演出が一瞬で飛ぶ。
    const dt = now - last;
    acc = Math.min(acc + dt, 250); last = now;
    BGM.pump();
    if (state === 'run') {
      runAcc = Math.min(runAcc + dt, 100);
      while (runAcc >= 1000 / 60) { runAcc -= 1000 / 60; RUN.step(); }
    }
    while (acc >= 1000 / 12) {
      acc -= 1000 / 12; f++;
      if (state === 'intro') tickIntro();
      if (state === 'candles') tickCandles();
      if (state === 'quiz') tickQuiz();
      if (state === 'end') tickEnd();
      Wd.stepParticles();
    }
    if (state === 'title') drawTitle();
    if (state === 'run') RUN.draw(f);
    if (state === 'intro') drawIntro();
    if (state === 'candles') drawCandles();
    if (state === 'quiz') drawQuiz();
    if (state === 'end') drawEnd();
    Wd.drawParticles(ctx);
    requestAnimationFrame(loop);
  }
  const jump = new URLSearchParams(location.search).get('scene');
  if (jump) {
    Object.values(actors).forEach((a) => { a.shown = true; });
    if (jump === 'run') startRun();
    if (jump === 'candles') startCandles();
    if (jump === 'quiz') startQuiz();
    if (jump === 'end') startEnd();
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => requestAnimationFrame(loop));
  else requestAnimationFrame(loop);
})();
