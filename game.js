/* ================================================================
   FIN & FURY  —  game.js  (fixed)
   Fixes:
   1. Assets now load correctly from local file:// via crossOrigin
   2. Sprite direction fixed — sheets face LEFT, so idle/swim rows
      are swapped: Row0=idle-left(mirrored→right), Row1=idle-left,
      Row2=swim-left(mirrored→right), Row3=swim-left
      We flip horizontally in canvas when facing right.
   3. Stage 1 NPCs are always smaller than the player (guaranteed
      eatability). Scaling is distributed so every NPC on stage N
      is <= playerScale * 1.05 unless intentionally large.
   4. Background/foreground images rendered correctly.
   5. Fury boss spawns properly on stages 5, 10, 15… with AI chase.
================================================================= */

'use strict';

// ── Sprite sheet layout ───────────────────────────────────────
// All sheets: 960×480, 6 cols × 4 rows
// Row 0 = idle  LEFT  (we mirror to get right-facing)
// Row 1 = idle  LEFT
// Row 2 = swim  LEFT  (we mirror to get right-facing)
// Row 3 = swim  LEFT
const FRAME_W    = 160;
const FRAME_H    = 120;
const ANIM_COLS  = 6;
const ROW_IDLE_L = 1;   // idle facing left
const ROW_SWIM_L = 3;   // swim facing left

const BG_CYCLE = 5;

// NPC species pool
const NPC_SPECIES = [
    { key:'npc_green',    file:'fish_sprites/secondfish_sprite/fish_sprite_sheet_green.png',     minScale:0.30, maxScale:0.72, color:'#38c850' },
    { key:'npc_goldfish', file:'fish_sprites/goldfish_sprite/fish_sprite_sheet_goldfish.png',  minScale:0.32, maxScale:0.72, color:'#ff9a20' },
    { key:'npc_clown',    file:'fish_sprites/clownfish_sprite/fish_sprite_sheet_clownfish.png', minScale:0.28, maxScale:0.70, color:'#ff5520' },
    { key:'npc_tuna',     file:'fish_sprites/tunafish_sprite/fish_sprite_sheet_tuna.png',      minScale:0.40, maxScale:0.85, color:'#4878c8' },
];

const rand    = (a,b)   => a + Math.random()*(b-a);
const randInt = (a,b)   => Math.floor(rand(a,b+1));
const clamp   = (v,a,b) => Math.max(a,Math.min(b,v));

// ─────────────────────────────────────────────────────────────
//  AssetLoader — crossOrigin-safe, works from file://
// ─────────────────────────────────────────────────────────────
class AssetLoader {
    constructor() {
        this.images   = {};
        this._total   = 0;
        this._done    = 0;
        this.progress = 0;
        this.label    = 'Preparing...';
        this.onComplete = null;
    }
    queue(key, src) {
        this._total++;
        const img = new Image();
        // crossOrigin must be set BEFORE src for CORS headers to apply
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            this.images[key] = img;
            this._finish(key);
        };
        img.onerror = () => {
            // Store null — fallback drawing will handle missing images
            this._finish(key);
        };
        img.src = src;
    }
    _finish(key) {
        this._done++;
        this.progress = this._done / this._total;
        this.label    = key.replace(/_/g,' ');
        if (this._done >= this._total && this.onComplete) this.onComplete();
    }
    get(key) { return this.images[key] || null; }
}

// ─────────────────────────────────────────────────────────────
//  Sprite — draws one frame, mirrors for right-facing
// ─────────────────────────────────────────────────────────────
class Sprite {
    constructor(img) {
        this.img    = img;
        this.row    = ROW_IDLE_L;
        this.col    = 0;
        this.timer  = 0;
        this.fps    = 8;
        this.facingRight = false;
    }
    setAnim(moving, facingRight) {
        this.facingRight = facingRight;
        const newRow = moving ? ROW_SWIM_L : ROW_IDLE_L;
        if (this.row !== newRow) { this.row = newRow; this.col = 0; this.timer = 0; }
        this.fps = moving ? 10 : 7;
    }
    update(dt) {
        this.timer += dt;
        const dur = 1/this.fps;
        if (this.timer >= dur) { this.col=(this.col+1)%ANIM_COLS; this.timer-=dur; }
    }
    draw(ctx, x, y, scale, fallbackColor) {
        const dw = FRAME_W*scale, dh = FRAME_H*scale;
        if (this.img && this.img.naturalWidth) {
            ctx.save();
            if (this.facingRight) {
                // Mirror horizontally: translate to x, scale(-1,1), draw at -x
                ctx.translate(x, y);
                ctx.scale(-1, 1);
                ctx.translate(-x, -y);
            }
            ctx.drawImage(this.img,
                this.col*FRAME_W, this.row*FRAME_H, FRAME_W, FRAME_H,
                x-dw/2, y-dh/2, dw, dh);
            ctx.restore();
        } else {
            // Canvas fallback fish shape
            const fc = fallbackColor || '#4af';
            const bw = dw*0.46, bh = dh*0.34;
            const fr = this.facingRight;
            ctx.save();
            ctx.fillStyle = fc;
            ctx.beginPath(); ctx.ellipse(x,y,bw,bh,0,0,Math.PI*2); ctx.fill();
            // Tail
            const tx = fr ? x+bw : x-bw;
            ctx.beginPath();
            ctx.moveTo(tx,y);
            ctx.lineTo(tx+(fr?bw*0.5:-bw*0.5), y-bh*0.65);
            ctx.lineTo(tx+(fr?bw*0.5:-bw*0.5), y+bh*0.65);
            ctx.closePath(); ctx.fill();
            // Eye
            const ex = fr ? x-bw*0.5 : x+bw*0.5;
            ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(ex,y-bh*0.18,bh*0.2,0,Math.PI*2); ctx.fill();
            ctx.fillStyle='#111'; ctx.beginPath(); ctx.arc(ex+(fr?-1:1)*bh*0.04,y-bh*0.18,bh*0.10,0,Math.PI*2); ctx.fill();
            ctx.restore();
        }
    }
}

