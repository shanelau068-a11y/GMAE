"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Phase = "menu" | "playing" | "paused" | "stageClear" | "over" | "victory";
type Ship = { x: number; y: number; w: number; h: number; hp: number; maxHp: number; cooldown: number; invincible: number };
type Shot = { x: number; y: number; vx: number; vy: number; r: number; enemy?: boolean; damage?: number };
type Enemy = { x: number; y: number; vx: number; vy: number; r: number; hp: number; maxHp: number; kind: number; cooldown: number; boss?: boolean; bossType?: number };
type PowerUp = { x: number; y: number; vy: number; life: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number };

const W = 390;
const H = 720;

function audioTone(ctx: AudioContext | null, frequency: number, duration: number, type: OscillatorType = "sine", volume = .035) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type; osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + duration);
  osc.connect(gain).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + duration);
}

export default function SpaceRaidGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef<Phase>("menu");
  const [phase, setPhaseState] = useState<Phase>("menu");
  const [sound, setSound] = useState(true);
  const soundRef = useRef(true);
  const audioRef = useRef<AudioContext | null>(null);
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [hp, setHp] = useState(100);
  const game = useRef({
    ship: { x: W / 2, y: H - 102, w: 34, h: 42, hp: 100, maxHp: 100, cooldown: 0, invincible: 0 } as Ship,
    shots: [] as Shot[], enemies: [] as Enemy[], particles: [] as Particle[], powerUps: [] as PowerUp[], stars: [] as { x: number; y: number; s: number; v: number }[],
    score: 0, wave: 1, time: 0, spawn: 25, kills: 0, bossSpawned: false, shake: 0,
  });

  const setPhase = (next: Phase) => { phaseRef.current = next; setPhaseState(next); };
  const tone = useCallback((f: number, d: number, t?: OscillatorType, v?: number) => {
    if (soundRef.current) audioTone(audioRef.current, f, d, t, v);
  }, []);

  const reset = useCallback(() => {
    game.current = { ship: { x: W / 2, y: H - 102, w: 34, h: 42, hp: 100, maxHp: 100, cooldown: 0, invincible: 0 }, shots: [], enemies: [], particles: [], powerUps: [], stars: Array.from({length: 85}, () => ({x: Math.random()*W, y: Math.random()*H, s: Math.random()*1.8+.4, v: Math.random()*1.5+.5})), score: 0, wave: 1, time: 0, spawn: 20, kills: 0, bossSpawned: false, shake: 0 };
    setScore(0); setWave(1); setHp(100);
  }, []);

  const start = useCallback(() => {
    if (!audioRef.current) audioRef.current = new AudioContext();
    audioRef.current.resume(); reset(); setPhase("playing"); tone(220, .1, "sawtooth", .05); setTimeout(() => tone(440, .18, "sine", .05), 80);
  }, [reset, tone]);

  const nextStage = useCallback(() => {
    const g=game.current; g.wave++; g.kills=0; g.bossSpawned=false; g.enemies=[]; g.shots=[]; g.powerUps=[]; g.spawn=35; g.ship.hp=Math.min(100,g.ship.hp+25); g.ship.x=W/2; g.ship.y=H-102; g.ship.invincible=100;
    setWave(g.wave); setHp(g.ship.hp); setPhase("playing"); tone(420,.16,"sine",.06); setTimeout(()=>tone(620,.24,"sine",.06),120);
  }, [tone]);

  useEffect(() => { soundRef.current = sound; }, [sound]);

  useEffect(() => {
    const canvas = canvasRef.current!; const ctx = canvas.getContext("2d")!;
    const resize = () => { const dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = W*dpr; canvas.height = H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); };
    resize(); window.addEventListener("resize", resize);
    if (!game.current.stars.length) game.current.stars = Array.from({length: 85}, () => ({x: Math.random()*W, y: Math.random()*H, s: Math.random()*1.8+.4, v: Math.random()*1.5+.5}));
    let raf = 0;
    const burst = (x:number,y:number,color:string,n=12) => { for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=Math.random()*3+1;game.current.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,color,size:Math.random()*3+1});} };
    const hit = (a:{x:number;y:number}, b:{x:number;y:number}, r:number) => (a.x-b.x)**2+(a.y-b.y)**2 < r*r;
    const drawShip = (s: Ship) => {
      ctx.save(); ctx.translate(s.x,s.y); if(s.invincible>0 && Math.floor(s.invincible/4)%2) ctx.globalAlpha=.35;
      const glow=ctx.createRadialGradient(0,16,2,0,16,27);glow.addColorStop(0,"#fff");glow.addColorStop(.25,"#38f7ff");glow.addColorStop(1,"transparent");ctx.fillStyle=glow;ctx.fillRect(-28,7,56,52);
      ctx.shadowBlur=18;ctx.shadowColor="#36eeff";ctx.fillStyle="#bffaff";ctx.beginPath();ctx.moveTo(0,-24);ctx.lineTo(18,15);ctx.lineTo(7,11);ctx.lineTo(0,23);ctx.lineTo(-7,11);ctx.lineTo(-18,15);ctx.closePath();ctx.fill();
      ctx.fillStyle="#6d43ff";ctx.beginPath();ctx.moveTo(0,-14);ctx.lineTo(7,8);ctx.lineTo(0,14);ctx.lineTo(-7,8);ctx.closePath();ctx.fill();ctx.restore();
    };
    const draw = () => {
      const g=game.current, active=phaseRef.current==="playing";
      ctx.clearRect(0,0,W,H); const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,"#05051a");bg.addColorStop(.55,"#0d0830");bg.addColorStop(1,"#020915");ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
      ctx.save(); if(g.shake>0){ctx.translate((Math.random()-.5)*g.shake,(Math.random()-.5)*g.shake);g.shake*=.85;}
      for(const st of g.stars){if(active)st.y+=st.v*(1+g.wave*.08);if(st.y>H){st.y=0;st.x=Math.random()*W;}ctx.globalAlpha=.35+st.s*.28;ctx.fillStyle=st.s>1.4?"#86eaff":"#fff";ctx.fillRect(st.x,st.y,st.s,st.s*2.7);}ctx.globalAlpha=1;
      if(active){
        g.time++; const s=g.ship;s.cooldown--;s.invincible=Math.max(0,s.invincible-1);
        if(s.cooldown<=0){g.shots.push({x:s.x-7,y:s.y-20,vx:0,vy:-9,r:3,damage:12},{x:s.x+7,y:s.y-20,vx:0,vy:-9,r:3,damage:12});s.cooldown=8;if(g.time%16===0)tone(680,.035,"square",.012);}
        const threshold = 8+g.wave*2;
        if(g.kills>=threshold && !g.bossSpawned){const bossHp=230+g.wave*95;g.bossSpawned=true;g.enemies.push({x:W/2,y:-60,vx:0,vy:.62,r:39+g.wave*2,hp:bossHp,maxHp:bossHp,kind:3,cooldown:70,boss:true,bossType:g.wave});tone(70+g.wave*12,.6,"sawtooth",.09);}
        if(!g.bossSpawned && --g.spawn<=0){const kind=Math.random()<.16+g.wave*.035?1:0,r=kind?20:15,hp=(kind?38:22)+g.wave*5;g.enemies.push({x:30+Math.random()*(W-60),y:-30,vx:(Math.random()-.5)*(0.7+g.wave*.08),vy:.75+Math.random()*.4+g.wave*.09,r,hp,maxHp:hp,kind,cooldown:95+Math.random()*75-g.wave*3});g.spawn=Math.max(28,62-g.wave*4);}
        for(const sh of g.shots){sh.x+=sh.vx;sh.y+=sh.vy;}
        for(const e of g.enemies){if(e.boss&&e.y>=92)e.vx=Math.sin(g.time/70)*(0.35+(e.bossType||1)*.08);e.x+=e.vx;e.y+=e.vy;if(e.boss && e.y>92)e.vy=0;if(e.x<e.r||e.x>W-e.r)e.vx*=-1;if(--e.cooldown<=0){const a=Math.atan2(s.y-e.y,s.x-e.x),count=e.boss?2+(e.bossType||1):1;for(let i=0;i<count;i++){const da=(i-(count-1)/2)*(.12+(e.bossType||0)*.012);g.shots.push({x:e.x,y:e.y+e.r/2,vx:Math.cos(a+da)*(e.boss?2.35+(e.bossType||1)*.12:2.1+g.wave*.06),vy:Math.sin(a+da)*(e.boss?2.35+(e.bossType||1)*.12:2.1+g.wave*.06),r:e.boss?5:4,enemy:true});}e.cooldown=e.boss?Math.max(34,70-(e.bossType||1)*6):Math.max(72,112-g.wave*5);}
          if(e.y>H+40){e.hp=0;if(!e.boss){s.hp-=12;setHp(Math.max(0,s.hp));}}
        }
        for(const sh of g.shots){if(sh.enemy){if(s.invincible<=0&&hit(sh,s,19)){sh.y=H+99;s.hp-=12;s.invincible=50;g.shake=8;burst(s.x,s.y,"#ff4f9b",16);tone(120,.16,"sawtooth",.07);setHp(Math.max(0,s.hp));}}else for(const e of g.enemies){if(e.hp>0&&hit(sh,e,e.r+5)){e.hp-=sh.damage||10;sh.y=-99;burst(sh.x,sh.y,"#5ffaff",4);if(e.hp<=0){burst(e.x,e.y,e.boss?"#c85cff":"#ff7a3d",e.boss?55:18);g.shake=e.boss?18:5;g.score+=e.boss?1800*g.wave:e.kind?250:120;g.kills++;setScore(g.score);tone(e.boss?70:180,e.boss?.7:.12,"sawtooth",e.boss?.12:.045);if(!e.boss&&Math.random()<.13)g.powerUps.push({x:e.x,y:e.y,vy:1.5,life:600});if(e.boss){setPhase(g.wave>=5?"victory":"stageClear");}}}}}
        for(const p of g.powerUps){p.y+=p.vy;p.life--;if(hit(p,s,25)){p.life=0;g.shake=16;g.shots=g.shots.filter(q=>!q.enemy);let bonus=0;for(const e of g.enemies){if(!e.boss&&e.hp>0){e.hp=0;g.kills++;bonus+=180;burst(e.x,e.y,"#62f6ff",16);}else if(e.boss)e.hp=Math.max(1,e.hp-(75+g.wave*15));}g.score+=bonus;setScore(g.score);tone(90,.45,"sawtooth",.11);setTimeout(()=>tone(900,.3,"sine",.06),80);burst(s.x,s.y,"#fff36a",40);}}
        g.shots=g.shots.filter(q=>q.y>-120&&q.y<H+120&&q.x>-30&&q.x<W+30);g.enemies=g.enemies.filter(e=>e.hp>0&&e.y<H+80);
        for(const p of g.particles){p.x+=p.vx;p.y+=p.vy;p.vx*=.97;p.vy*=.97;p.life-=.025;}
        g.powerUps=g.powerUps.filter(p=>p.life>0&&p.y<H+30);g.particles=g.particles.filter(p=>p.life>0);if(s.hp<=0)setPhase("over");
      }
      for(const sh of g.shots){ctx.save();ctx.shadowBlur=14;ctx.shadowColor=sh.enemy?"#ff3d87":"#32efff";ctx.fillStyle=sh.enemy?"#ff6cac":"#caffff";ctx.beginPath();ctx.arc(sh.x,sh.y,sh.r,0,Math.PI*2);ctx.fill();ctx.restore();}
      for(const e of g.enemies){const colors=["#ff4f9a","#b35cff","#ff8a3d","#32d9ff","#7cff6b"];const bc=colors[((e.bossType||1)-1)%colors.length];ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.boss?Math.sin(g.time/45)*.12:0);ctx.shadowBlur=e.boss?30:15;ctx.shadowColor=e.boss?bc:"#ff397c";ctx.fillStyle=e.boss?bc+"88":e.kind?"#7d204d":"#742347";ctx.beginPath();const points=e.boss?5+(e.bossType||1):8;for(let i=0;i<points*2;i++){const a=i*Math.PI/points-Math.PI/2,r=i%2?e.r*(.42+(e.bossType||1)*.04):e.r;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();ctx.strokeStyle=e.boss?bc:"#ff6da7";ctx.lineWidth=e.boss?3:2;ctx.stroke();ctx.fillStyle="#fff";ctx.fillRect(-e.r*.35,-3,e.r*.7,6);ctx.restore();if(e.hp<e.maxHp){ctx.fillStyle="#231133";ctx.fillRect(e.x-e.r,e.y-e.r-11,e.r*2,4);ctx.fillStyle=e.boss?bc:"#ff467f";ctx.fillRect(e.x-e.r,e.y-e.r-11,e.r*2*(e.hp/e.maxHp),4);}}
      for(const p of g.powerUps){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(g.time*.04);ctx.shadowBlur=24;ctx.shadowColor="#fff24a";ctx.fillStyle="#ffe94a";ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?8:15;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();ctx.fillStyle="#5b28c8";ctx.font="bold 13px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("爆",0,0);ctx.restore();}
      for(const p of g.particles){ctx.globalAlpha=p.life;ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size);}ctx.globalAlpha=1;drawShip(g.ship);ctx.restore();
      raf=requestAnimationFrame(draw);
    }; draw();
    const move = (clientX:number,clientY:number) => { if(phaseRef.current!=="playing")return;const r=canvas.getBoundingClientRect(),s=game.current.ship;s.x=Math.max(24,Math.min(W-24,(clientX-r.left)/r.width*W));s.y=Math.max(80,Math.min(H-45,(clientY-r.top)/r.height*H)); };
    const pointer=(e:PointerEvent)=>{e.preventDefault();move(e.clientX,e.clientY)}; canvas.addEventListener("pointerdown",pointer);canvas.addEventListener("pointermove",pointer);
    return()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",resize);canvas.removeEventListener("pointerdown",pointer);canvas.removeEventListener("pointermove",pointer)};
  }, [tone]);

  return <main className="game-shell">
    <div className="ambient ambient-a"/><div className="ambient ambient-b"/>
    <section className="game-frame" aria-label="羊腿哪里跑专用雷电游戏">
      <div className="brand"><span className="brand-mark">LT</span><div><b>星际雷电</b><small>羊腿哪里跑专用</small></div></div>
      <div className="hud"><div><small>SCORE</small><b>{score.toString().padStart(6,"0")}</b></div><div className="wave">关卡 <b>{wave}</b>/5</div><div className="hp"><small>护盾 {hp}%</small><i><em style={{width:`${hp}%`}}/></i></div></div>
      <canvas ref={canvasRef} className="game-canvas" aria-label="游戏区域：拖动战机自动射击" />
      <button className="sound" onClick={()=>setSound(v=>!v)} aria-label={sound?"关闭音效":"打开音效"}>{sound?"◖))":"◖×"}</button>
      {phase!=="playing"&&<div className="overlay">
        {phase==="menu"&&<><div className="kicker">NEON STRIKE · 2088</div><h1>星际<br/><span>雷电</span></h1><p>五关连续作战 · 每关独立 Boss<br/>拾取“爆”能量，瞬间清空敌机</p><button className="start" onClick={start}><span>启动战机</span><i>▶</i></button><small className="tip">建议开启声音 · 手指拖动自动射击</small></>}
        {phase==="paused"&&<><h2>战斗暂停</h2><button className="start" onClick={()=>setPhase("playing")}><span>继续战斗</span><i>▶</i></button></>}
        {phase==="stageClear"&&<><div className="result-icon win">✓</div><h2>第 {wave} 关突破</h2><p>护盾已修复 25%<br/>下一关敌军和 Boss 将更强</p><button className="start" onClick={nextStage}><span>进入第 {wave+1} 关</span><i>▶</i></button></>}
        {phase==="over"&&<><div className="result-icon">×</div><h2>战机坠毁</h2><p>本次得分 <b>{score}</b><br/>别让羊腿跑了，再来一次！</p><button className="start" onClick={start}><span>重新出击</span><i>↻</i></button></>}
        {phase==="victory"&&<><div className="result-icon win">★</div><h2>星域已清空</h2><p>最终得分 <b>{score}</b><br/>“羊腿哪里跑”小队凯旋！</p><button className="start" onClick={start}><span>再战一局</span><i>↻</i></button></>}
      </div>}
      {phase==="playing"&&<button className="pause" onClick={()=>setPhase("paused")} aria-label="暂停">Ⅱ</button>}
      <div className="signature">YANG TUI NA LI PAO · EXCLUSIVE</div>
    </section>
  </main>;
}
