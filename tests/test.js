const FT = require('../src/core.js');
let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) pass++; else { fail++; console.log('✗ ' + msg); } };
const eq = (a, b, msg) => ok(a === b, `${msg}：得到 ${JSON.stringify(a)}，應為 ${JSON.stringify(b)}`);

// 建立：我 = 女生 Sayun，漢名 林小芸
const t = FT.newTree({ given: 'Sayun', han: '林小芸', gender: 'F' });
const me = t.meId, P = t.people;
const dad = FT.addRelative(t, me, 'father').id; P[dad].given = 'Watan'; P[dad].han = '林大明'; P[dad].bo = 2;
const mom = FT.addRelative(t, me, 'mother').id; P[mom].given = 'Ciwas';
ok(P[dad].spouses.includes(mom) && P[mom].spouses.includes(dad), '加媽媽後爸媽自動成為配偶');

// 子連父名
eq(FT.tribalName(P[me], P), 'Sayun Watan', '子連父名');
eq(FT.tribalName(P[dad], P), 'Watan', '爸爸沒有父親資料時只有個人名');
const gpa = FT.addRelative(t, dad, 'father').id; P[gpa].given = 'Yumin';
eq(FT.tribalName(P[dad], P), 'Watan Yumin', '爸爸接上爺爺名字');
P[me].fullOverride = 'Sayun Ciwas';
eq(FT.tribalName(P[me], P), 'Sayun Ciwas', '手動族名優先');
P[me].fullOverride = '';
eq(FT.tribalName(FT.makePerson({ han: '王' }), P), '', '沒有族名時空白');

// 兄弟姊妹
const bro = FT.addRelative(t, me, 'olderBrother').id;
const sis = FT.addRelative(t, me, 'youngerSister').id;
eq(P[bro].fatherId, dad, '哥哥接上同一位爸爸');
eq(P[sis].motherId, mom, '妹妹接上同一位媽媽');
ok(P[bro].bo < P[me].bo && P[me].bo < P[sis].bo, '排行：哥哥 < 我 < 妹妹');
P[bro].given = 'Yukan';
eq(FT.tribalName(P[bro], P), 'Yukan Watan', '哥哥也連父名');

// 祖父母、伯叔姑、舅姨、堂表
const gma = FT.addRelative(t, dad, 'mother').id;
const uncleOlder = FT.addRelative(t, dad, 'olderBrother').id;
const auntF = FT.addRelative(t, dad, 'youngerSister').id;
const mgpa = FT.addRelative(t, mom, 'father').id;
const mUncle = FT.addRelative(t, mom, 'youngerBrother').id;
const mAunt = FT.addRelative(t, mom, 'olderSister').id;
const uWife = FT.addRelative(t, uncleOlder, 'spouse').id;
const cousin1 = FT.addRelative(t, uncleOlder, 'son').id;
const cousin2 = FT.addRelative(t, mAunt, 'daughter').id;
const ggpa = FT.addRelative(t, gpa, 'father').id;
const gggm = FT.addRelative(t, ggpa, 'mother').id;
const ggggf = FT.addRelative(t, gggm, 'father').id;
const mggm = FT.addRelative(t, mgpa, 'mother').id;
const gpBro = FT.addRelative(t, gpa, 'youngerBrother').id;
const gmSis = FT.addRelative(t, gma, 'olderSister').id;

const K = FT.kinMap(t);
const chk = (id, zh, term, label) => { eq(K[id].zh, zh, label + ' 中文'); if (term !== undefined) eq(K[id].term, term, label + ' 族語'); };
chk(me, '我', '', '我');
chk(dad, '爸爸', "yaba'", '爸爸');
chk(mom, '媽媽', "yaya'", '媽媽');
chk(gpa, '爺爺', 'yutas', '爺爺');
chk(gma, '奶奶', 'yaki', '奶奶');
chk(mgpa, '外公', 'yutas', '外公');
chk(ggpa, '曾祖父', 'yutas', '曾祖父');
chk(mggm, '外曾祖母', 'yaki', '外曾祖母');
chk(gggm, '高祖母', 'yaki', '高祖母');
chk(ggggf, '祖先（往上第 5 代）', 'yutas', '第5代祖先');
chk(bro, '哥哥', 'qbsuyan mlikuy', '哥哥');
chk(sis, '妹妹', "sswe'", '妹妹');
chk(uncleOlder, '伯伯', 'mama', '伯伯（比爸爸大）');
chk(auntF, '姑姑', 'yata', '姑姑');
chk(mUncle, '舅舅', 'mama', '舅舅');
chk(mAunt, '阿姨', 'yata', '阿姨');
chk(uWife, '伯母', '', '伯母');
chk(cousin1, '堂兄弟', '', '堂兄弟');
chk(cousin2, '表姊妹', '', '表姊妹');
chk(gpBro, '伯公／叔公', '', '爺爺的弟弟');
chk(gmSis, '姨婆', '', '奶奶的姊姊');

