// Esteira de Crédito — Algoritmo Panamericano (Banco Pan)
const W = 1100, H = 800;
let params = { r: 0.0175, u: 0.75, LGD: 0.80, Lmax: 25000 };
let clients = [], clientIdCounter = 0, spawnTimer = 0;
const SPAWN_DELAY = 60;
let sliders = {}, hoveredSlider = null, activeSlider = null;
let selectedProfileIdx = 0, profileBtns = [];
let explData = null, explAlpha = 0;
let logoImg;

function preload() {
  logoImg = loadImage('Assets/logobancopan.png',
    () => console.log('Logo loaded OK'),
    () => { logoImg = loadImage('logobancopan.png'); }
  );
}

const BELT_Y = 320, BELT_H = 60, BELT_SPEED = 1.5;
const ALGO_X = W / 2, ALGO_W = 150, ALGO_H = 190;

const CLIENT_PROFILES = [
  { label: 'Ótimo', pd: 0.008, capacidade: () => random(8000, 25000), rgb: [22,163,74],   lt: [220,252,231] },
  { label: 'Bom',   pd: 0.014, capacidade: () => random(3000, 10000), rgb: [8,145,178],   lt: [207,250,254] },
  { label: 'Médio', pd: 0.020, capacidade: () => random(1500,  5000), rgb: [217,119,6],   lt: [254,243,199] },
  { label: 'Ruim',  pd: 0.060, capacidade: () => random(500,   2000), rgb: [220,38,38],   lt: [254,226,226] },
];

const SLIDER_DEFS = [
  { key:'r',    label:'r — Interchange',  min:0.01,  max:0.04,  step:0.001, fmt: v=>(v*100).toFixed(2)+'%' },
  { key:'u',    label:'u — Utilização',   min:0.50,  max:1.00,  step:0.01,  fmt: v=>(v*100).toFixed(0)+'%' },
  { key:'LGD',  label:'LGD — Perda Def.', min:0.30,  max:1.00,  step:0.01,  fmt: v=>v.toFixed(2) },
  { key:'Lmax', label:'Lmax — Teto (R$)', min:5000,  max:25000, step:500,   fmt: v=>'R$'+Math.round(v).toLocaleString('pt-BR') },
];

function pdStar() { return (params.r * params.u) / params.LGD; }

function computeCredit(c) {
  const pi = params.r * params.u - c.pd * params.LGD;
  if (pi <= 0) return { limit:0, approved:false, pi };
  const limit = Math.min(c.capacidade, params.Lmax);
  return { limit, approved: limit >= 200, pi };
}

function spawnClient() {
  const prof = CLIENT_PROFILES[selectedProfileIdx];
  return {
    id: ++clientIdCounter, x: -70, phase:'approach', processT:0,
    profile: prof, pd: prof.pd + random(-0.001,0.001),
    capacidade: prof.capacidade(), result:null, shake:0, scaleT:0
  };
}

function setup() {
  createCanvas(W, H).parent('canvas-container');
  frameRate(60); textFont('Inter');
  buildSliders(); buildProfileBtns();
  clients.push(spawnClient());
}

function buildSliders() {
  SLIDER_DEFS.forEach((def, i) => {
    sliders[def.key] = { def, x: W-220, y: 40+i*74, w: 196, h:4 };
  });
}

function buildProfileBtns() {
  CLIENT_PROFILES.forEach((_, i) => {
    profileBtns.push({ x:16, y:168+i*56, w:210, h:48, idx:i });
  });
}

function draw() {
  background(248, 250, 252);
  updateClients();
  const active = clients.filter(c => c.phase !== 'gone');
  if (active.length === 0) {
    if (++spawnTimer >= SPAWN_DELAY) { clients.push(spawnClient()); spawnTimer = 0; }
  }
  clients = clients.filter(c => c.phase !== 'gone');
  if (explData && explAlpha < 255) explAlpha = min(explAlpha+6, 255);
  drawBelt(); drawAlgoBox(); drawClients();
  drawThresholdInfo(); drawProfileSelector(); drawSliderPanel(); drawExplicabilidade();
}