// ─────────────────────────────────────────────────────────────
//  Player — Fin, keyboard controlled
// ─────────────────────────────────────────────────────────────
class Player {
    constructor(img, x, y) {
        this.sprite = new Sprite(img);
        this.x=x; this.y=y;
        this.scale       = 0.72;
        this.speed       = 218;
        this.radius      = 34;
        this.facingRight = true;
        this.moving      = false;
    }
    get hitR() { return this.radius*this.scale; }

    update(dt, keys, W, H) {
        let dx=0, dy=0;
        if (keys['ArrowLeft'] ||keys['a']||keys['A']) dx-=1;
        if (keys['ArrowRight']||keys['d']||keys['D']) dx+=1;
        if (keys['ArrowUp']   ||keys['w']||keys['W']) dy-=1;
        if (keys['ArrowDown'] ||keys['s']||keys['S']) dy+=1;
        if (dx&&dy){dx*=0.707;dy*=0.707;}
        this.moving = !!(dx||dy);
        this.x = clamp(this.x+dx*this.speed*dt, this.hitR, W-this.hitR);
        this.y = clamp(this.y+dy*this.speed*dt, this.hitR, H-this.hitR);
        if (dx>0) this.facingRight=true;
        if (dx<0) this.facingRight=false;
        this.sprite.setAnim(this.moving, this.facingRight);
        this.sprite.update(dt);
    }
    draw(ctx) { this.sprite.draw(ctx,this.x,this.y,this.scale,'#30c8a8'); }
    grow(npcScale) {
        this.scale  = Math.min(this.scale  + npcScale*0.016, 1.95);
        this.radius = Math.min(this.radius + npcScale*0.9,   88);
        this.speed  = Math.max(this.speed  - npcScale*1.1,   112);
    }
}

// ─────────────────────────────────────────────────────────────
//  NpcFish — 3-state AI: SWIM / IDLE / TURN
// ─────────────────────────────────────────────────────────────
const S_SWIM=0, S_IDLE=1, S_TURN=2;

class NpcFish {
    constructor(img, x, y, scale, color) {
        this.sprite = new Sprite(img);
        this.x=x; this.y=y;
        this.scale  = scale;
        this.color  = color||'#4af';
        this.radius = 34;
        this.alive  = true;
        this.dying  = false;
        this.dyT    = 0;
        this.dyDur  = 0.40;
        this.speed  = clamp(rand(50,120)/scale, 40, 260);
        this.angle  = rand(0,Math.PI*2);
        this.vx     = Math.cos(this.angle)*this.speed;
        this.vy     = Math.sin(this.angle)*this.speed;
        this.state      = S_SWIM;
        this.stTimer    = rand(1.8,4.5);
        this.turnTarget = this.angle;
        this.facingRight = this.vx>=0;
    }
    get hitR() { return this.radius*this.scale; }

