import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { Water } from 'three/addons/objects/Water.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { repeatedBeams } from './architecture-kit.js';
import { siteData } from './site-data.js?v=20261006-axis';
const roofCX=siteData.design.houseCenter[0]-27.5,roofHalf=siteData.design.houseWidth/2+.55;

let seed=88042;
const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const dummy=new THREE.Object3D(),colour=new THREE.Color();
const vec=(x,y,z)=>new THREE.Vector3(x,y,z);

export async function prepareMaterials(M,scene,renderer,{onProgress=()=>{},beforeEnvironment=()=>{}}={}){
  const materialSets=['large_grey_tiles','white_plaster_02','wood_floor_deck','leafy_grass'];
  const totalResources=materialSets.length*3+3+1;
  let loadedResources=0;
  const track=promise=>promise.then(resource=>{onProgress(++loadedResources,totalResources);return resource;});
  onProgress(0,totalResources);
  const loader=new THREE.TextureLoader();
  async function texture(name,color=false,scale=1){const t=await track(loader.loadAsync('./assets/'+name));t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(scale,scale);t.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);if(color)t.colorSpace=THREE.SRGBColorSpace;return t;}
  const loadSet=async(name,scale)=>{const [map,normalMap,roughnessMap]=await Promise.all([texture(name+'_diff_1k.jpg',true,scale),texture(name+'_nor_gl_1k.jpg',false,scale),texture(name+'_rough_1k.jpg',false,scale)]);return {map,normalMap,roughnessMap};};
  const [stone,plaster,wood,grass,env]=await Promise.all([...materialSets.map((name,i)=>loadSet(name,[.65,.7,.5,.42][i])),track(new HDRLoader().loadAsync('./assets/chinese_garden_1k.hdr'))]);
  function assign(material,set,tint,normal=.4){Object.assign(material,set);material.color.set(tint);material.normalScale.set(normal,normal);material.needsUpdate=true;}
  assign(M.wall,plaster,'#f0f0e8',.28);assign(M.trim,plaster,'#a0a59e',.32);assign(M.base,stone,'#747d7c',.55);
  M.wall.map=null;M.wall.color.set('#eeeede');M.wall.normalScale.set(.11,.11);
  M.trim.map=null;M.trim.color.set('#9a9f98');
  assign(M.paving,stone,'#c8cecb',.58);assign(M.path,stone,'#cfd5d1',.58);
  assign(M.wood,wood,'#625047',.45);assign(M.woodLight,wood,'#807363',.45);assign(M.trunk,wood,'#706557',1.1);
  assign(M.grass,grass,'#acb9a2',.5);assign(M.grassDeep,grass,'#91a288',.5);
  M.grass.color.set('#689354');M.grassDeep.color.set('#6b984e');
  M.roof.color.set('#3d4646');M.roof.roughness=.88;M.roof.normalMap=stone.normalMap;M.roof.normalScale.set(.15,.15);
  M.roofEdge.color.set('#535c5e');M.dark.color.set('#313b3c');M.road.color.set('#717779');M.wall.color.set('#f5f3eb');M.wood.color.set('#897a65');M.woodLight.color.set('#bbac91');M.fabric.color.set('#c9c7ba');
  M.glass=new THREE.MeshPhysicalMaterial({color:'#aebfb5',roughness:.14,metalness:.18,transmission:0,transparent:true,opacity:.43,envMapIntensity:1,emissive:'#bc793d',emissiveIntensity:0,depthWrite:false});
  const [brickMap,brickNormal,brickRough]=await Promise.all([texture('brick_wall_003_diffuse_1k.jpg',true),texture('brick_wall_003_nor_gl_1k.jpg'),texture('brick_wall_003_rough_1k.jpg')]);
  for(const map of [brickMap,brickNormal,brickRough])map.repeat.set(.6,1.2);
  M.facade=new THREE.MeshStandardMaterial({color:'#eeeeea',map:brickMap,normalMap:brickNormal,roughnessMap:brickRough,roughness:.9,normalScale:new THREE.Vector2(.17,.17)});
  M.facade.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat facadeGrey=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722)); diffuseColor.rgb=mix(vec3(.55,.565,.555),vec3(facadeGrey),.62);');};
  M.facade.customProgramCacheKey=()=> 'light-grey-brick-v1';
  M.roof.color.set('#3b413d');M.wood.color.set('#786652');M.woodLight.color.set('#ad9677');
  // Deep timber, warm soffits and honed grey stone share one architectural palette.
  const timberMap=wood.map.clone();timberMap.repeat.set(.23,.7);timberMap.needsUpdate=true;
  M.timber=new THREE.MeshPhysicalMaterial({color:'#76634f',map:timberMap,normalMap:wood.normalMap,normalScale:new THREE.Vector2(.10,.10),roughness:.43,clearcoat:.12,clearcoatRoughness:.4,envMapIntensity:.65});
  M.timber.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat timberLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722)); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(timberLuma)*vec3(.76,.64,.51),.82);');};
  M.timber.customProgramCacheKey=()=> 'architectural-timber-v1';
  M.columnTimber=M.timber.clone();M.columnTimber.map=timberMap.clone();M.columnTimber.map.center.set(.5,.5);M.columnTimber.map.rotation=Math.PI/2;M.columnTimber.map.needsUpdate=true;
  M.columnTimber.onBeforeCompile=M.timber.onBeforeCompile;M.columnTimber.customProgramCacheKey=M.timber.customProgramCacheKey;
  M.soffit=M.woodLight.clone();M.soffit.color.set('#c4ae87');M.soffit.normalScale.set(.16,.16);M.soffit.roughness=.65;
  M.soffit.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat soffitLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722)); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(soffitLuma)*vec3(1.15,.92,.65),.8);');};
  M.soffit.customProgramCacheKey=()=> 'warm-soffit-v1';
  M.cutStone=new THREE.MeshStandardMaterial({color:'#7f857f',normalMap:stone.normalMap,normalScale:new THREE.Vector2(.055,.055),roughness:.78});
  M.bronze=new THREE.MeshStandardMaterial({color:'#504d40',roughness:.45,metalness:.48});
  M.warmGlow=new THREE.MeshStandardMaterial({color:'#e8d3ac',emissive:'#ffd298',emissiveIntensity:.25,roughness:.55});
  M.wall.color.set('#eeece2');
  M.facade.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat facadeGrey=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722)); diffuseColor.rgb=mix(vec3(.72,.705,.665),vec3(facadeGrey),.32);');};
  M.facade.customProgramCacheKey=()=> 'warm-grey-brick-v2';
  env.mapping=THREE.EquirectangularReflectionMapping;
  await beforeEnvironment();
  const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromEquirectangular(env).texture;pmrem.dispose();
  scene.environmentIntensity=1.1;scene.background=new THREE.Color('#cbdbe0');scene.fog=new THREE.Fog('#cbdbe0',75,170);
  scene.backgroundRotation.y=1.8;scene.environmentRotation.y=1.8;
  return {env,stone,wood,grass};
}