// ── Belt ──────────────────────────────────────────────────────
function drawBelt() {
  const bx=60, bw=W-120;
  noStroke(); fill(0,0,0,12); rect(bx+4,BELT_Y+6,bw,BELT_H,12);
  fill(203,213,225); stroke(148,163,184); strokeWeight(1.5); rect(bx,BELT_Y,bw,BELT_H,10);
  const sw=44, off=(frameCount*BELT_SPEED*0.55)%(sw*2);
  noStroke();
  for (let sx=bx-sw; sx<bx+bw+sw; sx+=sw*2) {
    fill(148,163,184,80);
    beginShape();
    vertex(sx+off,BELT_Y); vertex(sx+off+sw,BELT_Y);
    vertex(sx+off+sw-14,BELT_Y+BELT_H); vertex(sx+off-14,BELT_Y+BELT_H);
    endShape(CLOSE);
  }
  noStroke(); fill(255,255,255,70); rect(bx,BELT_Y,bw,10,10,10,0,0);
  drawRoller(bx+26, BELT_Y+BELT_H/2); drawRoller(bx+bw-26, BELT_Y+BELT_H/2);
  stroke(29,78,216,60); strokeWeight(1.2); noFill();
  line(bx+26,BELT_Y,bx+bw-26,BELT_Y);
  line(bx+26,BELT_Y+BELT_H,bx+bw-26,BELT_Y+BELT_H);
}

function drawRoller(x,y) {
  const r=BELT_H/2, ang=frameCount*BELT_SPEED*0.04;
  stroke(148,163,184); strokeWeight(1.5); fill(226,232,240); circle(x,y,r*2);
  fill(203,213,225); circle(x,y,r*0.65);
  stroke(148,163,184); strokeWeight(1);
  for (let a=0; a<TWO_PI; a+=TWO_PI/6) line(x,y,x+cos(a+ang)*r*0.65,y+sin(a+ang)*r*0.65);
}

// ── Algorithm box ──────────────────────────────────────────────
function drawAlgoBox() {
  const x=ALGO_X-ALGO_W/2, y=BELT_Y-ALGO_H+40;
  noStroke(); fill(0,0,0,12); rect(x+4,y+6,ALGO_W,ALGO_H,16);
  fill(255); stroke(7,178,253,80); strokeWeight(1.5); rect(x,y,ALGO_W,ALGO_H,14);
  const busy = clients.some(c=>c.phase==='processing');
  if (busy) { noStroke(); fill(7,178,253); rect(x,y,ALGO_W,5,14,14,0,0); }
  noStroke(); fill(13,19,23); textSize(13); textAlign(CENTER,TOP); textStyle(BOLD);
  text('Algoritmo',ALGO_X,y+16); text('Panamericano',ALGO_X,y+32);
  drawBancoPanLogo(ALGO_X, y+78);
  if (busy) {
    for (let d=0;d<3;d++) {
      const t=(frameCount*0.06+d*0.5)%1;
      fill(7,178,253,sin(t*PI)*255); noStroke();
      circle(ALGO_X-18+d*18, y+ALGO_H-26, 9);
    }
  } else {
    fill(203,213,225); noStroke();
    for (let d=0;d<3;d++) circle(ALGO_X-18+d*18, y+ALGO_H-26, 7);
  }
  textAlign(CENTER,BOTTOM); textSize(12); textStyle(NORMAL); fill(7,178,253);
  text('Caixa Branca · LP Solver', ALGO_X, y-10);
}

function drawBancoPanLogo(cx,cy) {
  if (logoImg) {
    imageMode(CENTER);
    let aspectRatio = logoImg.width / logoImg.height;
    let imgW = 110;
    let imgH = imgW / aspectRatio;
    image(logoImg, cx, cy, imgW, imgH);
    imageMode(CORNER);
  }
}