// 我的孩子（大人使用情境）與配偶、孫
const t2 = FT.newTree({ given: 'Hetay', gender: 'M' });
const w = FT.addRelative(t2, t2.meId, 'spouse').id;
eq(t2.people[w].gender, 'F', '男生的配偶預設女');
const son = FT.addRelative(t2, t2.meId, 'son').id;
eq(t2.people[son].motherId, w, '只有一位配偶時，孩子自動接上另一位家長');
const dau = FT.addRelative(t2, t2.meId, 'daughter').id;
const gs = FT.addRelative(t2, dau, 'son').id;
const K2 = FT.kinMap(t2);
eq(K2[w].zh, '妻子', '妻子'); eq(K2[son].zh, '兒子', '兒子'); eq(K2[son].term, "laqi'", '兒子族語');
eq(K2[gs].zh, '外孫子', '外孫（女兒的兒子）');
t2.people[t2.meId].given = 'Hetay';
eq(FT.tribalName(t2.people[son], t2.people), '', '孩子沒族名時空白');
t2.people[son].given = 'Payan';
eq(FT.tribalName(t2.people[son], t2.people), 'Payan Hetay', '孩子連父名');

// 稱謂表可以修改
t.terms = { sswe: '', youngerSibling: "sswe' (改)" };
eq(FT.kinMap(t)[sis].term, "sswe' (改)", '修改稱謂表');
t.terms = { father: '' };
eq(FT.kinMap(t)[dad].term, '', '清空稱謂表的某一格');
t.terms = {};

// 沒有爸媽時加兄弟姊妹 → 自動補空白爸媽
const t3 = FT.newTree({ given: 'Lahuy', gender: 'M' });
const r3 = FT.addRelative(t3, t3.meId, 'olderSister');
eq(r3.created.length, 3, '自動補爸爸、媽媽、姊姊');
ok(r3.note.length > 0, '有提示訊息');
eq(FT.kinMap(t3)[r3.id].zh, '姊姊', '姊姊稱謂');

// 已有爸爸不能再加
let threw = false; try { FT.addRelative(t, me, 'father'); } catch (e) { threw = true; }
ok(threw, '已有爸爸時再加會擋下');
threw = false; try { FT.deletePerson(t, me); } catch (e) { threw = true; }
ok(threw, '不能刪除我');
threw = false; try { FT.addRelative(FT.newTree({}), FT.newTree({}).meId, 'son'); } catch (e) { threw = true; }
ok(threw, '不存在的人會擋下');

// 刪除連帶
const prev = FT.deletePreview(t, dad);
ok(prev.includes(gpa) && prev.includes(uncleOlder) && prev.includes(cousin1), '刪爸爸會連帶爸爸那一邊');
ok(!prev.includes(bro) && !prev.includes(mom), '哥哥仍透過媽媽相連，不會被刪');
const before = Object.keys(t.people).length;
const gone = FT.deletePerson(t, dad);
eq(Object.keys(t.people).length, before - gone.length, '刪除後人數正確');
ok(Object.values(t.people).every(p => p.fatherId !== dad && !p.spouses.includes(dad)), '刪除後沒有殘留連結');
eq(FT.tribalName(t.people[me], t.people), 'Sayun', '爸爸刪掉後族名只剩個人名');