function surface(x,z){
  const a=(roofHalf-Math.abs(x-roofCX))/3,b=(5.55-Math.abs(z-10))/5.55;
  return 6.87+1.1*Math.max(0,Math.min(a,b,1));
}
export function tiledRoof(roofGroup,M){
  for(const c of [...roofGroup.children])roofGroup.remove(c);
  const shape=new THREE.PlaneGeometry(roofHalf*2,11.1,106,54);shape.rotateX(-Math.PI/2);shape.translate(roofCX,0,10);
  const p=shape.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,surface(p.getX(i),p.getZ(i))-.025);shape.computeVertexNormals();
  const under=new THREE.Mesh(shape,M.roof);under.castShadow=true;under.receiveShadow=true;roofGroup.add(under);
  const tilePositions=[],tileNormals=[],uv=[],indices=[];
  for(let j=0;j<=1;j++)for(let i=0;i<=8;i++){
    const theta=i/8*Math.PI;
    tilePositions.push(Math.cos(theta)*.1,Math.sin(theta)*.062+(j===0?.015:0),j*.34-.17);
    tileNormals.push(Math.cos(theta),Math.sin(theta),0);uv.push(i/8,j);
  }
  for(let i=0;i<8;i++)indices.push(i,i+9,i+1,i+1,i+9,i+10);
  const tg=new THREE.BufferGeometry();tg.setAttribute('position',new THREE.Float32BufferAttribute(tilePositions,3));tg.setAttribute('normal',new THREE.Float32BufferAttribute(tileNormals,3));tg.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));tg.setIndex(indices);
  const rows=[];
  for(let z=4.47;z<15.56;z+=.285)for(let x=roofCX-roofHalf+.09;x<roofCX+roofHalf;x+=.19)rows.push([x,z]);
  const tiles=new THREE.InstancedMesh(tg,M.roof,rows.length);const matrix=new THREE.Matrix4();
  rows.forEach(([x,z],i)=>{
    const dx=(surface(x+.01,z)-surface(x-.01,z))/.02,dz=(surface(x,z+.01)-surface(x,z-.01))/.02;
    const n=vec(-dx,1,-dz).normalize();let down;
    if(Math.abs(dx)>Math.abs(dz))down=vec(x<roofCX?-1:1,-Math.abs(dx),0).normalize();else down=vec(0,-Math.abs(dz),z<10?-1:1).normalize();
    const side=new THREE.Vector3().crossVectors(n,down).normalize();matrix.makeBasis(side,n,down);matrix.setPosition(x,surface(x,z)+.038,z);
    tiles.setMatrixAt(i,matrix);colour.setHSL(.51+rand()*.025,.045,.65+rand()*.3);tiles.setColorAt(i,colour);
  });tiles.castShadow=true;tiles.receiveShadow=true;tiles.instanceMatrix.needsUpdate=true;tiles.computeBoundingSphere();roofGroup.add(tiles);
  // Mortared ridge and hips have a curved silhouette and separate tile joints.
  const left=roofCX-roofHalf+.05,right=roofCX+roofHalf-.05;
  const ridgeL=left+3,ridgeR=right-3;
  for(const [a,b] of [[[left,4.47],[ridgeL,10]],[[right,4.47],[ridgeR,10]],[[left,15.53],[ridgeL,10]],[[right,15.53],[ridgeR,10]],[[ridgeL,10],[ridgeR,10]]]){
    const count=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.28);
    for(let i=0;i<count;i++){
      const t=i/count,t2=(i+1)/count;
      const av=vec(THREE.MathUtils.lerp(a[0],b[0],t),0,THREE.MathUtils.lerp(a[1],b[1],t));av.y=surface(av.x,av.z)+.12;
      const bv=vec(THREE.MathUtils.lerp(a[0],b[0],t2),0,THREE.MathUtils.lerp(a[1],b[1],t2));bv.y=surface(bv.x,bv.z)+.12;
      const dir=bv.clone().sub(av);const m=new THREE.Mesh(new THREE.CylinderGeometry(.14,.145,dir.length()+.035,8),M.roofEdge);m.position.copy(av.add(bv).multiplyScalar(.5));m.quaternion.setFromUnitVectors(vec(0,1,0),dir.normalize());m.castShadow=true;roofGroup.add(m);
    }
  }
}

