// ═══════════════════════════════════════════════
//  SYNTHWAVE AUDIO ENGINE
// ═══════════════════════════════════════════════
let AC=null;
function ctx(){if(!AC)AC=new(window.AudioContext||window.webkitAudioContext)();return AC;}

// Shared reverb + master chain
let masterGain,reverbNode,lpfNode;
function buildMaster(){
  const c=ctx();
  masterGain=c.createGain(); masterGain.gain.value=0.7;
  lpfNode=c.createBiquadFilter(); lpfNode.type='lowpass'; lpfNode.frequency.value=8000;
  // Simple reverb via convolver
  const buf=c.createBuffer(2,c.sampleRate*1.5,c.sampleRate);
  for(let ch=0;ch<2;ch++){const d=buf.getChannelData(ch);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,3);}
  reverbNode=c.createConvolver(); reverbNode.buffer=buf;
  const rvGain=c.createGain(); rvGain.gain.value=0.18;
  masterGain.connect(lpfNode); lpfNode.connect(c.destination);
  masterGain.connect(reverbNode); reverbNode.connect(rvGain); rvGain.connect(c.destination);
}

function note(freq,type,dur,vol,freqEnd,delay=0,useMaster=true){
  const c=ctx(); if(!masterGain)buildMaster();
  const t0=c.currentTime+delay/1000;
  const o=c.createOscillator(),g=c.createGain();
  o.connect(g);
  if(useMaster)g.connect(masterGain); else g.connect(c.destination);
  o.type=type; o.frequency.setValueAtTime(freq,t0);
  if(freqEnd)o.frequency.exponentialRampToValueAtTime(freqEnd,t0+dur);
  g.gain.setValueAtTime(0,t0);
  g.gain.linearRampToValueAtTime(vol,t0+Math.min(0.02,dur*0.1));
  g.gain.exponentialRampToValueAtTime(0.001,t0+dur);
  o.start(t0);o.stop(t0+dur+0.01);
}

// ── SYNTHWAVE MUSIC ──────────────────────────────
// A minor pentatonic: A2 C3 D3 E3 G3 A3 C4 D4 E4 G4
const PENTA=[110,130,147,165,196,220,262,294,330,392];
const KICK_FREQ=55; let musicRunning=false,musicTick=0,musicInterval=null;
let musicSpeed=1; // updated from gameSpeed

function startMusic(){
  if(musicRunning)return;
  musicRunning=true; musicTick=0;
  if(!masterGain)buildMaster();
  // BPM = 120 base, 16th note grid
  function tick(){
    if(!musicRunning)return;
    const bpm=Math.min(120+Math.floor((musicSpeed-1)*30),180);
    const sixteenth=60000/(bpm*4);
    const beat=musicTick%16;
    const bar=Math.floor(musicTick/16)%4;

    // Kick: 4-on-floor
    if(beat%4===0) playKick();
    // Snare: beats 4 & 12
    if(beat===4||beat===12) playSnare();
    // Hi-hat: every 2 sixteenths
    if(beat%2===0) playHihat();
    // Bass: follows kick, root A
    if(beat%4===0) playBass(bar);
    // Arp: 8th notes
    if(beat%2===0) playArp(bar,beat);
    // Lead melody: every bar on beat 0
    if(beat===0&&musicSpeed>1.3) playLead(bar);

    musicTick++;
    musicInterval=setTimeout(tick,sixteenth);
  }
  tick();
}

function stopMusic(){
  musicRunning=false;
  if(musicInterval)clearTimeout(musicInterval);
}

function playKick(){
  const c=ctx(); const g=c.createGain();
  const o=c.createOscillator();
  o.connect(g); g.connect(masterGain);
  o.type='sine'; o.frequency.setValueAtTime(150,c.currentTime);
  o.frequency.exponentialRampToValueAtTime(40,c.currentTime+0.15);
  g.gain.setValueAtTime(0.7,c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.3);
  o.start(); o.stop(c.currentTime+0.3);
}
function playSnare(){
  const c=ctx(); const buf=c.createBuffer(1,c.sampleRate*0.15,c.sampleRate);
  const d=buf.getChannelData(0); for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2);
  const s=c.createBufferSource(),g=c.createGain(),lp=c.createBiquadFilter();
  s.buffer=buf; lp.type='bandpass'; lp.frequency.value=3000; lp.Q.value=0.5;
  s.connect(lp); lp.connect(g); g.connect(masterGain);
  g.gain.setValueAtTime(0.35,c.currentTime); g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.15);
  s.start(); s.stop(c.currentTime+0.15);
}
function playHihat(){
  const c=ctx(); const buf=c.createBuffer(1,c.sampleRate*0.05,c.sampleRate);
  const d=buf.getChannelData(0); for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,3);
  const s=c.createBufferSource(),g=c.createGain(),hp=c.createBiquadFilter();
  s.buffer=buf; hp.type='highpass'; hp.frequency.value=8000;
  s.connect(hp); hp.connect(g); g.connect(masterGain);
  g.gain.setValueAtTime(0.12,c.currentTime); g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.05);
  s.start(); s.stop(c.currentTime+0.05);
}
function playBass(bar){
  const roots=[110,110,98,110]; // A A G A
  note(roots[bar],'sawtooth',0.18,0.3,null,0);
  note(roots[bar]*2,'sawtooth',0.08,0.1,null,90);
}
function playArp(bar,beat){
  const patterns=[[0,4,7,4],[2,5,9,5],[0,3,7,3],[2,4,9,4]];
  const idx=patterns[bar%4][(beat/2)%4];
  note(PENTA[idx]*2,'triangle',0.12,0.15);
}
function playLead(bar){
  const melody=[9,7,4,9,7,5,4,7];
  note(PENTA[melody[bar%8]]*2,'sine',0.25,0.18);
}

// ── SFX ──────────────────────────────────────────
const SFX={
  jump:   ()=>{note(300,'sine',0.08,0.25,650,0,false);},
  land:   ()=>{note(120,'sine',0.08,0.2,70,0,false);},
  slide:  ()=>{note(200,'triangle',0.2,0.15,70,0,false);},
  lane:   ()=>{note(560,'triangle',0.05,0.08,null,0,false);},
  coin:   (c)=>{const b=900+Math.min(c,10)*40;[b,b*1.26,b*1.5].forEach((f,i)=>note(f,'sine',0.12,0.18,null,i*50,false));},
  combo:  (n)=>{[523,659,784,1047].slice(0,n).forEach((f,i)=>note(f,'sine',0.15,0.2,null,i*70,false));},
  comboBreak:()=>{note(200,'triangle',0.25,0.1,80,0,false);},
  shield: ()=>{note(800,'sine',0.1,0.22,350,0,false);},
  powerup:()=>{[440,550,660,880].forEach((f,i)=>note(f,'sine',0.12,0.2,null,i*55,false));},
  death:  ()=>{[440,330,220,110].forEach((f,i)=>note(f,'triangle',0.3,0.18,null,i*120,false));},
  pause:  ()=>{note(440,'sine',0.1,0.08,null,0,false);},
  nearMiss:()=>{note(700,'triangle',0.05,0.07,280,0,false);},
  boss:   ()=>{[110,98,88,73].forEach((f,i)=>note(f,'sawtooth',0.4,0.3,null,i*180));},
  countdown:()=>{note(880,'sine',0.1,0.3,null,0,false);},
  go:     ()=>{[440,550,660,880].forEach((f,i)=>note(f,'sine',0.2,0.35,null,i*60,false));},
  shop:   ()=>{note(660,'sine',0.1,0.15,880,0,false);},
};
function speak(t){try{const u=new SpeechSynthesisUtterance(t);u.rate=1.1;u.pitch=1.15;u.volume=0.65;speechSynthesis.speak(u);}catch(e){}}

// ═══════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════
const LW=3, LANES=[-LW,0,LW];
const JF=0.37, GR=0.016, SDUR=760;
const SI=0.42, SINC=0.000072;
const CWIN=2000;
const CMILES=[3,5,8,12,20];

const THEMES=[
  {name:'NEON CITY',  sky:0x000612,fog:0x000612,fd:0.0062,track:0x0c0c1a},
  {name:'DESERT',     sky:0x190800,fog:0x190800,fd:0.006, track:0x1a100a},
  {name:'DEEP SPACE', sky:0x000005,fog:0x000005,fd:0.005, track:0x050511},
  {name:'UNDERWATER', sky:0x001828,fog:0x001828,fd:0.008, track:0x00181f},
];
const TMILES=[0,2500,6000,12000];

// [bodyCol, headCol, legCol, shoeEmissive]
const SKINS=[
  [0x00ddcc,0xffccaa,0x0a2244,0x0088dd], // Cyber
  [0x111111,0x333333,0x222222,0xff2200], // Ninja
  [0xddddff,0xffccaa,0x334466,0x00aaff], // Astro
  [0xddddff,0xffffff,0x888888,0x00ffff], // Ghost (shop)
  [0xff4400,0xffcc00,0x441100,0xff8800], // Dragon (shop)
];