// ── Clients ───────────────────────────────────────────────────
function updateClients() {
  for (const c of clients) {
    c.scaleT = min(c.scaleT+0.05,1);
    if (c.phase==='approach') {
      c.x += BELT_SPEED*1.3;
      if (c.x >= ALGO_X-ALGO_W/2-8) { c.phase='processing'; c.processT=0; }
    }
    if (c.phase==='processing') {
      c.processT++;
      c.shake = c.processT<15 ? random(-1.2,1.2) : 0;
      if (c.processT===45) {
        c.result = computeCredit(c);
        explData = {
          profile:    c.profile,
          pd:         c.pd,
          capacidade: c.capacidade,
          r: params.r, u: params.u, LGD: params.LGD, Lmax: params.Lmax,
          pi:         c.result.pi,
          approved:   c.result.approved,
          limit:      c.result.limit,
          pdStar:     pdStar(),
        };
        explAlpha = 0;
      }
      if (c.processT>=95) { c.phase='exit'; c.x=ALGO_X+ALGO_W/2+8; }
    }
    if (c.phase==='exit') {
      c.x += BELT_SPEED*1.3;
      if (c.x > W+130) c.phase='gone';
    }
  }
}

function drawClients() {
  for (const c of clients) {
    if (c.phase==='gone') continue;
    const mid=BELT_Y+BELT_H/2;
    // Posiciona o card acima da correia, centrado verticalmente
    let cx = c.phase==='processing' ? ALGO_X-ALGO_W/2-5+c.shake : c.x;
    let cy = mid; // centro vertical do card alinhado ao centro da correia
    const rgb = c.profile.rgb;
    push(); translate(cx,cy);
    const sc = 0.7+0.3*easeOut(c.scaleT); scale(sc);

    // Card compacto: 88×116
    const cw=44, ch=58; // meios lados: 44 e 58
    noStroke(); fill(0,0,0,15); rect(-cw+2,-ch+2,cw*2,ch*2,12);
    fill(255); noStroke();
    rect(-cw,-ch,cw*2,ch*2,12);
    // Top accent bar
    noStroke(); fill(rgb[0],rgb[1],rgb[2]);
    rect(-cw,-ch,cw*2,6,12,12,0,0);
    // Icon (avatar circle + arc) — menor
    fill(rgb[0],rgb[1],rgb[2],200); circle(0,-ch+22,20); arc(0,-ch+32,28,16,PI,TWO_PI);
    // ID
    fill(15,23,42); textAlign(CENTER,TOP); textSize(9); textStyle(BOLD);
    text('C-'+c.id, 0, -ch+44);
    // Profile badge
    const lt = c.profile.lt;
    fill(lt[0],lt[1],lt[2]); rect(-28,-ch+56,56,18,5);
    fill(rgb[0],rgb[1],rgb[2]); textSize(8); textStyle(BOLD); textAlign(CENTER,CENTER);
    text(c.profile.label, 0, -ch+65);
    // PD row
    fill(241,245,249); rect(-34,-ch+78,68,18,5);
    fill(100,116,139); textSize(7.5); textStyle(NORMAL); textAlign(CENTER,CENTER);
    text('PD: '+(c.pd*100).toFixed(2)+'%', 0, -ch+87);
    // Result badge
    if (c.result) {
      if (c.result.approved) { fill(220,252,231); rect(-34,-ch+100,68,18,5); fill(22,163,74); }
      else                   { fill(254,226,226); rect(-34,-ch+100,68,18,5); fill(220,38,38); }
      textSize(8); textStyle(BOLD); textAlign(CENTER,CENTER);
      text(c.result.approved ? 'R$'+Math.round(c.result.limit).toLocaleString('pt-BR') : 'NEGADO', 0, -ch+109);
    } else {
      fill(241,245,249); rect(-34,-ch+100,68,18,5);
      fill(100,116,139); textSize(7.5); textStyle(NORMAL); textAlign(CENTER,CENTER);
      text('Aguardando...', 0, -ch+109);
    }
    pop();
  }
}