export function leafGeometry(){
  const p=[],uv=[],indices=[];
  for(const [xx,zz,angle]of [[-.12,.05,-.8],[.12,.12,.8],[-.1,.28,-.7],[.11,.34,.8],[0,.46,0]]){
    const base=p.length/3,c=Math.cos(angle),s=Math.sin(angle);
    for(const [x,y,z]of [[0,0,0],[-.06,.008,.09],[0,0,.23],[.06,.008,.09],[0,.027,.1]])p.push(xx+x*c+z*s,y,zz-x*s+z*c);
    uv.push(.5,0,0,.4,.5,1,1,.4,.5,.5);indices.push(base,base+1,base+4,base+1,base+2,base+4,base+2,base+3,base+4,base+3,base,base+4);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function naturalPlanting(scene,M,inSite,excludesGrass=()=>false){
  const leafMaterial=new THREE.MeshStandardMaterial({color:'#526d36',roughness:.8,side:THREE.DoubleSide});
  // Gentle vein and colour variations are generated as a native material, not a substitute picture.
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=128;const c=canvas.getContext('2d');
  c.fillStyle='#b4c7a1';c.fillRect(0,0,64,128);c.strokeStyle='#82916c';c.lineWidth=1;c.beginPath();c.moveTo(32,0);c.lineTo(32,128);c.stroke();
  c.lineWidth=.6;for(let j=10;j<123;j+=12){c.beginPath();c.moveTo(32,j);c.lineTo(2,j+19);c.moveTo(32,j);c.lineTo(62,j+19);c.stroke();}
  const leafMap=new THREE.CanvasTexture(canvas);leafMap.colorSpace=THREE.SRGBColorSpace;leafMaterial.map=leafMap;
  const leafTransforms=[],branchGeometry=[];
  function branch(points,r1,r2){
    const curve=new THREE.CatmullRomCurve3(points);const geo=new THREE.TubeGeometry(curve,6,r1,6,false);
    const pos=geo.attributes.position;
    for(let i=0;i<pos.count;i++){const t=Math.floor(i/7)/6;const centre=curve.getPointAt(Math.min(t,1));const scale=THREE.MathUtils.lerp(1,r2/r1,t);pos.setXYZ(i,centre.x+(pos.getX(i)-centre.x)*scale,centre.y+(pos.getY(i)-centre.y)*scale,centre.z+(pos.getZ(i)-centre.z)*scale);}
    geo.computeVertexNormals();branchGeometry.push(geo);
  }
  function tree(x,z,s=1){
    const base=vec(x,.06,z);const top=base.clone().add(vec(.22*s,4.3*s,.18*s));
    branch([base,base.clone().add(vec(-.1*s,1.7*s,.1*s)),top],.23*s,.07*s);
    const clusters=[];
    for(let j=0;j<15;j++){
      const a=j*2.399+rand()*.5,rad=(1.05+rand()*1.6)*s;
      const origin=base.clone().add(vec(.1,1.8*s+rand()*2.2*s,.1));
      const end=base.clone().add(vec(Math.cos(a)*rad,(3.25+rand()*2.1)*s,Math.sin(a)*rad));
      branch([origin,origin.clone().lerp(end,.55).add(vec(0,.4*s,0)),end],.065*s,.014*s);clusters.push(end);
    }
    const count=innerWidth<640?1600:3000;
    for(let i=0;i<count;i++){
      const centre=clusters[i%clusters.length];const az=rand()*Math.PI*2,ct=rand()*2-1,r=Math.pow(rand(),.5)*(1.08*s);
      const pos=centre.clone().add(vec(Math.cos(az)*Math.sqrt(1-ct*ct)*r,ct*r*.72,Math.sin(az)*Math.sqrt(1-ct*ct)*r));
      leafTransforms.push({pos,rot:[rand()*Math.PI,rand()*Math.PI*2,rand()*.9],scale:(.55+rand()*.4)*s,tint:.7+rand()*.7});
    }
  }
  for(const p of [[6.8,25.1,.72],[-15,25.5,.85],[20,5,1],[20.4,15.5,.9],[17.3,6.5,.8],[-18.2,20.15,.7]])if(inSite(p[0],p[1]))tree(...p);
  // Shrub masses use the same fine leaf geometry with lower, asymmetric crowns.
  const shrubs=[[6.5,25.5],[20,17.8],[20.8,10],[18,6],[-16,24],[-24.5,5]];
  for(const [x,z]of shrubs)for(let j=0;j<420;j++){
    const a=rand()*Math.PI*2,r=Math.sqrt(rand())*.9;
    leafTransforms.push({pos:vec(x+Math.cos(a)*r,.22+Math.sqrt(1-r*r)*(.45+rand()*.25),z+Math.sin(a)*r),rot:[rand()*Math.PI,rand()*Math.PI*2,0],scale:.3+rand()*.3,tint:.7+rand()*.6});
  }
  const leaves=new THREE.InstancedMesh(leafGeometry(),leafMaterial,leafTransforms.length);
  leafTransforms.forEach((v,i)=>{dummy.position.copy(v.pos);dummy.rotation.set(...v.rot);dummy.scale.setScalar(v.scale);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);leaves.setColorAt(i,colour.setRGB(v.tint*.94,v.tint,v.tint*.8));});
  leaves.castShadow=true;leaves.receiveShadow=true;leaves.computeBoundingSphere();scene.add(leaves);
  const bg=mergeGeometries(branchGeometry,false);const bark=new THREE.Mesh(bg,M.trunk);bark.castShadow=true;bark.receiveShadow=true;scene.add(bark);
  branchGeometry.forEach(g=>g.dispose());
  // Fine grass blades and longer ornamental grasses make the ground meet the stone naturally.
  const grassGeom=new THREE.BufferGeometry();grassGeom.setAttribute('position',new THREE.Float32BufferAttribute([-.025,0,0,.025,0,0,-.018,.22,.025,.018,.22,.025,0,.4,.11],3));grassGeom.setIndex([0,1,2,2,1,3,2,3,4]);grassGeom.computeVertexNormals();
  const grassMat=new THREE.MeshStandardMaterial({color:'#6a8153',roughness:1,side:THREE.DoubleSide});
  const points=[];
  for(let i=0;i<30000;i++){
    const x=-24+rand()*48,z=3.4+rand()*29;
    const house=(x>roofCX-roofHalf-.12&&x<roofCX+roofHalf+.12&&z>4.3&&z<15.8)||(x>-10.8&&x<8.2&&z>=15.8&&z<23.4),park=(x>-22.3&&x<-12.2&&z>3&&z<9.4)||(x>-20.9&&x<-12.2&&z>=9.2&&z<14.85)||(x>-20.4&&x<-15.6&&z<3.4),veg=(x<-10.5&&x>-16&&z<22.3&&z>18)||(x>-18.6&&x<-15.6&&z>17.1&&z<19.5);
    if(inSite(x,z)&&!house&&!park&&!veg&&!excludesGrass(x,z))points.push([x,z]);
  }
  const blades=new THREE.InstancedMesh(grassGeom,grassMat,points.length);
  points.forEach(([x,z],i)=>{dummy.position.set(x,.04,z);dummy.rotation.set(0,rand()*Math.PI*2,0);dummy.scale.set(.55+rand()*.8,.1+rand()*.12,.5+rand());dummy.updateMatrix();blades.setMatrixAt(i,dummy.matrix);blades.setColorAt(i,colour.setHSL(.24+rand()*.05,.28+rand()*.1,.34+rand()*.1));});blades.receiveShadow=true;blades.computeBoundingSphere();scene.add(blades);
  return {leaves,blades};
}

export function landscapeDetails(scene,M,helpers){
  const {box,cylinder}=helpers;const garden=new THREE.Group();scene.add(garden);
  // The water garden is an optional proposal on the east side, beyond the main level walking route.
  const outline=[[8.2,10.8],[10.2,9.2],[13.8,9.3],[16.3,10.3],[17.1,12.4],[16.4,15.4],[14.6,17.0],[11.4,16.6],[9.5,15.2],[8.1,13.6]];
  const path=new THREE.Shape();path.moveTo(outline[0][0],-outline[0][1]);
  for(let i=0;i<outline.length;i++){
    const cur=outline[i],n=outline[(i+1)%outline.length];path.quadraticCurveTo(cur[0],-cur[1],(cur[0]+n[0])/2,-(cur[1]+n[1])/2);
  }path.closePath();
  const normalData=new Uint8Array(128*128*4);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4;normalData[i]=128+Math.sin(x*.45+y*.26)*27;normalData[i+1]=128+Math.cos(x*.25-y*.37)*27;normalData[i+2]=245;normalData[i+3]=255;}
  const normal=new THREE.DataTexture(normalData,128,128);normal.wrapS=normal.wrapT=THREE.RepeatWrapping;normal.needsUpdate=true;
  const water=new Water(new THREE.ShapeGeometry(path,36),{textureWidth:512,textureHeight:512,waterNormals:normal,waterColor:'#1b302b',sunColor:'#ede6d8',sunDirection:vec(-.6,.8,.5),distortionScale:.42,alpha:1,fog:true});
  water.rotation.x=-Math.PI/2;water.position.y=.125;garden.add(water);
  const edgeCurve=new THREE.CatmullRomCurve3(outline.map(([x,z])=>vec(x,.15,z)),true,'catmullrom',.4);
  const edge=new THREE.Mesh(new THREE.TubeGeometry(edgeCurve,120,.17,7,true),M.base);edge.castShadow=true;edge.receiveShadow=true;garden.add(edge);
  // Weathered rocks with textured, irregular surfaces.
  function rock(x,z,scale){const g=new THREE.IcosahedronGeometry(1,2);const p=g.attributes.position;for(let i=0;i<p.count;i++){const k=1+.12*Math.sin(p.getX(i)*9+p.getY(i)*6)+.06*Math.cos(p.getZ(i)*12);p.setXYZ(i,p.getX(i)*k,p.getY(i)*k,p.getZ(i)*k);}g.computeVertexNormals();const m=new THREE.Mesh(g,M.base);m.position.set(x,.12+scale*.18,z);m.rotation.set(rand()*.3,rand()*6.3,rand()*.35);m.scale.set(scale,scale*(.5+rand()*.4),scale*.8);m.castShadow=true;m.receiveShadow=true;garden.add(m);}
  for(let i=0;i<50;i++){const p=edgeCurve.getPointAt(i/50);if(Math.abs(p.z-13.2)>.9)rock(p.x,p.z,.24+rand()*.37);}
  for(const r of [[15.6,15.7,1.1],[16,16.4,.8],[15.3,16.4,.65],[8.8,10.4,.5],[-8,24,.6],[-12.7,24.5,.55]])rock(...r);
  // A level stone bridge with timber handrails mirrors the references without steps.
  box(9.2,.12,1.35,12.5,.24,13.2,M.path,garden);
  for(const z of [12.53,13.87]){box(9.3,.09,.09,12.5,1.05,z,M.wood,garden);box(9.3,.07,.07,12.5,.72,z,M.wood,garden);for(let x=8.1;x<=17;x+=1.1)box(.09,.92,.09,x,.62,z,M.wood,garden);}
  // Both bridge ends have a gradual approach to the adjoining garden level.
  for(const [x,sign]of [[7.35,-1],[17.65,1]]){const ramp=box(1.2,.10,1.5,x,.15,13.2,M.path,garden);ramp.rotation.z=-sign*.17;}
  // Hand-sized ceramic pots and plants at the veranda.
  for(const [x,z]of [[-5.5,17.8],[5.5,17.8],[7.7,13.2]]){
    cylinder(.35,.25,.55,x,.44,z,M.clay,garden,24);cylinder(.37,.37,.08,x,.74,z,M.clay,garden,24);cylinder(.30,.30,.03,x,.76,z,M.soil,garden,24);
    for(let i=0;i<32;i++){const a=i*2.399;const m=new THREE.Mesh(leafGeometry(),M.leafDark);m.position.set(x+Math.cos(a)*.13,.8+rand()*.35,z+Math.sin(a)*.13);m.rotation.set(-.5+rand(),a,rand());m.scale.setScalar(.65);garden.add(m);}
  }
  return {water,garden};
}