const PU={
  MAGNET: {icon:'🧲',col:'#ff44ff',dur:6000,lbl:'MAGNET'},
  SHIELD: {icon:'🛡️',col:'#00aaff',dur:8000,lbl:'SHIELD'},
  SLOWMO: {icon:'⏱️',col:'#aaffaa',dur:5000,lbl:'SLOW-MO'},
  DBLPTS: {icon:'✨',col:'#ffff00',dur:8000,lbl:'2X PTS'},
  HOVER:  {icon:'🛹',col:'#ff8800',dur:4000,lbl:'HOVERBOARD'},
};

const SHOP_ITEMS=[
  {id:'skin_ghost', name:'GHOST SKIN',   icon:'👻',cost:150,type:'skin',skinIdx:3},
  {id:'skin_dragon',name:'DRAGON SKIN',  icon:'🐉',cost:300,type:'skin',skinIdx:4},
  {id:'pu_dur',     name:'POWERUP+',     icon:'⚡',cost:100,type:'upgrade',key:'pu_dur'},
  {id:'magnet_rng', name:'MAGNET+',      icon:'🧲',cost:80, type:'upgrade',key:'magnet_rng'},
  {id:'start_shield',name:'START SHIELD',icon:'🛡️',cost:120,type:'upgrade',key:'start_shield'},
  {id:'trail_color',name:'RAINBOW TRAIL',icon:'🌈',cost:60, type:'upgrade',key:'trail_color'},
];

const ACHS=[
  {id:'c1',   lbl:'FIRST COIN',     icon:'🪙',chk:s=>s.coins>=1},
  {id:'c50',  lbl:'50 COINS',       icon:'💰',chk:s=>s.coins>=50},
  {id:'c100', lbl:'COIN HOARDER',   icon:'🤑',chk:s=>s.coins>=100},
  {id:'cm3',  lbl:'COMBO X3',       icon:'🔥',chk:s=>s.combo>=3},
  {id:'cm10', lbl:'COMBO X10',      icon:'⚡',chk:s=>s.combo>=10},
  {id:'cm20', lbl:'LEGENDARY',      icon:'👑',chk:s=>s.combo>=20},
  {id:'s1k',  lbl:'1K POINTS',      icon:'🎯',chk:s=>s.score>=1000},
  {id:'s10k', lbl:'10K POINTS',     icon:'💎',chk:s=>s.score>=10000},
  {id:'pu1',  lbl:'POWERED UP',     icon:'⚡',chk:s=>s.pus>=1},
  {id:'dj',   lbl:'DOUBLE JUMPER',  icon:'🦘',chk:s=>s.dj>=1},
  {id:'nm',   lbl:'CLOSE CALL',     icon:'😰',chk:s=>s.nm>=1},
  {id:'t1',   lbl:'DESERT RUNNER',  icon:'🏜️',chk:s=>s.theme>=1},
  {id:'t2',   lbl:'SPACE RUNNER',   icon:'🚀',chk:s=>s.theme>=2},
  {id:'t3',   lbl:'DEEP DIVER',     icon:'🌊',chk:s=>s.theme>=3},
  {id:'boss', lbl:'BOSS SURVIVOR',  icon:'💀',chk:s=>s.bossSurvived>=1},
  {id:'hover',lbl:'HOVERBOARDER',   icon:'🛹',chk:s=>s.hovered>=1},
  {id:'miss1',lbl:'DAILY HERO',     icon:'📅',chk:s=>s.missionsDone>=1},
  {id:'str5', lbl:'5 DODGE STREAK', icon:'🔥',chk:s=>(s.streak||0)>=5},
  {id:'str20',lbl:'DODGE MASTER',   icon:'⚡',chk:s=>(s.streak||0)>=20},
  {id:'hamza',lbl:'SECRET FOUND',   icon:'🥚',chk:s=>s.hamza>=1},
];

// Daily missions pool
const MISSIONS=[
  {id:'m_coins',  lbl:'Collect 20 coins',     goal:20, stat:'coins'},
  {id:'m_combo',  lbl:'Reach x5 combo',       goal:5,  stat:'combo'},
  {id:'m_dist',   lbl:'Run 500m',             goal:500,stat:'dist'},
  {id:'m_nojump', lbl:'100m without jumping', goal:100,stat:'nojumpDist'},
  {id:'m_pu',     lbl:'Collect 3 power-ups',  goal:3,  stat:'pus'},
  {id:'m_dj',     lbl:'Double-jump 5 times',  goal:5,  stat:'dj'},
];

// ═══════════════════════════════════════════════
//  PERSISTENT STORAGE
// ═══════════════════════════════════════════════
function ls(k,def){try{const v=localStorage.getItem(k);return v!==null?JSON.parse(v):def;}catch(e){return def;}}
function ss(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}

let totalCoins=ls('nd_coins',0);
let bestScore=ls('nd_best',0);
let ownedItems=new Set(ls('nd_owned',[]));
let unlockedAchs=new Set(ls('nd_achs',[]));
let upgrades=ls('nd_upgrades',{});
let scores=ls('nd_scores',[]);

// Daily mission
let todayMission=null,missionProgress=0,missionDone=false;
function setupDailyMission(){
  const today=new Date().toDateString();
  const saved=ls('nd_mission',null);
  if(saved&&saved.date===today){
    todayMission=MISSIONS.find(m=>m.id===saved.id)||MISSIONS[0];
    missionProgress=saved.progress||0;
    missionDone=saved.done||false;
  }else{
    todayMission=MISSIONS[Math.floor(Math.random()*MISSIONS.length)];
    missionProgress=0; missionDone=false;
    ss('nd_mission',{date:today,id:todayMission.id,progress:0,done:false});
  }
  updateMissionUI();
}
function updateMissionUI(){
  if(!todayMission)return;
  document.getElementById('mt').textContent='📅 DAILY MISSION';
  document.getElementById('md').textContent=`${todayMission.lbl} (${Math.min(missionProgress,todayMission.goal)}/${todayMission.goal})`;
  document.getElementById('mf').style.width=Math.min(missionProgress/todayMission.goal*100,100)+'%';
}
function updateMission(stat,val){
  if(!todayMission||missionDone||todayMission.stat!==stat)return;
  missionProgress=Math.max(missionProgress,val);
  if(missionProgress>=todayMission.goal&&!missionDone){
    missionDone=true;
    totalCoins+=50; ss('nd_coins',totalCoins); updateTotalCoinsUI();
    ss('nd_mission',{date:new Date().toDateString(),id:todayMission.id,progress:missionProgress,done:true});
    showAch({id:'miss_done',lbl:'MISSION COMPLETE! +50 COINS',icon:'📅'});
    flashScreen('#ffff0020');
    sessionStats.missionsDone=(sessionStats.missionsDone||0)+1;
    checkAchs();
  }else{
    ss('nd_mission',{date:new Date().toDateString(),id:todayMission.id,progress:missionProgress,done:false});
  }
  updateMissionUI();
}

// ═══════════════════════════════════════════════
//  GAME STATE
// ═══════════════════════════════════════════════
let running=false,paused=false;
let score=0,coins=0;
let spd=SI; // game speed
let lane=1,tx=0;
let vy=0,jumping=false,sliding=false,slideEnd=0;
let dj=false,djUsed=false; // double jump
let fid,stk=0,rt=0; // frameId, spawnTick, runTime
let combo=0,comboT=null,bestCombo=0,lastCoin=0;
let activePU={};
let skin=0;
let theme=0;
let shake=0;
let nmTimer=null; // near miss timer
let coinZoneActive=false,czTimer=null;
let bossActive=false,bossObj=null,bossHP=0;
let bossWaveTimer=null;
let nojumpDist=0; // for mission
let distM=0; // distance in meters
let obstacleStreak=0; // consecutive obstacles dodged
let lastTheme=-1;
let eggTyped=''; // easter egg typing buffer

let sessionStats={coins:0,score:0,combo:0,pus:0,dj:0,nm:0,theme:0,bossSurvived:0,hovered:0,missionsDone:0,dist:0,nojumpDist:0};
let sessionAchs=[];

// THREE
let scene,cam,ren;
let pg,legL,legR,armL,armR; // player group + limbs
let trail=[],obstacles=[],coinObjs=[],puObjs=[],deathParts=[];
let gTiles=[]; // ground tiles
let ghostObj=null; // ghost replay
let ghostData=[],ghostRec=[]; // recording
let lastGhostData=ls('nd_ghost',[]);

