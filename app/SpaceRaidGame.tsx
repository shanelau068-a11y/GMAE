"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Phase = "menu" | "playing" | "paused" | "stageClear" | "over" | "victory";
type Ship = { x: number; y: number; w: number; h: number; hp: number; maxHp: number; cooldown: number; invincible: number; power: number; spread: number };
type Shot = { x: number; y: number; vx: number; vy: number; r: number; enemy?: boolean; damage?: number };
type Enemy = { x: number; y: number; vx: number; vy: number; r: number; hp: number; maxHp: number; kind: number; cooldown: number; boss?: boolean; bossType?: number };
type PowerUp = { x: number; y: number; vy: number; life: number; kind: "bomb" | "spread" | "power" };
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
  const [powerLevel, setPowerLevel] = useState(0);
  const [spreadLevel, setSpreadLevel] = useState(0);
  const game = useRef({
    ship: { x: W / 2, y: H - 102, w: 34, h: 42, hp: 100, maxHp: 100, cooldown: 0, invincible: 0, power: 0, spread: 0 } as Ship,
    shots: [] as Shot[], enemies: [] as Enemy[], particles: [] as Particle[], powerUps: [] as PowerUp[], stars: [] as { x: number; y: number; s: number; v: number }[],
    score: 0, wave: 1, time: 0, spawn: 25, kills: 0, bossSpawned: false, shake: 0,
  });

  const setPhase = (next: Phase) => { phaseRef.current = next; setPhaseState(next); };
  const tone = useCallback((f: number, d: number, t?: OscillatorType, v?: number) => {
    if (soundRef.current) audioTone(audioRef.current, f, d, t, v);
  }, []);

  const reset = useCallback(() => {
    game.current = { ship: { x: W / 2, y: H - 102, w: 34, h: 42, hp: 100, maxHp: 100, cooldown: 0, invincible: 0, power: 0, spread: 0 }, shots: [], enemies: [], particles: [], powerUps: [], stars: Array.from({length: 85}, () => ({x: Math.random()*W, y: Math.random()*H, s: Math.random()*1.8+.4, v: Math.random()*1.5+.5})), score: 0, wave: 1, time: 0, spawn: 20, kills: 0, bossSpawned: false, shake: 0 };
    setScore(0); setWave(1); setHp(100); setPowerLevel(0); setSpreadLevel(0);
  }, []);

  const start = useCallback(() => {
    if (!audioRef.current) audioRef.current = new AudioContext();
    audioRef.current.resume(); reset(); setPhase("playing"); tone(220, .1, "sawtooth", .05); setTimeout(() => tone(440, .18, "sine", .05), 80);
  }, [reset, tone]);

  const nextStage = useCallback(() => {
    const g=game.current; g.wave++; g.kills=0; g.bossSpawned=false; g.enemies=[]; g.shots=[]; g.powerUps=[]; g.spawn=35; g.ship.hp=Math.min(100,g.ship.hp+25); g.ship.power=0; g.ship.spread=0; g.ship.x=W/2; g.ship.y=H-102; g.ship.invincible=100;
    setWave(g.wave); setHp(g.ship.hp); setPowerLevel(0); setSpreadLevel(0); setPhase("playing"); tone(420,.16,"sine",.06); setTimeout(()=>tone(620,.24,"sine",.06),120);
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
        if(s.cooldown<=0){const damage=10+s.power*5;g.shots.push({x:s.x,y:s.y-24,vx:0,vy:-9.5,r:3+s.power*.35,damage});if(s.spread>=1)g.shots.push({x:s.x-9,y:s.y-17,vx:-1.05,vy:-8.7,r:3,damage},{x:s.x+9,y:s.y-17,vx:1.05,vy:-8.7,r:3,damage});if(s.spread>=2)g.shots.push({x:s.x-13,y:s.y-11,vx:-2.05,vy:-8.1,r:3,damage},{x:s.x+13,y:s.y-11,vx:2.05,vy:-8.1,r:3,damage});if(s.spread>=3)g.shots.push({x:s.x-16,y:s.y-7,vx:-3,vy:-7.5,r:3,damage},{x:s.x+16,y:s.y-7,vx:3,vy:-7.5,r:3,damage});s.cooldown=Math.max(5,8-s.power*.75);if(g.time%16===0)tone(680+s.power*45,.035,"square",.012);}
        const threshold = g.wave===1?14:18+g.wave*4;
        if(g.kills>=threshold && !g.bossSpawned){const n=g.wave-1,bossHp=g.wave===1?450:590+n*350+n*n*70;g.bossSpawned=true;g.enemies.push({x:W/2,y:-70,vx:0,vy:.72,r:40+g.wave*1.8,hp:bossHp,maxHp:bossHp,kind:3,cooldown:48,boss:true,bossType:g.wave});tone(70+g.wave*10,.6,"sawtooth",.09);}
        if(!g.bossSpawned && --g.spawn<=0){const roll=Math.random(),fastRate=g.wave===1?0:.12+g.wave*.045,heavyRate=g.wave===1?.12:.18+g.wave*.055,kind=roll<fastRate?2:roll<fastRate+heavyRate?1:0,r=kind===2?17:kind===1?22:15,hp=(kind===2?44:kind===1?82:30)+g.wave*(kind===1?15:10);g.enemies.push({x:30+Math.random()*(W-60),y:-30,vx:(Math.random()-.5)*(kind===2?2.6+g.wave*.08:1+g.wave*.12),vy:(kind===2?2.1:.85+Math.random()*.45)+g.wave*.11,r,hp,maxHp:hp,kind,cooldown:(kind===1?52:84)+Math.random()*50-g.wave*3});g.spawn=g.wave===1?50:Math.max(15,46-g.wave*4);}
        for(const sh of g.shots){sh.x+=sh.vx;sh.y+=sh.vy;}
        for(const e of g.enemies){if(e.boss&&e.y>=92)e.vx=Math.sin(g.time/(58-(e.bossType||1)*2))*(.42+(e.bossType||1)*.07);e.x+=e.vx;e.y+=e.vy;if(e.boss && e.y>92)e.vy=0;if(e.x<e.r||e.x>W-e.r)e.vx*=-1;if(--e.cooldown<=0){const a=Math.atan2(s.y-e.y,s.x-e.x),bt=e.bossType||1,speed=2.35+bt*.11;if(e.boss){if(bt%4===1||bt>=6){const count=3+Math.floor(bt/2);for(let i=0;i<count;i++){const da=(i-(count-1)/2)*.16;g.shots.push({x:e.x,y:e.y+e.r/2,vx:Math.cos(a+da)*speed,vy:Math.sin(a+da)*speed,r:5,enemy:true});}}if(bt%4===2||bt>=7){const count=10+bt;for(let i=0;i<count;i++){const da=i*Math.PI*2/count;g.shots.push({x:e.x,y:e.y,vx:Math.cos(da)*speed*.8,vy:Math.sin(da)*speed*.8,r:4,enemy:true});}}if(bt%4===3||bt===8){const count=7;for(let i=0;i<count;i++){const da=-.75+i*.25+Math.sin(g.time/35)*.35;g.shots.push({x:e.x,y:e.y,vx:Math.sin(da)*speed,vy:Math.cos(da)*speed,r:5,enemy:true});}}if(bt%4===0){for(let i=0;i<5;i++){const da=g.time*.045+i*Math.PI*2/5;g.shots.push({x:e.x,y:e.y,vx:Math.cos(da)*speed,vy:Math.sin(da)*speed,r:4,enemy:true});}}e.cooldown=Math.max(28,62-bt*4);}else{const count=e.kind===1?3:1;for(let i=0;i<count;i++){const da=(i-(count-1)/2)*.16;g.shots.push({x:e.x,y:e.y+e.r/2,vx:Math.cos(a+da)*(2.05+g.wave*.07),vy:Math.sin(a+da)*(2.05+g.wave*.07),r:e.kind===1?4:3.5,enemy:true});}e.cooldown=Math.max(58,108-g.wave*5);}}
          if(e.y>H+40){e.hp=0;if(!e.boss){s.hp-=12;setHp(Math.max(0,s.hp));}}
        }
        for(const sh of g.shots){if(sh.enemy){if(s.invincible<=0&&hit(sh,s,19)){sh.y=H+99;s.hp-=12;s.invincible=50;g.shake=8;burst(s.x,s.y,"#ff4f9b",16);tone(120,.16,"sawtooth",.07);setHp(Math.max(0,s.hp));}}else for(const e of g.enemies){if(e.hp>0&&(!e.boss||e.y>=70)&&hit(sh,e,e.r+5)){e.hp-=sh.damage||10;sh.y=-99;burst(sh.x,sh.y,"#5ffaff",4);if(e.hp<=0){burst(e.x,e.y,e.boss?"#c85cff":"#ff7a3d",e.boss?55:18);g.shake=e.boss?18:5;g.score+=e.boss?1800*g.wave:e.kind?250:120;g.kills++;setScore(g.score);tone(e.boss?70:180,e.boss?.7:.12,"sawtooth",e.boss?.12:.045);if(!e.boss&&Math.random()<.2){const roll=Math.random(),kind=roll<.3?"bomb":roll<.65?"spread":"power";g.powerUps.push({x:e.x,y:e.y,vy:1.5,life:600,kind});}if(e.boss){setPhase(g.wave>=8?"victory":"stageClear");}}}}}
        for(const p of g.powerUps){p.y+=p.vy;p.life--;if(hit(p,s,25)){p.life=0;if(p.kind==="bomb"){g.shake=16;g.shots=g.shots.filter(q=>!q.enemy);let bonus=0;for(const e of g.enemies){if(!e.boss&&e.hp>0){e.hp=0;g.kills++;bonus+=180;burst(e.x,e.y,"#62f6ff",16);}else if(e.boss)e.hp=Math.max(1,e.hp-(60+g.wave*12));}g.score+=bonus;setScore(g.score);tone(90,.45,"sawtooth",.11);burst(s.x,s.y,"#fff36a",40);}else if(p.kind==="spread"){s.spread=Math.min(3,s.spread+1);setSpreadLevel(s.spread);tone(520,.22,"sine",.07);burst(s.x,s.y,"#4eeaff",28);}else{s.power=Math.min(3,s.power+1);setPowerLevel(s.power);tone(760,.22,"square",.055);burst(s.x,s.y,"#ff526f",28);}}}
        g.shots=g.shots.filter(q=>q.y>-120&&q.y<H+120&&q.x>-30&&q.x<W+30);g.enemies=g.enemies.filter(e=>e.hp>0&&e.y<H+80);
        for(const p of g.particles){p.x+=p.vx;p.y+=p.vy;p.vx*=.97;p.vy*=.97;p.life-=.025;}
        g.powerUps=g.powerUps.filter(p=>p.life>0&&p.y<H+30);g.particles=g.particles.filter(p=>p.life>0);if(s.hp<=0)setPhase("over");
      }
      for(const sh of g.shots){ctx.save();ctx.shadowBlur=14;ctx.shadowColor=sh.enemy?"#ff3d87":"#32efff";ctx.fillStyle=sh.enemy?"#ff6cac":"#caffff";ctx.beginPath();ctx.arc(sh.x,sh.y,sh.r,0,Math.PI*2);ctx.fill();ctx.restore();}
      for(const e of g.enemies){const colors=["#ff4f9a","#b35cff","#ff8a3d","#32d9ff","#7cff6b","#ffe14d","#ff5252","#9b7cff"],bc=colors[((e.bossType||1)-1)%colors.length];ctx.save();ctx.translate(e.x,e.y);ctx.shadowBlur=e.boss?32:14;ctx.shadowColor=e.boss?bc:e.kind===1?"#ff9a3d":e.kind===2?"#41efff":"#ff6da7";if(e.boss){ctx.strokeStyle=bc;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,e.r,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(0,0,e.r*.78,0,Math.PI*2);ctx.stroke();}else{ctx.fillStyle=e.kind===1?"#ff8a3d66":e.kind===2?"#41efff55":"#ff4f8855";ctx.beginPath();ctx.arc(0,0,e.r,0,Math.PI*2);ctx.fill();}ctx.font=`${e.boss?e.r*1.45:e.r*1.65}px "Segoe UI Emoji","Apple Color Emoji",sans-serif`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("🐏",0,e.boss?3:2);if(e.kind===1&&!e.boss){ctx.strokeStyle="#ffe2a6";ctx.lineWidth=2;ctx.strokeRect(-e.r,-e.r,e.r*2,e.r*2);}ctx.restore();if(e.hp<e.maxHp){ctx.fillStyle="#231133";ctx.fillRect(e.x-e.r,e.y-e.r-11,e.r*2,4);ctx.fillStyle=e.boss?bc:"#ff467f";ctx.fillRect(e.x-e.r,e.y-e.r-11,e.r*2*(e.hp/e.maxHp),4);}}
      for(const p of g.powerUps){const color=p.kind==="bomb"?"#ffe94a":p.kind==="spread"?"#4eeaff":"#ff526f",label=p.kind==="bomb"?"爆":p.kind==="spread"?"散":"强";ctx.save();ctx.translate(p.x,p.y);ctx.rotate(g.time*.04);ctx.shadowBlur=24;ctx.shadowColor=color;ctx.fillStyle=color;ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?8:15;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();ctx.rotate(-g.time*.04);ctx.fillStyle="#21114c";ctx.font="bold 13px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(label,0,0);ctx.restore();}
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
      <div className="brand"><span className="brand-mark">LT</span><div><b>星际雷电</b><small>羊腿哪里跑专用</small></div><strong style={{marginLeft:"auto",fontSize:8,color:"#ffe36b",border:"1px solid #ffe36b66",padding:"5px 7px",letterSpacing:1}}>V3 · 八关强化版</strong></div>
      <div className="hud"><div><small>SCORE</small><b>{score.toString().padStart(6,"0")}</b><small>散 {spreadLevel} · 强 {powerLevel}</small></div><div className="wave">关卡 <b>{wave}</b>/8</div><div className="hp"><small>护盾 {hp}%</small><i><em style={{width:`${hp}%`}}/></i></div></div>
      <canvas ref={canvasRef} className="game-canvas" aria-label="游戏区域：拖动战机自动射击" />
      <button className="sound" onClick={()=>setSound(v=>!v)} aria-label={sound?"关闭音效":"打开音效"}>{sound?"◖))":"◖×"}</button>
      {phase!=="playing"&&<div className="overlay">
        {phase==="menu"&&<><div className="kicker">NEON STRIKE · 2088</div><h1>星际<br/><span>雷电</span></h1><p>八关连续作战 · 八种 Boss 弹幕<br/>拾取“爆 / 散 / 强”三种战斗能量</p><button className="start" onClick={start}><span>启动战机</span><i>▶</i></button><small className="tip">散弹三级加密　加强弹三级提升</small></>}
        {phase==="paused"&&<><h2>战斗暂停</h2><button className="start" onClick={()=>setPhase("playing")}><span>继续战斗</span><i>▶</i></button></>}
        {phase==="stageClear"&&<><div className="result-icon win">✓</div><h2>第 {wave} 关突破</h2><p>护盾已修复 25%<br/>下一关火力重置，重新收集强化</p><button className="start" onClick={nextStage}><span>进入第 {wave+1} 关</span><i>▶</i></button></>}
        {phase==="over"&&<><div className="result-icon">×</div><h2>战机坠毁</h2><p>本次得分 <b>{score}</b><br/>别让羊腿跑了，再来一次！</p><button className="start" onClick={start}><span>重新出击</span><i>↻</i></button></>}
        {phase==="victory"&&<><div className="kicker">TOP SECRET · 通关彩蛋</div><img src="./victory-easter-egg.png" alt="羊腿哪里跑小队通关彩蛋：星际女指挥官" style={{width:190,height:238,objectFit:"cover",objectPosition:"center top",borderRadius:12,border:"2px solid #6ef4ff",boxShadow:"0 0 32px #6753ff99"}}/><h2 style={{fontSize:25,marginBottom:0}}>指挥官亲自迎接</h2><p style={{margin:"5px 0"}}>最终得分 <b>{score}</b><br/>羊腿哪里跑小队专属彩蛋</p><button className="start" style={{marginTop:10}} onClick={start}><span>再战一局</span><i>↻</i></button></>}
      </div>}
      {phase==="playing"&&<button className="pause" onClick={()=>setPhase("paused")} aria-label="暂停">Ⅱ</button>}
      <div className="signature">YANG TUI NA LI PAO · EXCLUSIVE</div>
    </section>
  </main>;
}