export function modernRoof(roofGroup,M,box){
  tiledRoof(roofGroup,M);
  for(const z of [4.55,15.45]){
    box(21.05,.23,.15,roofCX,6.795,z,M.timber,roofGroup);
    box(21.03,.035,.155,roofCX,6.69,z,M.bronze,roofGroup);
    box(20.82,.055,.31,roofCX,6.78,z<10?4.665:15.355,M.soffit,roofGroup);
    const rafters=[];for(let x=roofCX-10.25;x<=roofCX+10.26;x+=.27)rafters.push([x,6.75,z<10?4.665:15.355]);
    repeatedBeams(.07,.08,.31,rafters,M.soffit,roofGroup);
    box(20.5,.018,.024,roofCX,6.705,z<10?4.75:15.25,M.warmGlow,roofGroup);
  }
  for(const x of [roofCX-10.46,roofCX+10.46]){
    box(.15,.23,10.82,x,6.795,10,M.timber,roofGroup);
    box(.155,.035,10.82,x,6.69,10,M.bronze,roofGroup);
    box(.43,.055,10.5,x<roofCX?roofCX-10.23:roofCX+10.23,6.78,10,M.soffit,roofGroup);
    const rafters=[];for(let z=4.85;z<=15.2;z+=.28)rafters.push([x<roofCX?roofCX-10.23:roofCX+10.23,6.75,z]);
    repeatedBeams(.44,.08,.065,rafters,M.soffit,roofGroup);
  }
}