// ═══════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════
function init(){
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x000612);
  scene.fog=new THREE.FogExp2(0x000612,0.0062);

  cam=new THREE.PerspectiveCamera(68,innerWidth/innerHeight,0.1,400);
  cam.position.set(0,5.5,13); cam.lookAt(0,1.5,-15);

  ren=new THREE.WebGLRenderer({antialias:true});
  ren.setSize(innerWidth,innerHeight);
  ren.setPixelRatio(Math.min(devicePixelRatio,2));
  ren.shadowMap.enabled=true;
  ren.shadowMap.type=THREE.PCFSoftShadowMap;
  document.getElementById('gc').insertBefore(ren.domElement,document.getElementById('ui'));

  scene.add(new THREE.AmbientLight(0x112244,1.6));
  const sun=new THREE.DirectionalLight(0x88ddff,1.0);
  sun.position.set(8,20,8); sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{near:0.5,far:200,left:-40,right:40,top:40,bottom:-40});
  scene.add(sun);
  const nl=new THREE.PointLight(0x00ffff,1.2,28); nl.position.set(-3,1.5,-3); scene.add(nl);
  const nr=new THREE.PointLight(0xff00ff,1.2,28); nr.position.set(3,1.5,-3); scene.add(nr);

  buildSpeedLines();
  createPlayer();
  createGround();
  createCity();
  buildPUHUD();
  buildShop();
  setupDailyMission();
  renderLeaderboard();
  updateTotalCoinsUI();

  window.addEventListener('resize',onResize);
  document.addEventListener('keydown',onKey);
  document.addEventListener('keydown',onMenuKey); // easter egg typing
  document.getElementById('start-btn').addEventListener('click',()=>countdown(startGame));
  document.getElementById('restart-btn').addEventListener('click',()=>countdown(()=>{document.getElementById('gos').classList.add('hidden');resetGame();mainLoop();}));
  document.getElementById('res-btn').addEventListener('click',resumeGame);
  document.getElementById('quit-btn').addEventListener('click',quitGame);
  document.getElementById('shop-btn').addEventListener('click',openShop);
  document.getElementById('shop-close').addEventListener('click',closeShop);
  document.getElementById('gos-shop-btn').addEventListener('click',()=>{document.getElementById('gos').classList.add('hidden');openShop();});
  document.getElementById('egg-close').addEventListener('click',closeEasterEgg);
  document.querySelectorAll('.skbtn').forEach(b=>{
    b.addEventListener('click',()=>{
      const si=parseInt(b.dataset.skin);
      if((si===3&&!ownedItems.has('skin_ghost'))||(si===4&&!ownedItems.has('skin_dragon'))){openShop();return;}
      document.querySelectorAll('.skbtn').forEach(x=>x.classList.remove('sel'));
      b.classList.add('sel'); skin=si; rebuildPlayer();
    });
  });
}

// ═══════════════════════════════════════════════
//  SPEED LINES (CSS animated)
// ═══════════════════════════════════════════════
function buildSpeedLines(){
  const c=document.getElementById('splines');
  for(let i=0;i<16;i++){
    const l=document.createElement('div');
    l.className='spline';
    const deg=-20+Math.random()*40;
    const len=40+Math.random()*40;
    l.style.cssText=`top:${10+Math.random()*80}%;left:${Math.random()>0.5?'-'+len+'%':'100%'};width:${len}%;transform:rotate(${deg}deg);opacity:${0.3+Math.random()*0.4};animation:splineAnim ${0.3+Math.random()*0.4}s linear ${Math.random()*0.5}s infinite;`;
    c.appendChild(l);
  }
  const style=document.createElement('style');
  style.textContent=`@keyframes splineAnim{0%{opacity:0;}20%{opacity:0.4;}80%{opacity:0.3;}100%{opacity:0;}}`;
  document.head.appendChild(style);
}

// ═══════════════════════════════════════════════
//  COUNTDOWN
// ═══════════════════════════════════════════════
function countdown(cb){
  const el=document.getElementById('countdown');
  document.getElementById('ss').classList.add('hidden');
  let n=3;
  function tick(){
    if(n>0){
      el.textContent=n; el.style.opacity='1';
      SFX.countdown();
      setTimeout(()=>{el.style.opacity='0';n--;setTimeout(tick,300);},700);
    }else{
      el.textContent='GO!'; el.style.opacity='1'; SFX.go(); speak('GO');
      setTimeout(()=>{el.style.opacity='0';cb();},600);
    }
  }
  tick();
}

// ═══════════════════════════════════════════════
//  PLAYER
// ═══════════════════════════════════════════════
let pmats={};
function createPlayer(){
  pg=new THREE.Group();
  const sk=SKINS[skin];
  pmats.body =new THREE.MeshPhongMaterial({color:sk[0],emissive:new THREE.Color(sk[0]).multiplyScalar(0.15),shininess:90});
  pmats.head =new THREE.MeshPhongMaterial({color:sk[1],emissive:0x110800});
  pmats.leg  =new THREE.MeshPhongMaterial({color:sk[2],emissive:new THREE.Color(sk[2]).multiplyScalar(0.18),shininess:60});
  pmats.shoe =new THREE.MeshPhongMaterial({color:0xffffff,emissive:sk[3],emissiveIntensity:0.6});
  pmats.arm  =new THREE.MeshPhongMaterial({color:sk[0],emissive:new THREE.Color(sk[0]).multiplyScalar(0.12)});
  pmats.vis  =new THREE.MeshBasicMaterial({color:0x00ffff});
  pmats.str  =new THREE.MeshBasicMaterial({color:0x00ffff});

  const body=new THREE.Mesh(new THREE.BoxGeometry(0.95,1.35,0.70),pmats.body);
  body.position.y=1.475; body.castShadow=true; pg.add(body);
  const str=new THREE.Mesh(new THREE.BoxGeometry(0.75,0.09,0.72),pmats.str);
  str.position.y=1.60; pg.add(str);
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.68,0.68,0.68),pmats.head);
  head.position.y=2.48; head.castShadow=true; pg.add(head);
  const vis=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.18,0.1),pmats.vis);
  vis.position.set(0,2.50,0.35); pg.add(vis);
  armL=new THREE.Mesh(new THREE.BoxGeometry(0.28,0.78,0.28),pmats.arm);
  armL.position.set(-0.62,1.55,0); armL.castShadow=true;
  armR=new THREE.Mesh(new THREE.BoxGeometry(0.28,0.78,0.28),pmats.arm);
  armR.position.set(0.62,1.55,0); armR.castShadow=true;
  pg.add(armL,armR);
  function mkLeg(x){
    const g=new THREE.Group();
    const th=new THREE.Mesh(new THREE.BoxGeometry(0.36,0.58,0.36),pmats.leg); th.position.y=-0.29; th.castShadow=true; g.add(th);
    const sh=new THREE.Mesh(new THREE.BoxGeometry(0.30,0.54,0.30),pmats.leg); sh.position.y=-0.83; sh.castShadow=true; g.add(sh);
    const shoe=new THREE.Mesh(new THREE.BoxGeometry(0.38,0.20,0.52),pmats.shoe); shoe.position.set(0,-1.18,0.10); shoe.castShadow=true; g.add(shoe);
    g.position.set(x,0.80,0); return g;
  }
  legL=mkLeg(-0.28); legR=mkLeg(0.28); pg.add(legL,legR);

  // Skateboard — hidden by default, shown when HOVER powerup active
  const boardGroup = new THREE.Group();
  // Deck
  const deckMat = new THREE.MeshPhongMaterial({color:0xff8800,emissive:0x441100,shininess:100});
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.1,0.12,0.42),deckMat);
  deck.position.y=0; boardGroup.add(deck);
  // Trucks
  const truckMat = new THREE.MeshPhongMaterial({color:0x888888,emissive:0x222222,shininess:120});
  [-0.32,0.32].forEach(z=>{
    const truck=new THREE.Mesh(new THREE.BoxGeometry(1.0,0.08,0.18),truckMat);
    truck.position.set(0,-0.08,z); boardGroup.add(truck);
  });
  // Wheels
  const wheelMat=new THREE.MeshPhongMaterial({color:0x222222,emissive:0x00ffcc,emissiveIntensity:0.5,shininess:60});
  [[-0.42,-0.12,-0.28],[0.42,-0.12,-0.28],[-0.42,-0.12,0.28],[0.42,-0.12,0.28]].forEach(([x,y,z])=>{
    const w=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,0.12,10),wheelMat);
    w.rotation.z=Math.PI/2; w.position.set(x,y,z); boardGroup.add(w);
  });
  // Neon underglow strip
  const glowMat=new THREE.MeshBasicMaterial({color:0x00ffcc});
  const glow=new THREE.Mesh(new THREE.BoxGeometry(1.0,0.03,0.36),glowMat);
  glow.position.y=-0.07; boardGroup.add(glow);

  boardGroup.position.set(0,-0.08,0); // sits right below feet
  boardGroup.visible=false;
  boardGroup.name='skateboard';
  pg.add(boardGroup);

  pg.position.set(0,0,0); scene.add(pg);
}
function rebuildPlayer(){
  if(pg){scene.remove(pg);pg=null;legL=legR=armL=armR=null;}
  createPlayer();
}

