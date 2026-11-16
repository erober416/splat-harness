// Night Pond: a frog on a lily pad in a floating pond, with a stone lantern, cattails, lotus,
// koi, fireflies and a spillway. Scene units are roughly metres; the island is about 4 wide.
export const meta = {
  id: 'night-pond',
  title: 'Night Pond',
  seed: 20261115,
  hint: 'Drag to orbit. Tap to make the frog hop.',
  alt: 'A pixel-art frog on a lily pad in a floating pond at night, with a stone lantern, cattails, lotus flowers, koi and fireflies.',
  ui: { title: '#c9e77a', hint: '#ffc44d', text: '#a9afc0', ink: '#0b0d1a', edge: '#1a2b45', void: '#05060c' },
  palette: { name: 'Moonlit', colors: ['#05060c','#0b0d1a','#121a2e','#1a2b45','#23415a','#2f5d6e','#4a8a8a','#8fc7c0','#16301f','#1f4a2a','#2f6e35','#4c9a3f','#86c64a','#c9e77a','#3a1d14','#6e3320','#b3542a','#e8862e','#ffc44d','#fff0a8','#6b2247','#b83d6b','#ef7fa0','#ffc7d1','#3b3f52','#6d7387','#a9afc0','#eef1f8'] },
  bg: { bottom: [0.018, 0.022, 0.045], top: [0.062, 0.085, 0.165], curve: 2 },
  ramp: [0.085, 1.45, 0.7],
  camera: { mode: 'orbit', az: 0.2, el: 0.42, target: [0, 0.25, 0], fit: [2.1, 2.5], elRange: [0.08, 1.15], speed: 0.14 },
  tap: { hop: 0.5, time: 0.55 }
};

