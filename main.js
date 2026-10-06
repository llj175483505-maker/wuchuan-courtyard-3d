import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { siteData } from './site-data.js?v=20261006-axis';
import { prepareMaterials, modernRoof, naturalPlanting, architecturalDetails } from './realism.js?v=20261006-axis';
import { enclosedCourtyard } from './courtyard-style.js?v=20261006-axis';
import { intimateGarden } from './reference-garden.js?v=20261006-axis';
import { timberColumn, galleryCanopy, stoneCourtyardFrame } from './architecture-kit.js';

const loading = window.courtyardLoading;
await loading.stage(1, '正在启动三维引擎', '程序已加载 · 正在准备显示设备');
const host = document.getElementById('scene');
const annotations = [];
const dimensions = new THREE.Group();
const existing = new THREE.Group();
const roofGroup = new THREE.Group();
const upperGroup = new THREE.Group();
const lowerLabels = [];
const v3 = (x,y,z) => new THREE.Vector3(x,y,z);
const P = siteData.boundary.map(([x,z])=>[x-27.5,z]);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#dce7df');
scene.fog = new THREE.Fog('#dce7df',240,390);
const camera = new THREE.PerspectiveCamera(50,1,.1,400);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({antialias:true,alpha:false});
} catch (error) {
  loading.fail('当前浏览器无法启动 3D 显示。请使用新版 Chrome 或 Edge，并开启浏览器图形加速后重试。');
  throw error;
}
renderer.domElement.addEventListener('webglcontextlost',()=>{
  if(document.documentElement.dataset.sceneReady!=='true'){
    loading.fail('3D 显示在加载时中断，请关闭其他占用显卡的页面后重新加载。');
  }else{
    const notice=document.getElementById('error');notice.hidden=false;
    notice.textContent='3D 显示暂时中断，请刷新页面重新加载。';
  }
});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
host.append(renderer.domElement);
renderer.domElement.setAttribute('aria-label','庭院三维模型，左键拖动旋转，滚轮缩放，右键平移');
renderer.domElement.setAttribute('tabindex','0');
const controls = new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.075;
controls.minDistance=8;controls.maxDistance=240;
controls.maxPolarAngle=Math.PI*.486;
controls.minPolarAngle=.015;
controls.screenSpacePanning=false;
controls.target.set(0,0,13);
controls.listenToKeyEvents(renderer.domElement);
const hemi=new THREE.HemisphereLight('#eff4ff','#65745b',1.4);scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff2d9',3);
sun.position.set(25,45,35);sun.castShadow=true;
sun.shadow.mapSize.set(4096,4096);
Object.assign(sun.shadow.camera,{left:-34,right:34,top:34,bottom:-34,near:1,far:150});
sun.shadow.normalBias=.035;sun.shadow.bias=-.0002;sun.target.position.set(0,0,13);
scene.add(sun,sun.target);
const mat = (color,extra={}) => new THREE.MeshStandardMaterial({color,roughness:.83,...extra});
const M = {
  wall:mat('#f0ece0'),trim:mat('#e6dfca'),base:mat('#a8aa9c'),roof:mat('#5c6868'),roofEdge:mat('#4c5b59'),
  wood:mat('#916949'),woodLight:mat('#b89870'),dark:mat('#354a43'),glass:mat('#80a6aa',{metalness:.3,roughness:.2}),
  paving:mat('#d4d1bc'),path:mat('#dcdace'),road:mat('#74817e'),soil:mat('#aa967b'),grass:mat('#9db37d'),
  grassDeep:mat('#88a86b'),leaf:mat('#60844f'),leafLight:mat('#779758'),leafDark:mat('#426e4c'),trunk:mat('#826448'),
  white:mat('#eaeae0'),black:mat('#34413c'),water:mat('#83a99d'),clay:mat('#b68c65'),fabric:mat('#d2c4a4')
};
await loading.stage(2, '正在加载庭院材质', '正在读取石材、木纹、绿植与天空');
try {await prepareMaterials(M,scene,renderer,{
  onProgress: (done,total) => loading.resources(done,total),
  beforeEnvironment: () => loading.stage(18, '正在准备环境光影', '材质与环境资源 16 / 16 · 正在生成天空反射')
});} catch(error) {
  loading.fail('材质未能完整加载，请检查网络后点击“重新加载”。');throw error;
}
await loading.stage(18, '正在生成庭院', '正在构建主屋、围墙与三车停车区');
const geometries=new Map();
function box(w,h,d,x,y,z,material,parent=scene){
  const key=`${w},${h},${d}`;let geom=geometries.get(key);if(!geom){geom=new THREE.BoxGeometry(w,h,d);const p=geom.attributes.position,n=geom.attributes.normal,uv=geom.attributes.uv;for(let i=0;i<p.count;i++){if(Math.abs(n.getX(i))>.5)uv.setXY(i,p.getZ(i),p.getY(i));else if(Math.abs(n.getY(i))>.5)uv.setXY(i,p.getX(i),p.getZ(i));else uv.setXY(i,p.getX(i),p.getY(i));}geometries.set(key,geom);}
  const mesh=new THREE.Mesh(geom,material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function cylinder(rt,rb,h,x,y,z,material,parent=scene,segments=12){
  const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,segments),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function slab(points,height,material,y=0){
  const shape=new THREE.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
  const geom=new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false});geom.rotateX(-Math.PI/2);
  const mesh=new THREE.Mesh(geom,material);mesh.position.y=y;mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh;
}
function line(points,color='#678175',parent=scene,dashed=false){
  const geom=new THREE.BufferGeometry().setFromPoints(points.map(p=>v3(...p)));
  const material=dashed?new THREE.LineDashedMaterial({color,dashSize:.4,gapSize:.25}):new THREE.LineBasicMaterial({color});
  const mesh=new THREE.Line(geom,material);if(dashed)mesh.computeLineDistances();parent.add(mesh);return mesh;
}
function segment(a,b,h,thickness,material,parent=scene,y=0){
  const len=Math.hypot(b[0]-a[0],b[1]-a[1]);
  const mesh=box(len,h,thickness,(a[0]+b[0])/2,y+h/2,(a[1]+b[1])/2,material,parent);
  mesh.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0]);return mesh;
}
function label(text,position,type='space',classes=''){
  const el=document.createElement('div');el.className=(type==='dimension'?'dimension-label':'scene-label')+' '+classes;el.textContent=text;el.setAttribute('aria-hidden','true');host.append(el);
  const item={el,position:v3(...position),type,enabled:true};annotations.push(item);return item;
}
function inSite(x,z){let inside=false;for(let i=0,j=P.length-1;i<P.length;j=i++){
  const [xi,zi]=P[i],[xj,zj]=P[j];if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)inside=!inside;
}return inside;}