// ═══════════════════════════════════════════════
//  GROUND
// ═══════════════════════════════════════════════
function createGround(){
  const tm=new THREE.MeshPhongMaterial({color:0x0c0c1a,shininess:100});
  const lm=new THREE.MeshBasicMaterial({color:0x00ffff});
  const em=new THREE.MeshBasicMaterial({color:0xff00ff});
  for(let i=0;i<14;i++){
    const g=new THREE.Group();
    const t=new THREE.Mesh(new THREE.PlaneGeometry(LW*3+2.5,22),tm);
    t.rotation.x=-Math.PI/2; t.receiveShadow=true; g.add(t);
    [-LW/2,LW/2].forEach(x=>{const d=new THREE.Mesh(new THREE.PlaneGeometry(0.07,22),lm);d.rotation.x=-Math.PI/2;d.position.set(x,0.01,0);g.add(d);});
    [-(LW*1.5+0.5),LW*1.5+0.5].forEach((x,i)=>{const e=new THREE.Mesh(new THREE.PlaneGeometry(0.18,22),i===0?em:lm);e.rotation.x=-Math.PI/2;e.position.set(x,0.01,0);g.add(e);});
    for(let d=0;d<5;d++){const dash=new THREE.Mesh(new THREE.PlaneGeometry(0.06,2.5),new THREE.MeshBasicMaterial({color:0xffffff,opacity:0.1,transparent:true}));dash.rotation.x=-Math.PI/2;dash.position.set(0,0.01,-9+d*4.5);g.add(dash);}
    g.position.set(0,-0.01,i*22-80); scene.add(g); gTiles.push(g);
  }
}

// ═══════════════════════════════════════════════
//  CITY
// ═══════════════════════════════════════════════
function createCity(){
  const cols=[0x00ffff,0xff00ff,0xffaa00,0x0088ff,0xff3366,0x44ff88];
  for(let i=0;i<60;i++){
    const h=Math.random()*38+8,w=Math.random()*5+3;
    const col=cols[Math.floor(Math.random()*cols.length)];
    const m=new THREE.MeshPhongMaterial({color:0x080820,emissive:col,emissiveIntensity:0.05+Math.random()*0.07});
    const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,w),m);
    const side=Math.random()>0.5?24:-24;
    b.position.set(side+(Math.random()-0.5)*10,h/2,-Math.random()*320);
    b.castShadow=true; scene.add(b);
  }
}

// ═══════════════════════════════════════════════
//  OBSTACLES
// ═══════════════════════════════════════════════
function mkObs(zPos,forceLane){
  const l=forceLane!==undefined?forceLane:Math.floor(Math.random()*3);
  const t=Math.random(); let h,y,col;
  if(t<0.33){h=3.0;y=1.50;col=0xff2244;}
  else if(t<0.66){h=0.75;y=0.375;col=0xff8800;}
  else{h=2.2;y=1.10;col=0xcc0033;}
  const m=new THREE.MeshPhongMaterial({color:col,emissive:new THREE.Color(col).multiplyScalar(0.28),shininess:80});
  const o=new THREE.Mesh(new THREE.BoxGeometry(2.1,h,0.95),m);
  o.position.set(LANES[l],y,zPos); o.castShadow=true;
  o.add(new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry),new THREE.LineBasicMaterial({color:col})));
  o.userData={lane:l,h};
  scene.add(o); obstacles.push(o);
}

// Moving obstacle
function mkMovingObs(zPos){
  const h=2.0,col=0xff6600;
  const m=new THREE.MeshPhongMaterial({color:col,emissive:new THREE.Color(col).multiplyScalar(0.3),shininess:80});
  const o=new THREE.Mesh(new THREE.BoxGeometry(2.1,h,0.95),m);
  o.position.set(LANES[Math.floor(Math.random()*3)],1.0,zPos); o.castShadow=true;
  o.add(new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry),new THREE.LineBasicMaterial({color:col})));
  o.userData={h,moving:true,dir:Math.random()>0.5?1:-1,laneF:0};
  scene.add(o); obstacles.push(o);
}

// Boss ball
function spawnBoss(){
  if(bossActive)return;
  bossActive=true; bossHP=3;
  document.getElementById('boss-warn').style.opacity='1';
  updateBossHPUI(1);
  SFX.boss(); speak('BOSS INCOMING');
  setTimeout(()=>{document.getElementById('boss-warn').style.opacity='0';},2000);
  const geo=new THREE.SphereGeometry(1.5,16,16);
  const mat=new THREE.MeshPhongMaterial({color:0xff0000,emissive:0x440000,shininess:120});
  bossObj=new THREE.Mesh(geo,mat);
  bossObj.position.set(0,1.5,-120); bossObj.castShadow=true;
  scene.add(bossObj);
  // Boss waves: moves in for 12s then dies
  bossWaveTimer=setTimeout(()=>{if(bossObj){scene.remove(bossObj);bossObj=null;}bossActive=false;sessionStats.bossSurvived++;checkAchs();showFT('👊 BOSS SURVIVED!','#ff8800');score+=500;},12000);
}

// Coin zone
function startCoinZone(){
  if(coinZoneActive)return;
  coinZoneActive=true;
  const cz=document.getElementById('czbar');
  cz.style.opacity='1'; cz.textContent='★ COIN ZONE — 5X ★';
  // Flood coins
  for(let i=0;i<15;i++) mkCoin(-90-i*3,Math.floor(Math.random()*3));
  if(czTimer)clearTimeout(czTimer);
  czTimer=setTimeout(()=>{coinZoneActive=false;cz.style.opacity='0';},8000);
}

// ═══════════════════════════════════════════════
//  POWERUPS
// ═══════════════════════════════════════════════
function buildPUHUD(){
  const h=document.getElementById('puhud'); h.innerHTML='';
  Object.entries(PU).forEach(([k,v])=>{
    const s=document.createElement('div');
    s.className='puslot'; s.id='pu-'+k;
    s.innerHTML=`${v.icon}<div class="pubar" id="pub-${k}" style="height:0%"></div>`;
    s.title=v.lbl; h.appendChild(s);
  });
}
function activatePU(type){
  const info=PU[type];
  if(!info)return;
  const dur=info.dur*(upgrades.pu_dur?1.5:1);
  if(activePU[type])clearTimeout(activePU[type].t);
  document.getElementById('pu-'+type)?.classList.add('on');
  const t0=Date.now();
  function bar(){
    if(!activePU[type])return;
    const pct=Math.max(0,100-(Date.now()-t0)/dur*100);
    const b=document.getElementById('pub-'+type);
    if(b)b.style.height=pct+'%';
    if(pct>0)requestAnimationFrame(bar);
  }
  bar();
  const tm=setTimeout(()=>{
    delete activePU[type];
    document.getElementById('pu-'+type)?.classList.remove('on');
    const b=document.getElementById('pub-'+type); if(b)b.style.height='0%';
    if(type==='SLOWMO'){/* already handled by activePU check */}
    if(type==='HOVER'){pg.position.y=0;}
  },dur);
  activePU[type]={t:tm};
  SFX.powerup();
  showFT(info.icon+' '+info.lbl,'#fff');
  if(type==='HOVER'){speak('HOVERBOARD');sessionStats.hovered++;}
  else speak(info.lbl);
  sessionStats.pus++;
  updateMission('pus',sessionStats.pus);
  checkAchs();
}
function mkPU(zPos){
  const types=Object.keys(PU);
  const type=types[Math.floor(Math.random()*types.length)];
  const l=Math.floor(Math.random()*3);
  const info=PU[type];
  const m=new THREE.MeshPhongMaterial({color:new THREE.Color(info.col),emissive:new THREE.Color(info.col),emissiveIntensity:0.4,shininess:120});
  const mesh=new THREE.Mesh(new THREE.OctahedronGeometry(0.55,0),m);
  mesh.position.set(LANES[l],1.3,zPos); mesh.userData={type,lane:l};
  scene.add(mesh); puObjs.push(mesh);
}

// ═══════════════════════════════════════════════
//  COINS
// ═══════════════════════════════════════════════
function mkCoin(zPos,l){
  const lane=l!==undefined?l:Math.floor(Math.random()*3);
  const m=new THREE.MeshPhongMaterial({color:0xffd700,emissive:0xffaa00,emissiveIntensity:0.5,shininess:140});
  const c=new THREE.Mesh(new THREE.CylinderGeometry(0.44,0.44,0.13,14),m);
  c.rotation.z=Math.PI/2; c.position.set(LANES[lane],1.2,zPos);
  c.userData={lane,collected:false}; scene.add(c); coinObjs.push(c);
}

