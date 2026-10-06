import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// An ornamental pond garden, independent of the southern kitchen garden.
// Coordinates use surveyed world metres: east = +x, south = +z.
const TAU = Math.PI * 2;
function loopEdge(offset) {
  return Array.from({length:160},(_,i)=>{
    const a=i/160*TAU, nx=Math.cos(a)/3.9,nz=Math.sin(a)/5.2,n=Math.hypot(nx,nz);
    return [18.65+3.9*Math.cos(a)+offset*nx/n,9+5.2*Math.sin(a)+offset*nz/n];
  });
}
const pondPoints=Array.from({length:128},(_,i)=>{
  const a=i/128*TAU,r=1+.065*Math.sin(a*3+.5)+.028*Math.sin(a*5);
  return [18.6+2.5*Math.cos(a)*r,9.1+3.32*Math.sin(a)*r];
});
const rect=([x0,x1,z0,z1])=>[[x0,z0],[x1,z0],[x1,z1],[x0,z1]];
export const rearGardenPlan = {
  anchor:[18.65,.8,9.2], pond:pondPoints,
  loopOuter:loopEdge(.7),loopInner:loopEdge(-.7),loopWidth:1.4,
  connection:rect([12.75,15.3,8.7,10.1]),
  bridge:{x0:15.6,x1:21.6,z:9.4,width:1.35,ground:.085,rise:.52},
  bridgeLandings:[rect([14.6,15.7,8.725,10.075]),rect([21.5,22.7,8.725,10.075])],
  sittingTerrace:rect([16.4,20.5,14.55,17]),
  trees:[[15.1,3,4.5,1.15],[23.25,4.25,4.7,1.2],[20.9,16.4,4.0,1.02],[14.1,16.3,3.8,.96]],
  rockery:[18.45,5.95],
};