// 排版：不重疊、孩子在父母下方
function checkLayout(tree, label) {
  const L = FT.layout(tree), D = L.dim;
  const rows = {};
  Object.entries(L.pos).forEach(([id, p]) => (rows[p.y] = rows[p.y] || []).push(p));
  let overlap = false;
  Object.values(rows).forEach(r => { r.sort((a, b) => a.x - b.x); for (let i = 1; i < r.length; i++) if (r[i].x < r[i - 1].x + D.W + D.coupleGap - 0.5) overlap = true; });
  ok(!overlap, label + '：同一代卡片不重疊');
  let below = true;
  Object.values(tree.people).forEach(p => [p.fatherId, p.motherId].filter(Boolean).forEach(par => { if (L.pos[par].y >= L.pos[p.id].y) below = false; }));
  ok(below, label + '：孩子都在父母下面');
  ok(Object.keys(L.pos).length === Object.keys(tree.people).length, label + '：每個人都有位置');
  ok(L.width > 0 && isFinite(L.width) && isFinite(L.height), label + '：尺寸正常');
  return L;
}
// 重建完整家族測排版
const big = FT.newTree({ given: 'Sayun', gender: 'F' });
const bp = big.people;
const d2 = FT.addRelative(big, big.meId, 'father').id;
const m2 = FT.addRelative(big, big.meId, 'mother').id;
FT.addRelative(big, big.meId, 'olderBrother'); FT.addRelative(big, big.meId, 'youngerSister');
const gp2 = FT.addRelative(big, d2, 'father').id; FT.addRelative(big, d2, 'mother');
const mg2 = FT.addRelative(big, m2, 'father').id; FT.addRelative(big, m2, 'mother');
const u2 = FT.addRelative(big, d2, 'olderBrother').id; FT.addRelative(big, u2, 'spouse');
FT.addRelative(big, u2, 'son'); FT.addRelative(big, u2, 'daughter');
const a2 = FT.addRelative(big, m2, 'youngerSister').id; FT.addRelative(big, a2, 'spouse'); FT.addRelative(big, a2, 'son');
FT.addRelative(big, gp2, 'father'); FT.addRelative(big, gp2, 'mother'); FT.addRelative(big, mg2, 'father');
const L = checkLayout(big, '大家族');
// 爸爸那邊在左、媽媽那邊在右
ok(L.pos[gp2].x < L.pos[mg2].x, '爺爺在左、外公在右');
ok(L.pos[u2].x < L.pos[a2].x, '伯伯在左、阿姨在右');
// 我在爸媽之間下方
const mid = (L.pos[d2].x + L.pos[m2].x) / 2;
const sibs = [big.meId, ...FT.siblingsOf(big.meId, bp).map(s => s.id)].map(i => L.pos[i].x);
ok(Math.min(...sibs) <= mid + 1 && Math.max(...sibs) >= mid - 1, '兄弟姊妹排在爸媽下方範圍');
checkLayout(t, '刪除後的家族');
checkLayout(FT.newTree({ given: 'A' }), '只有我一個人');
// 一人兩位配偶
const t4 = FT.newTree({ given: 'B', gender: 'M' });
const s1 = FT.addRelative(t4, t4.meId, 'spouse').id, s2 = FT.addRelative(t4, t4.meId, 'spouse').id;
FT.addRelative(t4, t4.meId, 'son', { otherParentId: s1 }); FT.addRelative(t4, t4.meId, 'daughter', { otherParentId: s2 });
const L4 = checkLayout(t4, '兩位配偶');
ok(L4.pos[t4.meId].x > Math.min(L4.pos[s1].x, L4.pos[s2].x) && L4.pos[t4.meId].x < Math.max(L4.pos[s1].x, L4.pos[s2].x), '有兩位配偶時本人在中間');

// 匯出／匯入
const json = JSON.parse(JSON.stringify(big));
const back = FT.validate(json);
eq(Object.keys(back.people).length, Object.keys(big.people).length, '匯入後人數相同');
threw = false; try { FT.validate({ foo: 1 }); } catch (e) { threw = true; }
ok(threw, '亂七八糟的檔案會被拒絕');
const broken = JSON.parse(JSON.stringify(big)); broken.people[broken.meId].fatherId = 'nope';
eq(FT.validate(broken).people[broken.meId].fatherId, null, '壞掉的連結會被清掉');

// 保序回歸
const iso = FT.isotonic([3, 1, 2, 5], [1, 1, 1, 1]);
ok(iso.every((v, i) => i === 0 || v >= iso[i - 1] - 1e-9), '保序回歸結果遞增');