// ── Threshold info ────────────────────────────────────────────
function drawThresholdInfo() {
  const x=16,y=16,w=210,h=110;
  fill(255); stroke(7,178,253,60); strokeWeight(1); rect(x,y,w,h,14);
  noStroke(); fill(7,178,253); textAlign(LEFT,TOP); textSize(11); textStyle(BOLD);
  text('LIMIAR DE RENTABILIDADE',x+14,y+12);
  fill(71,85,105); textSize(12); textStyle(NORMAL);
  text('PD* = r · u / LGD', x+14,y+30);
  const pulse=0.5+0.5*sin(frameCount*0.04);
  fill(lerp(7,0,pulse),lerp(178,193,pulse),lerp(253,255,pulse));
  textSize(32); textStyle(BOLD); text((pdStar()*100).toFixed(2)+'%',x+14,y+48);
  fill(100,116,139); textSize(11); textStyle(NORMAL);
  text('PD < limiar → aprovado',x+14,y+88);
}

// ── Profile selector ──────────────────────────────────────────
function drawProfileSelector() {
  const px=16,py=136,pw=210,ph=CLIENT_PROFILES.length*56+24;
  fill(255); stroke(7,178,253,60); strokeWeight(1); rect(px,py,pw,ph,14);
  noStroke(); fill(7,178,253); textAlign(LEFT,TOP); textSize(11); textStyle(BOLD);
  text('TIPO DE CLIENTE',px+14,py+12);

  CLIENT_PROFILES.forEach((prof,i) => {
    const btn=profileBtns[i];
    const sel=(i===selectedProfileIdx);
    const rgb=prof.rgb, lt=prof.lt;
    const hov=(mouseX>=btn.x && mouseX<=btn.x+btn.w && mouseY>=btn.y && mouseY<=btn.y+btn.h);

    if (sel) { fill(rgb[0],rgb[1],rgb[2]); stroke(rgb[0],rgb[1],rgb[2]); }
    else if (hov) { fill(lt[0],lt[1],lt[2]); stroke(rgb[0],rgb[1],rgb[2]); }
    else { fill(248,250,252); stroke(226,232,240); }
    strokeWeight(1.5); rect(btn.x+8,btn.y,btn.w-16,btn.h,8);

    // Color dot
    if (!sel) { fill(rgb[0],rgb[1],rgb[2]); noStroke(); circle(btn.x+24,btn.y+btn.h/2,12); }
    // Label
    fill(sel ? 255 : 13,sel ? 255 : 19,sel ? 255 : 23);
    textAlign(LEFT,CENTER); textStyle(BOLD); textSize(13);
    text(prof.label, btn.x+(sel?18:36), btn.y+btn.h/2-5);
    // PD range
    fill(sel ? 220 : 100,sel ? 220 : 116,sel ? 220 : 139);
    textSize(10); textStyle(NORMAL);
    text('PD ~'+(prof.pd*100).toFixed(1)+'%', btn.x+(sel?18:36), btn.y+btn.h/2+9);
  });
}

// ── Slider panel ──────────────────────────────────────────────
function drawSliderPanel() {
  const px=W-240,py=16,pw=232,ph=SLIDER_DEFS.length*78+28;
  fill(255); stroke(7,178,253,60); strokeWeight(1); rect(px,py,pw,ph,14);
  noStroke(); fill(7,178,253); textAlign(LEFT,TOP); textSize(11); textStyle(BOLD);
  text('PARÂMETROS DO ALGORITMO',px+14,py+12);
  SLIDER_DEFS.forEach(def => drawSlider(sliders[def.key],def));
}