    update(dt,W,H) {
        if (this.dying) {
            this.dyT+=dt;
            if (this.dyT>=this.dyDur) this.alive=false;
            this.sprite.update(dt);
            return;
        }
        this.stTimer-=dt;
        const m=this.hitR+10;
        if (this.state===S_SWIM) {
            this.x+=this.vx*dt; this.y+=this.vy*dt;
            if (this.x<m)  {this.vx= Math.abs(this.vx); this.angle=0;}
            if (this.x>W-m){this.vx=-Math.abs(this.vx); this.angle=Math.PI;}
            if (this.y<m)  {this.vy= Math.abs(this.vy);}
            if (this.y>H-m){this.vy=-Math.abs(this.vy);}
            if (this.stTimer<=0) {
                if (Math.random()<0.42) {
                    this.state=S_IDLE; this.stTimer=rand(0.7,2.0);
                    this.vx=0; this.vy=0;
                } else {
                    this.state=S_TURN;
                    this.turnTarget=this.angle+rand(-Math.PI*0.8,Math.PI*0.8);
                    this.stTimer=rand(0.4,1.0);
                }
            }
        } else if (this.state===S_IDLE) {
            this.x+=Math.cos(this.angle)*10*dt;
            this.y+=Math.sin(this.angle)*10*dt;
            if (this.stTimer<=0) {
                this.state=S_SWIM; this.stTimer=rand(2.0,5.0);
                this.angle=this.turnTarget;
                this.vx=Math.cos(this.angle)*this.speed;
                this.vy=Math.sin(this.angle)*this.speed;
            }
        } else { // S_TURN
            const diff=this.turnTarget-this.angle;
            this.angle+=diff*Math.min(dt*4.5,1);
            this.vx=Math.cos(this.angle)*this.speed;
            this.vy=Math.sin(this.angle)*this.speed;
            if (this.stTimer<=0){this.state=S_SWIM;this.stTimer=rand(2.0,5.5);}
        }
        this.x=clamp(this.x,m,W-m); this.y=clamp(this.y,m,H-m);
        if (Math.abs(this.vx)>6) this.facingRight=this.vx>0;
        const moving=this.state===S_SWIM&&(Math.abs(this.vx)>8||Math.abs(this.vy)>8);
        this.sprite.setAnim(moving, this.facingRight);
        this.sprite.fps = moving?9:6;
        this.sprite.update(dt);
    }
    startDying(){if(!this.dying){this.dying=true;this.dyT=0;}}
    draw(ctx) {
        if (!this.alive) return;
        ctx.save();
        if (this.dying) {
            const t=this.dyT/this.dyDur;
            ctx.globalAlpha=Math.max(0,1-t);
            this.sprite.draw(ctx,this.x,this.y,this.scale*(1+t*0.4),this.color);
        } else {
            // Vertical tilt for NPC
            const vDom=this.state===S_SWIM&&Math.abs(this.vy)>Math.abs(this.vx)*1.3;
            if (vDom){
                const tilt=clamp(Math.atan2(this.vy,Math.abs(this.vx)),-0.5,0.5);
                ctx.translate(this.x,this.y); ctx.rotate(tilt); ctx.translate(-this.x,-this.y);
            }
            this.sprite.draw(ctx,this.x,this.y,this.scale,this.color);
        }
        ctx.restore();
    }
}

// ─────────────────────────────────────────────────────────────
//  FuryBoss — AI boss that chases the player and fires toxin
// ─────────────────────────────────────────────────────────────
class FuryBoss {
    constructor(img, x, y) {
        this.sprite = new Sprite(img);
        this.x=x; this.y=y;
        this.scale  = 1.4;
        this.radius = 44;
        this.alive  = true;
        this.dying  = false;
        this.dyT    = 0; this.dyDur = 0.7;
        this.hp     = 8;          // takes 8 pearl hits to defeat
        this.speed  = 135;
        this.facingRight = false;
        // Shoot timer
        this.shootTimer = 3.0;
        this.shootCooldown = 3.5;
        // Brief stun after taking hit
        this.stunTimer = 0;
    }
    get hitR() { return this.radius*this.scale; }

    update(dt, player, W, H) {
        if (this.dying){this.dyT+=dt; if(this.dyT>=this.dyDur) this.alive=false; return;}
        if (this.stunTimer>0){this.stunTimer-=dt; return;}

        // Chase player
        const dx=player.x-this.x, dy=player.y-this.y;
        const dist=Math.hypot(dx,dy)||1;
        const nx=dx/dist, ny=dy/dist;
        this.x=clamp(this.x+nx*this.speed*dt, this.hitR, W-this.hitR);
        this.y=clamp(this.y+ny*this.speed*dt, this.hitR, H-this.hitR);
        this.facingRight = dx>0;
        this.sprite.setAnim(true, this.facingRight);
        this.sprite.update(dt);

        this.shootTimer-=dt;
    }

    canShoot() { return this.shootTimer<=0; }
    resetShoot(){ this.shootTimer=this.shootCooldown; }

    takePearl(){
        this.hp--;
        this.stunTimer=0.35;
        if(this.hp<=0) this.startDying();
    }
    startDying(){if(!this.dying){this.dying=true;this.dyT=0;}}

    draw(ctx) {
        if (!this.alive) return;
        ctx.save();
        if (this.dying){
            const t=this.dyT/this.dyDur;
            ctx.globalAlpha=Math.max(0,1-t);
            this.sprite.draw(ctx,this.x,this.y,this.scale*(1+t*0.5),'#c01010');
        } else {
            // Flash red when stunned
            if (this.stunTimer>0){
                ctx.globalAlpha=0.55+Math.sin(Date.now()*0.04)*0.45;
            }
            this.sprite.draw(ctx,this.x,this.y,this.scale,'#c01010');
            // HP bar above Fury
            const bw=90, bh=8, bx=this.x-bw/2, by=this.y-this.hitR-18;
            ctx.globalAlpha=1;
            ctx.fillStyle='rgba(0,0,0,0.55)';
            ctx.fillRect(bx,by,bw,bh);
            ctx.fillStyle='#ff2828';
            ctx.fillRect(bx,by,bw*(this.hp/8),bh);
            ctx.strokeStyle='rgba(255,80,80,0.6)'; ctx.lineWidth=1;
            ctx.strokeRect(bx,by,bw,bh);
        }
        ctx.restore();
    }
}

