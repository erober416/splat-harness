// Moon Roof Cat: an orange tabby on the ridge of a tiled roof in front of a full moon, with a
// smoking chimney, a skylight, fairy lights and a sea of clouds. The ridge runs along X; the
// camera sits on +Z and sways so the moon (at -Z) stays behind the cat.
export const meta = {
  id: 'moon-roof-cat',
  title: 'Moon Roof Cat',
  seed: 9001,
  hint: 'Drag to look around. Tap to pet the cat.',
  alt: 'A pixel-art orange tabby cat sitting on the ridge of a tiled roof in front of a full moon, with a smoking chimney, fairy lights and a sea of clouds.',
  ui: { title: '#fff6d8', hint: '#f7a54a', text: '#b3b8d4', ink: '#0a0920', edge: '#3a2466', void: '#05040d' },
  palette: { name: 'Moonrise', colors: ['#05040d','#0a0920','#14123a','#231a52','#3a2466','#5c2f73','#8a3f7a','#fff6d8','#f3dfa0','#cbb37a','#8f7f66','#2a0f14','#5a1f1c','#8f3322','#c4512a','#e8782e','#f7a54a','#ffd27a','#2b2d4a','#4a4f73','#7a80a3','#b3b8d4','#e6e9f7','#1f4a3a','#3f8f55','#9be06a','#ff5f7e','#4fd0e0','#2a7888'] },
  bg: { bottom: [0.30, 0.13, 0.34], top: [0.035, 0.03, 0.11], curve: 0.6 },
  ramp: [0.05, 1.3, 0.75],
  camera: { mode: 'sway', az: 0.08, el: 0.14, target: [-0.1, 0.7, 0], fit: [2.4, 2.7], elRange: [0.02, 0.85], azRange: [-0.9, 0.9], speed: 0.22, swayAmp: 0.34 },
  tap: { hop: 0.22, time: 0.45 }
};

