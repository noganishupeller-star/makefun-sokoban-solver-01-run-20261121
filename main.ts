import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

function solve(level) {
  const lines = level.trimEnd().split(' ');
  const w = lines[0].length;
  const map = lines.join('');
  const steps = [-w,w,-1,1], letters = 'udlr';
  let player = map.indexOf('@'), solution = '';
  const hall = Math.floor(player / w);
  const boxes = new Set(), goals = new Set();
  for (let i = 0; i < map.length; i++) {
    if ('$*'.includes(map[i])) boxes.add(i);
    if ('.*'.includes(map[i])) goals.add(i);
  }
  function flood(start, allowed, blocked) {
    const paths = new Map([[start,'']]), queue = [start];
    for (let i=0;i<queue.length;i++) {
      const at = queue[i];
      for (let d=0;d<4;d++) {
        const next = at+steps[d];
        if (!allowed.has(next) || blocked.has(next) || paths.has(next)) continue;
        paths.set(next, paths.get(at)+letters[d]);
        queue.push(next);
      }
    }
    return paths;
  }
  const floor = new Set([...map].flatMap((v,i)=>v==='#'?[]:[i]));
  const interior = new Set([...floor].filter(i=>Math.floor(i/w)!==hall));
  const empty = new Set();
  while (interior.size) {
    const room = new Set(flood(interior.values().next().value, interior, empty).keys());
    for (const p of room) interior.delete(p);
    const targets = [...room].filter(p=>goals.has(p));
    if (!targets.length) continue;
    let door, landing;
    for (const p of room) for (const d of [-w,w]) {
      if (floor.has(p+d) && Math.floor((p+d)/w)===hall) { door=p; landing=p+d; }
    }
    const walk = flood(player,floor,boxes).get(landing);
    if (walk === undefined) throw Error('Hallway inaccessible');
    solution += walk;
    const allowed = new Set([...room,landing]);
    const distances = targets.map(goal=>{
      const dist = new Map([[goal,0]]), queue=[goal];
      for(let i=0;i<queue.length;i++) for(const step of steps) {
        const prev=queue[i]-step;
        if(room.has(prev) && allowed.has(prev-step) && !dist.has(prev)) {
          dist.set(prev,dist.get(queue[i])+1);queue.push(prev);
        }
      }
      return dist;
    });
    const costs = new Map();
    function heuristic(bs) {
      const key = bs.join(',');
      if(costs.has(key)) return costs.get(key);
      function assign(i,used) {
        if(i===bs.length) return 0;
        let best=Infinity;
        for(let j=0;j<targets.length;j++) if(!(used & (1<<j)) && distances[j].has(bs[i])) {
          best=Math.min(best,distances[j].get(bs[i])+assign(i+1,used | (1<<j)));
        }
        return best;
      }
      const cost=assign(0,0); costs.set(key,cost); return cost;
    }
    const initial=[...boxes].filter(p=>room.has(p)).sort((a,b)=>a-b);
    const buckets=[], seen=new Map();
    function enqueue(bs, at, g, prior, moves) {
      const h=heuristic(bs);
      if(!Number.isFinite(h)) return;
      const reach=flood(at,allowed,new Set(bs));
      const key=bs.join(',')+'/'+Math.min(...reach.keys());
      if((seen.get(key)??Infinity)<=g) return;
      seen.set(key,g);
      (buckets[g+h]??=[]).push({bs,reach,g,key,h,prior,moves});
    }
    enqueue(initial,landing,0,null,'');
    let found=false;
    for(let f=0;f<buckets.length && !found;f++) while(buckets[f]?.length) {
      const state=buckets[f].pop();
      if(state.g!==seen.get(state.key)) continue;
      if(state.h===0 && (state.reach.has(landing) || interior.size===0)) {
        const parts=[];
        for(let n=state;n;n=n.prior) parts.push(n.moves);
        solution+=parts.reverse().join('')+(state.reach.get(landing)??'');
        player=landing;
        for(const b of initial) boxes.delete(b);
        for(const t of targets) boxes.add(t);
        found=true;break;
      }
      for(let i=0;i<state.bs.length;i++) for(let d=0;d<4;d++) {
        const b=state.bs[i], dest=b+steps[d], behind=b-steps[d];
        if(!state.reach.has(behind)||!room.has(dest)||state.bs.includes(dest)) continue;
        const next=state.bs.slice();next[i]=dest;next.sort((a,b)=>a-b);
        enqueue(next,b,state.g+1,state,state.reach.get(behind)+letters[d]);
      }
    }
    if(!found) throw Error('No room solution');
  }
  return solution;
}
const input=process.env.MAKEFUN_INPUT_DIR??'/input', output=process.env.MAKEFUN_OUTPUT_DIR??'/output';
for(const id of readdirSync(input).sort()) {
  mkdirSync(join(output,id),{recursive:true});
  writeFileSync(join(output,id,'solution.txt'), solve(readFileSync(join(input,id,'level.txt'),'utf8'))+'\n');
}