// ═══════════════════════════════════════════════
//  GHOST
// ═══════════════════════════════════════════════
function recordGhost(){
  if(!pg)return;
  ghostRec.push({x:pg.position.x,y:pg.position.y,z:rt});
  if(ghostRec.length>6000)ghostRec.shift(); // cap
}
function spawnGhostRunner(){
  if(!lastGhostData||lastGhostData.length<10)return;
  const geo=new THREE.BoxGeometry(0.9,2.6,0.7);
  const mat=new THREE.MeshBasicMaterial({color:0x00ffff,transparent:true,opacity:0.18,wireframe:true});
  ghostObj=new THREE.Mesh(geo,mat);
  ghostObj.position.set(lastGhostData[0].x,lastGhostData[0].y,pg?pg.position.z:-5);
  scene.add(ghostObj);
}
let ghostIdx=0;
function updateGhost(){
  if(!ghostObj||!lastGhostData||lastGhostData.length<2)return;
  const frame=lastGhostData[Math.min(ghostIdx,lastGhostData.length-1)];
  if(frame){
    ghostObj.position.x+=(frame.x-ghostObj.position.x)*0.15;
    ghostObj.position.y=frame.y;
  }
  ghostIdx++;
  if(ghostIdx>=lastGhostData.length){scene.remove(ghostObj);ghostObj=null;}
}

// ═══════════════════════════════════════════════
//  TRAIL
// ═══════════════════════════════════════════════
function spawnTrail(){
  if(spd/SI<1.3)return;
  const cols=upgrades.trail_color?[0xff0000,0xff8800,0xffff00,0x00ff00,0x00ffff,0xff00ff]:
    activePU.SHIELD?[0x00aaff]:activePU.MAGNET?[0xff44ff]:activePU.DBLPTS?[0xffff00]:[0x00ffcc];
  const col=cols[Math.floor(Math.random()*cols.length)];
  const m=new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.65});
  const p=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.1,0.1),m);
  p.position.copy(pg.position); p.position.y+=0.5+Math.random()*1.2; p.position.x+=(Math.random()-0.5)*0.4;
  scene.add(p); trail.push({mesh:p,life:1});
}
function updTrail(){
  spawnTrail();
  for(let i=trail.length-1;i>=0;i--){
    const t=trail[i]; t.life-=0.045;
    t.mesh.material.opacity=t.life*0.55; t.mesh.position.z+=spd*0.25; t.mesh.scale.setScalar(t.life);
    if(t.life<=0){scene.remove(t.mesh);trail.splice(i,1);}
  }
}

// ═══════════════════════════════════════════════
//  DEATH PARTICLES
// ═══════════════════════════════════════════════
function spawnDeathParts(){
  for(let i=0;i<32;i++){
    const col=[0x00ffcc,0xff00aa,0xffd700,0xff3366][Math.floor(Math.random()*4)];
    const m=new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:1});
    const p=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.18,0.18),m);
    p.position.copy(pg.position); p.position.y+=1;
    const v=new THREE.Vector3((Math.random()-0.5)*0.4,Math.random()*0.35+0.1,(Math.random()-0.5)*0.3);
    scene.add(p); deathParts.push({mesh:p,vel:v,life:1});
  }
}
function updDeathParts(){
  for(let i=deathParts.length-1;i>=0;i--){
    const p=deathParts[i]; p.life-=0.022; p.mesh.material.opacity=p.life;
    p.vel.y-=0.012; p.mesh.position.add(p.vel); p.mesh.rotation.x+=0.15; p.mesh.rotation.z+=0.1;
    if(p.life<=0){scene.remove(p.mesh);deathParts.splice(i,1);}
  }
}

// ═══════════════════════════════════════════════
//  SPAWN
// ═══════════════════════════════════════════════
function spawnAll(){
  stk++;
  const iv=Math.max(44,Math.floor(82-(spd-SI)*210));
  if(stk%iv===0){
    const bl=new Set(); const n=Math.random()<0.28?2:1;
    for(let i=0;i<n;i++){
      let l,tries=0;
      do{l=Math.floor(Math.random()*3);tries++;}while(bl.has(l)&&tries<8);
      if(bl.size<2){bl.add(l); Math.random()<0.2&&spd/SI>2?mkMovingObs(-115):mkObs(-115);}
    }
  }
  if(stk%38===0&&Math.random()<0.65){
    const l=Math.floor(Math.random()*3);
    const n=Math.random()<0.35?6:1;
    for(let i=0;i<n;i++)mkCoin(-92-i*3,l);
  }
  if(stk%180===0&&Math.random()<0.6) mkPU(-110);
  // Boss wave every 5000 pts
  if(score>0&&Math.floor(score/5000)>Math.floor((score-spd*0.38)/5000)&&!bossActive) spawnBoss();
  // Coin zone every ~3000 pts
  if(score>0&&Math.floor(score/3000)>Math.floor((score-spd*0.38)/3000)&&!coinZoneActive) startCoinZone();
}

// ═══════════════════════════════════════════════
//  COMBO
// ═══════════════════════════════════════════════
function onCoin(){
  const now=Date.now(),gap=now-lastCoin; lastCoin=now;
  if(gap<CWIN){
    combo++; if(combo>bestCombo){bestCombo=combo;sessionStats.combo=combo;}
    if(CMILES.includes(combo)){SFX.combo(CMILES.indexOf(combo)+1);flashScreen('#ffd70020');SFX.coin(combo);
      const lb=['COMBO!','SICK!','INSANE!','GODLIKE!','LEGENDARY!']; speak(lb[Math.min(CMILES.indexOf(combo),lb.length-1)]);}
  }else{if(combo>0)SFX.comboBreak();combo=1;}
  if(comboT)clearTimeout(comboT);
  comboT=setTimeout(()=>{if(combo>0)SFX.comboBreak();combo=0;updComboUI();},CWIN);
  const mult=(1+Math.floor(combo/3))*(activePU.DBLPTS?2:1)*(coinZoneActive?5:1);
  const pts=50*mult; score+=pts; coins++;
  sessionStats.coins=coins; sessionStats.score=score;
  totalCoins++; ss('nd_coins',totalCoins); updateTotalCoinsUI();
  SFX.coin(combo);
  showFT(`+${pts}`,combo>2?'#ffd700':'#00ffff');
  updComboUI(); updScoreUI();
  updateMission('coins',sessionStats.coins);
  updateMission('combo',combo);
  checkAchs();
}
function updComboUI(){
  const fill=document.getElementById('cbfill'),lbl=document.getElementById('cblabel'),pop=document.getElementById('cbpop');
  fill.style.width=Math.min((combo/20)*100,100)+'%';
  if(combo>=3){
    const tier=combo>=20?'LEGENDARY':combo>=12?'GODLIKE':combo>=8?'INSANE':combo>=5?'SICK':'COMBO';
    const col=combo>=20?'#ff00ff':combo>=8?'#ff8800':'#ffd700';
    lbl.style.color=col; fill.style.boxShadow=`0 0 14px ${col}`;
    pop.textContent=`${tier} ×${combo}`; pop.style.color=col; pop.style.opacity='1';
    pop.style.fontSize=Math.min(46+combo*0.7,72)+'px';
  }else{lbl.style.color='#ffffff45';fill.style.boxShadow='0 0 8px #00ffff';pop.style.opacity='0';}
}

// ═══════════════════════════════════════════════
//  ACHIEVEMENTS
// ═══════════════════════════════════════════════
let achQ=[];
function checkAchs(){
  ACHS.forEach(a=>{if(!unlockedAchs.has(a.id)&&a.chk(sessionStats)){unlockedAchs.add(a.id);sessionAchs.push(a);ss('nd_achs',[...unlockedAchs]);showAch(a);}});
}
function showAch(a){achQ.push(a);if(achQ.length===1)nextAch();}
function nextAch(){
  if(!achQ.length)return;
  const a=achQ[0],el=document.getElementById('achpop');
  el.textContent=`${a.icon} ${a.lbl}`;el.style.opacity='1';
  setTimeout(()=>{el.style.opacity='0';achQ.shift();setTimeout(nextAch,500);},2200);
}

// ═══════════════════════════════════════════════
//  SHOP
// ═══════════════════════════════════════════════
function buildShop(){
  const g=document.getElementById('shop-grid'); g.innerHTML='';
  SHOP_ITEMS.forEach(item=>{
    const d=document.createElement('div');
    d.className='shop-item'+(ownedItems.has(item.id)?' owned':'');
    d.innerHTML=`<div class="si-icon">${item.icon}</div><div class="si-name">${item.name}</div><div class="si-cost">${ownedItems.has(item.id)?'OWNED':'💰 '+item.cost}</div>`;
    if(!ownedItems.has(item.id)){
      d.addEventListener('click',()=>{
        if(totalCoins>=item.cost){
          totalCoins-=item.cost; ss('nd_coins',totalCoins);
          ownedItems.add(item.id); ss('nd_owned',[...ownedItems]);
          if(item.type==='upgrade'){upgrades[item.key]=true;ss('nd_upgrades',upgrades);}
          SFX.shop(); buildShop(); updateShopUI();
          showFT('PURCHASED!','#ffd700');
        }else{showFT('NOT ENOUGH COINS','#ff4444');}
      });
    }
    g.appendChild(d);
  });
}
function openShop(){
  buildShop(); updateShopUI();
  document.getElementById('shop-screen').classList.remove('hidden');
}
function closeShop(){
  document.getElementById('shop-screen').classList.add('hidden');
  if(!running)document.getElementById('ss').classList.remove('hidden');
}
function updateShopUI(){document.getElementById('shop-coins').textContent='💰 '+totalCoins+' COINS';}
function updateTotalCoinsUI(){document.getElementById('total-coins-display').textContent=totalCoins;}