function drawSlider(sl,def) {
  const {x,y,w}=sl, val=params[def.key];
  const t=(val-def.min)/(def.max-def.min), tx=x+t*w;
  noStroke(); fill(51,57,66); textAlign(LEFT,BOTTOM); textSize(12); textStyle(NORMAL);
  text(def.label,x,y+16);
  textAlign(RIGHT,BOTTOM); textStyle(BOLD); fill(7,178,253);
  text(def.fmt(val),x+w,y+16);
  fill(226,232,240); noStroke(); rect(x,y+22,w,6,3);
  fill(7,178,253); rect(x,y+22,t*w,6,3);
  const hov=hoveredSlider===def.key, act=activeSlider===def.key;
  if (act) { fill(7,178,253,40); noStroke(); circle(tx,y+25,24); }
  fill(hov||act?0:7,hov||act?193:178,hov||act?255:253);
  stroke(255); strokeWeight(2); circle(tx,y+25,hov||act?17:14);
}

// ── Explicabilidade ───────────────────────────────────────────
function drawExplicabilidade() {
  if (!explData || explAlpha<=0) return;
  const a=explAlpha;
  const bw=W-200, bh=200, bx=(W-bw)/2, by=BELT_Y+BELT_H+24;
  const d=explData;
  const rgb=d.profile.rgb;

  // Card
  fill(255,255,255,a*0.98); stroke(7,178,253,a*0.3); strokeWeight(1); rect(bx,by,bw,bh,16);
  // Accent top bar
  noStroke(); fill(7,178,253,a); rect(bx,by,bw,5,16,16,0,0);

  // Header
  fill(13,19,23,a); textAlign(LEFT,TOP); textSize(16); textStyle(BOLD);
  text('Resultado da Análise',bx+24,by+18);
  // Profile badge
  fill(rgb[0],rgb[1],rgb[2],a*0.15); rect(bx+bw-150,by+14,136,28,8);
  fill(rgb[0],rgb[1],rgb[2],a); textAlign(CENTER,CENTER); textSize(13); textStyle(BOLD);
  text(d.profile.label+' · PD '+(d.pd*100).toFixed(2)+'%', bx+bw-82, by+28);

  // Divider
  stroke(7,178,253,a*0.3); strokeWeight(1); line(bx+24,by+52,bx+bw-24,by+52);

  // Three columns
  const colW=(bw-80)/3, colY=by+64;

  // ── Col 1: Rentabilidade ───────────────────────────────────
  noStroke();
  fill(13,19,23,a); textAlign(LEFT,TOP); textSize(14); textStyle(BOLD);
  text('① Margem', bx+24, colY);
  fill(51,57,66,a); textSize(12); textStyle(NORMAL);
  text('π = '+(d.pi*100).toFixed(3)+'%', bx+24, colY+24);
  const piRgb = d.pi > 0 ? [22,163,74] : [220,38,38];
  fill(piRgb[0],piRgb[1],piRgb[2],a); textSize(13); textStyle(BOLD);
  text(d.pi > 0 ? '✓ Positiva' : '✗ Negativa', bx+24, colY+46);
  // divider
  stroke(226,232,240,a*0.4); strokeWeight(1);
  line(bx+24+colW+6,colY,bx+24+colW+6,colY+120);

  // ── Col 2: Limite ─────────────────────────────────────────
  const cx2=bx+24+colW+20;
  const limitStep2 = d.pi > 0;
  noStroke();
  fill(13,19,23,a); textAlign(LEFT,TOP); textSize(14); textStyle(BOLD);
  text('② Limite', cx2, colY);
  fill(51,57,66,a); textSize(12); textStyle(NORMAL);
  if (limitStep2) {
    text('R$ '+Math.round(d.limit).toLocaleString('pt-BR'), cx2, colY+24);
    const limRgb = d.limit>=200 ? [22,163,74] : [220,38,38];
    fill(limRgb[0],limRgb[1],limRgb[2],a); textSize(13); textStyle(BOLD);
    text(d.limit>=200 ? '✓ Aprovado' : '✗ Abaixo do piso', cx2, colY+46);
  } else {
    text('Não aplicável', cx2, colY+24);
    fill(220,38,38,a); textSize(13); textStyle(BOLD);
    text('✗ Excluído', cx2, colY+46);
  }
  // divider
  stroke(226,232,240,a*0.4); strokeWeight(1);
  line(cx2+colW+6,colY,cx2+colW+6,colY+120);

  // ── Col 3: Decisão ────────────────────────────────────────
  const cx3=cx2+colW+20;
  noStroke();
  fill(13,19,23,a); textAlign(LEFT,TOP); textSize(14); textStyle(BOLD);
  text('③ Decisão', cx3, colY);
  // Big result
  const approved=d.approved;
  const rr=approved?[22,163,74]:[220,38,38];
  const ltr=approved?[220,252,231]:[254,226,226];
  fill(ltr[0],ltr[1],ltr[2],a*0.9); rect(cx3,colY+26,colW,60,12);
  fill(rr[0],rr[1],rr[2],a); textAlign(CENTER,CENTER); textSize(18); textStyle(BOLD);
  text(approved?'✓ APROVADO':'✗ NEGADO', cx3+colW/2, colY+48);
  if (approved) {
    textSize(14); textStyle(NORMAL);
    text('R$ '+Math.round(d.limit).toLocaleString('pt-BR'), cx3+colW/2, colY+68);
  }
  fill(100,116,139,a); textAlign(LEFT,TOP); textSize(11); textStyle(NORMAL);
  text('LGD '+d.LGD.toFixed(2)+' · Teto R$'+Math.round(d.Lmax).toLocaleString('pt-BR'), cx3, colY+98);
}