// A metre in this scene is one metre in the plan, in all three axes.
slab(P,.43,M.soil,-.42);
slab(P,.035,M.grass,0);
// Display only the measured plot and the road directly along its frontage.
const frontage=siteData.frontageProjection;
box(frontage,.13,5.5,0,-.12,-3.35,M.road);
box(frontage,.12,.32,0,-.02,-.44,M.path);
box(frontage,.12,.32,0,-.02,-6.26,M.path);
for(let x=-frontage/2+2.75;x<frontage/2-1.4;x+=5.5)box(2.8,.015,.07,x,-.045,-3.35,M.trim);
label('北侧道路',[6,.2,-3.8],'space','road-label');

// Boundary walls follow the original vector polyline, including its north-side kink.
const wallBodyHeight=siteData.design.wallHeight-siteData.design.wallCapHeight;
function boundaryWall(a,b){
  segment(a,b,wallBodyHeight,.22,M.wall);
  segment(a,b,siteData.design.wallCapHeight,.29,M.trim,scene,wallBodyHeight);
  segment(a,b,.3,.24,M.base);
}
for(let i=0;i<6;i++){
  boundaryWall(P[i],P[i+1]);
}
const northZ=x=>3.00976*(13.90376-x)/41.40376;
const gateX=-18,gateZ=northZ(gateX);
const openingL=-20.25,openingR=-14.25;
slab([[openingL,-.52],[openingR,-.52],[openingR,northZ(openingR)+.2],[openingL,northZ(openingL)+.2]],.03,M.paving,-.015);
boundaryWall(P[6],[openingL,northZ(openingL)]);
boundaryWall([openingR,northZ(openingR)],P[7]);
boundaryWall(P[7],P[0]);
// Car gate clear opening 4m, pedestrian gate 1.2m. All are proposed dimensions.
const gateAssembly = new THREE.Group();gateAssembly.position.set(gateX,0,gateZ);gateAssembly.rotation.y=Math.atan2(3.00976,41.40376);scene.add(gateAssembly);
const pierBodyHeight=siteData.design.gatePierHeight-.12;
for(const x of [-2.25,2.25,3.95]){box(.5,pierBodyHeight,.6,x,pierBodyHeight/2,0,M.wall,gateAssembly);box(.58,.12,.7,x,pierBodyHeight+.06,0,M.trim,gateAssembly);box(.22,.17,.23,x,1.91,-.32,M.dark,gateAssembly);}
// Sliding leaf runs behind the piers on the courtyard side of the boundary wall.
const carGate=new THREE.Group();carGate.position.set(-2,0,.42);gateAssembly.add(carGate);
box(8.15,.035,.065,-2.075,.075,.42,M.base,gateAssembly);
const gateTop=siteData.design.gateLeafTop,gateBottom=.14;
box(4,.14,.13,2,.16,0,M.dark,carGate);box(4,.12,.13,2,gateTop-.06,0,M.dark,carGate);
for(let i=0;i<30;i++)box(.068,gateTop-gateBottom,.095,.08+i*.132,(gateTop+gateBottom)/2,0,M.timber,carGate);
const pedestrianGate=new THREE.Group();pedestrianGate.position.set(2.5,0,0);gateAssembly.add(pedestrianGate);
box(1.2,.11,.1,.6,.16,0,M.dark,pedestrianGate);box(1.2,.12,.1,.6,gateTop-.06,0,M.dark,pedestrianGate);
for(let i=0;i<10;i++)box(.065,gateTop-gateBottom,.09,.05+i*.12,(gateTop+gateBottom)/2,0,M.timber,pedestrianGate);
box(.055,.2,.055,.95,1.02,-.08,M.dark,pedestrianGate);
label('车门 4m / 人行门 1.2m（拟）',[-16.8,2.8,gateZ],'space');
label('围墙总高 2.00m（拟）',[12,2.15,northZ(12)],'dimension');
// Three independent 2.8 x 5.5m bays face a shared 6m manoeuvring aisle.
// Proposed dimensions, not a swept-path certification for a specific vehicle.
slab([[-20,northZ(-20)+.08],[-16,northZ(-16)+.08],[-16,3.2],[-20,3.2]],.035,M.paving,.045);
box(9.8,.035,6,-17.25,.0625,6.2,M.paving);
const parkingSurface=M.paving.clone();parkingSurface.color.set('#a3aaa5');
box(8.4,.035,5.5,-16.55,.0625,11.95,parkingSurface);
box(27.8,.055,1.6,-1.3,.08,4,M.path);
box(1.6,.055,3.2,siteData.design.courtyardCenterX,.08,4.7,M.path);
// A clear strip separates the main pedestrian route from the parking aisle.
box(.24,.02,5.8,-12.15,.095,6.2,M.grassDeep);
for(const x of [-20.75,-17.95,-15.15,-12.35])box(.075,.009,5.5,x,.089,11.95,M.white);
box(8.4,.009,.075,-16.55,.089,14.7,M.white);
const parkingCenters=[-19.35,-16.55,-13.75];
parkingCenters.forEach((x,i)=>{
  box(1.65,.1,.17,x,.135,14.42,M.base);
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=96;const ctx=canvas.getContext('2d');
  ctx.font='bold 72px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#f6f5ea';ctx.fillText('P'+(i+1),128,48);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  const marking=new THREE.Mesh(new THREE.PlaneGeometry(.82,.31),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));
  marking.rotation.x=-Math.PI/2;marking.position.set(x,.097,9.39);scene.add(marking);
});
label('三车停车 · 每位2.8 × 5.5m（拟）',[-16.55,2.1,12]);
label('倒车通道 · 深6m（拟）',[-17.25,.2,6.2]);
// Passenger-car models provide a consistent physical scale: 4.75 x 1.85m.
function car(x,z,color){
  const g=new THREE.Group();g.position.set(x,.08,z);scene.add(g);
  const paint=mat(color,{roughness:.34,metalness:.28});
  const carGlass=new THREE.MeshPhysicalMaterial({color:'#33434b',roughness:.11,metalness:.45,envMapIntensity:1.2});
  function body(w,h,d,xx,yy,zz,material){
    const shape=new THREE.Shape();shape.moveTo(-w/2+.08,-h/2);shape.lineTo(w/2-.08,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+.08);shape.lineTo(w/2,h/2-.08);shape.quadraticCurveTo(w/2,h/2,w/2-.08,h/2);shape.lineTo(-w/2+.08,h/2);shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-.08);shape.lineTo(-w/2,-h/2+.08);shape.quadraticCurveTo(-w/2,-h/2,-w/2+.08,-h/2);
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:d-.08,steps:1,bevelEnabled:true,bevelThickness:.04,bevelSize:.02,bevelSegments:2,curveSegments:5});geometry.translate(0,0,-d/2+.04);
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(xx,yy,zz);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh;
  }
  body(1.81,.59,4.67,0,.66,0,paint);body(1.60,.68,2.47,0,1.11,.12,paint);
  const front=box(1.47,.50,.025,0,1.18,-1.10,carGlass,g);front.rotation.x=.30;
  const rear=box(1.44,.46,.025,0,1.17,1.38,carGlass,g);rear.rotation.x=-.25;
  box(1.75,.16,.06,0,.47,-2.365,M.dark,g);box(1.74,.16,.07,0,.45,2.365,M.dark,g);
  for(const side of [-1,1]){
    box(.025,.45,2.15,side*.813,1.17,.12,carGlass,g);box(.045,.53,.075,side*.827,1.17,.15,M.dark,g);
    box(.16,.1,.25,side*.95,1.08,-.74,paint,g);
    for(const zz of [-1.48,1.48]){const wheel=cylinder(.34,.34,.19,side*.85,.34,zz,M.black,g,24);wheel.rotation.z=Math.PI/2;const hub=cylinder(.21,.21,.20,side*.87,.34,zz,M.base,g,16);hub.rotation.z=Math.PI/2;}
    box(.49,.08,.045,side*.56,.72,-2.37,M.white,g);
    box(.42,.08,.045,side*.56,.72,2.37,mat('#9f3029'),g);
    for(const zz of [-.37,.73])box(.035,.04,.18,side*.93,.89,zz,M.base,g);
  }
  box(.4,.12,.025,0,.54,-2.4,M.white,g);
}
parkingCenters.forEach((x,i)=>car(x,11.95,['#eeeae2','#667b82','#b2b6b3'][i]));
for(const x of [-11.65,-8.2,-4.75,-2.2]){box(.16,2.48,.16,x,1.28,3.2,M.timber);box(.16,2.48,.16,x,1.28,4.8,M.timber);}
box(10.9,.20,2,-6.475,2.54,4,M.timber);
box(10.6,.045,1.75,-6.475,2.425,4,M.soffit);
for(let x=-11.7;x<-1.15;x+=.3)box(.065,.06,1.75,x,2.385,4,M.soffit);