// ===== 大家族與列印分支 =====
const bigTree = require('./big.js');
const BT = bigTree(6); const NB = Object.keys(BT.people).length;
let t0 = Date.now(); const LB = checkLayout(BT, `大家族 ${NB} 人`); const dt = Date.now() - t0;
ok(dt < 400, `大家族排版速度 ${dt}ms`);
const meB = BT.people[BT.meId];
const pat = FT.branchIds(BT, 'paternal'), mat = FT.branchIds(BT, 'maternal');
ok(pat.has(BT.meId) && mat.has(BT.meId), '兩邊分支都有我');
ok(pat.has(meB.fatherId) && pat.has(meB.motherId), '爸爸那邊包含爸爸（和媽媽本人）');
const mgf = BT.people[meB.motherId].fatherId, pgf = BT.people[meB.fatherId].fatherId;
ok(!pat.has(mgf) && pat.has(pgf), '爸爸那邊不含外公、包含爺爺');
ok(mat.has(mgf) && !mat.has(pgf), '媽媽那邊包含外公、不含爺爺');
ok(pat.size + mat.size < NB + 10, `兩邊分支大致切開（${pat.size}+${mat.size} vs ${NB}）`);
const desc = FT.branchIds(BT, 'desc', pgf);
ok(desc.has(meB.fatherId) && desc.has(BT.meId) && !desc.has(mgf), '爺爺的後代包含爸爸和我，不含外公');
const sub = { meId: BT.meId, people: FT.subsetPeople(BT.people, pat) };
ok(Object.values(sub.people).every(p => (!p.fatherId || sub.people[p.fatherId]) && p.spouses.every(s => sub.people[s])), '分支內關係不會連到分支外');
const LP = FT.layout(BT, { only: pat });
eq(Object.keys(LP.pos).length, pat.size, '分支排版人數正確');
ok(LP.width < LB.width, '分支比整個家族窄');
const LD = FT.layout(BT, { only: desc });
ok(Object.values(LD.pos).every(p => isFinite(p.x) && isFinite(p.y)), '後代分支排版正常（不含我時也可以）');

