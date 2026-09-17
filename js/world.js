// 背景、家族の定義、ケーキ、パーティクル
(function () {
  const { r, circle } = SPR;
  const W = 240, H = 320, GY = 250;

  // ---------- 家族 ----------
  // 並び順は左から。お母さんが真ん中。
  const FAMILY = [
    { key: 'dad', name: 'おとうさん', cm: 185, build: 2, hair: 'helmet', hairColor: '#2a2a2a', gray: true,
      top: '#8c8c8c', pants: '#1a1a1a', shoes: '#000', prop: 'bike', slot: 44, phase: 0 },
    { key: 'bro', name: 'おにいちゃん', cm: 180, build: 1, hair: 'short', hairColor: '#111',
      top: '#262626', pants: '#141414', shoes: '#000', prop: 'laptop', slot: 82, phase: 5 },
    { key: 'mom', name: 'おかあさん', cm: 170, build: 0, hair: 'bobLong', hairColor: '#111',
      top: '#262626', pants: '#141414', shoes: '#000', prop: 'broom', slot: 120, phase: 9 },
    { key: 'boy', name: 'おとうと', cm: 179, build: 0, baggy: 2, hair: 'centerPart', hairColor: '#111',
      top: '#5a3ad0', top2: '#3a2090', pants: '#1a1a1a', shoes: '#000', prop: 'skis', slot: 160, phase: 3 },
    { key: 'sis', name: 'いもうと', cm: 160, build: 0, baggy: 1, hair: 'long', hairColor: '#8a4a1a',
      top: '#222', top2: '#111', pants: '#4a70b8', shoes: '#000', prop: 'dog', slot: 194, phase: 12 },
  ];

  // ---------- 背景 ----------
  let cloudX = 0;
  function cloud(ctx, x, y) {
    r(ctx, x + 4, y, 8, 3, '#fff'); r(ctx, x + 2, y + 3, 12, 3, '#fff'); r(ctx, x, y + 6, 16, 3, '#fff');
    r(ctx, x + 6, y - 2, 4, 2, '#fff');
  }
  function hill(ctx, x, y, w, h) {
    r(ctx, x, y, w, h, '#00a800');
    r(ctx, x + 2, y - 3, w - 4, 3, '#00a800');
    r(ctx, x + 4, y - 5, w - 8, 2, '#00a800');
    r(ctx, x + 3, y + 3, 1, 1, '#005000'); r(ctx, x + w - 5, y + 5, 1, 1, '#005000');
  }
  function bush(ctx, x, y) {
    r(ctx, x, y, 14, 4, '#00a800'); r(ctx, x + 3, y - 3, 8, 3, '#00a800'); r(ctx, x + 5, y - 5, 4, 2, '#00a800');
    r(ctx, x + 2, y + 1, 1, 1, '#005000'); r(ctx, x + 10, y, 1, 1, '#005000');
  }
  function bricks(ctx) {
    r(ctx, 0, GY, W, H - GY, '#c84c0c');
    ctx.fillStyle = '#000';
    for (let y = GY; y < H; y += 8) {
      ctx.fillRect(0, y, W, 1);
      const off = ((y - GY) / 8) % 2 ? 8 : 0;
      for (let x = off; x < W; x += 16) ctx.fillRect(x, y, 1, 8);
    }
    r(ctx, 0, GY, W, 1, '#f8b878'); // 上面のハイライト
  }
  function pipe(ctx, x, top) {
    r(ctx, x, top, 24, 4, '#00a800'); r(ctx, x + 2, top + 4, 20, GY - top - 4, '#00a800');
    r(ctx, x + 2, top, 2, 4, '#80f880'); r(ctx, x + 4, top + 4, 2, GY - top - 4, '#80f880');
    r(ctx, x + 20, top, 2, 4, '#005000'); r(ctx, x + 19, top + 4, 2, GY - top - 4, '#005000');
  }
  function qblock(ctx, x, y, f, hit) {
    const c = hit ? '#8a6a30' : (((f >> 3) & 1) ? '#f8b800' : '#f8d060');
    r(ctx, x, y, 16, 16, c);
    r(ctx, x, y, 16, 1, '#f8e8a0'); r(ctx, x, y, 1, 16, '#f8e8a0');
    r(ctx, x + 15, y, 1, 16, '#7a4800'); r(ctx, x, y + 15, 16, 1, '#7a4800');
    if (!hit) {
      ctx.fillStyle = '#7a4800';
      [[6,3],[7,3],[8,3],[5,4],[9,4],[9,5],[8,6],[7,7],[7,8],[7,10],[7,11]].forEach(([a,b]) => ctx.fillRect(x + a, y + b, 1, 1));
    }
    [[1,1],[14,1],[1,14],[14,14]].forEach(([a,b]) => r(ctx, x + a, y + b, 1, 1, '#7a4800'));
  }

  function background(ctx, f, scroll = 0) {
    r(ctx, 0, 0, W, H, '#5c94fc');
    cloudX = (f * 0.15) % 320;
    [[20, 40], [150, 70], [90, 110], [230, 30]].forEach(([x, y]) => cloud(ctx, ((x - cloudX) % 320 + 320) % 320 - 40, y));
    hill(ctx, ((-10 - scroll * 0.3) % 300 + 300) % 300 - 30, GY - 10, 60, 10);
    hill(ctx, ((190 - scroll * 0.3) % 300 + 300) % 300 - 30, GY - 8, 40, 8);
    bush(ctx, ((30 - scroll * 0.6) % 300 + 300) % 300 - 30, GY - 4);
    bush(ctx, ((170 - scroll * 0.6) % 300 + 300) % 300 - 30, GY - 4);
    bricks(ctx);
  }

  // ---------- ケーキ ----------
  const CANDLES = 25;
  function cakeLayout() {
    const rows = [[8, 90], [8, 120], [9, 150]]; // [本数, 段の上面y]
    const out = [];
    rows.forEach(([n, y], i) => {
      const w = [92, 116, 140][i], x0 = 120 - w / 2;
      for (let k = 0; k < n; k++) out.push({ x: Math.round(x0 + (k + 0.5) * (w / n)) - 1, y, row: i });
    });
    return out;
  }
  function cake(ctx, f, candles) {
    const tiers = [[140, 150, 24], [116, 120, 24], [92, 90, 24]]; // [幅, y, 高さ]
    tiers.forEach(([w, y, h], i) => {
      const x = 120 - w / 2;
      r(ctx, x, y, w, h, i % 2 ? '#f8f0e0' : '#f0a0c0');
      r(ctx, x, y, w, 4, '#fff');
      for (let k = 0; k < w; k += 8) r(ctx, x + k + 2, y + 4, 4, 2, '#fff'); // フロスティング
      r(ctx, x, y + h - 2, w, 2, i % 2 ? '#d8c8a8' : '#c07090');
      for (let k = 6; k < w - 4; k += 12) r(ctx, x + k, y + 12, 2, 2, '#d82800'); // いちご
    });
    r(ctx, 40, 174, 160, 4, '#e8e8e8'); r(ctx, 36, 178, 168, 3, '#c8c8c8'); // お皿
    candles.forEach((c, i) => {
      r(ctx, c.x, c.y - 8, 2, 8, ['#f8f8f8', '#f8b8d8', '#b8d8f8'][i % 3]);
      r(ctx, c.x, c.y - 6, 2, 1, '#d82800');
      if (c.lit) {
        const fl = (f + i) % 4;
        r(ctx, c.x, c.y - 11 - (fl >> 1), 2, 3 + (fl >> 1), fl % 2 ? '#f8b800' : '#f87800');
        r(ctx, c.x, c.y - 10, 2, 1, '#fff8c0');
      } else if (c.smoke > 0) {
        const s = 12 - c.smoke;
        r(ctx, c.x + (s % 3) - 1, c.y - 12 - s, 1, 1, '#ddd');
        r(ctx, c.x + 1, c.y - 14 - s, 1, 1, '#eee');
      }
    });
  }

  // ---------- パーティクル ----------
  const P = [];
  const NES = ['#d82800', '#f8b800', '#00a800', '#5c94fc', '#f878f8', '#fff', '#f87800'];
  function confetti(n = 60) {
    for (let i = 0; i < n; i++) P.push({ t: 'c', x: Math.random() * W, y: -10 - Math.random() * 60, vy: 0.6 + Math.random(), sw: Math.random() * 6.28, c: NES[i % NES.length], life: 200 });
  }
  function burst(x, y, n = 18) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28, s = 1.2 + Math.random();
      P.push({ t: 'f', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, c: NES[(Math.random() * NES.length) | 0], life: 26 });
    }
  }
  function coin(x, y, text) { P.push({ t: 'coin', x, y, vy: -2.2, life: 22, text }); }
  function stepParticles() {
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.life--;
      if (p.t === 'c') { p.y += p.vy; p.sw += 0.2; p.x += Math.sin(p.sw) * 0.6; if (p.y > H) p.life = 0; }
      if (p.t === 'f') { p.x += p.vx; p.y += p.vy; p.vy += 0.06; }
      if (p.t === 'coin') { p.y += p.vy; p.vy += 0.1; }
      if (p.life <= 0) P.splice(i, 1);
    }
  }
  function drawParticles(ctx) {
    P.forEach((p) => {
      if (p.t === 'c') r(ctx, p.x, p.y, 2, 3, p.c);
      if (p.t === 'f') r(ctx, p.x, p.y, p.life > 10 ? 2 : 1, p.life > 10 ? 2 : 1, p.c);
      if (p.t === 'coin') {
        if (p.text) { ctx.fillStyle = '#f8b800'; ctx.font = '8px "Press Start 2P"'; ctx.fillText(p.text, p.x, p.y); }
        else { r(ctx, p.x, p.y, 4, 6, '#f8b800'); r(ctx, p.x + 1, p.y + 1, 2, 4, '#f8e080'); }
      }
    });
  }

  window.WORLD = { W, H, GY, FAMILY, background, cake, cakeLayout, CANDLES, qblock, pipe, confetti, burst, coin, stepParticles, drawParticles, particles: P };
})();