export function build(kit) {
  const { TAU, add, sub, mul, dot, cross, norm, mix, clamp01, hash, UP, A0, P0, QUP, I3, rotX, rotY, rotZ, ap, tr, quatY, quatB,
    R, rr, randUnit, solid, glow, setLights, shade, put, ellipsoid, cyl, box, roof } = kit;
  // Lights: cool moon from the front-left, one warm lantern at the back.
  const MOON=norm([-0.5,0.8,0.4]);
  const LCX=-1.02, LCZ=-0.92, LAN=[LCX,0.78,LCZ];
  setLights({ambient:[0.20,0.25,0.38],dir:[{dir:MOON,color:[0.55,0.66,0.85],wrap:0.2}],point:[{p:LAN,c:[1.0,0.62,0.25],i:1.5,k:2.0,min:0.12}]});

  const STONE=[0.50,0.52,0.63], STONE_D=[0.38,0.40,0.52], MOSS=[0.26,0.55,0.26];
  const WATERFALL=0.75; // angle of the spillway on the rim
  const angDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));

  function rock(c,rad,cnt,o){
    o=o||{};
    const s1=rr(0,6),s2=rr(0,6),s3=rr(0,6);
    ellipsoid(c,rad,rotY(rr(0,3)),cnt,o.size||0.04,(d,n)=>{
      if(!o.bare&&n[1]>0.5&&Math.sin(d[0]*6+s1)*Math.sin(d[2]*5+s2)>-0.25)return MOSS;
      return Math.sin(d[1]*9+s3)>0.3?STONE_D:STONE;
    },Object.assign({warp:d=>1+0.13*Math.sin(d[0]*5+s1)*Math.sin(d[1]*4+s2)+0.08*Math.sin(d[2]*7+s3)},o));
  }

  function buildWater(){
    const WR=1.8;
    for(let i=0;i<9500;i++){
      const rho=WR*Math.sqrt(R()),an=rr(0,TAU);
      const p=[rho*Math.cos(an),rr(-0.004,0.004),rho*Math.sin(an)];
      const nz=Math.sin(p[0]*3.1+1.3)*Math.sin(p[2]*2.7+0.4)+0.5*Math.sin(p[0]*7.3+p[2]*5.1);
      const b=mix([0.06,0.15,0.27],[0.10,0.34,0.40],clamp01(0.5+0.45*nz));
      solid.add(p,QUP,0.065,0.02,0.065,shade(b,p,UP,0.05),3,[4,rr(0,TAU),1,rho],P0);
      if(R()<0.035)solid.add([p[0],0.008,p[2]],QUP,0.022,0.008,0.022,[0.65,0.85,0.95],2.5,[8,rr(0,TAU),0,rr(0.8,2.6)],P0);
    }
  }

  function pad(c,r,notch,shadow){
    const cnt=Math.round(r*r*1100)+40;
    for(let i=0;i<cnt;i++){
      const rho=r*Math.sqrt(R()),an=rr(0,TAU),q=rho/r;
      if(Math.abs(angDiff(an,notch))<0.2&&q>0.1)continue;
      let b=[0.13,0.46,0.30];
      if(Math.abs(Math.sin((an-notch)*5.5))<0.13&&q>0.12)b=[0.20,0.60,0.36];
      if(q>0.88)b=[0.28,0.68,0.40];
      const p=[c[0]+rho*Math.cos(an),c[1]+rr(-0.003,0.003),c[2]+rho*Math.sin(an)];
      if(shadow){const sx=(p[0])/0.46,sz=(p[2]+0.03)/0.52;if(sx*sx+sz*sz<1)b=mul(b,0.5)}
      solid.add(p,QUP,0.036,0.012,0.036,shade(b,p,UP,0.05),3,A0,P0);
    }
  }

  function buildFrog(){
    const GREEN=[0.50,0.92,0.24],DARK=[0.15,0.50,0.20],BELLY=[0.86,0.97,0.46],ORANGE=[1.0,0.56,0.20],LINE=[0.08,0.26,0.12];
    const fa=[3,0,0.012,2.2],fp=[0,0.05,0],o={anim:fa,piv:fp};
    const spots=[];while(spots.length<10){const d=randUnit();if(d[1]>0.15)spots.push(d)}
    // torso, tipped up at the front
    ellipsoid([0,0.30,-0.05],[0.34,0.25,0.42],rotX(-0.35),1500,0.034,(d,n)=>{
      if(n[1]<-0.35)return BELLY;
      for(const s of spots)if(dot(d,s)>0.94)return DARK;
      return n[1]<-0.1?mix(GREEN,BELLY,0.5):GREEN;
    },o);
    // head, with a mouth line and nostrils
    const N1=norm([0.2,0.38,0.9]),N2=norm([-0.2,0.38,0.9]);
    ellipsoid([0,0.46,0.33],[0.31,0.20,0.27],rotX(-0.12),1100,0.03,d=>{
      if(d[1]<-0.22)return BELLY;
      if(d[1]<-0.08&&d[2]>-0.35)return LINE;
      if(dot(d,N1)>0.992||dot(d,N2)>0.992)return LINE;
      return GREEN;
    },o);
    for(const s of[-1,1]){
      // eye: lid, dark rim, gold iris, pupil, one white glint
      const e=norm([s*0.72,0.28,0.63]),hl=norm(add(e,[-0.25,0.45,0.1]));
      ellipsoid([s*0.185,0.635,0.37],[0.115,0.115,0.115],I3,520,0.02,d=>{
        const t=dot(d,e);
        if(dot(d,hl)>0.975)return{e:1,c:[1,1,1]};
        if(t>0.86)return{e:1,c:[0.02,0.02,0.04]};
        if(t>0.45)return{e:1,c:[1.0,0.74,0.16]};
        if(t>0.36)return LINE;
        return GREEN;
      },o);
      // back leg: thigh, folded shin, foot with orange toes
      ellipsoid([s*0.34,0.20,-0.20],[0.15,0.17,0.30],rotY(s*0.45),620,0.032,(d,n)=>n[1]<-0.4?BELLY:(dot(d,spots[0])>0.9?DARK:GREEN),o);
      ellipsoid([s*0.47,0.09,-0.02],[0.09,0.08,0.27],rotY(-s*0.15),360,0.028,()=>GREEN,o);
      ellipsoid([s*0.47,0.05,0.26],[0.10,0.035,0.15],I3,240,0.026,d=>d[2]>0.25?ORANGE:GREEN,o);
      // front leg and hand
      ellipsoid([s*0.25,0.22,0.36],[0.075,0.19,0.08],rotZ(s*0.3),300,0.026,()=>GREEN,o);
      ellipsoid([s*0.31,0.05,0.47],[0.10,0.035,0.11],I3,220,0.026,d=>d[2]>0.15?ORANGE:GREEN,o);
    }
    // throat sac, which puffs
    ellipsoid([0,0.30,0.42],[0.15,0.13,0.15],I3,420,0.03,()=>BELLY,{anim:[3,0,0.42,2.2],piv:[0,0.33,0.30]});
  }

  function lotus(c,sc,inner,tip){
    const layers=[[9,1.2,0.21,0],[7,0.8,0.20,0.3],[5,0.4,0.17,0.6]];
    for(const[n,tilt,len,offs]of layers)for(let k=0;k<n;k++){
      const ph=k/n*TAU+offs,a=[Math.sin(tilt)*Math.cos(ph),Math.cos(tilt),Math.sin(tilt)*Math.sin(ph)];
      const side=norm(cross(a,UP)),by=cross(a,side);
      ellipsoid(add(c,mul(a,len*sc*0.95)),[0.07*sc,0.02*sc,len*sc],[side,by,a],110,0.02*sc+0.006,d=>mix(inner,tip,clamp01(0.5+0.6*d[2])),{j:0.05});
    }
    ellipsoid(add(c,[0,0.05*sc,0]),[0.05*sc,0.04*sc,0.05*sc],I3,90,0.02,()=>({e:1,c:[1,0.82,0.3]}));
    glow.add(add(c,[0,0.1,0]),QUP,0.24*sc,0.24*sc,0.24*sc,[0.20,0.06,0.11],1,A0,P0);
  }

  function cattail(base,h,lean,ph){
    const anim=[1,ph,0.03,0],o={anim:anim,piv:base};
    const top=add(base,[lean[0]*h,h,lean[1]*h]),q=quatY(norm(sub(top,base))),sn=norm([-0.3,0.5,0.5]);
    for(let y=0;y<1;y+=0.035/h){const p=mix(base,top,y);solid.add(p,q,0.013,0.045,0.013,shade([0.36,0.62,0.28],p,sn),3,anim,base)}
    ellipsoid(mix(base,top,(h-0.33)/h),[0.055,0.17,0.055],I3,190,0.024,()=>[0.55,0.31,0.16],o);
    const nL=3+((R()*2)|0);
    for(let l=0;l<nL;l++){
      const a=rr(0,TAU),out=[Math.cos(a),0,Math.sin(a)],side=cross(UP,out),hl=h*rr(0.5,0.85),bend=rr(0.25,0.55);
      for(let t=0;t<1;t+=0.03){
        const p=add(base,add(mul(out,bend*t*t),[0,hl*(t-0.18*t*t*t),0]));
        const T=norm(add(mul(out,2*bend*t),[0,hl*(1-0.54*t*t),0])),nr=cross(T,side);
        const w=0.03*Math.pow(1-t,0.6)+0.006;
        solid.add(p,quatB([side,nr,T]),w,0.006,0.035,shade(mix([0.20,0.45,0.22],[0.40,0.72,0.34],t),p,nr[1]<0?mul(nr,-1):nr),3,anim,base);
      }
    }
  }

  function buildLantern(){
    rock([LCX,0.02,LCZ],[0.46,0.16,0.40],900,{size:0.04});
    const st=()=>STONE, o={j:0.06};
    box([LCX,0.21,LCZ],[0.17,0.04,0.17],520,0.028,st,o);
    cyl([LCX,0.25,LCZ],[LCX,0.62,LCZ],0.065,0.065,380,0.026,t=>t>0.45&&t<0.55?STONE_D:STONE,o);
    box([LCX,0.645,LCZ],[0.16,0.028,0.16],440,0.026,st,o);
    box([LCX,0.78,LCZ],[0.115,0.105,0.115],700,0.022,(ax,sg,q)=>{
      if(ax===1)return STONE_D;
      const hq=ax===0?q[2]:q[0];
      if(Math.abs(hq)<0.66&&Math.abs(q[1])<0.7&&Math.abs(hq)>0.09)return{e:1,c:[1.0,0.86,0.42],anim:[6,rr(0,TAU),0,0]};
      return STONE_D;
    },o);
    roof([LCX,0,LCZ],0.885,0.25,1.06,0.035,760,0.028,(t,s)=>Math.sin(s*7+t*9)>0.55?MOSS:STONE_D,o);
    ellipsoid([LCX,1.10,LCZ],[0.04,0.055,0.04],I3,90,0.02,()=>STONE,o);
    glow.add(LAN,QUP,0.50,0.50,0.50,[0.40,0.21,0.06],1,[6,0,0,0],P0);
    glow.add(LAN,QUP,0.20,0.20,0.20,[0.50,0.33,0.12],1,[6,1.7,0,0],P0);
  }

  function buildIsland(){
    // grassy rim
    for(let i=0;i<2700;i++){
      const an=rr(0,TAU),rad=rr(1.74,1.98),wf=Math.abs(angDiff(an,WATERFALL))<0.09;
      const p=[rad*Math.cos(an),wf?0.004:0.03+0.03*Math.sin(an*9)*Math.sin(rad*20),rad*Math.sin(an)];
      let b=Math.sin(an*13+rad*9)>0.2?[0.30,0.62,0.26]:[0.22,0.50,0.22];
      if(wf)b=R()<0.25?[0.85,0.95,1.0]:[0.25,0.52,0.62];
      solid.add(p,QUP,0.05,0.02,0.05,shade(b,p,UP),3,A0,P0);
    }
    for(let i=0;i<14;i++){
      const an=rr(0,TAU);if(Math.abs(angDiff(an,WATERFALL))<0.3)continue;
      const rad=rr(1.8,1.93),s=rr(0.07,0.13);
      rock([rad*Math.cos(an),0.05,rad*Math.sin(an)],[s,s*0.7,s*rr(0.8,1.2)],150,{size:0.03});
    }
    for(let i=0;i<170;i++){
      const an=rr(0,TAU);if(Math.abs(angDiff(an,WATERFALL))<0.12)continue;
      const rad=rr(1.78,1.96),base=[rad*Math.cos(an),0.04,rad*Math.sin(an)],ph=rr(0,TAU);
      for(let k=0;k<3;k++){
        const dir=norm([rr(-0.35,0.35),1,rr(-0.35,0.35)]),len=rr(0.07,0.17),p=add(base,mul(dir,len*0.5));
        solid.add(p,quatY(dir),0.011,len*0.45,0.011,shade([0.42,0.78,0.30],p,UP,0.12),3,[1,ph,0.8,0],base);
      }
      if(R()<0.16){const c=R()<0.5?[1,0.95,0.8]:(R()<0.5?[1,0.8,0.3]:[1,0.6,0.75]);solid.add(add(base,[0,0.07,0]),QUP,0.02,0.02,0.02,c,3,A0,P0)}
    }
    // the chunk of earth underneath: moss, soil, then banded stone
    for(let i=0;i<6500;i++){
      const an=rr(0,TAU),t=Math.pow(R(),0.85);
      const wob=1+0.06*Math.sin(an*5+t*6)+0.04*Math.sin(an*11+2+t*3);
      const rad=1.98*(1-0.86*Math.pow(t,1.45))*wob,y=0.03-1.55*t*(1+0.08*Math.sin(an*3+1));
      const p=[rad*Math.cos(an),y,rad*Math.sin(an)],n=norm([Math.cos(an),-(0.25+1.3*t),Math.sin(an)]);
      let b;
      if(t<0.05)b=[0.24,0.52,0.22];
      else if(t<0.16)b=[0.46,0.30,0.20];
      else{b=(Math.floor(y*7+Math.sin(an*4)*0.6)&1)?[0.44,0.46,0.58]:[0.34,0.36,0.48];if(R()<0.06)b=[0.25,0.50,0.30]}
      solid.add(p,quatY(n),0.07,0.03,0.07,shade(b,p,n,0.08),3,A0,P0);
    }
    // roots hanging off the underside
    for(let i=0;i<16;i++){
      const an=rr(0,TAU),t=rr(0.2,0.8),rad=1.98*(1-0.86*Math.pow(t,1.45)),top=[rad*Math.cos(an),0.03-1.55*t,rad*Math.sin(an)],len=rr(0.2,0.6),ph=rr(0,TAU);
      for(let y=0;y<len;y+=0.04){const p=add(top,[0,-y,0]);solid.add(p,QUP,0.012,0.035,0.012,shade([0.42,0.30,0.22],p,[Math.cos(an),0,Math.sin(an)]),3,[1,ph,0.25,0],top)}
    }
    // spillway
    for(let i=0;i<260;i++){
      const an=WATERFALL+rr(-0.07,0.07),k=rr(0.7,1);
      solid.add([1.99*Math.cos(an),0,1.99*Math.sin(an)],QUP,0.02,0.06,0.02,[0.55*k,0.80*k,0.95*k],2.0,[7,R(),rr(0.5,0.8),rr(1.3,1.9)],[0,0.01,0]);
    }
    // little rocks adrift below
    for(const c of[[1.3,-1.9,0.6],[-1.1,-2.3,-0.4],[0.3,-2.7,1.0],[-0.6,-1.9,1.3],[1.0,-2.6,-1.0],[-1.5,-1.4,0.9]]){
      const s=rr(0.1,0.22);rock(c,[s,s*0.8,s*rr(0.8,1.2)],260,{size:0.035,anim:[10,rr(0,TAU),0.05,rr(0.4,0.8)]});
    }
  }

  function buildKoi(){
    for(const[rad,dir,a0,seed]of[[1.12,1,0.4,1.0],[1.40,-1,3.4,4.0],[1.26,1,4.9,7.3]]){
      for(let i=0;i<110;i++){
        const u=rr(-1,1),wh=0.055*Math.pow(1-u*u,0.55)+(u<-0.72?(-0.72-u)*0.28:0),v=rr(-1,1)*wh;
        const an=a0+dir*u*0.19/rad,p=[(rad+v)*Math.cos(an),0.012,(rad+v)*Math.sin(an)];
        const c=Math.sin(u*5+seed)+0.4*Math.sin(v*40+seed)>0.15?[1.0,0.46,0.10]:[0.95,0.92,0.85];
        solid.add(p,QUP,0.022,0.008,0.022,mul(c,rr(0.78,0.9)),3,[5,seed,dir*0.2,u],P0);
      }
    }
  }

  function buildAir(){
    for(let i=0;i<46;i++){
      const rho=1.9*Math.sqrt(R()),a=rr(0,TAU),p=[rho*Math.cos(a),rr(0.25,2.6),rho*Math.sin(a)];
      const an=[2,rr(0,TAU),rr(0.15,0.35),rr(0.7,1.6)];
      solid.add(p,QUP,0.022,0.022,0.022,[0.92,1.0,0.5],4,an,p);
      glow.add(p,QUP,0.12,0.12,0.12,[0.42,0.50,0.14],1,an,p);
    }
    for(let i=0;i<2600;i++){
      const y=rr(-0.985,0.34),a=rr(0,TAU),c=Math.sqrt(1-y*y),s=0.02+0.07*Math.pow(R(),3),k=rr(0.45,1);
      const tint=R()<0.2?[1,0.85,0.65]:(R()<0.4?[0.7,0.85,1]:[0.9,0.92,1]);
      glow.add([34*c*Math.cos(a),34*y,34*c*Math.sin(a)],QUP,s,s,s,mul(tint,k),1.2,[8,rr(0,TAU),0,rr(0.4,2.2)],P0);
    }
  }

  buildWater();
  pad([0,0.03,0.02],0.82,2.3,true);
  for(const[x,z,r,n]of[[-1.05,0.55,0.30,1.0],[1.0,0.75,0.34,4.0],[0.95,-0.5,0.26,2.0],[-0.5,1.18,0.24,5.2],[0.28,1.28,0.20,0.3],[-1.25,-0.25,0.22,3.1],[0.2,-1.25,0.25,1.6]])pad([x,0.02,z],r,n,false);
  buildFrog();
  lotus([-1.07,0.04,0.58],1.0,[1,0.86,0.90],[0.98,0.42,0.62]);
  lotus([1.0,0.04,0.74],0.75,[1,1,0.95],[0.95,0.78,0.90]);
  buildLantern();
  for(const[x,z,h]of[[1.15,-1.0,1.75],[1.32,-0.82,1.45],[0.95,-1.18,1.9],[1.25,-1.15,1.3],[1.05,-0.85,1.1],[-0.45,-1.5,1.6],[-0.25,-1.6,1.25],[-0.6,-1.42,1.0],[-1.52,0.15,1.2],[-1.6,-0.05,0.9]])cattail([x,0,z],h,[rr(-0.08,0.08),rr(-0.08,0.08)],rr(0,TAU));
  rock([1.3,0.03,-0.15],[0.22,0.15,0.18],380);
  rock([0.55,0.02,-1.4],[0.2,0.12,0.16],320);
  rock([-1.45,0.02,0.75],[0.15,0.1,0.13],220);
  buildIsland();
  buildKoi();
  buildAir();
}