// Exterior wall faces and ground slab define a 20 x 10m, 200m² footprint.
const hx=siteData.design.houseCenter[0]-27.5,hz=10,h=3.3;
const houseWidth=siteData.design.houseWidth,houseDepth=siteData.design.houseDepth,courtX=siteData.design.courtyardCenterX;
const houseLeft=hx-houseWidth/2,houseRight=hx+houseWidth/2,stairX=courtX-1.9;
if(Math.abs(hx-courtX)>1e-6)throw new Error('Main house and courtyard must share one centre axis');
box(houseWidth,.18,houseDepth,hx,.13,hz,M.base);
box(houseWidth-.48,.08,houseDepth-.48,hx,.25,hz,M.path);
const groundWalls = new THREE.Group();scene.add(groundWalls,upperGroup,roofGroup);
function openingWall(total,cy,wallZ,openings,parent,height=3.12){
  let start=-total/2;
  for(const o of [...openings].sort((a,b)=>a.x-b.x)){
    const left=o.x-o.w/2,right=o.x+o.w/2;
    if(left>start)box(left-start,height,.24,(left+start)/2,cy,wallZ,M.facade,parent);
    const bottom=cy-height/2;
    if(o.sill>0)box(o.w,o.sill,.24,o.x,bottom+o.sill/2,wallZ,M.facade,parent);
    const topHeight=height-o.sill-o.height;
    if(topHeight>0)box(o.w,topHeight,.24,o.x,bottom+o.sill+o.height+topHeight/2,wallZ,M.facade,parent);
    if(o.door){
      box(o.w-.1,o.height,.09,o.x,bottom+o.sill+o.height/2,wallZ,M.wood,parent);
      box(.035,.26,.055,o.x+o.w*.29,bottom+1.05,wallZ-.08,M.dark,parent);
    }else if(!o.passage){
      box(o.w-.08,o.height,.05,o.x,bottom+o.sill+o.height/2,wallZ,M.glass,parent);
      for(const xx of [left+.025,right-.025,o.x])box(.07,o.height+.1,.13,xx,bottom+o.sill+o.height/2,wallZ,M.dark,parent);
      for(const yy of [bottom+o.sill,bottom+o.sill+o.height])box(o.w+.08,.065,.13,o.x,yy,wallZ,M.dark,parent);
      box(o.w+.08,.045,.25,o.x,bottom+o.sill+o.height+.075,wallZ,M.dark,parent);
    }
    // Timber surrounds sit on both wall faces, including rotated side walls.
    for(const face of [-1,1]){
      for(const xx of [left-.035,right+.035])box(.105,o.height+.14,.055,xx,bottom+o.sill+o.height/2,wallZ+face*.1475,M.timber,parent);
      box(o.w+.18,.13,.065,o.x,bottom+o.sill+o.height+.02,wallZ+face*.1525,M.timber,parent);
    }
    if(o.sill>.3)box(o.w+.24,.055,.39,o.x,bottom+o.sill-.035,wallZ,M.cutStone,parent);
    start=right;
  }
  if(start<total/2)box(total/2-start,height,.24,(total/2+start)/2,cy,wallZ,M.facade,parent);
}
// World-coordinate openings share one footprint datum; walls sit inside the slab edge.
function houseFacade(parent,cy,z,openings){
  const face=new THREE.Group();face.position.x=hx;parent.add(face);
  openingWall(houseWidth,cy,z,openings.map(o=>({...o,x:o.x-hx})),face);
}
const northWindows=[-8.5,-6.2,-3.65,3.65,6.2,8.5].map(dx=>({x:courtX+dx,w:1.5,sill:1.05,height:1.5}));
houseFacade(groundWalls,1.88,5.12,[{x:courtX,w:1.5,sill:0,height:2.4,door:true},...northWindows]);
houseFacade(groundWalls,1.88,14.88,[
  {x:courtX,w:4.8,sill:.02,height:3.02},
  ...[-1,1].flatMap(side=>[
    {x:courtX+side*3.65,w:1.3,sill:.55,height:2.15},
    {x:courtX+side*6.75,w:1.3,sill:0,height:2.5,passage:true},
    {x:courtX+side*8.5,w:1.3,sill:.55,height:2.15}
  ])
]);
function houseSides(parent,cy){
  for(const x of [houseLeft+.12,houseRight-.12]){
    const g=new THREE.Group();g.position.set(x,0,10);g.rotation.y=Math.PI/2;
    openingWall(9.52,cy,0,[{x:2.1,w:1.8,sill:1,height:1.6},{x:-2.2,w:1.8,sill:1,height:1.6}],g);parent.add(g);
  }
}
houseSides(groundWalls,1.88);
// Keep the living hall's 5.6 x 4.2m void; added floor area becomes usable rooms.
// A 1.3 x 4.66m stairwell clears the real treads; the landing remains at the south end.
for(const [a,b]of [[houseLeft,stairX-.65],[stairX+.65,houseRight]])box(b-a,.2,5.8,(a+b)/2,3.5,7.9,M.trim,upperGroup);
box(1.3,.2,.2,stairX,3.5,5.1,M.trim,upperGroup);
box(1.3,.2,.94,stairX,3.5,10.33,M.trim,upperGroup);
for(const [a,b]of [[houseLeft,courtX-2.8],[courtX+2.8,houseRight]])box(b-a,.2,4.2,(a+b)/2,3.5,12.9,M.trim,upperGroup);
houseFacade(upperGroup,5.18,5.12,[-8.5,-6.2,-3.65,0,3.65,6.2,8.5].map(dx=>({x:courtX+dx,w:1.5,sill:.8,height:1.85})));
houseFacade(upperGroup,5.18,14.88,[
  ...[-8.5,-6.75,-3.65,3.65,6.75,8.5].map(dx=>({x:courtX+dx,w:1.4,sill:.55,height:2.15})),
  {x:courtX,w:4.8,sill:0,height:3.12}
]);
houseSides(upperGroup,5.18);
// Veranda spans only the inner courtyard, between the two relocated wings.
box(9.5,.1,2.5,courtX,.16,16.25,M.paving);
for(const x of [courtX-2.68,courtX+2.68])timberColumn(x,17.22,M,box,scene);
const porch=new THREE.Group();scene.add(porch);
for(const x of [courtX-3.6,courtX+3.6])galleryCanopy(2.4,2.35,x,16.375,M,box,porch);
// Slim benches leave the hall approach and covered galleries open.
for(const x of [courtX-3.65,courtX+3.65]){
  box(1.25,.16,.5,x,.56,15.75,M.fabric);
  box(1.25,.38,.10,x,.80,15.52,M.timber);
  for(const dx of [-.47,.47])box(.065,.3,.36,x+dx,.33,15.75,M.timber);
}
const houseLabel=label('主屋占地 200㎡ · 20 × 10m（拟）',[hx,5.6,10]);
label('遮阳廊下',[courtX,3.25,17.5]);