// ── Mouse ─────────────────────────────────────────────────────
function mouseMoved() {
  hoveredSlider=null;
  let onSlider=false;
  for (const def of SLIDER_DEFS) {
    const sl=sliders[def.key];
    if (mouseX>=sl.x-8&&mouseX<=sl.x+sl.w+8&&mouseY>=sl.y+14&&mouseY<=sl.y+34) {
      hoveredSlider=def.key; onSlider=true;
    }
  }
  const onBtn=profileBtns.some(b=>mouseX>=b.x&&mouseX<=b.x+b.w&&mouseY>=b.y&&mouseY<=b.y+b.h);
  cursor(onSlider||onBtn?'pointer':'default');
}

function mousePressed() {
  for (const def of SLIDER_DEFS) {
    const sl=sliders[def.key];
    if (mouseX>=sl.x-8&&mouseX<=sl.x+sl.w+8&&mouseY>=sl.y+14&&mouseY<=sl.y+34) {
      activeSlider=def.key; updateSliderVal(def,sl);
    }
  }
  for (const btn of profileBtns) {
    if (mouseX>=btn.x&&mouseX<=btn.x+btn.w&&mouseY>=btn.y&&mouseY<=btn.y+btn.h) {
      selectedProfileIdx=btn.idx;
      if (clients.filter(c=>c.phase!=='gone').length===0) {
        clients.push(spawnClient()); spawnTimer=0;
      }
    }
  }
}

function mouseDragged() {
  if (!activeSlider) return;
  const def=SLIDER_DEFS.find(d=>d.key===activeSlider);
  updateSliderVal(def,sliders[activeSlider]);
}

function mouseReleased() { activeSlider=null; }

function updateSliderVal(def,sl) {
  let v=def.min+constrain((mouseX-sl.x)/sl.w,0,1)*(def.max-def.min);
  params[def.key]=constrain(Math.round(v/def.step)*def.step,def.min,def.max);
}

function easeOut(t) { return 1-pow(1-t,3); }
