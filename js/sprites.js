// 家族のドット絵。1px = 4cm で身長差を出す。
// 手で打ったビットマップではなく、身長・体格・髪型・持ち物から組み立てる。
(function () {
  const SKIN = '#f8c090', SKIN2 = '#d08850', DARK = '#1a1a1a';
  const DOG = '#141414', DOG2 = '#2c2c2c';

  function r(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w | 0, h | 0); }

  function line(ctx, x0, y0, x1, y1, c, thick) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      r(ctx, x0, y0, 1, 1, c);
      if (thick) r(ctx, x0 + 1, y0, 1, 1, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  function circle(ctx, cx, cy, rad, c) {
    let x = rad, y = 0, e = 1 - rad;
    while (x >= y) {
      [[x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y]]
        .forEach(([a, b]) => r(ctx, cx + a, cy + b, 1, 1, c));
      y++;
      if (e < 0) e += 2 * y + 1; else { x--; e += 2 * (y - x) + 1; }
    }
  }

  // ---------- 髪 ----------
  function hair(ctx, sp, g) {
    const { hx, headW, headH, headTop, cx } = g;
    const c = sp.hairColor;
    switch (sp.hair) {
      case 'short':
        r(ctx, hx, headTop, headW, 3, c);
        r(ctx, hx, headTop + 3, 1, 2, c);
        r(ctx, hx + headW - 1, headTop + 3, 1, 2, c);
        break;
      case 'centerPart': // 長めのセンター分け
        r(ctx, hx - 1, headTop - 2, headW + 2, 5, c);
        r(ctx, cx, headTop - 2, 1, 3, SKIN2);              // 分け目
        r(ctx, hx - 1, headTop + 3, 1, 5, c);
        r(ctx, hx + headW, headTop + 3, 1, 5, c);
        break;
      case 'bobLong': // ボブより少し長い
        r(ctx, hx - 1, headTop - 1, headW + 2, 4, c);
        r(ctx, hx - 1, headTop + 3, 1, headH + 1, c);
        r(ctx, hx + headW, headTop + 3, 1, headH + 1, c);
        r(ctx, hx, headTop + headH, 1, 1, c);
        r(ctx, hx + headW - 1, headTop + headH, 1, 1, c);
        break;
      case 'long': // ロング
        r(ctx, hx - 1, headTop - 1, headW + 2, 4, c);
        r(ctx, hx - 2, headTop + 3, 2, headH + 10, c);
        r(ctx, hx + headW, headTop + 3, 2, headH + 10, c);
        break;
      case 'helmet': { // マウンテンバイク用ヘルメット
        const hc = sp.helmetColor || '#d82800';
        r(ctx, hx - 1, headTop - 2, headW + 2, 5, hc);
        r(ctx, hx, headTop - 3, headW, 1, hc);
        r(ctx, hx - 1, headTop, headW + 2, 1, '#fff');   // ストライプ
        r(ctx, hx + 2, headTop - 2, 1, 1, DARK);          // 通気口
        r(ctx, cx, headTop - 3, 1, 1, DARK);
        r(ctx, hx + headW - 3, headTop - 2, 1, 1, DARK);
        r(ctx, hx - 1, headTop + 3, 1, headH - 5, DARK);  // あごひも
        r(ctx, hx + headW, headTop + 3, 1, headH - 5, DARK);
        // ヘルメットの下から白髪まじりの短髪がのぞく
        r(ctx, hx, headTop + 3, 2, 2, c); r(ctx, hx + headW - 2, headTop + 3, 2, 2, c);
        r(ctx, hx + 1, headTop + 3, 1, 1, '#c8c8c8'); r(ctx, hx + headW - 2, headTop + 4, 1, 1, '#c8c8c8');
        break;
      }
    }
    if (sp.gray) { // 白髪を混ぜる
      for (let y = headTop - 3; y < headTop + 5; y++)
        for (let x = hx - 1; x < hx + headW + 1; x++)
          if (((x * 7 + y * 3) % 5) === 0 && sp.hair !== 'helmet') r(ctx, x, y, 1, 1, '#c8c8c8');
    }
  }

  // ---------- 持ち物 ----------
  function laptop(ctx, sp, g, f) {
    const { cx, torsoTop, tx, torsoW } = g;
    const y = torsoTop + 3;
    r(ctx, tx - 2, torsoTop + 1, 2, 3, sp.top); r(ctx, tx + torsoW, torsoTop + 1, 2, 3, sp.top);
    r(ctx, cx - 5, y, 10, 5, '#3a3a3a');
    r(ctx, cx - 4, y + 1, 8, 3, (f % 16) < 12 ? '#4090f0' : '#80d0ff');
    if ((f % 16) < 12) { r(ctx, cx - 3, y + 2, 3, 1, '#20ff60'); r(ctx, cx + 1, y + 2, 2, 1, '#fff'); }
    r(ctx, cx - 5, y + 5, 10, 2, '#666');
    r(ctx, cx - 7, y + 4, 2, 2, SKIN); r(ctx, cx + 5, y + 4, 2, 2, SKIN);
  }

  function broom(ctx, sp, g, f) {
    const { tx, torsoW, torsoTop, y0 } = g;
    const lean = (f % 12) < 6 ? 0 : 2;
    const sx = tx + torsoW + 2, sy = torsoTop + 3;
    const ex = sx + 4 + lean, ey = y0 - 3;
    r(ctx, tx + torsoW, torsoTop + 1, 2, 5, sp.top);
    line(ctx, sx, sy, ex, ey, '#c28a3a');
    r(ctx, ex - 3, ey, 7, 3, '#f8d878');
    r(ctx, ex - 3, ey + 2, 7, 1, '#c8a040');
    r(ctx, sx - 1, sy + 3, 2, 2, SKIN);
    if (lean) { r(ctx, ex + 6, y0 - 2, 1, 1, '#ddd'); r(ctx, ex + 8, y0 - 1, 1, 1, '#ddd'); r(ctx, ex + 7, y0 - 4, 1, 1, '#eee'); }
  }

  function skis(ctx, sp, g, f) {
    const { tx, torsoW, torsoTop, headTop, y0 } = g;
    const x = tx + torsoW + 4, top = headTop - 6;
    [0, 3].forEach((o) => {
      r(ctx, x + o, top, 2, y0 - top, '#f4f4f4');
      r(ctx, x + o + 1, top - 1, 1, 1, '#f4f4f4');
      r(ctx, x + o, top + 6, 2, 3, '#d82800');
      r(ctx, x + o, top + 12, 2, 1, '#d82800');
      r(ctx, x + o, torsoTop + g.torsoH + 2, 2, 2, '#333');
    });
    r(ctx, tx + torsoW, torsoTop + 1, 2, 4, sp.top);
    r(ctx, x - 1, torsoTop + 4, 3, 2, SKIN);
  }

  function dog(ctx, sp, g, f) {
    const { tx, torsoW, torsoTop, y0 } = g;
    const hx = tx + torsoW + 6, hy = y0 - 18;
    // 体
    r(ctx, hx + 4, y0 - 14, 16, 8, DOG);
    r(ctx, hx + 5, y0 - 8, 14, 1, DOG2);
    // 脚
    [5, 9, 14, 18].forEach((o) => r(ctx, hx + o, y0 - 6, 2, 6, DOG));
    // しっぽ（ふりふり）
    if ((f % 8) < 4) r(ctx, hx + 20, y0 - 17, 2, 4, DOG); else r(ctx, hx + 20, y0 - 14, 4, 2, DOG);
    // 頭
    r(ctx, hx, hy, 8, 8, DOG);
    r(ctx, hx - 3, hy + 3, 4, 4, DOG);            // 鼻先
    r(ctx, hx - 3, hy + 3, 1, 1, '#000');
    r(ctx, hx + 6, hy + 1, 2, 5, '#000');         // 垂れ耳
    r(ctx, hx + 2, hy + 2, 1, 1, '#fff'); r(ctx, hx + 2, hy + 2, 1, 1, '#fff');
    r(ctx, hx + 2, hy + 2, 1, 1, '#fff');
    r(ctx, hx + 4, hy + 7, 4, 1, '#d82800');      // 首輪
    if ((f % 16) < 3) r(ctx, hx - 1, hy + 6, 2, 1, '#f06080'); // 舌
    // 妹の手（なでなで）
    const pet = (f % 8) < 4 ? 0 : 1;
    r(ctx, tx + torsoW, torsoTop + 1, 2, 3, sp.top);
    r(ctx, tx + torsoW + 1, torsoTop + 3, 4, 2, SKIN);
    r(ctx, hx + 1, hy - 2 + pet, 4, 2, SKIN);
  }

  function bike(ctx, sp, g, f) {
    const { tx, torsoTop, y0 } = g;
    const by = y0 - 7, bx = tx - 25, fx = tx - 9, mx = (bx + fx) / 2 | 0;
    const seatX = bx + 5, seatY = y0 - 20, headX = fx - 2, headY = y0 - 21;
    // フレーム（赤いMTB）
    line(ctx, bx, by, mx, y0 - 5, '#d82800', true);
    line(ctx, mx, y0 - 5, seatX, seatY, '#d82800', true);
    line(ctx, bx, by, seatX, seatY, '#d82800');
    line(ctx, seatX, seatY, headX, headY, '#d82800', true);
    line(ctx, mx, y0 - 5, headX, headY, '#d82800');
    line(ctx, headX, headY, fx, by, '#d82800', true);
    r(ctx, seatX - 2, seatY - 2, 6, 2, '#111');          // サドル
    r(ctx, headX - 3, headY - 2, 6, 1, '#111');          // ハンドル
    r(ctx, headX, headY - 1, 1, 1, '#111');
    // 車輪
    [bx, fx].forEach((wx) => {
      circle(ctx, wx, by, 6, '#000'); circle(ctx, wx, by, 5, '#000');
      circle(ctx, wx, by, 4, '#c8c8c8');
      const a = f * 0.55;
      for (let k = 0; k < 3; k++) {
        const t = a + k * Math.PI / 3;
        line(ctx, wx - Math.cos(t) * 4, by - Math.sin(t) * 4, wx + Math.cos(t) * 4, by + Math.sin(t) * 4, '#909090');
      }
      r(ctx, wx - 1, by - 1, 2, 2, '#eee');
    });
    circle(ctx, mx, y0 - 5, 2, '#333');
    r(ctx, mx - 3 + ((f % 4) < 2 ? 0 : 3), y0 - 5, 2, 1, '#111');  // ペダル
    // お父さんの左腕をハンドルへ
    r(ctx, tx - 2, torsoTop + 1, 2, 4, sp.top);
    line(ctx, tx - 2, torsoTop + 5, headX - 1, headY - 2, SKIN, true);
    r(ctx, headX - 2, headY - 3, 2, 2, SKIN);
  }

  // ---------- 人 ----------
  // cx: 中心x, gy: 足元y, f: フレーム, opt.walking で歩き
  function figure(ctx, cx, gy, sp, f, opt = {}) {
    const H = Math.round(sp.cm / 4);
    const headH = Math.round(H * 0.30);
    const build = sp.build || 0;
    const headW = headH + (build >= 2 ? 1 : 0);
    const torsoH = Math.round(H * 0.32);
    const torsoW = 9 + build * 2 + (sp.baggy ? 2 : 0);
    const legH = H - headH - torsoH - 1;
    const bob = opt.walking ? ((f % 2) ? -1 : 0) : (((f + (sp.phase || 0)) % 16) < 8 ? 0 : -1);
    const y0 = gy + bob;
    const legTop = y0 - legH;
    const torsoTop = legTop - torsoH;
    const neckY = torsoTop - 1;
    const headTop = neckY - headH;
    const hx = cx - (headW >> 1), tx = cx - (torsoW >> 1);
    const g = { cx, y0, headH, headW, torsoH, torsoW, legTop, torsoTop, headTop, hx, tx };

    // 後ろにある持ち物
    if (sp.prop === 'bike') bike(ctx, sp, g, f);
    if (sp.prop === 'skis') skis(ctx, sp, g, f);
    if (sp.hair === 'long') hair(ctx, sp, g); // ロングは体の後ろに垂れる

    // 脚
    const lw = Math.max(2, Math.round(torsoW / 3)) + (sp.baggy ? 1 : 0);
    const stride = opt.walking ? ((f % 2) ? 1 : -1) : 0;
    const lx = tx + 1 + stride, rx = tx + torsoW - 1 - lw - stride;
    r(ctx, lx, legTop, lw, legH, sp.pants);
    r(ctx, rx, legTop, lw, legH, sp.pants);
    r(ctx, lx - 1, y0 - 2, lw + 1, 2, sp.shoes);
    r(ctx, rx, y0 - 2, lw + 1, 2, sp.shoes);

    // 胴
    r(ctx, tx, torsoTop, torsoW, torsoH, sp.top);
    if (sp.apron) { r(ctx, cx - 2, torsoTop + 3, 5, torsoH - 3, '#fff'); r(ctx, cx - 3, torsoTop + 3, 7, 1, '#fff'); }
    if (sp.baggy) { r(ctx, tx, torsoTop + torsoH - 2, torsoW, 1, sp.top2 || '#0060a0'); r(ctx, tx + 2, torsoTop + 2, 1, torsoH - 4, sp.top2 || '#0060a0'); }
    // 腕（持ち物側は各関数で描く）
    const armL = torsoH - 4;
    const noL = sp.prop === 'bike' || sp.prop === 'laptop';
    const noR = sp.prop === 'broom' || sp.prop === 'skis' || sp.prop === 'dog' || sp.prop === 'laptop';
    if (!noL) { r(ctx, tx - 2, torsoTop + 1, 2, armL, sp.top); r(ctx, tx - 2, torsoTop + 1 + armL, 2, 2, SKIN); }
    if (!noR) { r(ctx, tx + torsoW, torsoTop + 1, 2, armL, sp.top); r(ctx, tx + torsoW, torsoTop + 1 + armL, 2, 2, SKIN); }

    // 首と頭
    r(ctx, cx - 1, neckY, 2, 1, SKIN);
    r(ctx, hx, headTop, headW, headH, SKIN);
    const ey = headTop + Math.round(headH * 0.5);
    r(ctx, hx + 2, ey, 2, 2, DARK); r(ctx, hx + headW - 4, ey, 2, 2, DARK);
    if ((f + (sp.phase || 0)) % 48 === 0) { r(ctx, hx + 2, ey, 1, 2, SKIN); r(ctx, hx + headW - 3, ey, 1, 2, SKIN); r(ctx, hx + 2, ey + 1, 1, 1, DARK); r(ctx, hx + headW - 3, ey + 1, 1, 1, DARK); } // まばたき
    r(ctx, cx - 1, ey + 4, 3, 1, SKIN2);
    if (sp.hair !== 'long') hair(ctx, sp, g); else { r(ctx, hx - 1, headTop - 1, headW + 2, 4, sp.hairColor); }

    // 前にある持ち物
    if (sp.prop === 'laptop') laptop(ctx, sp, g, f);
    if (sp.prop === 'broom') broom(ctx, sp, g, f);
    if (sp.prop === 'dog') dog(ctx, sp, g, f);
    return g;
  }

  window.SPR = { r, line, circle, figure, SKIN };
})();