// ═══════════════════════════════════════════════
//  LEADERBOARD
// ═══════════════════════════════════════════════
function addScore(s){
  scores.push({s:Math.floor(s),d:new Date().toLocaleDateString()});
  scores.sort((a,b)=>b.s-a.s); scores=scores.slice(0,5);
  ss('nd_scores',scores);
}
function renderLeaderboard(){
  const el=document.getElementById('lb');
  if(!scores.length){el.innerHTML='<div style="color:#ffffff30;font-size:10px;letter-spacing:2px">NO SCORES YET — BE THE FIRST!</div>';return;}
  el.innerHTML='<div style="color:#ffffff30;font-size:10px;letter-spacing:2px;margin-bottom:6px">— TOP RUNS —</div>'+
    scores.map((s,i)=>`<div class="lbrow${i===0?' you':''}"><span class="lbpos">${['🥇','🥈','🥉','4','5'][i]}</span><span>${s.s.toLocaleString()}</span><span style="color:#ffffff40">${s.d}</span></div>`).join('');
}

// ═══════════════════════════════════════════════
//  THEME
// ═══════════════════════════════════════════════
function checkTheme(){
  let nt=0;
  for(let i=TMILES.length-1;i>=0;i--){if(score>=TMILES[i]){nt=i;break;}}
  if(nt!==theme){
    theme=nt; const t=THEMES[theme];
    scene.background=new THREE.Color(t.sky);
    scene.fog=new THREE.FogExp2(t.fog,t.fd);
    showFT('🌍 '+t.name,'#aaffff'); speak(t.name);
    sessionStats.theme=theme; checkAchs(); flashScreen();
  }
}

// ═══════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════
function flashScreen(col='rgba(255,200,0,0.1)'){
  const f=document.createElement('div');
  f.style.cssText=`position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:260;background:${col};transition:opacity 0.35s;`;
  document.body.appendChild(f); setTimeout(()=>{f.style.opacity='0';setTimeout(()=>f.remove(),350);},50);
}
function showFT(text,color){
  const el=document.createElement('div'); el.className='ft';
  el.style.cssText=`color:${color};font-size:${combo>5?25:17}px;left:${44+Math.random()*12}%;top:${35+Math.random()*18}%;text-shadow:0 0 10px ${color};`;
  el.textContent=text; document.getElementById('ui').appendChild(el); setTimeout(()=>el.remove(),950);
}
function doShake(a){shake=Math.max(shake,a);}

// ═══════════════════════════════════════════════
//  UPDATE PLAYER
// ═══════════════════════════════════════════════
function animLegs(){
  if(sliding){legL.rotation.x=0.55;legR.rotation.x=-0.10;armL.rotation.x=0.45;armR.rotation.x=-0.25;return;}
  if(jumping){legL.rotation.x=-0.45;legR.rotation.x=-0.45;armL.rotation.x=-0.55;armR.rotation.x=-0.55;return;}
  const t=rt*0.14,sw=0.72;
  legL.rotation.x=Math.sin(t)*sw; legR.rotation.x=-Math.sin(t)*sw;
  armL.rotation.x=-Math.sin(t)*0.48; armR.rotation.x=Math.sin(t)*0.48;
  pg.rotation.x=0.07;
}

function updPlayer(){
  pg.position.x+=(tx-pg.position.x)*0.18;
  const s=activePU.SLOWMO?spd*0.35:spd;

  if(activePU.HOVER){
    // Hoverboard — show skateboard, glide over everything at fixed height
    const board=pg.getObjectByName('skateboard');
    if(board){
      board.visible=true;
      // Spin wheels
      board.children.forEach(c=>{ if(c.geometry&&c.geometry.type==='CylinderGeometry') c.rotation.x+=0.25; });
      // Tilt board with lane movement
      board.rotation.z=(tx-pg.position.x)*0.08;
    }
    pg.position.y=1.5+Math.sin(rt*0.1)*0.12;
    // Legs stay still on board — surf pose
    legL.rotation.x=0.2; legR.rotation.x=-0.1;
    armL.rotation.x=-0.3; armR.rotation.x=-0.3;
    armL.rotation.z=0.4; armR.rotation.z=-0.4;
    jumping=false; sliding=false;
  } else {
    // Hide board when not hovering
    const board=pg.getObjectByName('skateboard');
    if(board) board.visible=false;
    armL.rotation.z=0; armR.rotation.z=0;
    if(jumping){
      pg.position.y+=vy; vy-=GR;
      if(pg.position.y<=0){pg.position.y=0;jumping=false;vy=0;dj=false;djUsed=false;SFX.land();}
    }
    if(sliding&&Date.now()>slideEnd){sliding=false;pg.scale.y=1;if(!jumping)pg.position.y=0;}
    if(!jumping&&!sliding) pg.position.y=Math.sin(rt*0.18)*0.05;
  }

  // Track no-jump distance
  if(!jumping&&!sliding){nojumpDist+=s;updateMission('nojumpDist',nojumpDist);}
  else nojumpDist=0;

  // Distance
  distM+=s*0.1; sessionStats.dist=distM;
  updateMission('dist',distM);

  // Shield glow
  if(activePU.SHIELD){pmats.body.emissive.set(0x0044aa);pmats.body.emissiveIntensity=0.4+Math.sin(rt*0.2)*0.2;}
  else{pmats.body.emissive.set(new THREE.Color(SKINS[skin][0]).multiplyScalar(0.15));pmats.body.emissiveIntensity=1;}

  cam.position.x+=(pg.position.x*0.22-cam.position.x)*0.06;
  if(shake>0){cam.position.x+=(Math.random()-0.5)*shake;cam.position.y+=(Math.random()-0.5)*shake;shake*=0.78;if(shake<0.004)shake=0;}

  // Speed lines intensity
  const sv=Math.min((spd/SI-1.4)/2,1);
  document.getElementById('splines').style.opacity=Math.max(0,sv);

  animLegs();
}

// ═══════════════════════════════════════════════
//  UPDATE OBSTACLES
// ═══════════════════════════════════════════════
function updObs(){
  const s=activePU.SLOWMO?spd*0.35:spd;
  for(let i=obstacles.length-1;i>=0;i--){
    const o=obstacles[i]; o.position.z+=s;
    // Moving obstacle lane shift
    if(o.userData.moving){
      o.userData.laneF+=0.015*o.userData.dir;
      if(Math.abs(o.userData.laneF)>1){o.userData.dir*=-1;}
      o.position.x=Math.sin(o.userData.laneF*Math.PI)*LW;
    }
    // Near miss
    if(!o.userData.passed&&o.position.z>pg.position.z-2&&o.position.z<pg.position.z+2){
      const dx=Math.abs(o.position.x-pg.position.x);
      if(dx>1.2&&dx<2.6&&!o.userData.nm){
        o.userData.nm=true; SFX.nearMiss(); showFT('CLOSE!','#ff8800');
        sessionStats.nm++; checkAchs(); doShake(0.04);
        // Near-miss slow-mo bullet time
        const vg=document.getElementById('slowmo-vign'); vg.style.opacity='1';
        if(nmTimer)clearTimeout(nmTimer);
        nmTimer=setTimeout(()=>vg.style.opacity='0',600);
      }
    }
    // Hover skips collision
    if(activePU.HOVER){if(o.position.z>22){scene.remove(o);obstacles.splice(i,1);}continue;}
    if(hitTest(pg,o)){
      if(activePU.SHIELD){
        clearTimeout(activePU.SHIELD.t); delete activePU.SHIELD;
        document.getElementById('pu-SHIELD')?.classList.remove('on');
        document.getElementById('pub-SHIELD').style.height='0%';
        SFX.shield(); doShake(0.12); scene.remove(o); obstacles.splice(i,1);
        showFT('🛡️ BLOCKED!','#00aaff'); continue;
      }
      gameOver(); return;
    }
    if(o.position.z>22){scene.remove(o);obstacles.splice(i,1);score+=15;onObstacleDodged();}
  }
}

