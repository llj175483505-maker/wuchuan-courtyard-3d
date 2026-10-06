import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { siteData } from './site-data.js?v=a4-garden-life';
import { prepareMaterials } from './materials.js?v=a4-garden-life';
import { mobileLayout, sceneInsets, setupMobileUI } from './mobile-ui.js?v=a4-garden-life';

import { createCottage } from './cottage.js?v=a4-garden-life';
import { createGarden } from './cottage-garden.js?v=a4-garden-life';
import { createRecreation } from './recreation.js?v=a4-garden-life';

const loading = window.courtyardLoading;
await loading.stage(1, '正在启动三维引擎', '程序已加载 · 正在准备显示设备');
const host = document.getElementById('scene');
const annotations = [];
const dimensions = new THREE.Group();
const existing = new THREE.Group();
const roofGroup = new THREE.Group();
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
// Presentation daylight lights the west entrance and timber window surrounds.
sun.position.set(-28,45,24);sun.castShadow=true;
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
await loading.stage(18, '正在生成庭院', '正在构建200㎡独栋住宅与三车停车区');
const geometries=new Map();
function box(w,h,d,x,y,z,material,parent=scene){
  const key=`${w},${h},${d}`;let geom=geometries.get(key);if(!geom){geom=new THREE.BoxGeometry(w,h,d);const p=geom.attributes.position,n=geom.attributes.normal,uv=geom.attributes.uv;for(let i=0;i<p.count;i++){if(Math.abs(n.getX(i))>.5)uv.setXY(i,p.getZ(i),p.getY(i));else if(Math.abs(n.getY(i))>.5)uv.setXY(i,p.getX(i),p.getZ(i));else uv.setXY(i,p.getX(i),p.getY(i));}geometries.set(key,geom);}
  const mesh=new THREE.Mesh(geom,material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function cylinder(rt,rb,h,x,y,z,material,parent=scene,segments=12){
  const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,segments),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function accessRamp(x0,x1,z0,z1,top0,top1){
  const thickness=.065,geom=new THREE.BoxGeometry(x1-x0,thickness,z1-z0),p=geom.attributes.position;
  for(let i=0;i<p.count;i++){
    const t=(p.getX(i)+(x1-x0)/2)/(x1-x0);
    p.setY(i,p.getY(i)+top0+(top1-top0)*t-thickness/2);
  }
  geom.computeVertexNormals();
  const mesh=new THREE.Mesh(geom,M.path);mesh.position.set((x0+x1)/2,0,(z0+z1)/2);
  mesh.receiveShadow=true;scene.add(mesh);return mesh;
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

// Scheme A: one west-facing 200m² cottage. No detached side rooms.
const house=siteData.design.house;
const residence=createCottage({scene,M,box,cylinder,...house});
const housePoint=(x,z)=>[house.x+Math.cos(house.rotation)*x+Math.sin(house.rotation)*z,house.z-Math.sin(house.rotation)*x+Math.cos(house.rotation)*z];
const houseLabel=label('主屋 · 朝西 · 占地200㎡',[house.x,8.5,house.z]);
// Entry walks are level at 0.085m; the recessed porch is at 0.18m.
box(2.05,.065,15.2,-2.775,.0525,11.4,M.path);
box(1.5,.065,11.25,-10.85,.0525,8.875,M.path);
box(7.8,.065,1.6,-7.7,.0525,11.3,M.path);
slab([[-15.6,northZ(-15.6)+.14],[-10.1,northZ(-10.1)+.2],[-10.1,3.4],[-15.6,3.4]],.04,M.path,.045);
// A continuous south path links the front terrace to the family garden and service route.
box(8.75,.065,1.6,.575,.0525,20.1,M.path);
// Continuous circulation reaches the rear garden and southern productive garden.
box(16.6,.065,1.25,4.5,.0525,2.175,M.path);
box(1.55,.065,1.1,-3.025,.0525,3.35,M.path);
box(1.4,.065,17.8,12.1,.0525,10.4,M.path);
slab([[11.4,18.7],[12.8,18.7],[11.95,20.7],[10.9,20.7],[10.9,19.3],[11.4,19.3]],.065,M.path,.02);
box(6.5,.065,1.4,8.15,.0525,20,M.path);
// Court entry: a level crosswalk outside its eastern safety buffer.
accessRamp(-4.7,-3.8,19.3,20.7,.12,.085);
box(1.5,.065,1.1,-3.0,.0525,19.35,M.path);
const entry=new THREE.Group();entry.position.set(house.x,0,house.z);entry.rotation.y=house.rotation;scene.add(entry);
const rampGeometry=new THREE.BoxGeometry(2.8,.065,1.2);
const rp=rampGeometry.attributes.position;
for(let i=0;i<rp.count;i++)rp.setY(i,rp.getY(i)+.095*(.6-rp.getZ(i))/1.2);
rampGeometry.computeVertexNormals();
const ramp=new THREE.Mesh(rampGeometry,M.path);ramp.position.set(0,.0525,6.85);ramp.receiveShadow=true;entry.add(ramp);
lowerLabels.push(label('一楼空间示意',[house.x,.45,house.z],'floor','floor-label'));
const front=housePoint(0,6.35),west=housePoint(0,8.1);
line([[front[0],.22,front[1]],[west[0],.22,west[1]]],'#9f7743',dimensions);
line([[west[0]+.35,.22,west[1]-.25],[west[0],.22,west[1]],[west[0]+.35,.22,west[1]+.25]],'#9f7743',dimensions);
label('正门 / 露台朝西',[west[0],.4,west[1]-1.8],'dimension','design');
label('西向入户花园',[-7,.4,7.5]);
await loading.stage(19,'正在布置休闲与田园空间','正在生成投篮区、菜园、鸡舍与前后花园');
const landscape=createGarden({scene,M,box,cylinder,inSite});
const recreation=createRecreation({scene,M,box,cylinder,inSite});
label('后花园 · 草坪与休憩',[17.5,.65,8.5]);
label('投篮练习区 · 净活动面8×6m',[-10.2,.55,20]);
label('菜园 · 高畦种植',[.9,.7,26.5]);
label('小鸡舍 · 独立网围',[7.9,2.25,22.2]);
label('花园茶席',[0,1.25,22.7]);
// Rain is an optional atmosphere; its drops are kept within the property.
const rainPoints=[];
for(let i=0;i<950;i++){const x=Math.random()*55-27.5,z=Math.random()*35;if(inSite(x,z))rainPoints.push(x,Math.random()*17,z);}
const rainGeometry=new THREE.BufferGeometry();rainGeometry.setAttribute('position',new THREE.Float32BufferAttribute(rainPoints,3));
const rainCloud=new THREE.Points(rainGeometry,new THREE.PointsMaterial({color:'#ccdce2',size:.033,transparent:true,opacity:.6,depthWrite:false}));
rainCloud.visible=false;scene.add(rainCloud);
let floorCount=2,currentLight='day';
function updateBuilding(){
  const exterior=document.getElementById('roof').checked;
  roofGroup.visible=exterior;
  residence.setFloors(exterior?floorCount:1,exterior);
  residence.setLight(currentLight==='dusk',currentLight==='rain');
  houseLabel.position.y=2+floorCount*3.3;
  houseLabel.el.textContent='朝西独栋 · '+floorCount+'层 · 占地200㎡';
  document.getElementById('floor-area').textContent='占地200㎡ · 楼层面积约'+residence.floorAreas[floorCount]+'㎡'+(floorCount>1?' · 露台'+residence.terraceArea+'㎡':'');
  document.querySelectorAll('[data-floors]').forEach(b=>{const on=Number(b.dataset.floors)===floorCount;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  document.documentElement.dataset.floors=String(floorCount);
}
function setLight(mode){
  currentLight=mode;const dusk=mode==='dusk',rain=mode==='rain';
  hemi.intensity=dusk?.65:rain?1.2:1.4;sun.intensity=dusk?.32:rain?.65:3;
  sun.color.set(dusk?'#a9bbd7':'#fff2d9');scene.environmentIntensity=dusk?.4:1.1;
  scene.background.set(dusk?'#43566c':rain?'#b7c6c9':'#cbdbe0');scene.fog.color.copy(scene.background);
  scene.fog.near=rain?40:120;scene.fog.far=rain?150:260;renderer.toneMappingExposure=dusk?1.12:1.05;
  residence.setLight(dusk,rain);landscape.setLight(dusk,rain);recreation.setLight(dusk,rain);rainCloud.visible=rain;
  document.querySelectorAll('[data-light]').forEach(b=>{const on=b.dataset.light===mode;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  document.documentElement.dataset.lighting=mode;
}
document.querySelectorAll('[data-floors]').forEach(b=>b.addEventListener('click',()=>{floorCount=Number(b.dataset.floors);updateBuilding();}));
document.querySelectorAll('[data-light]').forEach(b=>b.addEventListener('click',()=>setLight(b.dataset.light)));
updateBuilding();setLight('day');
await loading.stage(20,'正在准备花园住宅观景视角','正在设置光线、尺寸标注与手机交互');

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
dimension(housePoint(-8,6.25),housePoint(8,6.25),'16.00m · 西向面宽',1.0,'design');
dimension(housePoint(-8,-6.25),housePoint(-8,6.25),'12.50m · 占地200㎡',1.1,'design');
dimension([-14.2,17],[-6.2,17],'8.00m · 投篮活动面',.55,'design');
dimension([-6.2,17],[-6.2,23],'6.00m · 投篮活动面',.45,'design');
line([[30,.04,6],[30,.04,-1]],'#5b796c',dimensions);line([[29.5,.04,0],[30,.04,-1],[30.5,.04,0]],'#5b796c',dimensions);label('北 N',[30,.2,-2],'dimension');
line([[-27,.04,26],[-22,.04,26]],'#5b796c',dimensions);
for(const x of [-27,-22])line([[x,.04,25.7],[x,.04,26.3]],'#5b796c',dimensions);
label('5m',[-24.5,.2,26.9],'dimension');
if(siteData.existingBuilding){
  const pts=siteData.existingBuilding.corners.map(([x,z])=>[x-27.5,.3,z]);line([...pts,pts[0]],'#b17f40',existing,true);
  const item=label('原建筑 · 图注120㎡',[siteData.existingBuilding.center[0]-27.5,.45,siteData.existingBuilding.center[1]],'existing');item.enabled=false;
}
document.getElementById('dimension-source').innerHTML=`<p><b>图纸基准</b><br>地界沿用原 PDF 矢量轮廓，以北侧东西总投影55m定标；模型面积约1130.01㎡，原图标注1130㎡。东南斜边图注20.37m，等比矢量约20.69m，此处保留原图轮廓。</p><p><b>A方案 · 朝西花园住宅</b><br>原左右厢房移除，改为一栋参考图风格的住宅。正门、门廊及主要露台统一朝西；外包络面宽16m、进深12.5m，占地200㎡，含内凹门廊。默认两层：首层约200㎡，二层实体约153㎡，室外露台47㎡，两层楼层面积合计约353㎡。三层版本增设约153㎡实体层，合计约506㎡；一层版本约200㎡。面积为模型几何粗算，门廊、露台及正式建面计算待后续设计复核。层高3.3m，浅色抹灰、木色门窗、灰瓦交叉坡顶、黑色栏杆、入口拱券为外观概念。</p><p><b>通行与园林</b><br>保留北侧4m车门及1.2m人行门、西北侧三个2.8×5.5m并列车位、北侧6m深倒车通道。西侧入户花园与连续步道连接主门廊，南侧为花园茶席、菜园和鸡舍；门前用1.2m长缓坡处理约9.5cm高差。围墙含压顶总高2m。车型暂按4.75×1.85m示意，具体转弯轨迹未校核。</p><p><b>新增休闲与田园</b><br>后花园为草坪、花境与休憩空间。西南投篮区净活动面8×6m，外围各1.5m缓冲，整体11×9m，属于家用投篮练习区，不是标准篮球场。旧西南水景和茶台移除；新茶席转到南侧，菜园采用窄高畦及连续小路，东南设置小型鸡舍和网围活动区。排水、鸡舍容量与清洁设施须在后续设计确认；植物与围挡仅示意功能分区。</p><p><b>尺寸说明</b><br>地块边界来自原图；道路宽5.5m、建筑、树木、景观、室内分区及高差为拟建设计。主屋位置和形态因朝向重新安排；屋檐地界余量只是几何检查，不代表审批退界。原建筑按拆除后重新布局，轮廓可单独显示。模型为概念交流使用，非施工图。</p>`;

let cameraTween=null,gateOpen=false,gateProgress=0,touring=false,tourTime=0;
let activeView='overview',layoutScale=1,hasView=false;
let safeScene={top:95,bottom:110};
function stopTour(){touring=false;document.getElementById('tour-toggle').textContent='自动漫游';document.getElementById('tour-toggle').setAttribute('aria-pressed','false');}
const presets={
 overview:{pos:[33.6,49,41.8],target:[0,1,13],caption:'A方案 · 后花园 · 投篮练习 · 菜园鸡舍 · 花园茶席'},
 parking:{pos:[-32,23,27],target:[-16.8,0,10],caption:'三车停车 · 每位2.8×5.5m · 倒车通道6m'},
 gate:{pos:[-30,10,-20],target:[-12,2,9],caption:'北侧入口 · 独立人行门连接西向住宅'},
 garden:{pos:[-31,18,32],target:[1,3,12],caption:'朝西独栋 · 灰瓦坡顶 · 木色门窗 · 二层露台'},
 detail:{pos:[-22,5.6,12.5],target:[-1.2,4.2,11.3],caption:'西立面 · 拱券门廊 · 木色窗框与黑色露台栏杆'},
 rear:{pos:[32,17,24],target:[17.5,.6,8.5],caption:'后花园 · 开阔草坪 · 花木与休憩座椅'},
 court:{pos:[-26,19,33],target:[-10.2,.5,20],caption:'家用投篮区 · 活动面8×6m · 周边缓冲1.5m'},
 farm:{pos:[18,18,37],target:[3,1,25],caption:'高畦菜园 · 独立鸡舍 · 连续清洁通道'},
 tea:{pos:[-9,8,31],target:[0,1,22.7],caption:'花园茶席 · 花境环绕 · 连通菜园的平整步道'},
 top:{pos:[0,86,13.1],target:[0,0,13],caption:'北在上 · 主屋200㎡ · 投篮活动面48㎡'}
};
const mobileFrames={overview:[70,48],parking:[17,16],gate:[20,18],garden:[34,25],detail:[19,13],rear:[16,16],court:[17,16],farm:[18,14],tea:[12,10],top:[60,42]};
function framingScale(name){
  if(!mobileLayout.matches)return 1;
  const cfg=presets[name],distance=v3(...cfg.pos).distanceTo(v3(...cfg.target));
  const visibleHeight=2*distance*Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
  const [width,height]=mobileFrames[name],usableHeight=Math.max(100,host.clientHeight-safeScene.top-safeScene.bottom);
  return Math.max(1,width/(visibleHeight*camera.aspect),height/(visibleHeight*usableHeight/host.clientHeight));
}
function setView(name,instant=false){
  stopTour();activeView=name;layoutScale=framingScale(name);hasView=true;
  const cfg=presets[name],target=v3(...cfg.target);
  const pos=v3(...cfg.pos).sub(target).multiplyScalar(layoutScale).add(target);
  cameraTween=null;controls.enableDamping=false;controls.update();
  camera.position.copy(pos);controls.target.set(...cfg.target);controls.update();controls.enableDamping=true;
  renderer.render(scene,camera);
  document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===name);b.setAttribute('aria-pressed',b.dataset.view===name?'true':'false');});
  document.getElementById('view-caption').textContent=mobileLayout.matches&&name==='overview'?'单指旋转 · 双指缩放和平移':cfg.caption;
  if(mobileLayout.matches){const bar=document.querySelector('.viewbar'),selected=bar.querySelector('[data-view="'+name+'"]');bar.scrollTo({left:Math.max(0,selected.offsetLeft-(bar.clientWidth-selected.offsetWidth)/2),behavior:'auto'});}
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
setupMobileUI({onReset:()=>setView('overview'),onPanelChange:open=>{controls.enabled=!open;if(open)stopTour();}});
for(const d of document.querySelectorAll('dialog'))d.addEventListener('click',e=>{if(e.target===d)d.close();});
function resize(){
  const w=host.clientWidth,h=host.clientHeight;camera.aspect=w/h;renderer.setSize(w,h);camera.clearViewOffset();safeScene=sceneInsets();
  if(mobileLayout.matches)camera.setViewOffset(w,h,0,(safeScene.bottom-safeScene.top)/2,w,h);
  else{const offset=Math.min(150,w*.13);camera.setViewOffset(w,h,-offset,0,w,h);}
  camera.updateProjectionMatrix();
  if(hasView){const next=framingScale(activeView);camera.position.sub(controls.target).multiplyScalar(next/layoutScale).add(controls.target);layoutScale=next;cameraTween=null;}
}

await loading.stage(21, '正在渲染首帧画面', '正在准备阴影与园林细节，首次打开可能需要稍候');
addEventListener('resize',resize);mobileLayout.addEventListener('change',resize);resize();setView('overview',true);
const projected=new THREE.Vector3();
let lastTime=performance.now();
function tick(t){
  const dt=Math.min((t-lastTime)/1000,.04);lastTime=t;
  if(touring){tourTime+=dt;camera.position.set(-30+Math.sin(tourTime*.11)*3,14+Math.sin(tourTime*.07)*2,14+Math.sin(tourTime*.09)*12);controls.target.set(house.x,floorCount===1?2:3.6,house.z);if(mobileLayout.matches)camera.position.sub(controls.target).multiplyScalar(layoutScale).add(controls.target);}
  if(cameraTween){const v=Math.min((t-cameraTween.start)/800,1),ease=1-Math.pow(1-v,3);camera.position.lerpVectors(cameraTween.from,cameraTween.to,ease);controls.target.lerpVectors(cameraTween.fromTarget,cameraTween.target,ease);if(v===1)cameraTween=null;}
  gateProgress=THREE.MathUtils.damp(gateProgress,gateOpen?1:0,5,dt);
  carGate.position.x=-2-4.1*gateProgress;pedestrianGate.rotation.y=-Math.PI*.46*gateProgress;
  controls.update();
  landscape.update(dt);recreation.update(dt);residence.update?.(dt);
  if(rainCloud.visible){const positions=rainGeometry.attributes.position;for(let i=0;i<positions.count;i++){let y=positions.getY(i)-dt*9;if(y<0)y=17;positions.setY(i,y);}positions.needsUpdate=true;}
  const w=host.clientWidth,h=host.clientHeight,showLabels=document.getElementById('labels').checked;
  const occupied=[];
  for(const a of annotations){
    let visible=a.enabled;
    if(a.type==='dimension')visible=dimensions.visible;
    else if(a.type==='floor')visible=showLabels&&!roofGroup.visible;
    else if(a.type==='space')visible=showLabels;
    if(visible){projected.copy(a.position).project(camera);visible=projected.z>-1&&projected.z<1&&Math.abs(projected.x)<.97&&Math.abs(projected.y)<.94;
      let xx=(projected.x*.5+.5)*w;const yy=(-projected.y*.5+.5)*h;
      if(!mobileLayout.matches&&xx<330&&yy<host.clientHeight-120)visible=false;
      if(yy<safeScene.top||yy>h-safeScene.bottom)visible=false;
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
