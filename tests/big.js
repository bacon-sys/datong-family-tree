const FT = require('../src/core.js');
function bigTree(seedN){
  let r = 1; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  const t = FT.newTree({ given: 'Sayun', han:'林小芸', gender: 'F' });
  const names=['Watan','Yumin','Ciwas','Sayun','Yukan','Batu','Lawa','Hetay','Pisuy','Tali','Iwan','Masa','Losin','Kumu','Yaway','Behuy','Temu','Ubing','Silan','Payan','Akiy','Buya'];
  const nm=()=>names[Math.floor(rnd()*names.length)];
  t.people[t.meId].given='Sayun';
  const add=(a,rel,o)=>{const id=FT.addRelative(t,a,rel,o).id; t.people[id].given=nm(); return id;};
  const d=add(t.meId,'father'), m=add(t.meId,'mother');
  add(t.meId,'olderBrother'); add(t.meId,'youngerSister');
  const gps=[add(d,'father'),add(d,'mother'),add(m,'father'),add(m,'mother')];
  // great-grandparents for the two grandfathers & grandmothers
  gps.forEach(g=>{add(g,'father');add(g,'mother');});
  // each parent has siblings with spouses & kids & grandkids
  [d,m].forEach(p=>{
    for(let i=0;i<seedN;i++){
      const s=add(p, i%2?'olderBrother':'youngerSister');
      add(s,'spouse');
      const k=2+Math.floor(rnd()*3);
      for(let j=0;j<k;j++){ const c=add(s, rnd()<.5?'son':'daughter'); if(rnd()<.4){add(c,'spouse'); add(c,'son'); add(c,'daughter');} }
    }
  });
  // grandparents' siblings with kids
  gps.forEach(g=>{ for(let i=0;i<2;i++){ const s=add(g,'youngerBrother'); add(s,'spouse'); add(s,'son'); add(s,'daughter'); }});
  return t;
}
module.exports = bigTree;
if (require.main === module) {
  for (const n of [3,6,8]) {
    const t = bigTree(n); const N = Object.keys(t.people).length;
    let t0=Date.now(); const L=FT.layout(t); const t1=Date.now(); FT.kinMap(t); const t2=Date.now();
    console.log(`people=${N} layout=${t1-t0}ms kin=${t2-t1}ms size=${Math.round(L.width)}x${Math.round(L.height)} fitA4=${(Math.min(1054/L.width,620/L.height)*100).toFixed(0)}%`);
  }
  // require('fs').writeFileSync('sample_155.json', JSON.stringify(bigTree(6)));
}