// ═══════════════════════════════════════════════
//  UPDATE COINS
// ═══════════════════════════════════════════════
function updCoins(){
  const s=activePU.SLOWMO?spd*0.35:spd;
  const magnetRange=upgrades.magnet_rng?12:8;
  for(let i=coinObjs.length-1;i>=0;i--){
    const c=coinObjs[i]; c.position.z+=s; c.rotation.y+=0.07;
    c.position.y=1.2+Math.sin(Date.now()*0.003+i)*0.15;
    if(activePU.MAGNET){
      const dx=pg.position.x-c.position.x,dz=pg.position.z-c.position.z;
      const d=Math.sqrt(dx*dx+dz*dz);
      if(d<magnetRange){c.position.x+=dx*0.1;c.position.z+=dz*0.1;}
    }
    if(!c.userData.collected&&
       Math.abs(c.position.z-pg.position.z)<1.5&&
       Math.abs(c.position.x-pg.position.x)<(activePU.MAGNET?3:1.6)&&
       Math.abs(c.position.y-(pg.position.y+0.8))<2){
      c.userData.collected=true; scene.remove(c); coinObjs.splice(i,1); onCoin(); continue;
    }
    if(c.position.z>22){scene.remove(c);coinObjs.splice(i,1);}
  }
}

// ═══════════════════════════════════════════════
//  UPDATE POWERUPS
// ═══════════════════════════════════════════════
function updPUs(){
  const s=activePU.SLOWMO?spd*0.35:spd;
  for(let i=puObjs.length-1;i>=0;i--){
    const p=puObjs[i]; p.position.z+=s;
    p.rotation.x+=0.04; p.rotation.y+=0.06;
    p.position.y=1.3+Math.sin(Date.now()*0.004+i)*0.2;
    if(Math.abs(p.position.z-pg.position.z)<1.5&&Math.abs(p.position.x-pg.position.x)<1.8&&Math.abs(p.position.y-(pg.position.y+0.8))<2){
      activatePU(p.userData.type); scene.remove(p); puObjs.splice(i,1); continue;
    }
    if(p.position.z>22){scene.remove(p);puObjs.splice(i,1);}
  }
}

// ═══════════════════════════════════════════════
//  UPDATE BOSS
// ═══════════════════════════════════════════════
function updBoss(){
  if(!bossObj||!bossActive)return;
  const s=activePU.SLOWMO?spd*0.35:spd;
  bossObj.position.z+=s*0.6; // moves slower
  bossObj.rotation.x+=0.04; bossObj.rotation.z+=0.03;
  // Chase player X
  bossObj.position.x+=(pg.position.x-bossObj.position.x)*0.015;
  bossObj.position.y=1.5+Math.sin(Date.now()*0.003)*0.3;
  // Check if boss passes player (survived)
  if(bossObj.position.z>22){scene.remove(bossObj);bossObj=null;bossActive=false;clearTimeout(bossWaveTimer);sessionStats.bossSurvived++;score+=500;showFT('👊 BOSS SURVIVED! +500','#ff8800');checkAchs();}
  // Collision
  const bb=new THREE.Box3().setFromObject(pg); bb.expandByScalar(-0.25);
  const ob=new THREE.Box3().setFromObject(bossObj);
  if(bb.intersectsBox(ob)){
    if(activePU.SHIELD){
      clearTimeout(activePU.SHIELD.t);delete activePU.SHIELD;
      document.getElementById('pu-SHIELD')?.classList.remove('on');
      document.getElementById('pub-SHIELD').style.height='0%';
      bossHP--; updateBossHPUI(bossHP/3); doShake(0.15);
      showFT('🛡️ BOSS HIT! HP:'+(bossHP),'#00aaff'); SFX.shield();
      if(bossHP<=0){ scene.remove(bossObj);bossObj=null;bossActive=false;clearTimeout(bossWaveTimer);updateBossHPUI(0);sessionStats.bossSurvived++;score+=1000;showFT('💥 BOSS DESTROYED! +1000','#ff8800');checkAchs(); }
    } else { gameOver(); }
  }
}

// ═══════════════════════════════════════════════
//  UPDATE GROUND
// ═══════════════════════════════════════════════
function updGround(){
  const s=activePU.SLOWMO?spd*0.35:spd;
  let minZ=Infinity; gTiles.forEach(t=>{if(t.position.z<minZ)minZ=t.position.z;});
  gTiles.forEach(t=>{t.position.z+=s;if(t.position.z>35)t.position.z=minZ-22;});
}

function hitTest(player,obs){
  const pb=new THREE.Box3().setFromObject(player); pb.expandByScalar(-0.22);
  return pb.intersectsBox(new THREE.Box3().setFromObject(obs));
}

function updScoreUI(){
  document.getElementById('score').textContent=Math.floor(score);
  document.getElementById('coins').textContent=coins;
  document.getElementById('spval').textContent=(spd/SI).toFixed(1)+'x';
  musicSpeed=spd/SI;
}

// ═══════════════════════════════════════════════
//  INPUT
// ═══════════════════════════════════════════════
function onKey(e){
  if(e.key==='Escape'){paused?resumeGame():running&&pauseGame();return;}
  if(!running||paused)return;
  switch(e.key){
    case'ArrowLeft':case'a':case'A':if(lane>0){lane--;tx=LANES[lane];SFX.lane();}break;
    case'ArrowRight':case'd':case'D':if(lane<2){lane++;tx=LANES[lane];SFX.lane();}break;
    case'ArrowUp':case'w':case'W':case' ':
      e.preventDefault();
      if(!jumping&&!sliding&&!activePU.HOVER){jumping=true;vy=JF;dj=true;SFX.jump();}
      else if(jumping&&dj&&!djUsed){vy=JF*0.8;djUsed=true;dj=false;SFX.jump();showFT('↑↑ DOUBLE!','#00ffff');sessionStats.dj++;updateMission('dj',sessionStats.dj);checkAchs();}
      break;
    case'ArrowDown':case's':case'S':
      if(!sliding&&!jumping&&!activePU.HOVER){sliding=true;slideEnd=Date.now()+SDUR;pg.scale.y=0.5;pg.position.y=-0.38;SFX.slide();}
      else if(jumping){vy=-JF*0.8;}
      break;
  }
}

// ═══════════════════════════════════════════════
//  GAME FLOW
// ═══════════════════════════════════════════════
function startGame(){
  ctx(); if(!masterGain)buildMaster();
  document.getElementById('ss').classList.add('hidden');
  resetGame(); mainLoop();
}
function restartGame(){document.getElementById('gos').classList.add('hidden');resetGame();mainLoop();}
function pauseGame(){paused=true;cancelAnimationFrame(fid);SFX.pause();stopMusic();document.getElementById('pause-sc').classList.remove('hidden');}
function resumeGame(){paused=false;SFX.pause();document.getElementById('pause-sc').classList.add('hidden');startMusic();mainLoop();}
function quitGame(){
  paused=false;running=false;cancelAnimationFrame(fid);stopMusic();
  document.getElementById('pause-sc').classList.add('hidden');
  document.getElementById('ss').classList.remove('hidden');
  renderLeaderboard(); clearCS();
}

function clearCS(){
  combo=0;if(comboT)clearTimeout(comboT);
  document.getElementById('cbpop').style.opacity='0';
  document.getElementById('cbfill').style.width='0%';
}

function resetGame(){
  score=0;coins=0;spd=SI;lane=1;tx=0;
  jumping=false;sliding=false;vy=0;dj=false;djUsed=false;
  stk=0;rt=0;distM=0;nojumpDist=0;
  combo=0;bestCombo=0;lastCoin=0;clearCS();
  sessionStats={coins:0,score:0,combo:0,pus:0,dj:0,nm:0,theme:0,bossSurvived:0,hovered:0,missionsDone:0,dist:0,nojumpDist:0,streak:0};
  sessionAchs=[];shake=0;coinZoneActive=false;bossActive=false;theme=0;
  obstacleStreak=0; lastLevelShown=0; eventCooldown=0;
  musicSpeed=1;
  const sd=document.getElementById('streak-display'); if(sd) sd.style.opacity='0';

  scene.background=new THREE.Color(THEMES[0].sky);
  scene.fog=new THREE.FogExp2(THEMES[0].fog,THEMES[0].fd);

  Object.keys(activePU).forEach(k=>{clearTimeout(activePU[k].t);delete activePU[k];});
  document.querySelectorAll('.puslot').forEach(s=>s.classList.remove('on'));
  document.querySelectorAll('.pubar').forEach(b=>b.style.height='0%');

  if(bossObj){scene.remove(bossObj);bossObj=null;}if(bossWaveTimer)clearTimeout(bossWaveTimer);
  obstacles.forEach(o=>scene.remove(o));coinObjs.forEach(c=>scene.remove(c));
  puObjs.forEach(p=>scene.remove(p));trail.forEach(t=>scene.remove(t.mesh));
  deathParts.forEach(p=>scene.remove(p.mesh));
  if(ghostObj){scene.remove(ghostObj);ghostObj=null;}
  obstacles=[];coinObjs=[];puObjs=[];trail=[];deathParts=[];

  pg.position.set(0,0,0);pg.scale.set(1,1,1);pg.rotation.set(0,0,0);
  legL.rotation.x=0;legR.rotation.x=0;armL.rotation.x=0;armR.rotation.x=0;

  // Apply start shield upgrade
  if(upgrades.start_shield)activatePU('SHIELD');

  // Ghost
  ghostRec=[]; ghostIdx=0;
  if(lastGhostData.length>5)spawnGhostRunner();

  running=true;paused=false;
  updScoreUI(); startMusic();
}