// Illustrative zoning, furniture at real scale; partitions remain a concept layout.
const interior=new THREE.Group();scene.add(interior);
function partitionX(x,z,d){box(.13,2.6,d,x,1.62,z,M.trim,interior);}
function partitionZ(x,z,w){box(w,2.6,.13,x,1.62,z,M.trim,interior);}
for(const x of [-4.15,1.65])partitionX(x,12.65,4.3);
// Leave a continuous passage in front of both doors into the side wings.
for(const x of [-8.15,5.65])partitionX(x,12,3);
for(const [x,w]of [[-8.1,5.8],[4.2,2.9],[7.68,1.66]])partitionZ(x,10.5,w);
partitionX(-4.15,6.75,3);partitionX(2.7,7.4,4.4);partitionX(5.8,7.4,4.4);
partitionZ(3.25,9.6,1.1);partitionZ(5.3,9.6,1);
function bed(x,z){
  box(1.85,.4,2.15,x,.52,z,M.wood,interior);box(1.8,.2,2.1,x,.82,z,M.fabric,interior);
  for(const dx of [-.45,.4])box(.64,.13,.43,x+dx,.98,z-.75,M.white,interior);
  box(1.92,.85,.13,x,.85,z-1.1,M.timber,interior);
  for(const dx of [-1.25,1.25])box(.5,.5,.5,x+dx,.56,z-.65,M.wood,interior);
}
bed(3.6,12.5);bed(-6.1,12.5);
// The tall living room aligns with the new courtyard axis at x=-1.25m.
box(3.1,.20,1,courtX,.60,11.7,M.fabric,interior);
box(3.1,.57,.19,courtX,.87,11.2,M.fabric,interior);
for(const dx of [-1.47,1.47])box(.16,.4,1,courtX+dx,.82,11.7,M.fabric,interior);
for(const dx of [-1,0,1])box(.94,.12,.8,courtX+dx,.76,11.8,M.fabric,interior);
box(1.55,.085,.7,courtX,.71,13.2,M.path,interior);
for(const dx of [-.6,.6])box(.06,.38,.5,courtX+dx,.49,13.2,M.dark,interior);
cylinder(.10,.13,.24,courtX,.89,13.2,M.clay,interior,24);
box(2,.1,.95,-6.5,1.01,7.6,M.wood,interior);
for(const x of [-7.1,-5.9])for(const z of [6.7,8.5])box(.45,.54,.45,x,.59,z,M.fabric,interior);
box(.65,.92,3,houseLeft+.57,.78,7.1,M.woodLight,interior);
box(1.9,.08,.7,7.2,1.02,12.6,M.wood,interior);box(.6,.5,.6,7.2,.6,13.5,M.fabric,interior);
box(2.3,.5,.95,7.2,.59,7.5,M.fabric,interior);box(2.3,.55,.15,7.2,.89,7.05,M.fabric,interior);
box(1.45,.38,.7,7.2,.5,9,M.wood,interior);
const stairs=new THREE.Group();interior.add(stairs);
for(let i=0;i<19;i++)box(1,(3.3/19)*(i+1),.24,stairX,.32+(3.3/19)*(i+1)/2,5.4+i*.24,M.base,stairs);
const upperStairs=stairs.clone(true);upperStairs.position.y=3.3;scene.add(upperStairs);
lowerLabels.push(label('老人房',[3.6,.6,12.8],'floor','floor-label'),label('客卧',[-6.1,.6,12.8],'floor','floor-label'),label('客厅',[courtX,.6,12.2],'floor','floor-label'),label('厨房 / 餐厅',[-6.5,.6,7.4],'floor','floor-label'),label('卫生间',[4.2,.6,7.5],'floor','floor-label'),label('书房',[7.2,.6,12.8],'floor','floor-label'),label('家庭厅',[7.2,.6,8.2],'floor','floor-label'),label('门厅',[courtX,.6,6.1],'floor','floor-label'));