// ─────────────────────────────────────────────────────────────
//  ToxinBolt — Fury's projectile
// ─────────────────────────────────────────────────────────────
class ToxinBolt {
    constructor(x,y,tx,ty){
        this.x=x; this.y=y;
        const dist=Math.hypot(tx-x,ty-y)||1;
        const spd=240;
        this.vx=(tx-x)/dist*spd;
        this.vy=(ty-y)/dist*spd;
        this.alive=true;
        this.r=10;
        this.timer=0; this.dur=3.0;
    }
    update(dt,W,H){
        this.x+=this.vx*dt; this.y+=this.vy*dt;
        this.timer+=dt;
        if (this.x<-20||this.x>W+20||this.y<-20||this.y>H+20||this.timer>this.dur)
            this.alive=false;
    }
    draw(ctx,e){
        if(!this.alive)return;
        ctx.save();
        const pulse=1+Math.sin(e*8)*0.15;
        // Glow
        const g=ctx.createRadialGradient(this.x,this.y,1,this.x,this.y,this.r*3*pulse);
        g.addColorStop(0,'rgba(80,240,40,0.55)'); g.addColorStop(1,'rgba(40,180,10,0)');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(this.x,this.y,this.r*3*pulse,0,Math.PI*2); ctx.fill();
        // Core
        ctx.fillStyle='#80ff40';
        ctx.beginPath(); ctx.arc(this.x,this.y,this.r*pulse,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#c8ffa0';
        ctx.beginPath(); ctx.arc(this.x-this.r*0.3,this.y-this.r*0.3,this.r*0.35,0,Math.PI*2); ctx.fill();
        ctx.restore();
    }
}

// ─────────────────────────────────────────────────────────────
//  ScorePopup
// ─────────────────────────────────────────────────────────────
class ScorePopup {
    constructor(x,y,text,color){
        this.x=x; this.y=y; this.text=text; this.color=color||'#fff';
        this.alpha=1; this.vy=-50; this.timer=0; this.dur=1.1; this.alive=true;
    }
    update(dt){this.timer+=dt;this.y+=this.vy*dt;this.vy*=0.93;this.alpha=1-this.timer/this.dur;if(this.timer>=this.dur)this.alive=false;}
    draw(ctx){
        if(!this.alive)return;
        ctx.save(); ctx.globalAlpha=Math.max(0,this.alpha);
        ctx.fillStyle=this.color; ctx.font="bold 20px 'Exo 2',sans-serif";
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.shadowColor='rgba(0,0,0,0.7)'; ctx.shadowBlur=6;
        ctx.fillText(this.text,this.x,this.y); ctx.restore();
    }
}

// ─────────────────────────────────────────────────────────────
//  StageTransition
// ─────────────────────────────────────────────────────────────
class StageTransition {
    constructor(){this.active=false;this.phase='idle';this.alpha=0;this.timer=0;this.label='';this.cb=null;}
    start(label,cb){this.active=true;this.phase='out';this.alpha=0;this.timer=0;this.label=label;this.cb=cb;}
    update(dt){
        if(!this.active)return; this.timer+=dt;
        if(this.phase==='out'){
            this.alpha=Math.min(1,this.timer/0.45);
            if(this.timer>=0.45){this.phase='text';this.timer=0;if(this.cb)this.cb();}
        }else if(this.phase==='text'){
            if(this.timer>=1.6){this.phase='in';this.timer=0;}
        }else{
            this.alpha=1-Math.min(1,this.timer/0.5);
            if(this.timer>=0.5){this.active=false;this.phase='idle';this.alpha=0;}
        }
    }
    draw(ctx,W,H){
        if(!this.active&&this.alpha<=0)return;
        ctx.save(); ctx.globalAlpha=clamp(this.alpha,0,1);
        ctx.fillStyle='#000d1a'; ctx.fillRect(0,0,W,H);
        if(this.phase==='text'||this.phase==='in'){
            ctx.globalAlpha=this.phase==='in'?clamp(this.alpha*5,0,1):1;
            ctx.fillStyle='#ffd060'; ctx.font="bold 58px 'Bangers',cursive";
            ctx.textAlign='center'; ctx.textBaseline='middle';
            ctx.shadowColor='rgba(255,180,0,0.65)'; ctx.shadowBlur=32;
            ctx.fillText(this.label,W/2,H/2);
        }
        ctx.restore();
    }
}

// ─────────────────────────────────────────────────────────────
//  HUD
// ─────────────────────────────────────────────────────────────
class HUD {
    draw(ctx,W,H,stage,score,fishLeft,playerScale,hasPearl,isBossStage){
        ctx.save();
        ctx.shadowColor='rgba(0,0,0,0.85)'; ctx.shadowBlur=8;
        ctx.font="700 17px 'Exo 2',sans-serif"; ctx.textBaseline='top';
        ctx.fillStyle='#7de8ff'; ctx.textAlign='left';
        ctx.fillText(`STAGE  ${stage}`,20,16);
        ctx.fillStyle='#ffd060'; ctx.textAlign='center';
        ctx.fillText(`SCORE  ${score}`,W/2,16);
        ctx.fillStyle=isBossStage?'#ff4444':'#ff9040'; ctx.textAlign='right';
        const fishLabel = isBossStage ? `⚠ FURY  HP:${fishLeft}` : `FISH  ${fishLeft}`;
        ctx.fillText(fishLabel,W-20,16);
        // Size bar
        const bx=20,by=42,bw=120,bh=8;
        const fill=clamp((playerScale-0.72)/(1.95-0.72),0,1);
        ctx.shadowBlur=0;
        ctx.fillStyle='rgba(0,0,0,0.4)'; this._rr(ctx,bx,by,bw,bh,4); ctx.fill();
        ctx.fillStyle='rgba(255,255,255,0.1)'; this._rr(ctx,bx,by,bw,bh,4); ctx.fill();
        if(fill>0){
            const cg=ctx.createLinearGradient(bx,by,bx+bw,by);
            cg.addColorStop(0,'#00e5ff');cg.addColorStop(1,'#00ff88');
            ctx.fillStyle=cg; this._rr(ctx,bx,by,Math.max(8,bw*fill),bh,4); ctx.fill();
        }
        ctx.fillStyle='rgba(100,220,255,0.6)';
        ctx.font="11px 'Exo 2',sans-serif"; ctx.textAlign='left'; ctx.textBaseline='top';
        ctx.fillText('SIZE',bx+bw+8,by+1);
        // Pearl indicator
        if(hasPearl){
            ctx.fillStyle='rgba(200,240,255,0.9)';
            ctx.font="13px 'Exo 2',sans-serif"; ctx.textAlign='left';
            ctx.fillText('● PEARL READY  [SPACE]',20,58);
        }
        ctx.restore();
    }
    _rr(ctx,x,y,w,h,r){
        const rd=Math.min(r,w/2,h/2);
        ctx.beginPath(); ctx.moveTo(x+rd,y); ctx.lineTo(x+w-rd,y); ctx.arcTo(x+w,y,x+w,y+rd,rd);
        ctx.lineTo(x+w,y+h-rd); ctx.arcTo(x+w,y+h,x+w-rd,y+h,rd);
        ctx.lineTo(x+rd,y+h); ctx.arcTo(x,y+h,x,y+h-rd,rd);
        ctx.lineTo(x,y+rd); ctx.arcTo(x,y,x+rd,y,rd); ctx.closePath();
    }
}

// ─────────────────────────────────────────────────────────────
//  Game  — main engine
// ─────────────────────────────────────────────────────────────
class Game {
    constructor(canvas){
        this.canvas=canvas;
        this.ctx=canvas.getContext('2d');
        this.dpr=window.devicePixelRatio||1;
        this.W=Math.round(canvas.width/this.dpr);
        this.H=Math.round(canvas.height/this.dpr);
        this.state='loading';
        this.stage=1;
        this.score=0;
        this.loader=new AssetLoader();
        this.player=null;
        this.npcs=[];
        this.fury=null;          // boss instance
        this.toxins=[];          // Fury's projectiles
        this.popups=[];
        this.bgImg=null; this.fgImg=null;
        this.hud=new HUD();
        this.transition=new StageTransition();
        this.keys={};
        this.hasPearl=false;     // player collected a pearl
        this.pearlTimer=0;       // countdown (pearl lasts 15s)
        this.pearlDur=15;
        this.lastTime=0;
        this.elapsed=0;
        this._bgBubbles=null;
        this._bindKeys();
        this._queueAssets();
    }

