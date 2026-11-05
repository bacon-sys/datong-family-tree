/* ===== 族譜核心邏輯（純函式，可單獨測試） ===== */
const FT = (() => {
  const TERM_DEFS = [
    // key, 中文說明, 預設族語（賽考利克泰雅語）
    ['father', '爸爸', "yaba'"],
    ['mother', '媽媽', "yaya'"],
    ['grandfather', '爺爺／外公', 'yutas'],
    ['grandmother', '奶奶／外婆', 'yaki'],
    ['ancestorM', '曾祖父以上（男）', 'yutas'],
    ['ancestorF', '曾祖母以上（女）', 'yaki'],
    ['uncle', '伯伯／叔叔／舅舅', 'mama'],
    ['aunt', '姑姑／阿姨', 'yata'],
    ['olderBrother', '哥哥', 'qbsuyan mlikuy'],
    ['olderSister', '姊姊', 'qbsuyan kneril'],
    ['youngerSibling', '弟弟／妹妹', "sswe'"],
    ['child', '兒子／女兒', "laqi'"],
    ['grandchild', '孫子女', ''],
    ['spouse', '配偶', ''],
    ['uncleInLaw', '伯母／嬸嬸／舅媽／姑丈／姨丈', ''],
    ['cousin', '堂表兄弟姊妹', ''],
    ['nibling', '姪子女／外甥', ''],
    ['grandSibling', '叔公／姑婆／舅公／姨婆', ''],
  ];
  const DEFAULT_TERMS = Object.fromEntries(TERM_DEFS.map(d => [d[0], d[2]]));
  // 族籍選項：原住民族 16 族（依原民會公告）＋其他
  const TRIBES = ['泰雅族', '太魯閣族', '賽德克族', '賽夏族', '噶瑪蘭族', '阿美族', '布農族', '排灣族', '魯凱族', '卑南族',
    '鄒族', '邵族', '雅美族（達悟族）', '撒奇萊雅族', '拉阿魯哇族', '卡那卡那富族', '漢族', '新住民'];
  // 傳統上採「子連父名」的族
  const PATRONYMIC = ['泰雅族', '太魯閣族', '賽德克族', '賽夏族', '噶瑪蘭族'];
  function tribeShort(t) {
    if (!t) return '';
    if (t.startsWith('雅美族')) return '達悟';
    return t.replace(/族$/, '');
  }

  let _seq = 0;
  function newId() {
    _seq++;
    return 'p' + Date.now().toString(36) + _seq.toString(36) + Math.random().toString(36).slice(2, 5);
  }

  function makePerson(o = {}) {
    return {
      id: o.id || newId(),
      given: o.given || '',        // 族名（個人名）
      han: o.han || '',            // 漢名
      gender: o.gender || '',      // 'M' | 'F' | ''
      bo: o.bo == null ? null : o.bo, // 排行（家中第幾個孩子）
      fullOverride: o.fullOverride || '', // 手動輸入的完整族名
      fatherId: o.fatherId || null,
      motherId: o.motherId || null,
      spouses: o.spouses ? o.spouses.slice() : [],
      divorced: o.divorced ? o.divorced.slice() : [], // 已離婚的配偶（雙方都記）
      adoptF: !!o.adoptF,          // 和爸爸是收養關係
      adoptM: !!o.adoptM,          // 和媽媽是收養關係
      tribe: o.tribe || '',        // 族籍
      deceased: !!o.deceased,      // 已過世
      photo: safePhoto(o.photo),   // 相片（縮好的小圖，data URL）
    };
  }
  // 只接受圖片的 data URL（避免匯入的檔案夾帶其他東西），太大的不收
  const PHOTO_MAX = 300000;
  function safePhoto(v) {
    return typeof v === 'string' && v.length < PHOTO_MAX && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v) ? v : '';
  }
  // 拿掉相片（老師的全班清單存在裝置上時用）
  function stripPhotos(data) {
    const out = Object.assign({}, data, { people: {} });
    for (const id in data.people) out.people[id] = Object.assign({}, data.people[id], { photo: '' });
    return out;
  }

  function newTree(me) {
    const p = makePerson(me);
    return {
      app: 'datong-family-tree', version: 1,
      student: { cls: '', seat: '' },
      meId: p.id,
      people: { [p.id]: p },
      terms: {},
    };
  }

  /* ---------- 子連父名 ---------- */
  function tribalName(p, people) {
    if (!p) return '';
    if (p.fullOverride && p.fullOverride.trim()) return p.fullOverride.trim();
    const g = (p.given || '').trim();
    if (!g) return '';
    const f = p.fatherId ? people[p.fatherId] : null;
    const fg = f && (f.given || '').trim();
    return fg ? g + ' ' + fg : g;
  }

  /* ---------- 關係查詢 ---------- */
  function childrenOf(id, people) {
    return Object.values(people).filter(p => p.fatherId === id || p.motherId === id);
  }
  function parentsOf(p) { return [p.fatherId, p.motherId].filter(Boolean); }
  function neighbors(id, people) {
    const p = people[id]; const out = [];
    if (!p) return out;
    parentsOf(p).forEach(x => people[x] && out.push([x, 'P']));
    childrenOf(id, people).forEach(c => out.push([c.id, 'C']));
    p.spouses.forEach(s => people[s] && out.push([s, 'S']));
    return out;
  }
  function siblingsOf(id, people) {
    const p = people[id]; if (!p) return [];
    const par = parentsOf(p);
    if (!par.length) return [];
    return Object.values(people).filter(q => q.id !== id &&
      ((p.fatherId && q.fatherId === p.fatherId) || (p.motherId && q.motherId === p.motherId)));
  }

  /* ---------- 稱謂推算 ---------- */
  // 以「我」為起點找最短路徑（血緣優先：配偶邊權重較高）
  function paths(meId, people) {
    const dist = { [meId]: 0 }, prev = {}, done = new Set();
    const W = { P: 1, C: 1, S: 1.6 };
    while (true) {
      let u = null, best = Infinity;
      for (const k in dist) if (!done.has(k) && dist[k] < best) { best = dist[k]; u = k; }
      if (u == null) break;
      done.add(u);
      for (const [v, t] of neighbors(u, people)) {
        const nd = dist[u] + W[t];
        if (dist[v] == null || nd < dist[v] - 1e-9) { dist[v] = nd; prev[v] = [u, t]; }
      }
    }
    const res = {};
    for (const id in dist) {
      const chain = [id]; let steps = '';
      let cur = id;
      while (prev[cur]) { steps = prev[cur][1] + steps; cur = prev[cur][0]; chain.unshift(cur); }
      res[id] = { steps, chain };
    }
    return res;
  }

  function cmpBo(a, b) { // a 是否比 b 年長：true / false / null（不知道）
    if (a == null || b == null || a.bo == null || b.bo == null || a.bo === b.bo) return null;
    return a.bo < b.bo;
  }

  function kinOf(steps, chain, people, terms) {
    const T = k => ((terms && terms[k] != null && terms[k] !== '') ? terms[k] : (terms && k in terms ? '' : DEFAULT_TERMS[k])) || '';
    const P = i => people[chain[i]];
    const me = P(0), x = P(chain.length - 1);
    const g = x ? x.gender : '';
    const pick = (m, f, u) => g === 'M' ? m : g === 'F' ? f : u;
    const r = (zh, key) => ({ zh, term: key ? T(key) : '', key: key || '' });

    if (steps === '') return r('我');
    if (steps === 'P') {
      const adopted = (me.fatherId === x.id && me.adoptF) || (me.motherId === x.id && me.adoptM);
      return r(adopted ? pick('養父', '養母', '養父母') : pick('爸爸', '媽媽', '父母'), g === 'F' ? 'mother' : g === 'M' ? 'father' : '');
    }
    if (/^P+$/.test(steps)) {
      const n = steps.length;
      const maternal = P(1) && P(1).gender === 'F';
      const key = n === 2 ? pick('grandfather', 'grandmother', '') : pick('ancestorM', 'ancestorF', '');
      if (n === 2) return r(maternal ? pick('外公', '外婆', '外祖父母') : pick('爺爺', '奶奶', '祖父母'), key);
      if (n === 3) return r((maternal ? '外' : '') + pick('曾祖父', '曾祖母', '曾祖父母'), key);
      if (n === 4) return r((maternal ? '外' : '') + pick('高祖父', '高祖母', '高祖父母'), key);
      return r('祖先（往上第 ' + n + ' 代）', key);
    }
    if (steps === 'PC') {
      const older = cmpBo(x, me);
      if (older === true) return r(pick('哥哥', '姊姊', '兄姊'), pick('olderBrother', 'olderSister', ''));
      if (older === false) return r(pick('弟弟', '妹妹', '弟妹'), 'youngerSibling');
      return r(pick('兄弟', '姊妹', '手足'), '');
    }
    if (steps === 'PS') return r(pick('繼父', '繼母', '繼父母'));
    if (steps === 'PPC') {
      const par = P(1), paternal = par && par.gender === 'M';
      if (paternal) {
        if (g === 'F') return r('姑姑', 'aunt');
        const o = cmpBo(x, par);
        return r(o === true ? '伯伯' : o === false ? '叔叔' : '伯伯／叔叔', g === 'M' ? 'uncle' : '');
      }
      return r(pick('舅舅', '阿姨', '舅舅／阿姨'), pick('uncle', 'aunt', ''));
    }
    if (steps === 'PPCS') {
      const par = P(1), blood = P(3), paternal = par && par.gender === 'M';
      let zh;
      if (paternal) {
        if (blood && blood.gender === 'F') zh = '姑丈';
        else { const o = cmpBo(blood, par); zh = o === true ? '伯母' : o === false ? '嬸嬸' : '伯母／嬸嬸'; }
      } else zh = blood && blood.gender === 'F' ? '姨丈' : '舅媽';
      return r(zh, 'uncleInLaw');
    }
    if (steps === 'PPCC') {
      const par = P(1), mid = P(3);
      const tang = par && par.gender === 'M' && mid && mid.gender === 'M';
      return r((tang ? '堂' : '表') + pick('兄弟', '姊妹', '兄弟姊妹'), 'cousin');
    }
    if (steps === 'PPPC') {
      const gp = P(2);
      let zh;
      if (gp && gp.gender === 'F') zh = pick('舅公', '姨婆', '舅公／姨婆');
      else zh = pick('伯公／叔公', '姑婆', '伯叔公／姑婆');
      return r(zh, 'grandSibling');
    }
    if (steps === 'C') {
      const adopted = (x.fatherId === me.id && x.adoptF) || (x.motherId === me.id && x.adoptM);
      return r(adopted ? pick('養子', '養女', '養子女') : pick('兒子', '女兒', '孩子'), 'child');
    }
    if (steps === 'CC') {
      const mid = P(1), outer = mid && mid.gender === 'F';
      return r((outer ? '外' : '') + pick('孫子', '孫女', '孫子女'), 'grandchild');
    }
    if (steps === 'S') return (me.divorced || []).includes(x.id) ? r(pick('前夫', '前妻', '前配偶')) : r(pick('丈夫', '妻子', '配偶'), 'spouse');
    if (steps === 'PCC') {
      const sib = P(2), viaSister = sib && sib.gender === 'F';
      return r(viaSister ? pick('外甥', '外甥女', '外甥') : pick('姪子', '姪女', '姪子女'), 'nibling');
    }
    if (steps === 'PCS') {
      const sib = P(2), o = cmpBo(sib, me);
      if (sib && sib.gender === 'M') return r(o === true ? '嫂嫂' : o === false ? '弟媳' : '兄弟的配偶');
      if (sib && sib.gender === 'F') return r(o === true ? '姊夫' : o === false ? '妹夫' : '姊妹的配偶');
      return r('手足的配偶');
    }
    if (steps === 'SP') return r(pick('配偶的爸爸', '配偶的媽媽', '配偶的父母'));
    if (steps === 'CS') return r(pick('女婿', '媳婦', '孩子的配偶'));
    return r('親戚');
  }

  function kinMap(tree) {
    const ps = paths(tree.meId, tree.people);
    const out = {};
    for (const id in tree.people) {
      const pth = ps[id];
      out[id] = pth ? kinOf(pth.steps, pth.chain, tree.people, tree.terms) : { zh: '（未連上）', term: '', key: '' };
    }
    return out;
  }

  /* ---------- 新增家人 ---------- */
  function sibGroup(anchorId, people) {
    const a = people[anchorId];
    const list = [a, ...siblingsOf(anchorId, people)];
    return list;
  }
  function normalizeBo(list) {
    const sorted = list.slice().sort((a, b) => {
      const x = a.bo == null ? 1e9 : a.bo, y = b.bo == null ? 1e9 : b.bo;
      return x - y;
    });
    sorted.forEach((p, i) => { p.bo = i + 1; });
  }
  function link(people, a, b) {
    if (!a || !b || a === b) return;
    if (!people[a].spouses.includes(b)) people[a].spouses.push(b);
    if (!people[b].spouses.includes(a)) people[b].spouses.push(a);
  }

  // rel: father mother spouse son daughter olderBrother olderSister youngerBrother youngerSister
  // 回傳 { id, created:[ids], note }
  function addRelative(tree, anchorId, rel, opts = {}) {
    const people = tree.people, a = people[anchorId];
    if (!a) throw new Error('找不到這個人');
    const created = []; let note = '';
    const add = o => { const p = makePerson(o); people[p.id] = p; created.push(p.id); return p; };

    if (rel === 'father' || rel === 'mother') {
      const field = rel === 'father' ? 'fatherId' : 'motherId';
      const other = rel === 'father' ? 'motherId' : 'fatherId';
      if (a[field]) throw new Error(rel === 'father' ? '已經有爸爸了' : '已經有媽媽了');
      const p = add({ gender: rel === 'father' ? 'M' : 'F' });
      // 同一位另一半家長、還沒有這個家長的兄弟姊妹，一起接上
      const otherParent = a[other];
      const group = [a];
      if (otherParent) Object.values(people).forEach(q => { if (q.id !== a.id && q[other] === otherParent && !q[field]) group.push(q); });
      group.forEach(q => { q[field] = p.id; });
      if (otherParent) link(people, p.id, otherParent);
      if (group.length > 1) note = '兄弟姊妹也一起接上了';
      return { id: p.id, created, note };
    }
    if (rel === 'spouse') {
      const first = a.spouses.length === 0;
      const p = add({ gender: a.gender === 'M' ? 'F' : a.gender === 'F' ? 'M' : '' });
      link(people, a.id, p.id);
      // 第一位配偶：先前加的孩子如果還缺另一位家長，就一起接上（子女線從夫妻中間往下）
      if (first && a.gender) {
        const otherField = a.gender === 'M' ? 'motherId' : 'fatherId';
        const kids = childrenOf(a.id, people).filter(k => k.id !== p.id && !k[otherField]);
        kids.forEach(k => { k[otherField] = p.id; });
        if (kids.length) note = '之前加的孩子也一起接上這位配偶了';
      }
      return { id: p.id, created, note };
    }
    if (rel === 'son' || rel === 'daughter') {
      if (!a.gender) throw new Error('請先設定這個人的性別，才知道他是爸爸還是媽媽');
      const p = add({ gender: rel === 'son' ? 'M' : 'F' });
      const selfField = a.gender === 'M' ? 'fatherId' : 'motherId';
      const otherField = a.gender === 'M' ? 'motherId' : 'fatherId';
      p[selfField] = a.id;
      let op = opts.otherParentId;
      if (op === undefined) op = a.spouses.length === 1 ? a.spouses[0] : null;
      if (op && people[op]) p[otherField] = op;
      const kids = childrenOf(a.id, people).filter(k => k.id !== p.id);
      const max = kids.reduce((m, k) => Math.max(m, k.bo || 0), 0);
      p.bo = max + 1;
      return { id: p.id, created, note };
    }
    if (/^(older|younger)(Brother|Sister)$/.test(rel)) {
      if (!a.fatherId && !a.motherId) {
        const f = add({ gender: 'M' }), m = add({ gender: 'F' });
        a.fatherId = f.id; a.motherId = m.id; link(people, f.id, m.id);
        note = '兄弟姊妹要透過爸媽連起來，已先加上爸爸、媽媽的空白卡片';
      }
      const group = sibGroup(a.id, people);
      normalizeBo(group);
      const older = rel.startsWith('older');
      const p = add({ gender: rel.endsWith('Brother') ? 'M' : 'F', fatherId: a.fatherId, motherId: a.motherId, tribe: a.tribe });
      p.bo = a.bo + (older ? -0.5 : 0.5);
      normalizeBo([...group, p]);
      return { id: p.id, created, note };
    }
    throw new Error('不認得的關係：' + rel);
  }

  /* ---------- 拖拉換順序 ---------- */
  // 同一對父母（爸爸、媽媽都一樣）的孩子，依排行排好
  function unitSiblings(id, people) {
    const p = people[id]; if (!p || (!p.fatherId && !p.motherId)) return [];
    return Object.values(people).filter(q => q.fatherId === p.fatherId && q.motherId === p.motherId)
      .sort((a, b) => ((a.bo == null ? 1e9 : a.bo) - (b.bo == null ? 1e9 : b.bo)));
  }
  // 把 id 移到 afterId 後面（afterId 為 null：移到最前面）。
  // 只在這組兄弟姊妹原本佔的排行之間互換，同父異母／同母異父的手足排行不會被動到。
  function reorderSiblings(tree, id, afterId) {
    const people = tree.people;
    let group = unitSiblings(id, people);
    if (group.length < 2) return false;
    let slots = group.map(q => q.bo);
    if (slots.some(v => v == null) || new Set(slots).size !== slots.length) {
      normalizeBo(sibGroup(id, people)); group = unitSiblings(id, people); slots = group.map(q => q.bo);
    }
    const before = group.map(q => q.id).join();
    const rest = group.filter(q => q.id !== id);
    const at = afterId == null ? 0 : rest.findIndex(q => q.id === afterId) + 1;
    if (afterId != null && at === 0) return false;
    rest.splice(at, 0, people[id]);
    rest.forEach((q, i) => { q.bo = slots[i]; });
    return rest.map(q => q.id).join() !== before;
  }

  // 在排行欄位填數字：只收 1～30 的整數；和兄弟姊妹撞號時，原本那位（和後面連號的）往後移一位
  // 回傳被往後移的人的 id
  function setBirthOrder(tree, id, value) {
    const people = tree.people, p = people[id]; if (!p) return [];
    if (value == null || value === '') { p.bo = null; return []; }
    let n = Math.round(Number(value));
    if (!isFinite(n)) return [];
    n = Math.min(30, Math.max(1, n));
    const others = siblingsOf(id, people).filter(q => q.bo != null).sort((a, b) => a.bo - b.bo);
    const before = Object.fromEntries(others.map(q => [q.id, q.bo]));
    // 原本排行剛好是 1、2、3……沒有空號：當成「換到第 n 個」，其他人跟著往前或往後
    const k = others.length + 1, all = [...others.map(q => q.bo), p.bo].sort((a, b) => a - b);
    if (p.bo != null && n <= k && all.every((v, i) => v === i + 1)) {
      const rest = others.slice(); rest.splice(n - 1, 0, p);
      rest.forEach((q, i) => { q.bo = i + 1; });
      return others.filter(q => q.bo !== before[q.id]).map(q => q.id);
    }
    p.bo = n;
    // 由小到大檢查，確保不重複（中間空號保留，例如只填了老大和老三）
    const list = [...others.filter(q => q.bo < n), p, ...others.filter(q => q.bo >= n)];
    let prev = 0;
    list.forEach(q => { if (q.bo <= prev) q.bo = prev + 1; prev = q.bo; });
    return others.filter(q => q.bo !== before[q.id]).map(q => q.id);
  }

  /* ---------- 特殊關係 ---------- */
  function setDivorced(tree, a, b, on) {
    const P = tree.people; if (!P[a] || !P[b] || !P[a].spouses.includes(b)) return;
    [[a, b], [b, a]].forEach(([x, y]) => {
      const d = P[x].divorced = (P[x].divorced || []).filter(z => z !== y);
      if (on) d.push(y);
    });
  }
  function isDivorced(tree, a, b) { const p = tree.people[a]; return !!(p && (p.divorced || []).includes(b)); }
  function isAdopted(p) { return !!(p && ((p.fatherId && p.adoptF) || (p.motherId && p.adoptM))); }

  /* ---------- 刪除 ---------- */
  function connectedFrom(startId, people, skipId) {
    const seen = new Set([startId]); const q = [startId];
    while (q.length) {
      const u = q.shift();
      for (const [v] of neighbors(u, people)) if (v !== skipId && !seen.has(v)) { seen.add(v); q.push(v); }
    }
    return seen;
  }
  // 預覽：刪掉 id 之後，會跟著被移除（不再和「我」相連）的人
  function deletePreview(tree, id) {
    if (id === tree.meId) return null;
    const people = tree.people;
    // 模擬刪除
    const clone = {};
    for (const k in people) if (k !== id) {
      const p = people[k];
      clone[k] = Object.assign({}, p, {
        fatherId: p.fatherId === id ? null : p.fatherId,
        motherId: p.motherId === id ? null : p.motherId,
        spouses: p.spouses.filter(s => s !== id),
        divorced: (p.divorced || []).filter(s => s !== id),
      });
    }
    const keep = connectedFrom(tree.meId, clone);
    return Object.keys(clone).filter(k => !keep.has(k));
  }
  function deletePerson(tree, id) {
    const extra = deletePreview(tree, id);
    if (extra == null) throw new Error('不能刪除「我」');
    const gone = new Set([id, ...extra]);
    for (const k of gone) delete tree.people[k];
    for (const p of Object.values(tree.people)) {
      if (gone.has(p.fatherId)) p.fatherId = null;
      if (gone.has(p.motherId)) p.motherId = null;
      p.spouses = p.spouses.filter(s => !gone.has(s));
      p.divorced = (p.divorced || []).filter(s => !gone.has(s));
      if (!p.fatherId) p.adoptF = false;
      if (!p.motherId) p.adoptM = false;
    }
    return [...gone];
  }

  /* ---------- 排版 ---------- */
  const DIM = { W: 224, H: 124, coupleGap: 30, blockGap: 60, familyGap: 110, rowGap: 120 };

  function generations(tree) {
    const gen = { [tree.meId]: 0 }; const q = [tree.meId];
    while (q.length) {
      const u = q.shift();
      for (const [v, t] of neighbors(u, tree.people)) {
        if (gen[v] != null) continue;
        gen[v] = gen[u] + (t === 'P' ? -1 : t === 'C' ? 1 : 0);
        q.push(v);
      }
    }
    // 沒連上的人放在「我」這一代
    for (const id in tree.people) if (gen[id] == null) gen[id] = 0;
    return gen;
  }

  // 等差保序回歸（Pool Adjacent Violators）
  function isotonic(t, w) {
    const blocks = [];
    for (let i = 0; i < t.length; i++) {
      blocks.push({ v: t[i], w: w[i], n: 1 });
      while (blocks.length > 1 && blocks[blocks.length - 2].v > blocks[blocks.length - 1].v) {
        const b = blocks.pop(), a = blocks.pop();
        const ww = a.w + b.w;
        blocks.push({ v: (a.v * a.w + b.v * b.w) / ww, w: ww, n: a.n + b.n });
      }
    }
    const out = [];
    blocks.forEach(b => { for (let i = 0; i < b.n; i++) out.push(b.v); });
    return out;
  }

  // 只取一部分人（列印分支用）：關係線只保留在這群人之內
  function subsetPeople(people, only) {
    const out = {};
    for (const id of only) {
      const p = people[id]; if (!p) continue;
      out[id] = Object.assign({}, p, {
        fatherId: only.has(p.fatherId) ? p.fatherId : null,
        motherId: only.has(p.motherId) ? p.motherId : null,
        spouses: p.spouses.filter(s => only.has(s)),
        divorced: (p.divorced || []).filter(s => only.has(s)),
      });
    }
    return out;
  }

  function layout(tree, opts = {}) {
    const D = DIM;
    const fullGen = generations(tree);
    const people = opts.only ? subsetPeople(tree.people, opts.only) : tree.people;
    const gen = {}; Object.keys(people).forEach(i => gen[i] = fullGen[i]);
    const ids = Object.keys(people);
    const kidsIdx = {}; ids.forEach(i => kidsIdx[i] = []);
    ids.forEach(i => { const p = people[i]; [p.fatherId, p.motherId].forEach(x => { if (x && kidsIdx[x]) kidsIdx[x].push(i); }); });
    const nb = id => { const p = people[id]; const out = [];
      [p.fatherId, p.motherId].forEach(x => x && out.push([x, 'P']));
      kidsIdx[id].forEach(c => out.push([c, 'C']));
      p.spouses.forEach(s => out.push([s, 'S'])); return out; };
    const startId = people[tree.meId] ? tree.meId : ids[0];
    // 夫妻併成一個區塊（同一代）
    const parent = {}; ids.forEach(i => parent[i] = i);
    const find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
    ids.forEach(i => people[i].spouses.forEach(s => { if (people[s] && gen[s] === gen[i]) parent[find(i)] = find(s); }));
    const groups = {};
    ids.forEach(i => { const r = find(i); (groups[r] = groups[r] || []).push(i); });
    // 探索順序（從「我」出發），排夫妻順序和初始位置都會用到
    const order = {}; let k = 0;
    { const seen = new Set([startId]); const q = [startId];
      while (q.length) { const u = q.shift(); order[u] = k++; for (const [v] of nb(u)) if (!seen.has(v)) { seen.add(v); q.push(v); } }
      ids.forEach(i => { if (order[i] == null) order[i] = k++; }); }
    // 夫妻區塊內的左右順序
    function orderSpouses(members) {
      if (members.length === 1) return members;
      const set = new Set(members);
      const adj = {}; members.forEach(m => adj[m] = people[m].spouses.filter(s => set.has(s)));
      const deg = m => adj[m].length;
      // 男左女右的「順眼程度」
      const score = arr => arr.reduce((sc, m, i) => sc + (i && people[arr[i - 1]].gender === 'M' && people[m].gender === 'F' ? 1 : 0), 0);
      const isPath = members.every(m => deg(m) <= 2) && members.filter(m => deg(m) === 1).length === 2;
      if (isPath) {
        // 一串婚姻（例如 繼父－媽媽－爸爸－繼母）：照順序排，每對夫妻都相鄰
        const ends = members.filter(m => deg(m) === 1).sort((a, b) => order[a] - order[b]);
        const path = [ends[0]]; let prev = null, cur = ends[0];
        while (path.length < members.length) {
          const nx = adj[cur].find(v => v !== prev && !path.includes(v)); if (!nx) break;
          path.push(nx); prev = cur; cur = nx;
        }
        if (path.length === members.length) {
          const rev = path.slice().reverse();
          return score(rev) > score(path) ? rev : path;
        }
      }
      // 一個人有好幾位配偶：這個人放中間
      const hub = members.slice().sort((a, b) => (deg(b) - deg(a)) || (order[a] - order[b]))[0];
      const seen = new Set([hub]), out = [hub];
      const visit = u => adj[u].sort((a, b) => order[a] - order[b]).forEach(v => { if (!seen.has(v)) { seen.add(v); out.push(v); visit(v); } });
      visit(hub);
      members.forEach(m => { if (!seen.has(m)) out.push(m); });
      const others = out.slice(1), half = Math.ceil(others.length / 2);
      return [...others.slice(0, half).reverse(), hub, ...others.slice(half)];
    }
    const blocks = Object.values(groups).map(members => {
      const ordered = orderSpouses(members);
      return { members: ordered, gen: gen[members[0]], w: ordered.length * D.W + (ordered.length - 1) * D.coupleGap, x: 0 };
    });
    const blockOf = {}; blocks.forEach(b => b.members.forEach(m => blockOf[m] = b));
    const gens = [...new Set(blocks.map(b => b.gen))].sort((a, b) => a - b);
    const rows = {}; gens.forEach(g => rows[g] = []);
    blocks.forEach(b => rows[b.gen].push(b));
    gens.forEach(g => rows[g].sort((a, b) => Math.min(...a.members.map(m => order[m])) - Math.min(...b.members.map(m => order[m]))));

    const memberX = id => { const b = blockOf[id]; const i = b.members.indexOf(id); return b.x + i * (D.W + D.coupleGap) + D.W / 2; };
    const center = b => b.x + b.w / 2;
    // 同一組兄弟姊妹之間用一般間距；不同家之間多留一點空
    const gapBefore = (row, i) => i === 0 ? 0 : (row[i - 1]._cl === row[i]._cl ? D.blockGap : D.familyGap);
    const compact = row => { let x = 0; row.forEach((b, i) => { x += gapBefore(row, i); b.x = x; x += b.w; }); };
    gens.forEach(g => compact(rows[g]));

    // ---- 兄弟姊妹分組：同一對父母的孩子是一組，組內照排行，整組一起移動 ----
    const unitOf = m => { const p = people[m]; const f = p.fatherId && people[p.fatherId] ? p.fatherId : '', mo = p.motherId && people[p.motherId] ? p.motherId : '';
      return (f || mo) ? f + '|' + mo : null; };
    const minOrd = b => Math.min(...b.members.map(m => order[m]));
    blocks.forEach(b => { b._units = [...new Set(b.members.map(unitOf).filter(Boolean))]; });
    const rowCl = {};
    gens.forEach(g => {
      const row = rows[g]; const up = new Map(row.map(b => [b, b]));
      const f = b => { let r = b; while (up.get(r) !== r) r = up.get(r); up.set(b, r); return r; };
      const firstOf = {};
      row.forEach(b => b._units.forEach(u => { if (firstOf[u]) up.set(f(b), f(firstOf[u])); else firstOf[u] = b; }));
      const m = new Map();
      row.forEach(b => { const r = f(b); if (!m.has(r)) m.set(r, []); m.get(r).push(b); });
      rowCl[g] = [...m.values()].map((bl, ci) => { const cl = { blocks: bl, id: g + ':' + ci }; bl.forEach(b => b._cl = cl.id); return cl; });
    });
    const unitAnchor = u => { const ps = u.split('|').filter(Boolean); return ps.reduce((s, x) => s + memberX(x), 0) / ps.length; };
    // 一組（可能因為夫妻而連起兩組兄弟姊妹）裡面的左右順序
    const arrange = cl => {
      const units = {};
      cl.blocks.forEach(b => b._units.forEach(u => (units[u] = units[u] || []).push(b)));
      let uo = Object.keys(units);
      if (!uo.length) { cl.blocks.sort((a, b) => minOrd(a) - minOrd(b)); return; }
      uo.sort((a, b) => (unitAnchor(a) - unitAnchor(b)) || (a < b ? -1 : 1));
      if (uo.length === 2) {
        // 夫妻各自的兄弟姊妹：誰在夫妻左邊，誰那一家就排左邊（男左女右）
        const br = cl.blocks.find(b => b._units.includes(uo[0]) && b._units.includes(uo[1]));
        if (br) {
          const i0 = br.members.findIndex(m => unitOf(m) === uo[0]), i1 = br.members.findIndex(m => unitOf(m) === uo[1]);
          if (i1 < i0) uo = [uo[1], uo[0]];
        }
      }
      const boIn = (b, u) => { const m = b.members.find(mm => unitOf(mm) === u); const v = m && people[m].bo; return v == null ? 1e9 : v; };
      const placed = new Set(), seq = [];
      uo.forEach((u, i) => {
        const next = uo[i + 1];
        const mine = units[u].filter(b => !placed.has(b));
        const srt = arr => arr.sort((a, b) => (boIn(a, u) - boIn(b, u)) || (minOrd(a) - minOrd(b)));
        const toNext = srt(mine.filter(b => next && b._units.includes(next)));
        const rest = srt(mine.filter(b => !toNext.includes(b)));
        [...rest, ...toNext].forEach(b => { placed.add(b); seq.push(b); });
      });
      cl.blocks = seq;
    };
    const clCenter = cl => cl.blocks.reduce((s, b) => s + center(b), 0) / cl.blocks.length;
    const setRow = g => { rows[g] = rowCl[g].flatMap(cl => cl.blocks); compact(rows[g]); };
    gens.forEach(g => { rowCl[g].sort((a, b) => Math.min(...a.blocks.map(minOrd)) - Math.min(...b.blocks.map(minOrd))); rowCl[g].forEach(arrange); setRow(g); });

    const parentAnchor = id => {
      const p = people[id]; const ps = parentsOf(p).filter(x => people[x]);
      if (!ps.length) return null;
      return ps.reduce((s, x) => s + memberX(x), 0) / ps.length;
    };
    const childAnchor = b => {
      const xs = [];
      b.members.forEach(m => kidsIdx[m].forEach(c => { if (gen[c] === b.gen + 1) xs.push(memberX(c)); }));
      return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null;
    };
    const keyDown = b => {
      const xs = b.members.map(parentAnchor).filter(v => v != null);
      return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : center(b);
    };
    const place = (row, desired, weight) => {
      let off = 0; const o = [];
      row.forEach((b, i) => { off += gapBefore(row, i); o.push(off); off += b.w; });
      const t = row.map((b, i) => desired[i] - b.w / 2 - o[i]);
      const y = isotonic(t, weight);
      row.forEach((b, i) => { b.x = y[i] + o[i]; });
    };

    // 排序：上下來回的重心法（以「一組兄弟姊妹」為單位移動，組內順序固定照排行）
    const hasUnits = cl => cl.blocks.some(b => b._units.length);
    for (let it = 0; it < 6; it++) {
      for (let gi = 1; gi < gens.length; gi++) {
        const g = gens[gi];
        rowCl[g].forEach(arrange);
        const keyed = rowCl[g].map((cl, i) => {
          let k;
          if (hasUnits(cl)) { const xs = cl.blocks.map(keyDown); k = xs.reduce((s, x) => s + x, 0) / xs.length; }
          else k = clCenter(cl);
          return { cl, k, i };
        });
        keyed.sort((p, q) => (p.k - q.k) || (p.i - q.i));
        rowCl[g] = keyed.map(z => z.cl); setRow(g);
      }
      for (let gi = gens.length - 2; gi >= 0; gi--) {
        const g = gens[gi];
        // 往上這一趟只移動「沒有填父母」的那些人（例如最上面的祖先），兄弟姊妹的順序不受孩子位置影響
        const keyed = rowCl[g].map((cl, i) => {
          let k = clCenter(cl);
          if (!hasUnits(cl)) { const cs = cl.blocks.map(childAnchor).filter(v => v != null); if (cs.length) k = cs.reduce((s, x) => s + x, 0) / cs.length; }
          return { cl, k, i };
        });
        keyed.sort((p, q) => (p.k - q.k) || (p.i - q.i));
        rowCl[g] = keyed.map(z => z.cl); setRow(g);
      }
    }
    // 整張圖上下都沒有卡片的空白直條，縮成一般的家族間距（不影響上下對齊）
    const squeeze = () => {
      const iv = blocks.map(b => [b.x, b.x + b.w]).sort((a, b) => a[0] - b[0]);
      const cuts = []; let end = iv.length ? iv[0][1] : 0;
      for (let i = 1; i < iv.length; i++) {
        if (iv[i][0] - end > D.familyGap) cuts.push([end, iv[i][0] - end - D.familyGap]);
        end = Math.max(end, iv[i][1]);
      }
      if (!cuts.length) return;
      blocks.forEach(b => { let d = 0; cuts.forEach(([at, by]) => { if (b.x >= at) d += by; }); b.x -= d; });
    };
    // 位置：讓孩子在父母正下方、父母在孩子正上方
    for (let it = 0; it < 12; it++) {
      for (let gi = 1; gi < gens.length; gi++) {
        const row = rows[gens[gi]];
        const des = [], wt = [];
        row.forEach(b => {
          // 有父母的成員各自對準自己的父母（夫妻兩人都有父母時取中間，兩邊的家都拉得到）
          const ms = b.members.filter(mm => parentAnchor(mm) != null);
          if (ms.length) {
            const xs = ms.map(m => parentAnchor(m) - (memberX(m) - center(b)));
            des.push(xs.reduce((s, x) => s + x, 0) / xs.length); wt.push(1);
          } else { des.push(center(b)); wt.push(0.05); }
        });
        place(row, des, wt);
      }
      for (let gi = gens.length - 2; gi >= 0; gi--) {
        const row = rows[gens[gi]];
        const des = [], wt = [];
        row.forEach(b => { const c = childAnchor(b); if (c != null) { des.push(c); wt.push(1); } else { des.push(center(b)); wt.push(0.05); } });
        place(row, des, wt);
      }
      squeeze();
    }
    // 正規化
    let minX = Infinity, maxX = -Infinity;
    blocks.forEach(b => { minX = Math.min(minX, b.x); maxX = Math.max(maxX, b.x + b.w); });
    blocks.forEach(b => { b.x -= minX; });
    const g0 = gens[0];
    const pos = {};
    blocks.forEach(b => b.members.forEach((m, i) => {
      pos[m] = { x: b.x + i * (D.W + D.coupleGap), y: (b.gen - g0) * (D.H + D.rowGap), gen: b.gen };
    }));

    // 連線
    const lines = [];
    const doneCouple = new Set();
    ids.forEach(i => people[i].spouses.forEach(s => {
      const key = [i, s].sort().join('|');
      if (doneCouple.has(key) || !pos[s]) return; doneCouple.add(key);
      const a = pos[i], b = pos[s];
      if (a.y !== b.y) return;
      const [L, R] = a.x < b.x ? [a, b] : [b, a];
      lines.push({ type: 'marry', a: i, b: s, x1: L.x + D.W, y1: L.y + D.H / 2, x2: R.x, y2: R.y + D.H / 2, adjacent: R.x - L.x - D.W <= D.coupleGap + 1 });
    }));
    const units = {};
    ids.forEach(i => {
      const p = people[i]; if (!p.fatherId && !p.motherId) return;
      const key = (p.fatherId || '') + '|' + (p.motherId || '');
      (units[key] = units[key] || []).push(i);
    });
    const unitList = Object.entries(units);
    const byRow = {};
    unitList.forEach(([key, kids]) => {
      const ps = key.split('|').filter(Boolean).filter(x => pos[x]);
      if (!ps.length) return;
      const top = Math.max(...ps.map(x => pos[x].y));
      const ax = ps.reduce((s, x) => s + pos[x].x + D.W / 2, 0) / ps.length;
      const startY = ps.length === 2 && pos[ps[0]].y === pos[ps[1]].y ? top + D.H / 2 : top + D.H;
      const kx = kids.map(c => pos[c].x + D.W / 2);
      const ky = Math.min(...kids.map(c => pos[c].y));
      (byRow[ky] = byRow[ky] || []).push({ ax, startY, kx, ky, kids });
    });
    Object.values(byRow).forEach(list => {
      list.sort((a, b) => a.ax - b.ax);
      list.forEach((u, i) => {
        const n = list.length;
        const busY = u.ky - D.rowGap / 2 + (n > 1 ? (i - (n - 1) / 2) * Math.min(14, (D.rowGap - 40) / n) : 0);
        lines.push({ type: 'family', ax: u.ax, startY: u.startY, busY, kx: u.kx, ky: u.ky, kids: u.kids });
      });
    });
    const height = (gens[gens.length - 1] - g0) * (D.H + D.rowGap) + D.H;
    return { pos, lines, width: maxX - minX, height, dim: D, ids };
  }

  /* ---------- 列印分支 ---------- */
  // kind: 'all' | 'paternal' | 'maternal' | 'desc'（某人的後代，rootId）
  function branchIds(tree, kind, rootId) {
    const people = tree.people, all = new Set(Object.keys(people));
    if (kind === 'all') return all;
    if (kind === 'desc') {
      const out = new Set(); const q = [rootId];
      const kids = {}; Object.values(people).forEach(p => [p.fatherId, p.motherId].forEach(x => { if (x) (kids[x] = kids[x] || []).push(p.id); }));
      while (q.length) {
        const u = q.shift(); if (!people[u] || out.has(u)) continue; out.add(u);
        (kids[u] || []).forEach(c => q.push(c));
      }
      // 加上配偶（不再往下展開配偶那邊的親戚）
      [...out].forEach(u => people[u].spouses.forEach(s => out.add(s)));
      return out;
    }
    const me = people[tree.meId];
    const side = kind === 'paternal' ? me.fatherId : me.motherId;
    const other = kind === 'paternal' ? me.motherId : me.fatherId;
    if (!side) return new Set([tree.meId]);
    const ps = paths(tree.meId, people);
    const out = new Set();
    for (const id in ps) {
      const c = ps[id].chain;
      if (c.length === 1) out.add(id);                       // 我
      else if (c[1] === side) out.add(id);                   // 經過這一邊的家長
      else if (c[1] !== other) out.add(id);                  // 我的配偶、孩子
    }
    // 兄弟姊妹（可能先經過另一位家長才找到）、另一位家長本人
    siblingsOf(tree.meId, people).forEach(s => out.add(s.id));
    if (other) out.add(other);
    return out;
  }

  /* ---------- 族群來源 ---------- */
  // 依族籍一代一代往上平分：爸爸、媽媽各一半。
  // 收養的關係不算；沒填爸媽（或爸媽那邊沒有任何族籍資料）的部分，用這個人自己的族籍來算。
  // 回傳 { mix: {族籍: 比例}, src: [[人的 id, 比例]] }，src 是「用了誰的族籍、算了多少」
  function ancestry(tree, id) {
    const P = tree.people, memo = {}, onStack = new Set();
    const own = pid => ((P[pid] && P[pid].tribe) || '').trim();
    const merge = src => { const m = new Map(); src.forEach(([i, v]) => m.set(i, (m.get(i) || 0) + v)); return [...m.entries()]; };
    function calc(pid) {
      if (memo[pid]) return memo[pid];
      const p = P[pid];
      if (!p || onStack.has(pid)) return [[pid, 1]];
      onStack.add(pid);
      const f = p.fatherId && P[p.fatherId] && !p.adoptF ? p.fatherId : null;
      const m = p.motherId && P[p.motherId] && !p.adoptM ? p.motherId : null;
      let src;
      if (!f && !m) src = [[pid, 1]];
      else {
        src = [];
        [f, m].forEach(x => { if (x) calc(x).forEach(([i, v]) => src.push([i, v / 2])); else src.push([pid, 0.5]); });
        // 上面的祖先沒有填族籍：改用這個人自己的族籍
        if (own(pid)) {
          let gap = 0; src = src.filter(([i, v]) => { if (!own(i)) { gap += v; return false; } return true; });
          if (gap) src.push([pid, gap]);
        }
        src = merge(src);
      }
      onStack.delete(pid); memo[pid] = src;
      return src;
    }
    const src = calc(id).slice().sort((a, b) => b[1] - a[1]);
    const mix = {};
    src.forEach(([i, v]) => { const k = own(i); mix[k] = (mix[k] || 0) + v; });
    return { mix, src };
  }
  // 0.375 → '3/8'；1 → '1'
  function fracText(x) {
    if (Math.abs(x - 1) < 1e-9) return '1';
    for (let k = 1; k <= 16; k++) {
      const d = 2 ** k, n = x * d;
      if (Math.abs(n - Math.round(n)) < 1e-7) { let a = Math.round(n), b = d; while (a % 2 === 0 && b > 1) { a /= 2; b /= 2; } return a + '/' + b; }
    }
    return (x * 100).toFixed(1) + '%';
  }

  /* ---------- 檔案 ---------- */
  function validate(data) {
    if (!data || data.app !== 'datong-family-tree' || !data.people || !data.meId || !data.people[data.meId])
      throw new Error('這不是族譜系統匯出的檔案');
    for (const id in data.people) {
      const p = data.people[id];
      data.people[id] = makePerson(Object.assign({}, p, { id }));
    }
    for (const p of Object.values(data.people)) {
      // 排行只收 1～30 的整數
      if (p.bo != null) { const n = Math.round(Number(p.bo)); p.bo = isFinite(n) && n >= 1 ? Math.min(30, n) : null; }
      if (p.fatherId && !data.people[p.fatherId]) p.fatherId = null;
      if (p.motherId && !data.people[p.motherId]) p.motherId = null;
      p.spouses = p.spouses.filter(s => data.people[s] && s !== p.id);
      p.divorced = p.divorced.filter(s => p.spouses.includes(s));
      if (!p.fatherId) p.adoptF = false;
      if (!p.motherId) p.adoptM = false;
    }
    data.student = data.student || { cls: '', seat: '' };
    data.terms = data.terms || {};
    return data;
  }

  return { TERM_DEFS, DEFAULT_TERMS, makePerson, newTree, tribalName, childrenOf, siblingsOf, kinMap, addRelative,
    deletePreview, deletePerson, layout, generations, validate, isotonic, DIM, paths, branchIds, subsetPeople,
    TRIBES, PATRONYMIC, tribeShort, setDivorced, isDivorced, isAdopted, unitSiblings, reorderSiblings, safePhoto, stripPhotos, PHOTO_MAX, ancestry, fracText, setBirthOrder };
})();
if (typeof module !== 'undefined') module.exports = FT;