export function createRearGarden({parent,M,box,cylinder,inSite}) {
  const group=new THREE.Group();group.name='rear-ornamental-pond-garden';parent.add(group);
  const surfaces=[],beds=[],leaves=[],blades=[],blooms=[],lights=[];
  let seed=67391,time=0;
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const stone=M.path.clone();stone.color.set('#d5d0bd');stone.roughness=.88;
  const coping=M.base.clone();coping.color.set('#b2b0a0');coping.roughness=.86;
  const dark=M.dark.clone();dark.color.set('#424e45');
  const wood=M.woodLight.clone();wood.color.set('#b3976e');wood.roughness=.74;
  const soil=M.soil.clone();soil.color.set('#5d6250');
  const rockMaterial=M.base.clone();rockMaterial.color.set('#90958a');rockMaterial.roughness=.94;
  const gravelMaterial=new THREE.MeshStandardMaterial({color:'#b9b4a2',roughness:1});
  const glow=new THREE.MeshStandardMaterial({color:'#fff0cd',emissive:'#ffd59a',emissiveIntensity:.15,roughness:.6});
  function contains(points,x,z) {
    let yes=false;
    for(let i=0,j=points.length-1;i<points.length;j=i++) {
      const [a,b]=points[i],[c,d]=points[j];
      if((b>z)!==(d>z)&&x<(c-a)*(z-b)/(d-b)+a)yes=!yes;
    }
    return yes;
  }
  function safe(x,z,r=0) {
    if(!inSite(x,z))return false;
    for(let i=0;i<16;i++)if(!inSite(x+Math.cos(i*TAU/16)*r,z+Math.sin(i*TAU/16)*r))return false;
    return true;
  }
  function shape(points) {
    const s=new THREE.Shape();points.forEach(([x,z],i)=>i?s.lineTo(x,-z):s.moveTo(x,-z));s.closePath();return s;
  }
  function flat(points,y,material,name,holes=[]) {
    if(!points.every(([x,z])=>safe(x,z,.06)))throw new Error('Rear garden exceeds surveyed land: '+name);
    const s=shape(points);for(const hole of holes)s.holes.push(shape(hole));
    const geometry=new THREE.ShapeGeometry(s),p=geometry.attributes.position,uv=geometry.attributes.uv;
    for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i),-p.getY(i));
    const mesh=new THREE.Mesh(geometry,material);mesh.rotation.x=-Math.PI/2;mesh.position.y=y;mesh.receiveShadow=true;mesh.name=name;group.add(mesh);
    surfaces.push({points,holes});return mesh;
  }
  function rounded(points) {
    return new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,0,z)),true,'catmullrom',.12).getPoints(90).map(p=>[p.x,p.z]);
  }
  function bed(points,name) {
    const outline=rounded(points);flat(outline,.075,soil,name);beds.push(outline);
    // Beds and thin edging sit below the finished walking surface wherever their
    // curved outlines meet it, keeping the full route flush and visually legible.
    const edge=new THREE.Line(new THREE.BufferGeometry().setFromPoints(outline.map(([x,z])=>new THREE.Vector3(x,.08,z))),new THREE.LineBasicMaterial({color:'#717467'}));
    edge.name=name+'-edge';group.add(edge);return outline;
  }
  const loopOuter=rearGardenPlan.loopOuter,loopInner=rearGardenPlan.loopInner;
  flat(loopOuter,.085,stone,'continuous-1.4m-level-garden-loop',[loopInner]);
  flat(rearGardenPlan.connection,.085,stone,'east-house-walk-to-pond');
  rearGardenPlan.bridgeLandings.forEach((p,i)=>flat(p,.085,stone,'flush-bridge-landing-'+i));
  flat(rearGardenPlan.sittingTerrace,.085,stone,'garden-sitting-terrace');
  // Fine cross joints articulate a single flush paved route; there are no stepping-stone gaps.
  const joints=[];
  for(let i=0;i<76;i++) {
    const a=i/76*TAU,nx=Math.cos(a)/3.9,nz=Math.sin(a)/5.2,n=Math.hypot(nx,nz);
    const x=18.65+3.9*Math.cos(a),z=9+5.2*Math.sin(a);
    joints.push(new THREE.Vector3(x-.69*nx/n,.087,z-.69*nz/n),new THREE.Vector3(x+.69*nx/n,.087,z+.69*nz/n));
  }
  const pavingJoints=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(joints),new THREE.LineBasicMaterial({color:'#afa998',transparent:true,opacity:.38}));group.add(pavingJoints);

  // Pale natural coping frames one dark, reflective ornamental water surface.
  const bank=pondPoints.map(([x,z])=>[18.6+(x-18.6)*1.105,9.1+(z-9.1)*1.075]);
  flat(bank,.098,coping,'curved-pond-stone-bank',[pondPoints]);
  const normalSize=64,normalData=new Uint8Array(normalSize*normalSize*4);
  for(let y=0;y<normalSize;y++)for(let x=0;x<normalSize;x++) {
    const i=(y*normalSize+x)*4,a=x/normalSize*TAU,b=y/normalSize*TAU;
    normalData[i]=128+Math.round(24*Math.sin(a*4+b*3)+8*Math.sin(a*11-b*5));
    normalData[i+1]=128+Math.round(23*Math.cos(b*5-a*2)+9*Math.sin(a*7+b*9));normalData[i+2]=248;normalData[i+3]=255;
  }
  const normalMap=new THREE.DataTexture(normalData,normalSize,normalSize,THREE.RGBAFormat);
  normalMap.wrapS=normalMap.wrapT=THREE.RepeatWrapping;normalMap.needsUpdate=true;
  const water=new Water(new THREE.ShapeGeometry(shape(pondPoints)),{
    textureWidth:512,textureHeight:512,waterNormals:normalMap,alpha:1,
    sunDirection:new THREE.Vector3(-.5,1,.45).normalize(),sunColor:'#fff5d9',
    waterColor:'#173c37',distortionScale:.38,size:2.7,fog:true
  });
  water.name='ornamental-pond-water-not-swimming-pool';water.rotation.x=-Math.PI/2;water.position.y=.066;group.add(water);
  // Water is opaque and just above the existing terrain: this masks the lawn without
  // carving the calibrated site mesh or introducing an unverified excavation depth.
  surfaces.push({points:bank,holes:[]});

  // A gently arched timber bridge; side rails follow the arc and keep its ends open.
  const bridge=new THREE.Group();bridge.name='arched-timber-garden-bridge';group.add(bridge);
  const B=rearGardenPlan.bridge,L=B.x1-B.x0;
  const bridgeY=x=>B.ground+B.rise*Math.sin(Math.PI*Math.max(0,Math.min(1,(x-B.x0)/L)));
  const bridgeSlope=x=>B.rise*Math.PI/L*Math.cos(Math.PI*(x-B.x0)/L);
  for(let i=0;i<48;i++) {
    const x=B.x0+(i+.5)*L/48;
    const plank=box(L/48+.006,.065,B.width,x,bridgeY(x)-.0325,B.z,wood,bridge);plank.rotation.z=Math.atan(bridgeSlope(x));
  }
  function beamBetween(a,b,r,material,parent=group,segments=8) {
    const d=new THREE.Vector3().subVectors(b,a),m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),segments),material);
    m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());m.castShadow=m.receiveShadow=true;parent.add(m);return m;
  }
  for(const side of [-1,1]) {
    const zz=B.z+side*(B.width/2-.025);
    for(let i=0;i<=8;i++) {
      const x=B.x0+i*L/8;
      box(.065,.97,.065,x,bridgeY(x)+.485,zz,dark,bridge);
      box(.11,.038,.11,x,bridgeY(x)+.99,zz,wood,bridge);
    }
    for(let i=0;i<=37;i++) {const x=B.x0+i*L/37;box(.021,.78,.021,x,bridgeY(x)+.45,zz,dark,bridge);}
    for(const h of [.1,.99]) {
      const points=Array.from({length:80},(_,i)=>{const x=B.x0+L*i/79;return new THREE.Vector3(x,bridgeY(x)+h,zz);});
      const rail=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),80,h>.5?.035:.02,7,false),h>.5?wood:dark);rail.castShadow=true;bridge.add(rail);
    }
  }
  for(const z of [B.z-.51,B.z+.51]) {
    const points=Array.from({length:64},(_,i)=>{const x=B.x0+L*i/63;return new THREE.Vector3(x,bridgeY(x)-.085,z);});
    const bearer=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),64,.06,8,false),dark);bridge.add(bearer);
  }

  // Low sculptural faux-stone grouping, rather than a tall mountain or pavilion.
  const rockery=new THREE.Group();rockery.name='low-sculptural-artificial-stone-group';group.add(rockery);
  function featureStone(x,y,z,sx,sy,sz,angle=0,parent=rockery) {
    let g=new THREE.IcosahedronGeometry(1,4);
    // Weld position vertices before calculating normals, so the weathered stone
    // reads as a continuous eroded surface rather than disconnected triangles.
    g.deleteAttribute('normal');g.deleteAttribute('uv');g=mergeVertices(g,1e-5);
    const p=g.attributes.position,uv=[];
    for(let i=0;i<p.count;i++) {
      const xx=p.getX(i),yy=p.getY(i),zz=p.getZ(i),d=1+.14*Math.sin(xx*8+yy*3)*Math.cos(zz*7)+.08*Math.sin(yy*12+zz*6);
      p.setXYZ(i,xx*d,yy*(1+.05*Math.sin(xx*6+zz*6)),zz*d);
      uv.push((xx+1)*.7,(zz+1)*.7);
    }
    g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    g.computeVertexNormals();const mesh=new THREE.Mesh(g,rockMaterial);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.rotation.set(.04,angle,.03);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  featureStone(18.2,.7,6.0,.64,.76,.61,.3);
  featureStone(19.17,.48,6.25,.60,.53,.53,1.4);
  featureStone(17.45,.37,6.45,.52,.38,.45,2.0);
  featureStone(18.55,.30,6.83,.47,.34,.49,.6);
  featureStone(19.6,.24,6.65,.33,.25,.38,1.0);
  const cascadeMaterial=new THREE.MeshPhysicalMaterial({color:'#b8d2c8',roughness:.19,metalness:.14,transparent:true,opacity:.62,side:THREE.DoubleSide,depthWrite:false});
  const cascadeGeometry=new THREE.BufferGeometry();
  cascadeGeometry.setAttribute('position',new THREE.Float32BufferAttribute([18.49,.93,6.23,18.81,.91,6.23,18.51,.57,6.46,18.84,.55,6.46,18.57,.12,6.89,18.95,.12,6.89],3));
  cascadeGeometry.setIndex([0,1,2,2,1,3,2,3,4,4,3,5]);cascadeGeometry.computeVertexNormals();
  const cascade=new THREE.Mesh(cascadeGeometry,cascadeMaterial);cascade.name='small-stone-cascade';group.add(cascade);
  const sparkleData=Array.from({length:44},()=>({t:rand(),phase:rand()*TAU}));
  const sparkleMesh=new THREE.InstancedMesh(new THREE.SphereGeometry(1,5,4),new THREE.MeshStandardMaterial({color:'#dce9df',transparent:true,opacity:.52,roughness:.2}),sparkleData.length);group.add(sparkleMesh);

  // Four planting layers: modest trees, evergreen leaves, fine grasses and flowers.
  const plantBeds=[
    [[13.4,2.3],[16.6,2.05],[18.15,2.35],[18.45,2.82],[17.2,3.05],[15.8,3.48],[14.15,4.6],[13.35,4.2]],
    [[20.4,2.22],[24.15,2.1],[25.05,3.35],[24.4,6.2],[23.72,6.92],[23.25,5.25],[22.2,3.55],[20.65,3.0]],
    [[24.3,7.2],[24.45,8.65],[23.95,10.9],[23.3,12.8],[22.65,13.7],[22.45,12.4],[23.1,10.1],[23.35,8.0]],
    [[21.8,14.4],[22.15,15.8],[21.75,17.23],[20.86,17.8],[20.68,16.1],[20.9,15.02]],
    [[13.45,13.5],[14.35,13.8],[15.9,15.18],[16.0,17.62],[14.9,18.0],[13.45,17.5]],
    [[16.1,4.9],[17.25,4.12],[19.4,4.04],[21.0,4.81],[20.77,5.5],[19.4,5.19],[17.89,5.1],[16.78,5.9]],
    [[16.5,12.5],[17.8,13.15],[19.3,13.15],[20.6,12.85],[20.16,13.95],[18.1,13.96],[16.8,13.55]],
    [[13.4,6.35],[14.07,5.85],[14.28,6.82],[13.93,8.08],[13.39,8.2]],
    [[13.4,10.7],[13.97,10.68],[14.6,12.32],[14.12,12.95],[13.37,12.4]],
  ];
  plantBeds.forEach((points,i)=>bed(points,'layered-flower-border-'+i));
  // A narrow dry-gravel strip between the pond and loop keeps vegetation off the route.
  // Only small gravel clusters are used, preserving the organic water outline.
  const gravelMesh=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),gravelMaterial,420);
  const dummy=new THREE.Object3D(),color=new THREE.Color();let gravelCount=0;
  for(let i=0;i<1600&&gravelCount<420;i++) {
    const a=rand()*TAU,r=1.05+rand()*.06,x=18.6+2.55*r*Math.cos(a),z=9.1+3.35*r*Math.sin(a);
    if(contains(bank,x,z)||!contains(loopInner,x,z)||Math.abs(z-B.z)<.76)continue;
    dummy.position.set(x,.12,z);dummy.rotation.set(rand()*3,rand()*6,0);dummy.scale.set(.034+rand()*.05,.023+rand()*.022,.035+rand()*.05);dummy.updateMatrix();gravelMesh.setMatrixAt(gravelCount++,dummy.matrix);
  }
  gravelMesh.count=gravelCount;gravelMesh.computeBoundingSphere();group.add(gravelMesh);
  const onRoute=(x,z,r=.08)=>{
    const inLoop=contains(loopOuter,x,z)&&!contains(loopInner,x,z);
    return inLoop||contains(rearGardenPlan.connection,x,z)||contains(rearGardenPlan.sittingTerrace,x,z)||rearGardenPlan.bridgeLandings.some(p=>contains(p,x,z))||Math.abs(z-B.z)<B.width/2+r&&x>B.x0-r&&x<B.x1+r;
  };
  function plantOK(x,z,r=.12) {
    if(!safe(x,z,r)||x-r<13.04||contains(bank,x,z)||onRoute(x,z,r))return false;
    for(let i=0;i<8;i++)if(onRoute(x+Math.cos(i*TAU/8)*r,z+Math.sin(i*TAU/8)*r)||contains(bank,x+Math.cos(i*TAU/8)*r,z+Math.sin(i*TAU/8)*r))return false;
    return true;
  }
  function shrub(x,z,r,h=.5) {
    for(let i=0;i<Math.round(400*r);i++) {
      const a=rand()*TAU,d=Math.sqrt(rand())*r,xx=x+Math.cos(a)*d,zz=z+Math.sin(a)*d;
      if(!plantOK(xx,zz,.20))continue;
      leaves.push({x:xx,y:.15+Math.sqrt(Math.max(0,1-d*d/(r*r)))*h*(.7+.3*rand()),z:zz,s:.24+rand()*.18,a:rand()*TAU,tone:.235+rand()*.045});
    }
  }
  function tuft(x,z,s=1) {
    if(!plantOK(x,z,s*.39))return;
    for(let i=0;i<30;i++)blades.push({x:x+(rand()-.5)*.12,z:z+(rand()-.5)*.12,s:s*(.72+rand()*.35),a:rand()*TAU});
  }
  function flower(x,z,r,tone) {
    shrub(x,z,r,.3);
    for(let i=0;i<28;i++) {
      const a=rand()*TAU,d=Math.sqrt(rand())*r,xx=x+Math.cos(a)*d,zz=z+Math.sin(a)*d;
      if(plantOK(xx,zz,.14))blooms.push({x:xx,y:.42+rand()*.13,z:zz,s:.041+rand()*.025,tone});
    }
  }
  for(const p of [[14.1,2.85,.55,.75],[16.55,2.55,.56,.6],[23.72,3.04,.67,.72],[24.16,5.12,.51,.72],[23.75,8.21,.47,.8],[23.35,11.15,.40,.62],[21.65,16.1,.4,.73],[14.1,15.6,.4,.6],[14.7,17.35,.55,.72],[17.25,4.7,.43,.53],[20.1,4.77,.45,.53],[18.25,13.58,.5,.42],[13.77,7.25,.24,.4],[13.83,11.55,.27,.43]])shrub(...p);
  for(const p of [[15.1,2.52,.4,1],[16.3,3.07,.4,0],[22.57,3.37,.48,1],[24.10,4.15,.45,0],[23.95,7.98,.37,1],[23.15,11.55,.4,0],[21.45,15.22,.35,1],[21.35,17.04,.36,2],[14.1,14.5,.36,0],[15.27,17.12,.42,1],[17.03,5.05,.36,0],[20.42,5.04,.35,1],[17.53,13.57,.4,1],[19.22,13.65,.38,0],[13.73,6.69,.24,2]])flower(...p);
  for(const p of [[13.8,3.85,.84],[17.56,2.58,.75],[23.92,3.67,.8],[24.04,5.81,.86],[23.7,9.02,.9],[22.94,12.31,.76],[21.32,16.49,.74],[13.97,16.85,.85],[15.48,16.21,.76],[18.21,4.54,.65],[19.45,4.57,.75],[16.9,13.07,.67],[19.82,13.35,.69],[13.63,11.28,.52]])tuft(...p);
  for(const outline of beds) {
    const xs=outline.map(p=>p[0]),zs=outline.map(p=>p[1]),x0=Math.min(...xs),z0=Math.min(...zs),w=Math.max(...xs)-x0,d=Math.max(...zs)-z0;
    for(let i=0;i<440;i++) {
      const x=x0+rand()*w,z=z0+rand()*d;
      if(contains(outline,x,z)&&plantOK(x,z,.08))leaves.push({x,y:.13+rand()*.075,z,s:.18+rand()*.10,a:rand()*TAU,tone:.24+rand()*.04});
    }
  }
  function tree(x,z,height,radius) {
    const fork=new THREE.Vector3(x+.05,height*.53,z-.05);beamBetween(new THREE.Vector3(x,.1,z),fork,.10,M.trunk);
    const crowns=[];
    for(let i=0;i<11;i++) {
      const a=i*2.399,end=new THREE.Vector3(x+Math.cos(a)*radius*(.3+rand()*.43),height*(.77+rand()*.16),z+Math.sin(a)*radius*(.3+rand()*.43));
      beamBetween(fork,end,.03,M.trunk);crowns.push(end);
    }
    for(let i=0;i<1500;i++) {
      const p=crowns[i%11],a=rand()*TAU,d=Math.sqrt(rand())*radius*.34,xx=p.x+Math.cos(a)*d,zz=p.z+Math.sin(a)*d;
      if(!safe(xx,zz,.25)||xx<13.02)continue;
      leaves.push({x:xx,y:p.y+(rand()-.5)*height*.17,z:zz,s:.37+rand()*.23,a:rand()*TAU,tone:.23+rand()*.07});
    }
  }
  rearGardenPlan.trees.forEach(p=>tree(...p));
  const leafGeometry=new THREE.BufferGeometry();
  leafGeometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-.11,.02,.2,0,.055,.42,.11,.02,.2,0,.04,.19],3));leafGeometry.setIndex([0,1,4,1,2,4,2,3,4,3,0,4]);leafGeometry.computeVertexNormals();
  const leafMesh=new THREE.InstancedMesh(leafGeometry,new THREE.MeshStandardMaterial({color:'#b2bd94',roughness:.93,side:THREE.DoubleSide}),leaves.length);
  leaves.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(-.6+rand()*1.6,p.a,rand()*.6);dummy.scale.setScalar(p.s);dummy.updateMatrix();leafMesh.setMatrixAt(i,dummy.matrix);leafMesh.setColorAt(i,color.setHSL(p.tone,.22+rand()*.24,.32+rand()*.24));});leafMesh.name='layered-instanced-garden-foliage';leafMesh.castShadow=leafMesh.receiveShadow=true;leafMesh.computeBoundingSphere();group.add(leafMesh);
  const bladeGeometry=new THREE.BufferGeometry();bladeGeometry.setAttribute('position',new THREE.Float32BufferAttribute([-.017,0,0,.017,0,0,-.014,.37,.09,.014,.37,.09,0,.68,.35],3));bladeGeometry.setIndex([0,1,2,2,1,3,2,3,4]);bladeGeometry.computeVertexNormals();
  const grassMesh=new THREE.InstancedMesh(bladeGeometry,new THREE.MeshStandardMaterial({color:'#93a275',roughness:1,side:THREE.DoubleSide}),blades.length);
  blades.forEach((p,i)=>{dummy.position.set(p.x,.12,p.z);dummy.rotation.set(0,p.a,0);dummy.scale.setScalar(p.s);dummy.updateMatrix();grassMesh.setMatrixAt(i,dummy.matrix);});grassMesh.computeBoundingSphere();group.add(grassMesh);
  const petals=new THREE.InstancedMesh(new THREE.SphereGeometry(1,5,3),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.9}),blooms.length*5),flowerColours=['#f3f0d9','#ab91ca','#d89bae'];
  blooms.forEach((p,i)=>{for(let j=0;j<5;j++){const a=j*TAU/5;dummy.position.set(p.x+Math.cos(a)*p.s*.6,p.y,p.z+Math.sin(a)*p.s*.6);dummy.rotation.set(0,a,0);dummy.scale.set(p.s*.64,p.s*.25,p.s*.46);dummy.updateMatrix();petals.setMatrixAt(i*5+j,dummy.matrix);petals.setColorAt(i*5+j,color.set(flowerColours[p.tone]));}});petals.computeBoundingSphere();group.add(petals);

  // Quiet contemporary seating looks north over the garden; circulation remains open.
  const bench=new THREE.Group();bench.name='rear-garden-timber-seating';group.add(bench);
  for(const x of [17.32,19.43]) {
    for(let i=0;i<6;i++)box(1.8,.058,.08,x,.48,16.26+i*.085,wood,bench);
    for(const xx of [x-.69,x+.69])box(.08,.37,.48,xx,.285,16.48,dark,bench);
    for(let i=0;i<4;i++)box(1.8,.082,.045,x,.65+i*.085,16.76,wood,bench);
    for(const xx of [x-.74,x+.74])box(.04,.63,.045,xx,.625,16.8,dark,bench);
  }
  cylinder(.30,.30,.055,18.38,.45,15.79,wood,bench,24);cylinder(.08,.15,.35,18.38,.255,15.79,dark,bench,12);
  for(const [x,z]of [[13.55,8.36],[13.55,10.43],[16.75,3.16],[22.7,5.49],[23.44,10.73],[20.76,14.14],[15.6,14.49]]) {
    if(!safe(x,z,.18)||onRoute(x,z,.2))continue;
    box(.085,.43,.085,x,.33,z,dark,group);box(.16,.035,.16,x,.565,z,dark,group);box(.07,.038,.07,x,.527,z,glow,group);
    const light=new THREE.PointLight('#ffdda4',0,3.2,2);light.position.set(x,.56,z);group.add(light);lights.push(light);
  }
  const rockLight=new THREE.SpotLight('#ffdcab',0,5,Math.PI/4,.75,1.5);rockLight.position.set(19.6,.3,5.25);rockLight.target.position.set(18.4,.9,6.2);group.add(rockLight,rockLight.target);
  function setLight(dusk,rain=false) {
    glow.emissiveIntensity=dusk?2.2:rain?.45:.15;lights.forEach(l=>{l.intensity=dusk?1.5:0;});rockLight.intensity=dusk?6:0;
    water.material.uniforms.sunColor.value.set(dusk?'#788899':rain?'#c2ccce':'#fff5d9');
    water.material.uniforms.waterColor.value.set(dusk?'#102e2c':'#173c37');
  }
  function update(dt) {
    time+=Math.min(dt||0,.1);water.material.uniforms.time.value=time*.3;
    sparkleData.forEach((p,i)=>{const t=(p.t+time*.72)%1;dummy.position.set(18.58+Math.sin(p.phase)*.12+t*.12,.93-t*.8,6.25+t*.64);dummy.rotation.set(0,0,0);dummy.scale.set(.007,.028+Math.sin(t*3)*.01,.009);dummy.updateMatrix();sparkleMesh.setMatrixAt(i,dummy.matrix);});sparkleMesh.instanceMatrix.needsUpdate=true;
  }
  update(0);sparkleMesh.computeBoundingSphere();
  const excludesGrass=(x,z)=>surfaces.some(({points,holes})=>contains(points,x,z)&&!holes.some(h=>contains(h,x,z)));
  return {group,water,setLight,update,excludesGrass,footprints:rearGardenPlan};
}