// 先加孩子、後加配偶：孩子自動接上配偶
const t5 = FT.newTree({ given: 'Ciwas', gender: 'F' });
const k5 = FT.addRelative(t5, t5.meId, 'son').id;
const r5 = FT.addRelative(t5, t5.meId, 'spouse');
eq(t5.people[k5].fatherId, r5.id, '先加的孩子會接上後加的配偶');
ok(r5.note.length > 0, '接上時有提示');
const L5 = FT.layout(t5); const fam = L5.lines.find(l => l.type === 'family');
eq(fam.startY, L5.dim.H / 2, '子女線從夫妻中間（卡片半高）往下');
// 第二位配偶不會搶走孩子
const r6 = FT.addRelative(t5, t5.meId, 'spouse');
eq(t5.people[k5].fatherId, r5.id, '第二位配偶不會改到既有孩子');
// ===== 離婚、收養、族籍 =====
const t7 = FT.newTree({ given: 'Sayun', gender: 'F', tribe: '泰雅族' });
const P7 = t7.people, me7 = t7.meId;
const d7 = FT.addRelative(t7, me7, 'father').id, m7 = FT.addRelative(t7, me7, 'mother').id;
P7[d7].given = 'Watan';
FT.setDivorced(t7, d7, m7, true);
ok(FT.isDivorced(t7, d7, m7) && FT.isDivorced(t7, m7, d7), '離婚雙方都有記錄');
eq(FT.kinMap(t7)[d7].zh, '爸爸', '爸媽離婚，爸爸仍是爸爸');
const s7 = FT.addRelative(t7, d7, 'spouse').id;
eq(FT.kinMap(t7)[s7].zh, '繼母', '爸爸再婚的對象是繼母');
P7[me7].adoptF = true;
eq(FT.kinMap(t7)[d7].zh, '養父', '收養：養父');
eq(FT.kinMap(t7)[m7].zh, '媽媽', '只和爸爸是收養，媽媽仍是媽媽');
eq(FT.tribalName(P7[me7], P7), 'Sayun Watan', '收養的孩子預設連養父的名字（可手動改）');
ok(FT.isAdopted(P7[me7]), 'isAdopted');
const sib7 = FT.addRelative(t7, me7, 'olderSister').id;
eq(P7[sib7].tribe, '泰雅族', '兄弟姊妹預設同族籍');
// 前妻、養子
const t8 = FT.newTree({ given: 'Hetay', gender: 'M' });
const w8 = FT.addRelative(t8, t8.meId, 'spouse').id;
FT.setDivorced(t8, t8.meId, w8, true);
eq(FT.kinMap(t8)[w8].zh, '前妻', '離婚後是前妻');
const k8 = FT.addRelative(t8, t8.meId, 'son').id; t8.people[k8].adoptF = true;
eq(FT.kinMap(t8)[k8].zh, '養子', '收養：養子');
FT.setDivorced(t8, t8.meId, w8, false);
eq(FT.kinMap(t8)[w8].zh, '妻子', '取消離婚標註');
// 刪除後清乾淨、匯入後保留
FT.setDivorced(t8, t8.meId, w8, true);
FT.deletePerson(t8, w8);
eq(t8.people[t8.meId].divorced.length, 0, '刪除配偶後離婚記錄一起清掉');
const back7 = FT.validate(JSON.parse(JSON.stringify(t7)));
ok(back7.people[me7].adoptF && FT.isDivorced(back7, d7, m7) && back7.people[me7].tribe === '泰雅族', '匯出匯入後保留收養、離婚、族籍');
eq(FT.tribeShort('雅美族（達悟族）'), '達悟', '族籍簡稱');
eq(FT.tribeShort('泰雅族'), '泰雅', '族籍簡稱2');
eq(FT.TRIBES.filter(x => x.includes('族') && !['漢族'].includes(x)).length, 16, '原住民族 16 族');
// ===== 爸媽離婚後各自再婚：夫妻要相鄰 =====
function adjacentCouples(tree) {
  const L = FT.layout(tree), D = L.dim; let bad = [];
  Object.values(tree.people).forEach(p => p.spouses.forEach(s => {
    const a = L.pos[p.id], b = L.pos[s];
    if (a.y !== b.y || Math.abs(a.x - b.x) > D.W + D.coupleGap + 0.5) bad.push((p.given || p.han) + '-' + (tree.people[s].given || tree.people[s].han));
  }));
  return { L, bad };
}
const t9 = FT.newTree({ given: 'Me', gender: 'M' });
const P9 = t9.people;
const d9 = FT.addRelative(t9, t9.meId, 'father').id, m9 = FT.addRelative(t9, t9.meId, 'mother').id;
P9[d9].given = 'Dad'; P9[m9].given = 'Mom';
FT.addRelative(t9, t9.meId, 'olderBrother');
FT.setDivorced(t9, d9, m9, true);
const sf9 = FT.addRelative(t9, m9, 'spouse').id; P9[sf9].given = 'StepDad';
let r9 = adjacentCouples(t9);
eq(r9.bad.length, 0, '媽媽再嫁：每對夫妻相鄰 ' + r9.bad.join(','));
const sm9 = FT.addRelative(t9, d9, 'spouse').id; P9[sm9].given = 'StepMom';
r9 = adjacentCouples(t9);
eq(r9.bad.length, 0, '爸爸也再娶：四人一串，每對夫妻都相鄰 ' + r9.bad.join(','));
const xs = [sf9, m9, d9, sm9].map(i => r9.L.pos[i].x);
ok((xs[0] < xs[1] && xs[1] < xs[2] && xs[2] < xs[3]) || (xs[0] > xs[1] && xs[1] > xs[2] && xs[2] > xs[3]), '順序是 繼父－媽媽－爸爸－繼母（或左右相反）');
const kidsX = [t9.meId, ...FT.siblingsOf(t9.meId, P9).map(x => x.id)].map(i => r9.L.pos[i].x + r9.L.dim.W / 2);
const midDM = (r9.L.pos[d9].x + r9.L.pos[m9].x + r9.L.dim.W) / 2;
ok(Math.min(...kidsX) - 1 <= midDM + r9.L.dim.W && Math.max(...kidsX) + 1 >= midDM - r9.L.dim.W, '我和哥哥在爸媽中間的下方附近');
const famLine = r9.L.lines.find(l => l.type === 'family' && l.kids.includes(t9.meId));
ok(Math.abs(famLine.ax - midDM) < 1, '我的子女線從爸爸媽媽中間下來');
// 各自和新配偶生了孩子（同父異母、同母異父）
const hs1 = FT.addRelative(t9, m9, 'daughter', { otherParentId: sf9 }).id;
const hs2 = FT.addRelative(t9, d9, 'son', { otherParentId: sm9 }).id;
r9 = adjacentCouples(t9);
eq(r9.bad.length, 0, '加上同母異父、同父異母的手足後夫妻仍相鄰');
checkLayout(t9, '再婚家庭');
// 一人三位配偶（中心人物在中間）
const t10 = FT.newTree({ given: 'Hub', gender: 'M' });
['A', 'B', 'C'].forEach(n => { const id = FT.addRelative(t10, t10.meId, 'spouse').id; t10.people[id].given = n; });
const L10 = FT.layout(t10); const hubX = L10.pos[t10.meId].x;
const others10 = Object.keys(t10.people).filter(i => i !== t10.meId).map(i => L10.pos[i].x);
ok(others10.some(x => x < hubX) && others10.some(x => x > hubX), '三位配偶時，本人在中間');

