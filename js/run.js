// 横スクロールのステージ「WORLD 9-25」。
// お母さんが自動で走り、タップでジャンプ。コインを年齢の数だけ集め、
// ？ブロックをたたくと家族が出てきて後ろをついて走る。旗でゴール。
// 物理は60Hzで回す（12fpsだとジャンプがカクつく）。
(function () {
  const { r, figure } = SPR;

  window.makeRun = function (o) {
    const { ctx, Wd, SFX, CFG, BGM } = o;
    const GY = Wd.GY, W = Wd.W;
    const AGE = CFG.age || 45;
    const MOMX = 84;                 // お母さんの画面上のx
    const GOAL = 2560, CASTLE = 2640;
    const HEAD = 44;                 // 足元から頭のてっぺんまで
    const FAM = Object.fromEntries(Wd.FAMILY.map((s) => [s.key, s]));
    const LINES = Object.assign({
      dad: 'いつも ありがとう',
      bro: 'おめでとう!',
      boy: 'これからも よろしく',
      sis: 'おめでとう!',
    }, CFG.familyLines || {});
    const STAR_COLORS = ['#d82800', '#f8b800', '#00a800', '#5c94fc', '#f878f8'];

    let S, L;

    function level() {
      const coins = [];
      const line = (x, y, n) => { for (let i = 0; i < n; i++) coins.push({ x: x + i * 14, y }); };
      const arc = (cx) => { for (let i = 0; i < 5; i++) { const t = i / 4; coins.push({ x: cx - 36 + t * 72, y: GY - 40 - Math.sin(t * Math.PI) * 44 }); } };
      // 合計がちょうど年齢の数（45）になるように置く
      line(190, GY - 16, 5); arc(662); line(820, GY - 16, 4); line(1000, GY - 70, 5); arc(1120);
      arc(1312); line(1480, GY - 16, 5); arc(2012); line(2230, GY - 16, 6);
      // 年齢を変えたときは端数を最後の列で合わせる
      while (coins.length < AGE) coins.push({ x: 2320 + (coins.length % 10) * 14, y: GY - 16 - Math.floor((coins.length - 45) / 10) * 14 });
      coins.length = Math.min(coins.length, AGE);
      return {
        coins: coins.map((c) => ({ ...c, got: false })),
        pipes: [650, 1300, 2000].map((x) => ({ x, top: GY - 28 })),
        enemies: [500, 800, 1150, 1550, 1800, 2150].map((x) => ({ x, vx: -0.45, alive: true, active: false, dead: 0 })),
        blocks: [
          { x: 360, key: 'dad' }, { x: 940, key: 'bro' }, { x: 1210, key: 'star' },
          { x: 1640, key: 'boy' }, { x: 2290, key: 'sis' },
        ].map((b) => ({ ...b, y: GY - 88, used: false, bump: 0 })),
      };
    }

    function start() {
      L = level();
      S = {
        phase: 'card', t: 0, camX: 0, y: GY, vy: 0, ground: true, holding: false, coyote: 0, buf: 0,
        coins: 0, score: 0, time: 300, tAcc: 0, inv: 0, star: 0, shake: 0,
        hist: [], followers: [], items: [], momSX: MOMX, flagY: GY - 120, tally: 0,
      };
    }

    // ---------- 入力 ----------
    function doJump() { S.vy = -6.8; S.ground = false; S.coyote = 0; S.buf = 0; SFX.jump(); }
    function press() {
      if (S.phase === 'card') { if (S.t > 20) begin(); return; }
      if (S.phase !== 'play') return;
      S.holding = true;
      if (S.ground || S.coyote > 0) doJump(); else S.buf = 8;
    }
    function release() { S.holding = false; if (S.phase === 'play' && S.vy < -2.5) S.vy = -2.5; }
    function begin() { S.phase = 'play'; S.t = 0; BGM.start(); }

    // ---------- 出来事 ----------
    function hitBlock(b) {
      b.bump = 8;
      if (b.used) { SFX.bump(); return; }
      b.used = true;
      if (b.key === 'star') {
        S.items.push({ t: 'star', x: b.x + 4, y: b.y - 4, vy: -2, life: 40 });
        S.star = 480; BGM.fast = true; SFX.up();
        o.say('スター! むてきで はしれ!');
        return;
      }
      const sp = FAM[b.key];
      SFX.up();
      S.score += 1000;
      Wd.coin(b.x - S.camX, b.y - 6, '1000');
      S.followers.push({ key: b.key, sp, x: b.x - S.camX + 8, y: b.y, vy: -3, landed: false });
      o.say(`${sp.name} が なかまに なった!\n「${LINES[b.key]}」`);
    }
    function hurt() {
      const lose = Math.min(2, S.coins);
      S.coins -= lose; S.inv = 90; S.shake = 10;
      SFX.hurt();
      for (let i = 0; i < lose; i++) Wd.coin(MOMX - 4 + i * 8, S.y - 30);
      o.say(lose ? `いたっ! コイン -${lose}` : 'いたっ!');
    }
    function kill(e, by) {
      e.alive = false; e.dead = 24;
      S.score += by === 'star' ? 200 : 100;
      Wd.coin(e.x - S.camX, GY - 20, by === 'star' ? '200' : '100');
      Wd.burst(e.x - S.camX + 6, GY - 6, 10);
      SFX.stomp();
    }

    // ---------- 1ステップ（60Hz） ----------
    function step() {
      S.t++;
      if (S.shake > 0) S.shake--;
      if (S.phase === 'card') { if (S.t > 170) begin(); return; }
      if (S.phase === 'play') stepPlay();
      else stepGoal();
      stepFollowers();
      S.items.forEach((it) => { it.y += it.vy; it.vy += 0.1; it.life--; });
      S.items = S.items.filter((it) => it.life > 0);
      L.blocks.forEach((b) => { if (b.bump > 0) b.bump--; });
      L.enemies.forEach((e) => { if (e.dead > 0) e.dead--; });
    }

    function stepPlay() {
      const speed = S.star > 0 ? 2.3 : 1.7;
      let nx = S.camX + speed;
      // 土管に横からぶつかったら止まる
      L.pipes.forEach((p) => {
        const wx = nx + MOMX;
        if (S.y > p.top + 1 && wx + 5 > p.x && wx - 5 < p.x + 24) nx = Math.min(nx, p.x - 5 - MOMX);
      });
      S.camX = Math.max(S.camX, nx);
      const wx = S.camX + MOMX;

      // 縦。押しっぱなしの間は重力を弱くして高く跳ぶ
      S.vy = Math.min(7, S.vy + (S.holding && S.vy < 0 ? 0.28 : 0.42));
      const prevFeet = S.y, prevHead = S.y - HEAD;
      S.y += S.vy;
      let g = GY;
      L.pipes.forEach((p) => { if (wx + 5 > p.x + 1 && wx - 5 < p.x + 23 && prevFeet <= p.top + 0.5) g = Math.min(g, p.top); });
      if (S.y >= g) {
        S.y = g; S.vy = 0; S.ground = true;
        if (S.buf > 0) doJump();
      } else {
        if (S.ground) S.coyote = 6;
        S.ground = false;
      }

      // ？ブロックを下からたたく
      if (S.vy < 0) {
        L.blocks.forEach((b) => {
          const bb = b.y + 16;
          if (wx + 7 > b.x && wx - 7 < b.x + 16 && S.y - HEAD <= bb && prevHead > bb) {
            S.y = bb + HEAD; S.vy = 1.5; hitBlock(b);
          }
        });
      }

      // コイン
      L.coins.forEach((c) => {
        if (c.got) return;
        if (c.x + 6 > wx - 7 && c.x < wx + 7 && c.y + 8 > S.y - HEAD && c.y < S.y) {
          c.got = true; S.coins++; S.score += 200; SFX.coin();
          if (S.coins === AGE) { o.say(`コイン ${AGE}まい コンプリート!`); Wd.confetti(40); }
        }
      });

      // ほこり（敵）
      L.enemies.forEach((e) => {
        if (!e.alive) return;
        if (!e.active && e.x - S.camX < W + 20) e.active = true;
        if (!e.active) return;
        e.x += e.vx;
        L.pipes.forEach((p) => { if (e.x + 12 > p.x && e.x < p.x + 24) { e.vx = -e.vx; e.x += e.vx * 3; } });
        if (wx + 6 > e.x && wx - 6 < e.x + 12 && S.y > GY - 10 && S.y - HEAD < GY) {
          if (S.star > 0) kill(e, 'star');
          else if (S.vy > 0 && prevFeet <= GY - 6) { kill(e); S.vy = S.holding ? -6 : -4.5; S.shake = 4; }
          else if (S.inv <= 0) hurt();
        }
      });

      if (S.inv > 0) S.inv--;
      if (S.star > 0 && --S.star === 0) BGM.fast = false;
      if (S.coyote > 0) S.coyote--;
      if (S.buf > 0) S.buf--;
      if (++S.tAcc >= 24) { S.tAcc = 0; if (S.time > 0) S.time--; }
      S.hist.push(S.y); if (S.hist.length > 120) S.hist.shift();

      // ゴール。旗のどこにつかまったかでボーナス
      if (wx >= GOAL) {
        S.phase = 'slide'; S.star = 0; S.inv = 0; BGM.stop(); SFX.flag();
        const h = GY - S.y;
        const bonus = h > 60 ? 5000 : h > 35 ? 2000 : h > 12 ? 800 : 400;
        S.score += bonus; Wd.coin(MOMX + 6, S.y - 30, String(bonus));
      }
    }

    function stepGoal() {
      if (S.phase === 'slide') {
        if (S.y < GY) S.y = Math.min(GY, S.y + 1.6);
        if (S.flagY < GY - 18) S.flagY += 1.6;
        if (S.y >= GY && S.flagY >= GY - 18) { S.phase = 'walk'; S.t = 0; SFX.clear(); o.clear(true); }
      } else if (S.phase === 'walk') {
        if (S.momSX < CASTLE - S.camX + 24) S.momSX += 1;
        else { S.phase = 'tally'; S.t = 0; }
      } else if (S.phase === 'tally') {
        if (S.time > 0) {
          const k = Math.min(S.time, 3); S.time -= k; S.score += k * 50;
          if (S.t % 3 === 0) SFX.tick();
        } else if (S.tally < S.followers.length + 1) {
          if (S.t % 22 === 0) { S.tally++; Wd.burst(60 + Math.random() * 120, 40 + Math.random() * 60, 22); SFX.blow(); }
        } else if (S.t > 60 && S.phase !== 'done') {
          S.phase = 'done'; o.clear(false);
          o.onClear({ coins: S.coins, score: S.score, joined: S.followers.map((f) => f.key) });
        }
        if (S.time === 0 && S.tally === 0) S.t = S.t % 22;
      }
    }

    function stepFollowers() {
      S.followers.forEach((fw, i) => {
        const lead = S.phase === 'play' || S.phase === 'slide' ? MOMX : S.momSX;
        const tx = lead - 22 * (i + 1);
        if (!fw.landed) {
          fw.vy += 0.3; fw.y += fw.vy;
          if (S.phase === 'play') fw.x -= (S.star > 0 ? 2.3 : 1.7) * 0.5;
          if (fw.y >= GY && fw.vy > 0) { fw.y = GY; fw.landed = true; }
        } else {
          fw.x += (tx - fw.x) * 0.06;
          const h = S.phase === 'play' ? S.hist[S.hist.length - 1 - (i + 1) * 8] : GY;
          fw.y += ((h == null ? GY : h) - fw.y) * 0.5;
        }
      });
    }

    // ---------- 描画 ----------
    function coinSpr(x, y, f) {
      const w = [6, 4, 2, 4][f % 4];
      r(ctx, x + (6 - w) / 2, y, w, 8, '#f8b800');
      if (w > 2) r(ctx, x + (6 - w) / 2 + 1, y + 1, 1, 6, '#fff0a0');
    }
    function dust(e, f) {
      const x = Math.round(e.x - S.camX);
      if (!e.alive) {
        if (e.dead > 0) { r(ctx, x, GY - 3, 12, 3, '#8a8a8a'); r(ctx, x + 3, GY - 3, 2, 1, '#000'); r(ctx, x + 7, GY - 3, 2, 1, '#000'); }
        return;
      }
      const w = (f % 4) < 2;
      r(ctx, x + 1, GY - 10, 10, 8, '#8a8a8a');
      r(ctx, x, GY - 8, 12, 4, '#8a8a8a');
      [[0, 10], [3, 11], [7, 11], [10, 10], [11, 7], [-1, 6]].forEach(([a, b], k) => r(ctx, x + a, GY - b - ((f + k) % 2), 1, 1, '#b0b0b0'));
      r(ctx, x + 3, GY - 8, 2, 2, '#fff'); r(ctx, x + 7, GY - 8, 2, 2, '#fff');
      r(ctx, x + 3 + (e.vx < 0 ? 0 : 1), GY - 7, 1, 1, '#000'); r(ctx, x + 7 + (e.vx < 0 ? 0 : 1), GY - 7, 1, 1, '#000');
      r(ctx, x + (w ? 1 : 3), GY - 2, 3, 2, '#333'); r(ctx, x + (w ? 8 : 6), GY - 2, 3, 2, '#333');
    }
    function castle(x) {
      const y = GY - 56;
      r(ctx, x, y + 20, 56, 36, '#c84c0c');
      r(ctx, x + 10, y, 36, 20, '#c84c0c');
      ctx.fillStyle = '#000';
      for (let yy = y; yy < GY; yy += 6) {
        const x0 = yy < y + 20 ? x + 10 : x, w = yy < y + 20 ? 36 : 56;
        ctx.fillRect(x0, yy, w, 1);
        for (let xx = x0 + (((yy - y) / 6) % 2 ? 4 : 0); xx < x0 + w; xx += 8) ctx.fillRect(xx, yy, 1, 6);
      }
      for (let k = 0; k < 7; k++) r(ctx, x + k * 8 + 1, y + 16, 6, 4, '#c84c0c');
      for (let k = 0; k < 5; k++) r(ctx, x + 10 + k * 8, y - 4, 5, 4, '#c84c0c');
      r(ctx, x + 22, GY - 18, 12, 18, '#000'); r(ctx, x + 24, GY - 20, 8, 2, '#000');
      r(ctx, x + 16, y + 6, 4, 8, '#000'); r(ctx, x + 36, y + 6, 4, 8, '#000');
    }
    function flag(f) {
      const x = GOAL - S.camX;
      r(ctx, x - 4, GY - 8, 10, 8, '#8a6a30'); r(ctx, x - 4, GY - 8, 10, 1, '#c8a060');
      r(ctx, x, GY - 128, 2, 120, '#8ae08a');
      r(ctx, x - 1, GY - 133, 4, 4, '#00a800'); r(ctx, x, GY - 132, 1, 1, '#b0ffb0');
      const fy = S.flagY;
      for (let k = 0; k < 12; k++) r(ctx, x - 14 + k, fy + (k >> 1) * 0 + Math.floor(k / 2), 1, 12 - k, '#fff');
      r(ctx, x - 9, fy + 4, 2, 2, '#d82800'); r(ctx, x - 7, fy + 4, 2, 2, '#d82800'); r(ctx, x - 8, fy + 6, 2, 1, '#d82800');
    }
    function hud() {
      ctx.font = '8px "Press Start 2P"'; ctx.textAlign = 'left';
      const txt = (s, x, y, c = '#fff') => { ctx.fillStyle = '#000'; ctx.fillText(s, x + 1, y + 1); ctx.fillStyle = c; ctx.fillText(s, x, y); };
      txt('MAMA', 8, 14); txt(String(S.score).padStart(6, '0'), 8, 24);
      coinSpr(78, 16, 0); txt('COIN', 88, 14); txt(`${S.coins}/${AGE}`, 88, 24, S.coins === AGE ? '#f8b800' : '#fff');
      txt('TIME', 150, 14); txt(String(S.time).padStart(3, '0'), 158, 24);
    }
    function card(f) {
      r(ctx, 0, 0, W, Wd.H, '#000');
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff'; ctx.font = '10px "Press Start 2P"'; ctx.fillText('WORLD 9-25', 120, 96);
      figure(ctx, 96, 170, FAM.mom, 0);
      ctx.font = '10px "Press Start 2P"'; ctx.fillText(`× ${AGE}`, 142, 156);
      ctx.font = '11px "DotGothic16"'; ctx.fillStyle = '#f8b800';
      ctx.fillText(`コインを ${AGE}まい あつめよう`, 120, 214);
      ctx.fillStyle = '#fff'; ctx.fillText('？ブロックには かぞくが いるよ', 120, 232);
      if ((f >> 2) % 2 === 0) { ctx.fillStyle = '#fff'; ctx.fillText('タップで ジャンプ', 120, 270); }
      ctx.font = '9px "DotGothic16"'; ctx.fillStyle = '#888'; ctx.fillText('ながおしで たかく とぶ', 120, 286);
      ctx.textAlign = 'left';
    }

    function draw(f) {
      if (S.phase === 'card') { card(f); return; }
      ctx.save();
      if (S.shake) ctx.translate(((S.shake * 7) % 5) - 2, ((S.shake * 3) % 3) - 1);
      Wd.background(ctx, f, S.camX);
      castle(Math.round(CASTLE - S.camX));
      L.pipes.forEach((p) => { const x = p.x - S.camX; if (x > -30 && x < W + 10) Wd.pipe(ctx, Math.round(x), p.top); });
      L.blocks.forEach((b) => {
        const x = Math.round(b.x - S.camX); if (x < -20 || x > W + 4) return;
        Wd.qblock(ctx, x, b.y - (b.bump > 4 ? 8 - b.bump : b.bump > 0 ? b.bump : 0), f, b.used);
      });
      L.coins.forEach((c) => { if (!c.got) { const x = c.x - S.camX; if (x > -10 && x < W + 4) coinSpr(Math.round(x), Math.round(c.y), f); } });
      L.enemies.forEach((e) => dust(e, f));
      flag(f);
      S.items.forEach((it) => {
        const x = it.x - S.camX, y = it.y;
        const c = STAR_COLORS[(f + it.life) % STAR_COLORS.length];
        r(ctx, x + 3, y, 2, 2, c); r(ctx, x, y + 2, 8, 2, c); r(ctx, x + 1, y + 4, 6, 2, c); r(ctx, x + 1, y + 6, 2, 2, c); r(ctx, x + 5, y + 6, 2, 2, c);
      });
      // 家族は後ろから描く
      const running = S.phase === 'play' || S.phase === 'walk';
      [...S.followers].reverse().forEach((fw) => figure(ctx, Math.round(fw.x), Math.round(fw.y), fw.sp, f, { walking: fw.landed && running && Math.abs(fw.y - GY) < 1 }));
      // お母さん
      const mx = S.phase === 'play' ? MOMX : S.phase === 'slide' ? MOMX - 3 : Math.round(S.momSX);
      if (!(S.inv > 0 && (S.inv >> 2) % 2)) {
        let sp = FAM.mom;
        if (S.star > 0 && (S.star > 90 || (f % 2))) sp = { ...sp, top: STAR_COLORS[f % STAR_COLORS.length], pants: STAR_COLORS[(f + 2) % STAR_COLORS.length] };
        const walking = (S.phase === 'play' && S.ground) || (S.phase === 'walk' && S.momSX < CASTLE - S.camX + 24);
        figure(ctx, mx, Math.round(S.y), sp, f, { walking });
        if (S.star > 0 && f % 2) Wd.burst(mx + (Math.random() * 16 - 8), S.y - Math.random() * 40, 1);
      }
      ctx.restore();
      hud();
      if (S.phase === 'play' && S.t < 200 && (f >> 2) % 2 === 0) {
        ctx.textAlign = 'center'; ctx.font = '11px "DotGothic16"';
        ctx.fillStyle = '#000'; ctx.fillText('タップで ジャンプ!', 121, 61); ctx.fillStyle = '#fff'; ctx.fillText('タップで ジャンプ!', 120, 60);
        ctx.textAlign = 'left';
      }
    }

    return { start, step, draw, press, release };
  };
})();