    _bindKeys(){
        window.addEventListener('keydown',e=>{
            this.keys[e.key]=true;
            if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))
                e.preventDefault();
        });
        window.addEventListener('keyup',e=>{this.keys[e.key]=false;});
    }

    _queueAssets(){
        this.loader.queue('player','assets/fish_sprite_sheet_teal.png');
        this.loader.queue('fury_sheet','assets/fish_sprite_sheet_fury.png');
        NPC_SPECIES.forEach(sp=>this.loader.queue(sp.key,sp.file));
        for(let i=1;i<=BG_CYCLE;i++){
            this.loader.queue(`bg${i}`,`assets/stage${i}_bg.png`);
            this.loader.queue(`fg${i}`,`assets/stage${i}_fg.png`);
        }
        this.loader.onComplete=()=>{
            this._initStage(this.stage);
            this.state='playing';
        };
    }

    resize(W,H,dpr){this.W=W;this.H=H;this.dpr=dpr;}
    start(){requestAnimationFrame(ts=>this._loop(ts));}

    _loop(ts){
        const dt=Math.min((ts-this.lastTime)/1000,0.05);
        this.lastTime=ts; this.elapsed+=dt;
        this._update(dt); this._draw();
        requestAnimationFrame(ts2=>this._loop(ts2));
    }

    // ── Stage init ────────────────────────────────────────────
    _initStage(n){
        const bgIdx=((n-1)%BG_CYCLE)+1;
        this.bgImg=this.loader.get(`bg${bgIdx}`);
        this.fgImg=this.loader.get(`fg${bgIdx}`);
        if(!this.player)
            this.player=new Player(this.loader.get('player'),this.W/2,this.H/2);
        this.npcs=[]; this.popups=[]; this.toxins=[];
        this.fury=null;
        // Boss stage every 5
        const isBoss=(n%5===0);
        if(isBoss){
            this._spawnFury();
        } else {
            const count=Math.min(5+n*2,26);
            for(let i=0;i<count;i++) this._spawnNpc(n);
        }
    }

    _spawnFury(){
        // Spawn Fury on a random edge away from player
        const edge=randInt(0,3);
        let x,y;
        if(edge===0){x=rand(80,this.W-80);y=60;}
        else if(edge===1){x=rand(80,this.W-80);y=this.H-60;}
        else if(edge===2){x=60;y=rand(80,this.H-80);}
        else{x=this.W-60;y=rand(80,this.H-80);}
        this.fury=new FuryBoss(this.loader.get('fury_sheet'),x,y);
    }

    _spawnNpc(stageNum){
        const sp=NPC_SPECIES[randInt(0,NPC_SPECIES.length-1)];
        const img=this.loader.get(sp.key);
        // ── KEY FIX: scale is always BELOW player scale * 1.0 on stage 1
        //    On later stages some fish can be larger than starting size
        //    but are still beatable once player has grown.
        const playerSc = this.player ? this.player.scale : 0.72;
        const stageBonus=Math.min((stageNum-1)*0.04, 0.20);
        // Hard cap: no NPC starts bigger than (playerScale + stage bonus)
        const capScale = playerSc + stageBonus;
        const rawMin=sp.minScale;
        const rawMax=Math.min(sp.maxScale+stageBonus, capScale);
        const scale=rand(rawMin, Math.max(rawMin+0.01, rawMax));
        let x,y,attempts=0;
        do {
            x=rand(80,this.W-80); y=rand(80,this.H-80); attempts++;
        } while(this.player&&Math.hypot(x-this.player.x,y-this.player.y)<220&&attempts<20);
        this.npcs.push(new NpcFish(img,x,y,scale,sp.color));
    }

    // ── Update ────────────────────────────────────────────────
    _update(dt){
        this.transition.update(dt);
        if(this.state!=='playing')return;
        const {W,H}=this;
        this.player.update(dt,this.keys,W,H);

        // Pearl timer
        if(this.hasPearl){
            this.pearlTimer-=dt;
            if(this.pearlTimer<=0){this.hasPearl=false;}
        }

        // Pearl shoot
        if(this.keys[' ']&&this.hasPearl&&this.fury&&!this.fury.dying){
            this.keys[' ']=false; // consume keypress
            this._shootPearl();
        }

        // NPC update
        for(const npc of this.npcs) npc.update(dt,W,H);

        // Fury boss update
        if(this.fury&&this.fury.alive){
            this.fury.update(dt,this.player,W,H);
            // Fury shoots toxin at player
            if(this.fury.canShoot()){
                this.fury.resetShoot();
                this.toxins.push(new ToxinBolt(this.fury.x,this.fury.y,this.player.x,this.player.y));
            }
            // Fury touches player → damage feedback (push)
            const fd=Math.hypot(this.player.x-this.fury.x,this.player.y-this.fury.y);
            if(fd<this.fury.hitR+this.player.hitR*0.6){
                const ang=Math.atan2(this.player.y-this.fury.y,this.player.x-this.fury.x);
                this.player.x=clamp(this.player.x+Math.cos(ang)*18,this.player.hitR,W-this.player.hitR);
                this.player.y=clamp(this.player.y+Math.sin(ang)*18,this.player.hitR,H-this.player.hitR);
                const recent=this.popups.filter(p=>p.text==='DANGER!').length;
                if(!recent) this.popups.push(new ScorePopup(this.player.x,this.player.y-36,'DANGER!','#ff3333'));
            }
        }

        // Toxin update + collision with player
        for(const t of this.toxins) t.update(dt,W,H);
        for(const t of this.toxins){
            if(!t.alive)continue;
            if(Math.hypot(this.player.x-t.x,this.player.y-t.y)<t.r+this.player.hitR*0.5){
                t.alive=false;
                this.popups.push(new ScorePopup(this.player.x,this.player.y-36,'POISONED!','#80ff40'));
            }
        }
        this.toxins=this.toxins.filter(t=>t.alive);

        this._checkEat();
        for(const p of this.popups) p.update(dt);
        this.popups=this.popups.filter(p=>p.alive);

        // Stage clear check
        const isBossStage=(this.stage%5===0);
        if(isBossStage){
            if(this.fury&&!this.fury.alive&&!this.transition.active) this._stageClear();
        } else {
            const remaining=this.npcs.filter(n=>n.alive).length;
            if(remaining===0&&!this.transition.active) this._stageClear();
        }
    }

    _shootPearl(){
        if(!this.fury)return;
        // Pearl travels toward Fury and damages it
        this.fury.takePearl();
        const pts=50;
        this.score+=pts;
        this.popups.push(new ScorePopup(this.fury.x,this.fury.y-30,`PEARL HIT! +${pts}`,'#c8f0ff'));
    }

    _checkEat(){
        const p=this.player;
        for(const npc of this.npcs){
            if(!npc.alive||npc.dying)continue;
            const dist=Math.hypot(p.x-npc.x,p.y-npc.y);
            const gap=p.hitR*0.72+npc.hitR*0.68;
            if(dist>gap)continue;
            if(npc.scale<=p.scale*1.15){
                npc.startDying();
                const pts=Math.round(npc.scale*100);
                this.score+=pts;
                p.grow(npc.scale);
                // Chance to drop pearl power-up
                if(!this.hasPearl&&Math.random()<0.12){
                    this.hasPearl=true; this.pearlTimer=this.pearlDur;
                    this.popups.push(new ScorePopup(npc.x,npc.y-40,'PEARL +15s','#80d0ff'));
                }
                this.popups.push(new ScorePopup(npc.x,npc.y-22,`+${pts}`,'#ffd060'));
            } else {
                const ang=Math.atan2(p.y-npc.y,p.x-npc.x);
                p.x=clamp(p.x+Math.cos(ang)*10,p.hitR,this.W-p.hitR);
                p.y=clamp(p.y+Math.sin(ang)*10,p.hitR,this.H-p.hitR);
                const recent=this.popups.filter(pp=>pp.text==='TOO BIG!').length;
                if(!recent) this.popups.push(new ScorePopup(p.x,p.y-34,'TOO BIG!','#ff5555'));
            }
        }
    }

    _stageClear(){
        this.state='transition';
        const next=this.stage+1;
        const nextIsBoss=(next%5===0);
        const lbl=nextIsBoss?`⚠  STAGE ${next}  —  FURY APPROACHES!`:`STAGE  ${next}`;
        this.transition.start(lbl,()=>{
            this.stage=next;
            this._initStage(this.stage);
        });
        setTimeout(()=>{if(this.state==='transition')this.state='playing';},2700);
    }

    // ── Draw ──────────────────────────────────────────────────
    _draw(){
        const {ctx,dpr,W,H}=this;
        ctx.save(); ctx.scale(dpr,dpr);
        if(this.state==='loading') this._drawLoading(ctx,W,H);
        else this._drawGame(ctx,W,H);
        ctx.restore();
    }

    _drawLoading(ctx,W,H){
        const g=ctx.createLinearGradient(0,0,0,H);
        g.addColorStop(0,'#000d1a'); g.addColorStop(1,'#001e3c');
        ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
        ctx.save();
        for(let i=0;i<10;i++){
            const sx=W*(0.05+i*0.1),sp=55+i*9;
            const rr=ctx.createLinearGradient(sx,0,sx,H*0.9);
            rr.addColorStop(0,`rgba(70,190,255,${0.03+(i%3)*0.008})`);
            rr.addColorStop(1,'rgba(0,80,180,0)');
            ctx.fillStyle=rr; ctx.beginPath();
            ctx.moveTo(sx-3,0); ctx.lineTo(sx+3,0);
            ctx.lineTo(sx+sp,H*0.9); ctx.lineTo(sx-sp,H*0.9);
            ctx.closePath(); ctx.fill();
        }
        ctx.restore();
        ctx.save();
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.shadowColor='rgba(255,170,0,0.55)'; ctx.shadowBlur=28;
        const tg=ctx.createLinearGradient(W/2,H/2-90,W/2,H/2-20);
        tg.addColorStop(0,'#ffd060'); tg.addColorStop(1,'#ff7800');
        ctx.fillStyle=tg; ctx.font="80px 'Bangers',cursive";
        ctx.save(); ctx.transform(1,0,-0.1,1,7,0);
        ctx.fillText('FIN & FURY',W/2,H/2-60); ctx.restore(); ctx.restore();
        ctx.save();
        ctx.fillStyle='rgba(120,210,255,0.9)'; ctx.font="20px 'Exo 2',sans-serif";
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('Loading...',W/2,H/2+14); ctx.restore();
        const bw=Math.min(W*0.48,380),bh=6,bx=(W-bw)/2,by=H/2+46;
        ctx.save();
        ctx.fillStyle='rgba(255,255,255,0.08)';
        ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,3); ctx.fill();
        const pg=ctx.createLinearGradient(bx,by,bx+bw,by);
        pg.addColorStop(0,'#00c8ff'); pg.addColorStop(1,'#00ff88');
        ctx.fillStyle=pg;
        ctx.beginPath(); ctx.roundRect(bx,by,Math.max(6,bw*this.loader.progress),bh,3); ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.fillStyle='rgba(100,170,210,0.5)'; ctx.font="12px 'Exo 2',sans-serif";
        ctx.textAlign='center'; ctx.textBaseline='top';
        ctx.fillText(this.loader.label,W/2,by+14); ctx.restore();
    }

    _drawGame(ctx,W,H){
        // Background
        if(this.bgImg&&this.bgImg.naturalWidth){
            ctx.drawImage(this.bgImg,0,0,W,H);
        } else {
            this._drawFallbackBG(ctx,W,H);
        }
        // NPCs
        for(const npc of this.npcs) npc.draw(ctx);
        // Fury boss
        if(this.fury) this.fury.draw(ctx);
        // Toxin bolts
        for(const t of this.toxins) t.draw(ctx,this.elapsed);
        // Player (on top of NPCs, below FG)
        if(this.player) this.player.draw(ctx);
        // Foreground
        if(this.fgImg&&this.fgImg.naturalWidth){
            ctx.drawImage(this.fgImg,0,0,W,H);
        }
        // Popups
        for(const p of this.popups) p.draw(ctx);
        // HUD
        const isBossStage=(this.stage%5===0);
        const fishLeft=isBossStage
            ? (this.fury?this.fury.hp:0)
            : this.npcs.filter(n=>n.alive).length;
        this.hud.draw(ctx,W,H,this.stage,this.score,fishLeft,
                      this.player?.scale??0.72, this.hasPearl, isBossStage);
        // Stage transition
        this.transition.draw(ctx,W,H);
    }

    _drawFallbackBG(ctx,W,H){
        const e=this.elapsed;
        const tint=(this.stage-1)%5;
        const bgC=[
            ['#000d1a','#001e3c','#002f54'],
            ['#00101a','#001a2c','#002038'],
            ['#060010','#0d0025','#120035'],
            ['#080a00','#0f1400','#141a00'],
            ['#120000','#1a0000','#200000'],
        ];
        const [c0,c1,c2]=bgC[tint];
        const g=ctx.createLinearGradient(0,0,0,H);
        g.addColorStop(0,c0); g.addColorStop(0.45,c1); g.addColorStop(1,c2);
        ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
        const rg=ctx.createRadialGradient(W/2,H*0.42,0,W/2,H*0.42,Math.max(W,H)*0.6);
        rg.addColorStop(0,'rgba(0,100,180,0.12)'); rg.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=rg; ctx.fillRect(0,0,W,H);
        ctx.save();
        for(let i=0;i<10;i++){
            const sx=W*(0.05+i*0.1),sp=55+i*9;
            const rr=ctx.createLinearGradient(sx,0,sx,H*0.88);
            rr.addColorStop(0,`rgba(70,190,255,${0.035+(i%3)*0.008})`);
            rr.addColorStop(1,'rgba(0,80,180,0)');
            ctx.fillStyle=rr; ctx.beginPath();
            ctx.moveTo(sx-3,0); ctx.lineTo(sx+3,0);
            ctx.lineTo(sx+sp,H*0.88); ctx.lineTo(sx-sp,H*0.88);
            ctx.closePath(); ctx.fill();
        }
        ctx.restore();
        ctx.save();
        for(let i=0;i<16;i++){
            const cx2=W*(0.03+i*0.062),cy2=H*(0.82+Math.sin(e*0.55+i)*0.032);
            const rw=26+Math.sin(e*1.05+i*0.8)*15,rh=5+Math.sin(e*0.85+i*1.2)*2.2;
            const a=0.05+Math.sin(e*0.75+i)*0.022;
            ctx.fillStyle=`rgba(100,210,255,${Math.max(0,a)})`;
            ctx.beginPath(); ctx.ellipse(cx2,cy2,rw,rh,0,0,Math.PI*2); ctx.fill();
        }
        ctx.restore();
        ctx.save();
        if(!this._bgBubbles){
            this._bgBubbles=Array.from({length:35},()=>({
                x:rand(0,W),y:rand(0,H),r:rand(1.5,5),vy:rand(0.3,0.9),
                dx:(Math.random()-0.5)*0.25,ph:Math.random()*Math.PI*2
            }));
        }
        for(const b of this._bgBubbles){
            b.y-=b.vy; b.x+=b.dx+Math.sin(e*1.1+b.ph)*0.12;
            if(b.y<-10){b.y=H+5;b.x=rand(0,W);}
            const alpha=0.12+Math.sin(e*1.8+b.ph)*0.06;
            ctx.globalAlpha=Math.max(0,alpha);
            ctx.strokeStyle='rgba(130,210,255,0.6)'; ctx.lineWidth=0.8;
            ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.stroke();
            ctx.fillStyle='rgba(200,240,255,0.2)';
            ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill();
            ctx.globalAlpha=alpha*1.2; ctx.fillStyle='rgba(255,255,255,0.7)';
            ctx.beginPath(); ctx.arc(b.x-b.r*0.32,b.y-b.r*0.32,b.r*0.24,0,Math.PI*2); ctx.fill();
        }
        ctx.restore();
    }
}