export function build(kit) {
  const { TAU, add, sub, mul, dot, cross, norm, mix, clamp01, hash, UP, A0, P0, QUP, I3, rotX, rotY, rotZ, ap, tr, quatY, quatB,
    R, rr, randUnit, solid, glow, setLights, shade, put, ellipsoid, cyl, box, roof } = kit;
  // The house, measured.
  const RIDGE=0.6,SL=0.62,HX=1.9,WX=1.75,WZ=1.3,EZ=1.5,WALLB=-2.2;
  const roofY=z=>RIDGE-Math.abs(z)*SL;
  const SKY={x0:0.22,x1:0.98,v0:0.28,v1:0.64};
  const SKYC=[(SKY.x0+SKY.x1)/2,0,(SKY.v0+SKY.v1)/2*EZ];SKYC[1]=roofY(SKYC[2])+0.05;
  const WINA=[0.55,-0.95],WINB=[-0.95,-0.95],GWIN=[0,-0.55];
  const EAVEY=roofY(EZ)-0.03;
  const BULBC=[[1.0,0.80,0.35],[1.0,0.40,0.55],[0.35,0.85,0.95],[1.0,0.60,0.25]];

  // Lights: moon behind, soft sky fill in front, warm lamps close by.
  const MOON=norm([-0.3,0.55,-0.78]),FILL=norm([0.25,0.6,0.75]);
  const WARM=[1.0,0.68,0.32];
  const LIGHTS=[
    {p:add(SKYC,[0,0.28,0.15]),c:WARM,i:1.5,k:0.9},
    {p:[WINA[0],WINA[1],WZ+0.35],c:WARM,i:1.0,k:2.5},
    {p:[WX+0.35,GWIN[1],GWIN[0]],c:WARM,i:0.9,k:2.5}
  ];
  const BULBS=[];
  for(let i=0;i<12;i++){const b={p:[-1.65+i*0.3,EAVEY-0.09,EZ+0.02],c:BULBC[i%4]};BULBS.push(b);LIGHTS.push({p:b.p,c:b.c,i:0.45,k:9})}

  setLights({ambient:[0.30,0.28,0.44],dir:[{dir:MOON,color:[0.55,0.60,0.80]},{dir:FILL,color:[0.26,0.22,0.30]}],point:LIGHTS});

  const BEAM=[0.32,0.20,0.16],CREAM=[0.88,0.80,0.62],TEAL=[0.22,0.78,0.80];
  const GLASS=()=>({e:1,c:[1.0,0.84,0.42],anim:[6,rr(0,TAU),0,0]});

  function buildRoof(){
    const TC=[[0.86,0.42,0.26],[0.78,0.34,0.22],[0.92,0.50,0.28],[0.70,0.30,0.24]];
    for(const sg of[1,-1]){
      const n=norm([0,1,sg*SL]),q=quatY(n);
      for(let i=0;i<4600;i++){
        const x=rr(-HX,HX),v=R(),row=Math.floor(v*10),fv=v*10-row;
        if(sg>0&&x>SKY.x0&&x<SKY.x1&&v>SKY.v0&&v<SKY.v1)continue;
        const cu=x/0.2+(row&1)*0.5,col=Math.floor(cu),fu=cu-col;
        let b=TC[(hash(row,col+sg*50)*4)|0];
        if(hash(row+9,col)<0.05)b=[0.36,0.50,0.32];
        if(fv<0.14||fu<0.1)b=mul(b,0.45);else if(fv>0.82)b=mul(b,1.18);
        const z=sg*v*EZ,p=[x,roofY(z)+0.035*fv,z];
        solid.add(p,q,0.04,0.016,0.04,shade(b,p,n,0.05),3,A0,P0);
      }
    }
    cyl([-HX,RIDGE+0.02,0],[HX,RIDGE+0.02,0],0.075,0.075,700,0.032,t=>((t*2*HX/0.28)%1)<0.12?[0.40,0.18,0.14]:[0.74,0.33,0.22]);
    // skylight on the front slope
    const n=norm([0,1,SL]),q=quatY(n),w=SKY.x1-SKY.x0,hgt=(SKY.v1-SKY.v0)*EZ;
    for(let i=0;i<800;i++){
      const fx=R(),fv=R(),x=SKY.x0+fx*w,z=(SKY.v0+fv*(SKY.v1-SKY.v0))*EZ,p=[x,roofY(z)+0.05,z];
      const edge=Math.min(fx,1-fx)*w<0.05||Math.min(fv,1-fv)*hgt<0.05;
      if(edge)solid.add(p,q,0.03,0.014,0.03,shade(BEAM,p,n),3,A0,P0);
      else if(Math.abs(fx-0.5)<0.035)solid.add(p,q,0.026,0.012,0.026,[0.5,0.26,0.1],3,A0,P0);
      else solid.add(p,q,0.03,0.012,0.03,[1.0,0.86,0.45],3,[6,rr(0,TAU),0,0],P0);
    }
    glow.add(add(SKYC,[0,0.1,0.05]),QUP,0.45,0.45,0.45,[0.34,0.20,0.07],1,[6,0.4,0,0],P0);
  }

  function wallColor(u,y){
    if(Math.abs(y+0.42)<0.04)return BEAM;
    const f=(((u+WX)/0.875)%1+1)%1;
    if(f<0.045||f>0.955)return BEAM;
    return CREAM;
  }
  function shutter(dx,dy,half,h){ // returns colour if this point is on a shutter
    const a=Math.abs(dx);
    if(a>half+0.05&&a<half+0.24&&Math.abs(dy)<h+0.03)return (((dy+2)/0.07)%1)<0.28?mul(TEAL,0.6):TEAL;
    return null;
  }
  function buildWalls(){
    const nf=[0,0,1];
    for(let i=0;i<4200;i++){
      const x=rr(-WX,WX),y=rr(WALLB,-0.2),p=[x,y,WZ];
      let b=wallColor(x,y);
      // lit window
      let dx=x-WINA[0],dy=y-WINA[1];
      if(Math.abs(dx)<0.31&&Math.abs(dy)<0.35){
        if(Math.abs(dx)<0.26&&Math.abs(dy)<0.30&&Math.abs(dx)>0.025&&Math.abs(dy)>0.025)b=GLASS();else b=BEAM;
      }else{const s=shutter(dx,dy,0.26,0.30);if(s)b=s}
      // sleeping window
      dx=x-WINB[0];dy=y-WINB[1];
      if(Math.abs(dx)<0.27&&Math.abs(dy)<0.31){
        if(Math.abs(dx)<0.22&&Math.abs(dy)<0.26&&Math.abs(dx)>0.025)b=Math.abs(dx+dy*0.8-0.08)<0.05?{e:1,c:[0.36,0.40,0.62]}:{e:1,c:[0.09,0.09,0.22]};else b=BEAM;
      }else{const s=shutter(dx,dy,0.22,0.26);if(s)b=s}
      put(p,nf,0.04,b,{j:0.05});
    }
    glow.add([WINA[0],WINA[1],WZ+0.05],QUP,0.38,0.38,0.38,[0.30,0.17,0.06],1,[6,2.2,0,0],P0);
    for(const sx of[1,-1]){
      const n=[sx,0,0];
      for(let i=0;i<2500;i++){
        const z=rr(-WZ,WZ),top=roofY(z)-0.02,y=WALLB+(top-WALLB)*R(),p=[sx*WX,y,z];
        let b=wallColor(z+WX-WZ,y);
        if(Math.abs(z)<0.04)b=BEAM;
        if(sx>0){const d=Math.hypot(z-GWIN[0],y-GWIN[1]);if(d<0.2)b=(Math.abs(z)<0.022||Math.abs(y-GWIN[1])<0.022)?BEAM:GLASS();else if(d<0.26)b=BEAM}
        put(p,n,0.04,b,{j:0.05});
      }
    }
    glow.add([WX+0.05,GWIN[1],GWIN[0]],QUP,0.3,0.3,0.3,[0.28,0.16,0.06],1,[6,4.1,0,0],P0);
    // flower box
    box([WINA[0],-1.33,WZ+0.08],[0.34,0.06,0.07],300,0.028,()=>[0.42,0.26,0.18]);
    for(let i=0;i<110;i++){
      const p=[WINA[0]+rr(-0.32,0.32),rr(-1.27,-1.12),WZ+rr(0.04,0.15)],k=R();
      const b=k<0.6?[0.30,0.72,0.36]:(k<0.8?[1.0,0.45,0.6]:[1.0,0.85,0.4]);
      solid.add(p,QUP,0.024,0.024,0.024,shade(b,p,norm([0,0.6,0.8]),0.1,1.2),3,A0,P0);
    }
    // fairy lights along the eave
    for(let x=-1.82;x<=1.82;x+=0.025){
      const y=EAVEY-0.07*Math.abs(Math.sin(Math.PI*(x+1.8)/0.3));
      solid.add([x,y,EZ+0.02],QUP,0.011,0.011,0.011,[0.12,0.10,0.2],3,A0,P0);
    }
    for(const b of BULBS){
      const an=[8,rr(0,TAU),0,rr(0.5,1.1)];
      solid.add(b.p,QUP,0.034,0.04,0.034,b.c,4,A0,P0);
      glow.add(b.p,QUP,0.13,0.13,0.13,mul(b.c,0.42),1,an,P0);
    }
  }

  function buildChimney(){
    const C=[1.2,0.72,-0.3],BR=[[0.72,0.30,0.24],[0.60,0.24,0.20],[0.80,0.38,0.26]];
    box(C,[0.26,0.62,0.26],1700,0.03,(ax,sg,q,p)=>{
      if(ax===1)return[0.3,0.2,0.2];
      const row=Math.floor(p[1]/0.09),fy=p[1]/0.09-row,u=(ax===0?p[2]:p[0])/0.2+(row&1)*0.5+10,col=Math.floor(u),fu=u-col;
      if(fy<0.16||fu<0.1)return[0.62,0.60,0.64];
      return BR[(hash(row,col+ax*7)*3)|0];
    },{j:0.05});
    box([1.2,1.37,-0.3],[0.32,0.035,0.32],520,0.03,()=>[0.60,0.60,0.70]);
    for(const x of[1.08,1.32]){
      cyl([x,1.40,-0.3],[x,1.58,-0.3],0.075,0.06,170,0.024,t=>t>0.85?[0.5,0.22,0.16]:[0.82,0.40,0.25]);
      for(let i=0;i<22;i++)solid.add([x,1.6,-0.3],QUP,0.07,0.07,0.07,[0.50,0.50,0.68],1.6,[14,R(),rr(0.10,0.16),0],[x,1.6,-0.3]);
    }
    // a small bird asleep on the cap
    ellipsoid([0.98,1.475,-0.10],[0.07,0.06,0.09],I3,90,0.022,d=>d[1]<-0.2?[0.85,0.85,0.95]:[0.50,0.58,0.85],{gain:1.2});
    ellipsoid([0.98,1.545,-0.03],[0.045,0.045,0.045],I3,50,0.02,()=>[0.50,0.58,0.85],{gain:1.2});
    solid.add([0.98,1.535,0.025],QUP,0.016,0.012,0.022,[1.0,0.62,0.2],4,A0,P0);
    // antenna
    const G=[0.42,0.44,0.62],qx=quatY([1,0,0]);
    for(let y=0.35;y<1.82;y+=0.05){const p=[-1.6,y,-0.3];solid.add(p,QUP,0.012,0.04,0.012,shade(G,p,norm([0,0.3,1])),4,A0,P0)}
    for(const[y,h]of[[1.72,0.30],[1.56,0.23],[1.40,0.16]])for(let x=-h;x<=h;x+=0.05){const p=[-1.6+x,y,-0.3];solid.add(p,qx,0.01,0.04,0.01,shade(G,p,UP),4,A0,P0)}
  }

  function buildCat(){
    const ORANGE=[1.0,0.60,0.22],DARK=[0.78,0.36,0.12],WHITE=[1.0,0.97,0.90],PINK=[1.0,0.60,0.66];
    const CAT=[-0.5,RIDGE-0.08,0],BB=rotY(Math.PI/2);
    const bpt=v=>add(CAT,ap(BB,v)),bbs=[ap(BB,I3[0]),ap(BB,I3[1]),ap(BB,I3[2])],bl=p=>tr(BB,sub(p,CAT));
    const HO=bpt([0,1.02,0.16]),HB=rotY(0.67);
    const hpt=v=>add(HO,ap(HB,v)),hl=p=>tr(HB,sub(p,HO));
    const ca=[3,0,0.01,2.0],o={anim:ca,piv:CAT,gain:1.15};
    // haunches and chest
    ellipsoid(bpt([0,0.30,-0.12]),[0.34,0.32,0.42],bbs,1900,0.034,(d,n,p)=>{
      const l=bl(p);
      if(d[1]<-0.55)return WHITE;
      if(d[1]>-0.2&&Math.sin(l[2]*20+l[1]*5)>0.5)return DARK;
      return ORANGE;
    },o);
    ellipsoid(bpt([0,0.58,0.10]),[0.26,0.36,0.25],bbs,1500,0.032,(d,n,p)=>{
      const l=bl(p);
      if(d[2]>0.45&&d[1]<0.6)return WHITE;
      if(d[2]<0.2&&Math.sin(l[1]*22)>0.5)return DARK;
      return ORANGE;
    },o);
    for(const s of[-1,1]){
      // hind leg and foot, front leg and paw (white socks)
      ellipsoid(bpt([s*0.26,0.16,0.02]),[0.14,0.26,0.26],bbs,520,0.03,(d,n,p)=>Math.sin(bl(p)[2]*20+1)>0.6?DARK:ORANGE,o);
      ellipsoid(bpt([s*0.27,-0.10,0.27]),[0.085,0.05,0.14],bbs,170,0.024,()=>WHITE,o);
      ellipsoid(bpt([s*0.11,0.24,0.30]),[0.075,0.30,0.085],bbs,380,0.026,d=>d[1]<-0.45?WHITE:ORANGE,o);
      ellipsoid(bpt([s*0.11,-0.02,0.36]),[0.085,0.045,0.11],bbs,150,0.024,()=>WHITE,o);
    }
    // tail, held up and swishing
    const tb=bpt([0,0.14,-0.5]),tph=1.3;
    for(let i=0;i<26;i++){
      const t=i/25,r=0.085-0.02*t;
      const c=bpt([0.10*Math.sin(t*4.5)*t,0.14+0.98*t-0.1*t*t,-0.5-0.30*Math.sin(t*3.6)]);
      ellipsoid(c,[r,r,r],I3,70,0.026,()=>(t>0.88||Math.sin(t*26)>0.3)?DARK:ORANGE,{anim:[12,tph,0.13,0],piv:tb,gain:1.15});
    }
    // collar and bell
    cyl(bpt([0,0.73,0.11]),bpt([0,0.79,0.12]),0.24,0.225,240,0.022,()=>[0.25,0.85,0.9],o);
    ellipsoid(bpt([0,0.69,0.36]),[0.045,0.045,0.045],I3,60,0.018,()=>({e:1,c:[1.0,0.82,0.3]}),o);
    // head, turned toward the viewer
    const hbs=[ap(HB,I3[0]),ap(HB,I3[1]),ap(HB,I3[2])];
    ellipsoid(HO,[0.27,0.23,0.24],hbs,1500,0.028,d=>{
      if(d[1]<-0.35&&d[2]>0)return WHITE;
      if(d[1]>0.3&&d[2]>-0.3&&Math.sin(d[0]*16)>0.35)return DARK;
      if(Math.abs(d[0])>0.75&&Math.sin(d[1]*14)>0.4)return DARK;
      return ORANGE;
    },o);
    ellipsoid(hpt([0,-0.075,0.20]),[0.13,0.085,0.09],hbs,300,0.022,()=>WHITE,o);
    ellipsoid(hpt([0,-0.035,0.285]),[0.03,0.022,0.02],hbs,40,0.014,()=>({e:1,c:PINK}),o);
    for(const s of[-1,1]){
      const e=norm([s*0.12,0.05,1]),gl2=norm([s*0.12-0.3,0.45,1]);
      ellipsoid(hpt([s*0.118,0.04,0.185]),[0.076,0.076,0.076],hbs,320,0.016,d=>{
        const t=dot(d,e),bk=[9,0,0.01,2.0];
        if(t<0.1)return null;
        if(t<0.25)return{e:1,c:[0.20,0.10,0.08],anim:bk};
        if(dot(d,gl2)>0.985)return{e:1,c:[1,1,1],anim:bk};
        if(Math.abs(d[0]-e[0])<0.26)return{e:1,c:[0.03,0.03,0.06],anim:bk};
        return{e:1,c:[0.72,1.0,0.36],anim:bk};
      },{piv:CAT});
      const ea=hpt([s*0.16,0.15,0]),eb=hpt([s*0.245,0.43,-0.03]);
      cyl(ea,eb,0.115,0.004,260,0.022,(t,an,p)=>{const l=hl(p);return(l[2]>-0.03*t+0.035&&t<0.7)?PINK:(t>0.85?DARK:ORANGE)},o);
      for(const dir of[[s,0.18,0.3],[s,0,0.35],[s,-0.2,0.3]]){
        const dl=norm(dir),c=hpt(add([s*0.1,-0.075,0.24],mul(dl,0.09)));
        solid.add(c,quatY(ap(HB,dl)),0.003,0.075,0.003,[0.9,0.88,0.85],1.3,ca,CAT);
      }
    }
    // a heart, for when the cat gets petted
    const HC=[-0.15,2.42,0.3];let k=0;
    while(k<80){
      const x=rr(-1.3,1.3),y=rr(-1.2,1.4);
      if(Math.pow(x*x+y*y-1,3)-x*x*y*y*y<0){solid.add([HC[0]+x*0.13,HC[1]+y*0.13,HC[2]],QUP,0.03,0.03,0.03,[1.0,0.37,0.5],4,[11,0,0,0],HC);k++}
    }
    glow.add(HC,QUP,0.28,0.28,0.28,[0.30,0.08,0.14],1,[11,0,0,0],HC);
  }

  function puff(c,scale,anim,piv){
    const n=5+((R()*4)|0);
    for(let k=0;k<n;k++){
      const ox=rr(-1,1)*0.7*scale,r=rr(0.3,0.5)*scale*(1-Math.abs(ox)/(1.4*scale)*0.5);
      const cc=[c[0]+ox,c[1]+rr(0,0.22)*scale,c[2]+rr(-0.3,0.3)*scale];
      ellipsoid(cc,[r*1.25,r*0.72,r],I3,34,0.12*scale,d=>d[1]<-0.35?null:[0.80,0.78,0.96],{alpha:1.5,anim:anim,piv:piv||cc,j:0.04});
    }
  }
  function buildSky(){
    // moon
    const MC=[-0.6,1.95,-3.2],MR=1.4,qz=quatY([0,0,1]);
    const craters=[[-0.45,0.4,0.28],[0.35,0.55,0.18],[0.1,-0.3,0.33],[-0.6,-0.35,0.2],[0.6,-0.1,0.22],[0.55,-0.65,0.14],[-0.1,0.75,0.12]];
    for(let i=0;i<3000;i++){
      const rho=MR*Math.sqrt(R()),a=rr(0,TAU),x=rho*Math.cos(a),y=rho*Math.sin(a);
      let c=[1.0,0.97,0.84];
      for(const[cx,cy,cr]of craters)if(Math.hypot(x/MR-cx,y/MR-cy)<cr)c=[0.86,0.80,0.62];
      if(rho/MR>0.93)c=[0.96,0.90,0.70];
      solid.add([MC[0]+x,MC[1]+y,MC[2]],qz,0.055,0.02,0.055,c,4,A0,P0);
    }
    glow.add([MC[0],MC[1],MC[2]+0.05],QUP,1.9,1.9,1.9,[0.10,0.09,0.15],1,A0,P0);
    // clouds hugging the house, a deeper sea below, a few drifting past the moon
    for(let i=0;i<11;i++){const a=i/11*TAU+rr(-0.2,0.2);puff([2.5*Math.cos(a),-2.0+rr(-0.1,0.05),2.0*Math.sin(a)],rr(1.0,1.4),[10,rr(0,TAU),0.04,rr(0.3,0.6)])}
    for(let i=0;i<16;i++){const c=[rr(-6,6),rr(-4.3,-2.6),rr(-3,2.5)];puff(c,rr(1.3,2.0),[13,0,0,rr(0.04,0.11)],[c[0],0,0])}
    for(let i=0;i<6;i++){const c=[rr(-6,6),rr(1.7,4.4),rr(-2.9,-1.9)];puff(c,rr(0.7,1.2),[13,0,0,rr(0.06,0.14)],[c[0],0,0])}
    // stars
    for(let i=0;i<2400;i++){
      const y=rr(-0.5,0.78),a=rr(0,TAU),c=Math.sqrt(1-y*y),s=0.02+0.07*Math.pow(R(),3),k=rr(0.45,1);
      const tint=R()<0.2?[1,0.85,0.65]:(R()<0.4?[0.7,0.85,1]:[0.9,0.92,1]);
      glow.add([34*c*Math.cos(a),34*y,34*c*Math.sin(a)],QUP,s,s,s,mul(tint,k),1.2,[8,rr(0,TAU),0,rr(0.4,2.2)],P0);
    }
  }

  buildRoof();
  buildWalls();
  buildChimney();
  buildCat();
  buildSky();
}