// Courtyard, lawns and paths stay within the recovered property shape.
box(9.5,.04,6.2,courtX,.095,20.5,M.paving);
stoneCourtyardFrame(M,box,scene,courtX);
label('开阔活动庭院',[courtX,.4,20.5]);
// Low vegetation beds and a small utility corner to the west.
for(let i=0;i<3;i++){
  const x=-15+i*1.4,z=20.1;
  box(1.05,.12,3.8,x,.13,z,M.soil);
  for(const dx of [-.56,.56])box(.08,.17,4,x+dx,.15,z,M.wood);
  for(let j=0;j<7;j++)for(const dx of [-.26,.25]){const g=new THREE.Mesh(new THREE.SphereGeometry(.17,6,4),j%2?M.leaf:M.leafLight);g.position.set(x+dx,.32,z-1.5+j*.48);g.scale.y=.55;scene.add(g);}
}
box(2.7,.16,2.1,-17.1,.15,18.3,M.path);box(1.65,.8,.65,-17.1,.61,17.9,M.base);
box(1.68,.09,.7,-17.1,1.05,17.9,M.path);box(.65,.03,.45,-17.3,1.1,17.88,M.dark);
label('菜园 / 家务区',[-13,.7,21.5]);
await loading.stage(19, '正在布置园林', '正在生成屋顶、树木、水庭与廊下细节');
modernRoof(roofGroup,M,box);
const landscape=intimateGarden(scene,M,{box,cylinder,inSite});
naturalPlanting(scene,M,inSite,landscape.excludesGrass);
const lighting=architecturalDetails({scene,M,roofGroup,upperGroup,groundWalls,box,cylinder});
const courtyard=enclosedCourtyard({scene,M,box,cylinder,openingWall,upperGroup,landscape});
await loading.stage(20, '正在准备观景视角', '庭院已生成 · 正在设置光线、尺寸与交互');
const thirdGroup=upperGroup.clone(true);thirdGroup.position.y=3.3;box(5.6,.2,4.2,courtX,3.5,12.9,M.trim,thirdGroup);scene.add(thirdGroup);
const pendants=new THREE.Group();scene.add(pendants);
for(const [x,y,r]of [[-.6,2.7,.45],[.5,2.45,.6]]){const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.018,8,48),lighting.amber);ring.rotation.x=Math.PI/2;ring.position.set(x+courtX,y,12.7);pendants.add(ring);}
const pendantWires=[-.6,.5].map(x=>cylinder(.008,.008,1,x+courtX,3,12.7,M.dark,scene,5));
label('东侧 · 竹影水庭',[15.3,.6,13.5]);
label('西侧 · 树下茶席',[-12.9,.8,24.8]);
let floorCount=2;
function updateBuilding(){
  const exterior=document.getElementById('roof').checked;
  roofGroup.visible=exterior;upperGroup.visible=exterior&&floorCount>=2;thirdGroup.visible=exterior&&floorCount>=3;
  courtyard.wingRoofs.visible=exterior;courtyard.galleryRoofs.visible=exterior;porch.visible=exterior;
  roofGroup.position.y=(floorCount-2)*3.3;stairs.visible=floorCount>1;upperStairs.visible=exterior&&floorCount>=3;
  const pendantOffset=floorCount>1?1.8:0;pendants.position.y=pendantOffset;
  pendantWires.forEach((wire,i)=>{const bottom=[2.7,2.45][i]+pendantOffset,top=floorCount>1?6.67:3.34;wire.scale.y=top-bottom;wire.position.y=(top+bottom)/2;});
  houseLabel.el.textContent=['','单层主屋','两层主屋','三层主屋'][floorCount]+' · 占地200㎡ · 20 × 10m（拟）';
  houseLabel.position.y=4.5+(floorCount-1)*3.3;
  document.getElementById('floor-area').textContent='占地200㎡ · 主屋建面约 '+([0,200,376.5,576.5][floorCount])+'㎡ ＋ 厢房64㎡';
  document.querySelectorAll('[data-floors]').forEach(b=>{const on=Number(b.dataset.floors)===floorCount;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  document.documentElement.dataset.floors=String(floorCount);
}
document.querySelectorAll('[data-floors]').forEach(b=>b.addEventListener('click',()=>{floorCount=Number(b.dataset.floors);updateBuilding();}));
function setLight(mode){
  const dusk=mode==='dusk',rain=mode==='rain';hemi.intensity=dusk?.55:rain?1.2:1.4;sun.intensity=dusk?.32:rain?.65:3;
  sun.color.set(dusk?'#a9bbd7':'#fff2d9');scene.environmentIntensity=dusk?.35:1.1;
  scene.background.set(dusk?'#465b72':rain?'#b7c6c9':'#cbdbe0');scene.fog.color.copy(scene.background);scene.fog.near=rain?28:75;scene.fog.far=rain?110:170;renderer.toneMappingExposure=dusk?1.1:1.05;
  lighting.amber.emissiveIntensity=dusk||rain?2.7:.6;lighting.lamps.forEach(l=>l.intensity=dusk?18:rain?8:0);courtyard.weather(rain);landscape.setLight(dusk,rain);
  M.glass.emissiveIntensity=dusk?.12:0;landscape.water.material.uniforms.sunColor.value.set(dusk?'#61758a':'#ede6d8');
  document.querySelectorAll('[data-light]').forEach(b=>{const on=b.dataset.light===mode;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  document.documentElement.dataset.lighting=mode;
}
document.querySelectorAll('[data-light]').forEach(b=>b.addEventListener('click',()=>setLight(b.dataset.light)));
updateBuilding();setLight('day');

// Measured vectors and source annotations are deliberately distinct.
scene.add(dimensions,existing);existing.visible=false;dimensions.visible=document.getElementById('dimensions').checked;
function dimension(a,b,text,offset=1.3,cls=''){
  const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),ox=dz/len*offset,oz=-dx/len*offset;
  const aa=[a[0]+ox,.15,a[1]+oz],bb=[b[0]+ox,.15,b[1]+oz];
  line([aa,bb],'#789186',dimensions);
  for(const p of [a,b])line([[p[0],.15,p[1]],[p[0]+ox*1.2,.15,p[1]+oz*1.2]],'#91a596',dimensions);
  const tdx=dx/len*.22,tdz=dz/len*.22;
  for(const p of [aa,bb])line([[p[0]-tdx-ox*.12,.17,p[2]-tdz-oz*.12],[p[0]+tdx+ox*.12,.17,p[2]+tdz+oz*.12]],'#789186',dimensions);
  label(text,[(aa[0]+bb[0])/2,.35,(aa[2]+bb[2])/2],'dimension',cls);
}
for(let i=0;i<6;i++){
  const txt=i===2?'20.69m · 图注20.37m*':`${siteData.annotations[i].toFixed(2)}m（图注）`;
  dimension(P[i],P[i+1],txt,1.25,i===2?'discrepancy':'');
}
dimension([-27.5,0],[27.5,0],'55.00m · 总投影',8.0);
dimension([-27.5,0],[13.90376,0],'41.40m · 投影',10.2);
dimension([13.90376,0],[27.5,0],'13.60m · 投影',10.2);
dimension([-20.75,9.2],[-17.95,9.2],'2.80m · 车位',.5,'design');
dimension([-12.35,9.2],[-12.35,14.7],'5.50m · 车位',.5,'design');
dimension([-22.15,3.2],[-22.15,9.2],'6.00m · 倒车通道',-.65,'design');
dimension([houseLeft,5],[houseRight,5],'20.00m · 主屋占地200㎡',1.8,'design');
dimension([houseRight,5],[houseRight,15],'10.00m · 拟建',1.2,'design');
line([[30,.04,6],[30,.04,-1]],'#5b796c',dimensions);line([[29.5,.04,0],[30,.04,-1],[30.5,.04,0]],'#5b796c',dimensions);label('北 N',[30,.2,-2],'dimension');
line([[-27,.04,26],[-22,.04,26]],'#5b796c',dimensions);
for(const x of [-27,-22])line([[x,.04,25.7],[x,.04,26.3]],'#5b796c',dimensions);
label('5m',[-24.5,.2,26.9],'dimension');
if(siteData.existingBuilding){
  const pts=siteData.existingBuilding.corners.map(([x,z])=>[x-27.5,.3,z]);line([...pts,pts[0]],'#b17f40',existing,true);
  const item=label('原建筑 · 图注120㎡',[siteData.existingBuilding.center[0]-27.5,.45,siteData.existingBuilding.center[1]],'existing');item.enabled=false;
}
document.getElementById('dimension-source').innerHTML=`<p><b>图纸基准</b><br>由原 PDF 矢量边界提取，按北侧东西总投影 55m 定标。模型面积约 1130.01㎡；图注 1130㎡。北边保留原有折点。内部30.170m、16.413m和12.658m也已交叉核对。</p><p><b>待复核的一条边</b><br>东南斜边图注 20.37m，矢量按比例约 20.69m。本模型保留原图轮廓，未强行改形。其余图注与矢量线长存在毫米至厘米级差异。</p><p><b>原建筑</b><br>轮廓按原图位置恢复。图注11×11.86m与文字120㎡存在差异，图示尺寸乘积约130.46㎡。</p><p><b>新建设计假设</b><br>主屋 20×10m，占地200㎡（按外墙外边线，不含廊檐），可切换1／2／3层；层高3.3m，低坡瓦屋脊分别约4.8／8.1／11.4m；二层方案中客厅上方设约23.5㎡挑空，主屋示意建面约376.5㎡，三层约576.5㎡。切换层数不改变主屋占地及地界。另设左右单层厢房各4×8m，合计64㎡，沿主屋南面衔接，主屋、门厅、主屋屋脊和两侧厢房以同一中轴对齐，中轴位于场景x=-1.25m；最紧的右厢房檐角距图示地界约1.65m，仅为几何余量，实际退界另核。围墙含压顶总高2.00m，门柱含压顶总高2.25m，门扇顶部1.95m；均为方案高度。车门净宽4m，人行门净宽1.2m。西北侧3个独立并排车位，每位2.8×5.5m，北侧倒车通道深6m、宽9.8m，停车区调整至靠入口，车位东缘距主屋西墙约1.10m；菜园与家务台位于西侧。三车均直接面对同一通道，不作串联停车。车型暂以4.75×1.85m乘用车示意，具体车型转弯轨迹尚未校核。位置、尺寸均可调整，非批准方案。</p><p><b>原图未提供</b><br>道路宽度暂示意5.5m；地面按平地展示。现场高差、邻房及退界须补充实测。围墙、树木、水景、装修及一楼隔间均为概念。场景只展示原图地块及临街道路，未模拟周边土地与树林；日光与傍晚不代表实际日照分析。建筑细部采用深木色廊柱、木条檐底、灰石柱脚与暗藏暖光，采用简洁直线收边。侧廊柱脚宽0.40m，计入突出窗台后的图示最窄净宽约1.40m。园林采用东侧水庭、西侧茶席的非对称布局；两侧廊柱之间约5.8m保持开阔，侧院连续步道连接休憩区。水景、植物及家具均为拟建设计，植物品种待结合现场日照选定。</p>`;

let cameraTween=null,gateOpen=false,gateProgress=0,touring=false,tourTime=0;
function stopTour(){touring=false;document.getElementById('tour-toggle').textContent='自动漫游';document.getElementById('tour-toggle').setAttribute('aria-pressed','false');}
const presets={
  overview:{pos:[-47,63,68],target:[0,0,13],caption:'鼠标左键拖动旋转 · 滚轮缩放 · 右键平移'},
  parking:{pos:[-29,25,26],target:[-15,0,10],caption:'3个独立车位 · 每位2.8×5.5m · 倒车通道6m'},
  gate:{pos:[-30,9,-21],target:[-10,1.7,8],caption:'北侧入口 · 车门与独立人行门'},
  garden:{pos:[courtX,23,44],target:[courtX,2.4,14.5],caption:'主屋、门厅与两侧厢房同轴对齐 · 东水庭 · 西茶席'},
  detail:{pos:[-1.25,2.8,26.8],target:[-1.2,3.05,15.5],caption:'深木廊柱 · 木条檐底 · 灰石柱脚与平整铺地'},
  water:{pos:[18.5,5.1,20],target:[14.6,.4,13.2],caption:'竹影水庭 · 小水面、景石与白花地被'},
  tea:{pos:[-7,4.8,29],target:[-12.9,.6,24.8],caption:'树下茶席 · 四人围坐，步道通往主庭院'},
  top:{pos:[0,86,13.1],target:[0,0,13],caption:'北在上，东在右 · 按米制比例查看用地'}
};
function setView(name,instant=false){
  stopTour();
  const cfg=presets[name];const pos=v3(...cfg.pos);if(innerWidth<640){
    if(name==='overview')pos.multiplyScalar(2.05);
    else if(name==='top')pos.y=195;
    else pos.sub(v3(...cfg.target)).multiplyScalar(1.55).add(v3(...cfg.target));
  }
  cameraTween=null;controls.enableDamping=false;controls.update();
  camera.position.copy(pos);controls.target.set(...cfg.target);controls.update();controls.enableDamping=true;
  renderer.render(scene,camera);
  document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===name);b.setAttribute('aria-pressed',b.dataset.view===name?'true':'false');});
  document.getElementById('view-caption').textContent=innerWidth<640&&name==='overview'?'单指旋转 · 双指缩放和平移':cfg.caption;
}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
controls.addEventListener('start',()=>{cameraTween=null;stopTour();});
document.getElementById('tour-toggle').addEventListener('click',()=>{if(touring){stopTour();return;}setView('garden');touring=true;tourTime=0;document.getElementById('tour-toggle').textContent='停止漫游';document.getElementById('tour-toggle').setAttribute('aria-pressed','true');});
document.getElementById('gate-toggle').addEventListener('click',()=>{gateOpen=!gateOpen;document.getElementById('gate-toggle').textContent=gateOpen?'关闭院门':'打开院门';});
document.getElementById('dimensions').addEventListener('change',e=>{dimensions.visible=e.target.checked;});
document.getElementById('roof').addEventListener('change',updateBuilding);
document.getElementById('existing').addEventListener('change',e=>{existing.visible=e.target.checked;annotations.filter(a=>a.type==='existing').forEach(a=>a.enabled=e.target.checked);});
document.getElementById('help').addEventListener('click',()=>document.getElementById('help-dialog').showModal());
document.getElementById('help-close').addEventListener('click',()=>document.getElementById('help-dialog').close());
document.getElementById('plan-button').addEventListener('click',()=>document.getElementById('plan-dialog').showModal());
document.getElementById('plan-close').addEventListener('click',()=>document.getElementById('plan-dialog').close());
document.getElementById('panel-toggle').addEventListener('click',e=>{const panel=document.querySelector('.panel');panel.classList.toggle('open');e.target.setAttribute('aria-expanded',panel.classList.contains('open'));e.target.textContent=panel.classList.contains('open')?'收起场地设置':'场地信息与设置';});
for(const d of document.querySelectorAll('dialog'))d.addEventListener('click',e=>{if(e.target===d)d.close();});
function resize(){const w=host.clientWidth,h=host.clientHeight;camera.aspect=w/h;renderer.setSize(w,h);camera.clearViewOffset();if(w>640){const offset=Math.min(150,w*.13);camera.setViewOffset(w,h,-offset,0,w,h);}camera.updateProjectionMatrix();}
await loading.stage(21, '正在渲染首帧画面', '正在准备阴影与水面反射，首次打开可能需要稍候');
addEventListener('resize',resize);resize();setView('garden',true);
const projected=new THREE.Vector3();
let lastTime=performance.now();
function tick(t){
  const dt=Math.min((t-lastTime)/1000,.04);lastTime=t;
  if(touring){tourTime+=dt;camera.position.set(courtX+Math.sin(tourTime*.11)*3.4,4.8+Math.sin(tourTime*.07)*.65,30.5-Math.sin(tourTime*.09)*2.4);controls.target.set(courtX,floorCount===1?2:3.8,15.2);}
  if(cameraTween){const v=Math.min((t-cameraTween.start)/800,1),ease=1-Math.pow(1-v,3);camera.position.lerpVectors(cameraTween.from,cameraTween.to,ease);controls.target.lerpVectors(cameraTween.fromTarget,cameraTween.target,ease);if(v===1)cameraTween=null;}
  gateProgress=THREE.MathUtils.damp(gateProgress,gateOpen?1:0,5,dt);
  carGate.position.x=-2-4.1*gateProgress;pedestrianGate.rotation.y=-Math.PI*.46*gateProgress;
  controls.update();
  landscape.water.material.uniforms.time.value+=dt*.35;
  courtyard.update(dt);
  const w=host.clientWidth,h=host.clientHeight,showLabels=document.getElementById('labels').checked;
  const occupied=[];
  for(const a of annotations){
    let visible=a.enabled;
    if(a.type==='dimension')visible=dimensions.visible;
    else if(a.type==='floor')visible=showLabels&&!roofGroup.visible;
    else if(a.type==='space')visible=showLabels;
    if(visible){projected.copy(a.position).project(camera);visible=projected.z>-1&&projected.z<1&&Math.abs(projected.x)<.97&&Math.abs(projected.y)<.94;
      let xx=(projected.x*.5+.5)*w;const yy=(-projected.y*.5+.5)*h;
      if(w>640&&xx<330&&yy<host.clientHeight-120)visible=false;
      if(yy<95||yy>h-110)visible=false;
      const width=a.el.offsetWidth||a.el.textContent.length*12+16;
      xx=THREE.MathUtils.clamp(xx,width/2+8,w-width/2-8);
      const rect={l:xx-width/2-4,r:xx+width/2+4,t:yy-30,b:yy+5};
      if(visible&&occupied.some(r=>rect.l<r.r&&rect.r>r.l&&rect.t<r.b&&rect.b>r.t))visible=false;
      if(visible)occupied.push(rect);
      a.el.style.left=xx+'px';a.el.style.top=yy+'px';
    }
    a.el.style.display=visible?'block':'none';
  }
  renderer.render(scene,camera);requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
if(renderer.getContext().isContextLost()){
  loading.fail('3D 显示在加载时中断，请重新加载场景。');
  throw new Error('WebGL context lost during initialization');
}
await loading.finish();