// ===== 排版：兄弟姊妹成組、照排行（2026-11-05） =====
function sibCheck(tt, label) {
  const L = FT.layout(tt), PP = tt.people;
  const units = {};
  for (const p of Object.values(PP)) { if (!p.fatherId && !p.motherId) continue; const k = (p.fatherId || '') + '|' + (p.motherId || ''); (units[k] = units[k] || []).push(p.id); }
  // 已婚、而且配偶也有填父母：會移到靠配偶那一邊，不算排行錯
  const bridge = id => PP[id].spouses.some(s => L.pos[s] && L.pos[s].y === L.pos[id].y && (PP[s].fatherId || PP[s].motherId));
  let split = 0, wrong = 0;
  for (const kids of Object.values(units)) {
    if (kids.length < 2) continue;
    const y = L.pos[kids[0]].y, xs = kids.map(i => L.pos[i].x), lo = Math.min(...xs), hi = Math.max(...xs);
    const mates = new Set(kids.flatMap(c => PP[c].spouses));
    if (Object.keys(PP).some(i => L.pos[i].y === y && L.pos[i].x > lo && L.pos[i].x < hi && !kids.includes(i) && !mates.has(i))) split++;
    const bo = kids.slice().sort((a, b) => L.pos[a].x - L.pos[b].x).filter(i => !bridge(i)).map(i => PP[i].bo).filter(v => v != null);
    if (bo.some((v, i) => i && v < bo[i - 1])) wrong++;
  }
  eq(split, 0, label + '：兄弟姊妹中間沒有別家的人');
  eq(wrong, 0, label + '：兄弟姊妹照排行由左到右');
  return L;
}
{
  // 照 2026-11-05 回報的截圖：曾祖父母底下 5 個孩子，每人都有孩子
  const ts = FT.newTree({ given: 'Watan', gender: 'M' });
  const A = (a, r) => FT.addRelative(ts, a, r).id;
  const d = A(ts.meId, 'father'); A(ts.meId, 'mother');
  const gf = A(d, 'father'); A(d, 'mother'); A(gf, 'father'); A(gf, 'mother');
  const sb = [A(gf, 'olderSister'), A(gf, 'olderSister'), A(gf, 'olderBrother'), A(gf, 'olderBrother')];
  sb.forEach((s, i) => { for (let j = 0; j < (i < 2 ? 2 : 3); j++) A(s, j % 2 ? 'son' : 'daughter'); });
  const a1 = A(d, 'olderBrother'); A(a1, 'son'); A(a1, 'daughter');
  const a2 = A(d, 'youngerSister'); A(a2, 'spouse'); A(a2, 'son'); A(a2, 'daughter');
  sibCheck(ts, '截圖家族');
  // 改排行後順序跟著變
  const kids = FT.childrenOf(sb[2], ts.people).sort((x, y) => x.bo - y.bo);
  kids[0].bo = 9; const L2 = FT.layout(ts);
  ok(L2.pos[kids[0].id].x > L2.pos[kids[1].id].x, '把老大的排行改成最後，他就移到最右邊');
}
for (const n of [3, 6]) {
  const tb = bigTree(n), N = Object.keys(tb.people).length;
  const L = sibCheck(tb, '大家族 ' + N + ' 人');
  // 不會越排越寬：寬度不超過「每一代全部排緊」的 1.6 倍
  const rowW = {}; for (const id in L.pos) rowW[L.pos[id].y] = (rowW[L.pos[id].y] || 0) + L.dim.W + L.dim.familyGap;
  ok(L.width < 1.6 * Math.max(...Object.values(rowW)), '大家族 ' + N + ' 人：寬度合理（' + Math.round(L.width) + '）');
}
for (const f of ['sample_15.json', 'sample_155.json']) sibCheck(FT.validate(JSON.parse(require('fs').readFileSync(__dirname + '/' + f, 'utf8'))), f);