export function architecturalDetails({scene,M,roofGroup,upperGroup,groundWalls,box,cylinder}){
  const lamps=[],amber=M.warmGlow,cx=siteData.design.courtyardCenterX;
  const left=roofCX-siteData.design.houseWidth/2,right=roofCX+siteData.design.houseWidth/2;
  for(const [x,z]of [[-4.1,15.08],[1.6,15.08],[-18,2.4]]){
    box(.16,.46,.10,x,2.06,z,M.timber);box(.105,.32,.105,x,2.06,z+.008,amber);
    for(const xx of [x-.064,x+.064])box(.016,.36,.018,xx,2.06,z+.071,M.bronze);
    box(.19,.045,.16,x,2.295,z+.02,M.timber);box(.17,.04,.14,x,1.825,z+.02,M.timber);
  }
  for(const [x,z]of [[-4.55,16.25],[cx,15.9],[2.05,16.25],[-5.1,18],[2.6,18],[-5.1,21.5],[2.6,21.5]]){
    const light=new THREE.PointLight('#ffdcaa',0,5.5,2);light.position.set(x,2.8,z);scene.add(light);lamps.push(light);
  }
  for(const [x,z]of [[cx,12],[3.6,12.5],[-6.5,7.4],[7.2,12.8]]){const l=new THREE.PointLight('#ffdfa8',0,7,2);l.position.set(x,2.3,z);scene.add(l);lamps.push(l);}
  for(const x of [left+.13,cx-2.52,cx+2.52,right-.13]){
    box(.13,3.04,.10,x,1.92,15.07,M.timber,groundWalls);
    box(.13,3.12,.10,x,5.18,15.07,M.timber,upperGroup);
  }
  for(const [a,b]of [[left,cx-2.52],[cx+2.52,right]]){
    const x=(a+b)/2,w=b-a;
    box(w,.16,.12,x,3.535,15.07,M.timber,upperGroup);
    box(w,.025,.13,x,3.615,15.07,M.bronze,upperGroup);
  }
  box(20.05,.14,.11,roofCX,3.535,4.97,M.timber,upperGroup);
  for(const x of [left-.03,right+.03])box(.11,.14,10,x,3.535,10,M.timber,upperGroup);
  // Stone skirts stop at hall glazing and the passages into the side wings.
  for(const [a,b]of [[left,cx-7.4],[cx-6.1,cx-2.52],[cx+2.52,cx+6.1],[cx+7.4,right]])box(b-a,.28,.075,(a+b)/2,.46,15.025,M.cutStone,groundWalls);
  for(const [a,b]of [[left,cx-.85],[cx+.85,right]])box(b-a,.28,.075,(a+b)/2,.46,4.975,M.cutStone,groundWalls);
  for(const x of [left-.025,right+.025])box(.075,.28,10,x,.46,10,M.cutStone,groundWalls);
  return {lamps,amber};
}