function gameOver(){
  running=false;cancelAnimationFrame(fid);stopMusic();clearCS();
  obstacleStreak=0;
  const sd=document.getElementById('streak-display'); if(sd) sd.style.opacity='0';
  SFX.death(); doShake(0.3);
  const df=document.getElementById('dflash'); df.style.opacity='0.85'; setTimeout(()=>df.style.opacity='0',300);
  spawnDeathParts();
  // Save ghost of best run
  if(score>bestScore){ss('nd_ghost',ghostRec.slice(-2000));}
  if(score>bestScore)bestScore=score;
  addScore(score); ss('nd_best',bestScore); renderLeaderboard();
  let df2=0;
  function da(){if(df2++<45){updDeathParts();ren.render(scene,cam);requestAnimationFrame(da);}else showGOS();}
  da();
}

function showGOS(){
  document.getElementById('fscore').textContent=Math.floor(score);
  document.getElementById('fcoins').textContent=coins;
  document.getElementById('fcombo').textContent=bestCombo+'x';
  document.getElementById('fdist').textContent=Math.floor(distM)+'m';
  document.getElementById('btag').textContent=score>=bestScore&&bestScore>0?'★  NEW BEST  ★':`BEST: ${Math.floor(bestScore)}`;
  document.getElementById('ach-earned').textContent=sessionAchs.length?'UNLOCKED: '+sessionAchs.map(a=>a.icon+a.lbl).join(' · '):'';
  // Add streak info
  const streakInfo = sessionStats.streak>0 ? `  |  🔥 BEST STREAK: ${sessionStats.streak}` : '';
  document.getElementById('ach-earned').textContent += streakInfo;
  document.getElementById('gos').classList.remove('hidden');
}

function onResize(){cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();ren.setSize(innerWidth,innerHeight);}

// ═══════════════════════════════════════════════
//  MAIN LOOP
// ═══════════════════════════════════════════════
function mainLoop(){
  if(!running||paused)return;
  fid=requestAnimationFrame(mainLoop);
  const sm=activePU.SLOWMO?0.35:1;
  spd+=SINC*sm; score+=spd*0.38; rt++;
  checkTheme(); spawnAll(); checkLevelMilestone(); checkRandomEvent();
  updPlayer(); updObs(); updCoins(); updPUs(); updBoss();
  updGround(); updTrail(); updateGhost(); recordGhost();
  updateBossHPUI(bossHP/3);
  updScoreUI();
  ren.render(scene,cam);
}

// ═══════════════════════════════════════════════
//  EASTER EGG — type "hamza" in menu
// ═══════════════════════════════════════════════
function onMenuKey(e){
  if(running) return; // only in menu
  eggTyped += e.key.toLowerCase();
  if(eggTyped.length > 8) eggTyped = eggTyped.slice(-8);
  // Show typing hint
  const kb = document.getElementById('konami-bar');
  if(kb) kb.textContent = eggTyped.split('').map(c=>'hamza'.includes(c)?c:'·').join(' ');
  if(eggTyped.includes('hamza')) {
    eggTyped = '';
    if(kb) kb.textContent = '';
    triggerEasterEgg();
  }
}

function triggerEasterEgg(){
  // Unlock all skins + give 500 coins
  const alreadyDone = ownedItems.has('skin_ghost') && ownedItems.has('skin_dragon');
  ownedItems.add('skin_ghost');
  ownedItems.add('skin_dragon');
  ss('nd_owned',[...ownedItems]);
  if(!alreadyDone){
    totalCoins += 500;
    ss('nd_coins', totalCoins);
    updateTotalCoinsUI();
  }
  // Show all skin buttons as unlocked
  document.querySelectorAll('.skbtn').forEach(b=>{
    const si=parseInt(b.dataset.skin);
    const span=b.querySelector('span');
    if(span && si>=3) span.remove();
  });

  // Show overlay with confetti
  const egg = document.getElementById('easter-egg');
  egg.classList.add('show');
  spawnConfetti();
  SFX.powerup();
  setTimeout(()=>{SFX.powerup();},300);
  setTimeout(()=>{SFX.powerup();},600);
  try{
    const u=new SpeechSynthesisUtterance('Easter egg unlocked! Hello Hamza!');
    u.rate=1; u.pitch=1.3; speechSynthesis.speak(u);
  }catch(e){}
  buildShop(); updateShopUI();
  // Unlock hamza achievement
  sessionStats.hamza=1; checkAchs();
}

function spawnConfetti(){
  const container=document.getElementById('egg-confetti');
  container.innerHTML='';
  const colors=['#ffd700','#00ffff','#ff00ff','#ff3366','#44ff88','#ff8800'];
  for(let i=0;i<80;i++){
    const c=document.createElement('div');
    c.className='conf';
    const col=colors[Math.floor(Math.random()*colors.length)];
    const dur=1.5+Math.random()*2;
    const delay=Math.random()*1.5;
    c.style.cssText=`left:${Math.random()*100}%;top:-20px;background:${col};width:${6+Math.random()*10}px;height:${6+Math.random()*10}px;animation-duration:${dur}s;animation-delay:${delay}s;`;
    container.appendChild(c);
  }
}

function closeEasterEgg(){
  document.getElementById('easter-egg').classList.remove('show');
  document.getElementById('egg-confetti').innerHTML='';
}

// ═══════════════════════════════════════════════
//  OBSTACLE STREAK SYSTEM
// ═══════════════════════════════════════════════
function onObstacleDodged(){
  obstacleStreak++;
  sessionStats.streak = Math.max(sessionStats.streak||0, obstacleStreak);
  const sd = document.getElementById('streak-display');
  const sv = document.getElementById('streak-val');
  if(sv) sv.textContent = obstacleStreak;
  if(sd){
    sd.style.opacity = obstacleStreak >= 3 ? '1' : '0';
    sd.style.color = obstacleStreak >= 10 ? '#ff00ff' : obstacleStreak >= 5 ? '#ff8800' : '#ffd700';
  }
  if(obstacleStreak === 5)  { showFT('🔥 5 DODGE STREAK!','#ff8800'); SFX.combo(2); }
  if(obstacleStreak === 10) { showFT('⚡ 10 DODGE STREAK!','#ff00ff'); SFX.combo(3); speak('10 STREAK'); }
  if(obstacleStreak === 20) { showFT('👑 20 STREAK!!! +1000','#ffd700'); score+=1000; SFX.combo(4); speak('LEGENDARY STREAK'); }
  // Bonus score on streaks
  if(obstacleStreak % 5 === 0 && obstacleStreak > 0) { score += obstacleStreak * 10; }
}

// ═══════════════════════════════════════════════
//  BOSS HP UI
// ═══════════════════════════════════════════════
function updateBossHPUI(pct){
  const wrap=document.getElementById('boss-hp-wrap');
  const fill=document.getElementById('boss-hp-fill');
  if(wrap) wrap.style.opacity=bossActive?'1':'0';
  if(fill) fill.style.width=Math.max(0,pct*100)+'%';
}

// ═══════════════════════════════════════════════
//  LEVEL MILESTONE POPUP
// ═══════════════════════════════════════════════
let lastLevelShown=0;
function checkLevelMilestone(){
  const level=Math.floor(score/1000);
  if(level>lastLevelShown){
    lastLevelShown=level;
    const el=document.getElementById('level-popup');
    if(el){
      el.textContent=`LEVEL ${level}`;
      el.style.opacity='1';
      setTimeout(()=>el.style.opacity='0',1400);
    }
    if(level%5===0){ SFX.combo(4); speak('Level '+level); }
  }
}

// ═══════════════════════════════════════════════
//  RANDOM EVENTS — meteor shower, coin rain, etc.
// ═══════════════════════════════════════════════
let eventCooldown=0;
function checkRandomEvent(){
  eventCooldown--;
  if(eventCooldown>0) return;
  if(Math.random()<0.003){
    const events=['COIN_RAIN','SPEED_BURST','OBSTACLE_CLEAR'];
    const ev=events[Math.floor(Math.random()*events.length)];
    if(ev==='COIN_RAIN'){
      eventCooldown=400;
      showFT('💰 COIN RAIN!','#ffd700');
      for(let i=0;i<20;i++) setTimeout(()=>mkCoin(-92-Math.random()*60,Math.floor(Math.random()*3)),i*80);
    } else if(ev==='SPEED_BURST'){
      eventCooldown=300;
      showFT('⚡ SPEED BURST!','#00ffff');
      const oldSpd=spd; spd*=1.5;
      setTimeout(()=>{ spd=oldSpd; showFT('SPEED NORMAL','#ffffff'); },3000);
    } else if(ev==='OBSTACLE_CLEAR'){
      eventCooldown=350;
      showFT('🧹 CLEAR!','#44ff88');
      obstacles.forEach(o=>scene.remove(o)); obstacles=[];
      doShake(0.06);
    }
  }
}

init();