// 已過世：存檔、開檔都保留
{
  const td = FT.newTree({ given: 'A', gender: 'M' });
  const f = FT.addRelative(td, td.meId, 'father').id; td.people[f].deceased = true;
  const back = FT.validate(JSON.parse(JSON.stringify(td)));
  eq(back.people[f].deceased, true, '已過世：匯出再開啟後仍是已過世');
  eq(back.people[td.meId].deceased, false, '沒勾的人預設不是已過世');
  const old = JSON.parse(JSON.stringify(td)); delete old.people[f].deceased;
  eq(FT.validate(old).people[f].deceased, false, '舊版檔案（沒有這個欄位）可以正常開啟');
}

// 拖拉換順序
{
  const tr = FT.newTree({ given: 'Me', gender: 'F' });
  const A = (a, r) => FT.addRelative(tr, a, r).id, Pr = tr.people;
  const b1 = A(tr.meId, 'olderBrother'), s1 = A(tr.meId, 'youngerSister'), s2 = A(tr.meId, 'youngerSister');
  const ord = () => FT.unitSiblings(tr.meId, Pr).map(q => q.id);
  const start = ord();
  eq(start[0], b1, '換順序前：哥哥排第一');
  ok(FT.reorderSiblings(tr, b1, start[3]), '把哥哥拖到最後');
  eq(ord()[3], b1, '哥哥變成最後一個');
  eq(FT.kinMap(tr)[b1].zh, '弟弟', '換到後面之後，稱謂自動變成弟弟');
  ok(FT.reorderSiblings(tr, b1, null), '再拖回最前面');
  eq(ord().join(), start.join(), '拖回最前面後恢復原本順序');
  ok(!FT.reorderSiblings(tr, b1, null), '放回原位：沒有改變');
  // 同父異母手足的排行不受影響
  const dad = Pr[tr.meId].fatherId, sm = A(dad, 'spouse');
  const half = FT.addRelative(tr, dad, 'son', { otherParentId: sm }).id;
  const hb = Pr[half].bo;
  FT.reorderSiblings(tr, s2, null);
  eq(Pr[half].bo, hb, '同父異母的弟弟排行不變');
  eq(new Set(FT.unitSiblings(tr.meId, Pr).map(q => q.bo)).size, 4, '換完排行不重複');
  // 排行有空白或重複時也能換
  Pr[b1].bo = null; Pr[s1].bo = 2; Pr[s2].bo = 2;
  ok(FT.reorderSiblings(tr, tr.meId, null) !== undefined, '排行不完整時也能換');
  eq(FT.unitSiblings(tr.meId, Pr)[0].id, tr.meId, '排行不完整時，換完我排第一');
  eq(new Set(FT.unitSiblings(tr.meId, Pr).map(q => q.bo)).size, 4, '排行不完整時，換完排行不重複');
  // 排版跟著變
  const L = FT.layout(tr), xs = FT.unitSiblings(tr.meId, Pr).map(q => L.pos[q.id].x);
  ok(xs.every((x, i) => !i || x > xs[i - 1]), '換順序後畫面由左到右照新順序');
}
console.log(`\n✓ ${pass}/${pass + fail} 通過` + (fail ? `（${fail} 項失敗）` : ''));
process.exit(fail ? 1 : 0);
