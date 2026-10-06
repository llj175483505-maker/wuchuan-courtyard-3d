import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { leafGeometry } from './realism.js';

// Metre-based proposal: open middle, an eastern water garden and western tea terrace.
export function intimateGarden(scene,M,{box,cylinder,inSite}){
  const garden=new THREE.Group();garden.name='side-gardens';scene.add(garden);
  let seed=217;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const dummy=new THREE.Object3D(),colour=new THREE.Color();
  const stone=M.base.clone();stone.color.set('#919789');stone.map=null;stone.roughness=.88;stone.normalScale.set(.18,.18);
  const timber=M.woodLight.clone();timber.color.set('#a89474');
  timber.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat woodGrey=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722)); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(woodGrey)*vec3(1.13,1.03,.86),.75);');};
  timber.customProgramCacheKey=()=> 'garden-teak-v1';
  const cushion=M.fabric.clone();cushion.color.set('#d5d0bb');
  const soil=M.soil.clone();soil.color.set('#535945');
  const leaves=[],flowers=[],grass=[],beds=[],surfaceBounds=[];
  function curve(points,y=0){return new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,y,z)),true,'catmullrom',.25);}
  function shapeOf(points){const shape=new THREE.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();return shape;}
  function surface(points,y,material){const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(points)),material);mesh.rotation.x=-Math.PI/2;mesh.position.y=y;mesh.receiveShadow=true;garden.add(mesh);surfaceBounds.push(points);return mesh;}
  function contains(points,x,z){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const [a,b]=points[i],[c,d]=points[j];if((b>z)!==(d>z)&&x<(c-a)*(z-b)/(d-b)+a)inside=!inside;}return inside;}
  function plantingBed(points){
    const edge=curve(points,.15),sample=edge.getPoints(80).map(p=>[p.x,p.z]);surface(sample,.13,soil);
    const rim=new THREE.Mesh(new THREE.TubeGeometry(edge,80,.045,5,true),M.dark);rim.castShadow=true;garden.add(rim);
    beds.push(sample);return sample;
  }
  function shrub(x,z,r=.45,h=.5,tint=.29){
    for(let i=0;i<Math.round(r*480);i++){
      const a=rand()*Math.PI*2,d=Math.sqrt(rand())*r,xx=x+Math.cos(a)*d,zz=z+Math.sin(a)*d;
      if(!inSite(xx,zz))continue;
      leaves.push({x:xx,y:.16+Math.sqrt(Math.max(0,1-d*d/(r*r)))*h*(.65+rand()*.35),z:zz,s:.24+rand()*.27,a:rand()*6.28,tint});
    }
  }
  function tuft(x,z,s=.65){for(let j=0;j<28;j++){const a=rand()*6.28,r=rand()*.16*s;grass.push({x:x+Math.cos(a)*r,z:z+Math.sin(a)*r,s:s*(.65+rand()*.55),a});}}
  function whiteFlowers(x,z,s=.5){
    shrub(x,z,s,.32,.27);
    for(let j=0;j<18;j++){const a=rand()*6.28,r=Math.sqrt(rand())*s;flowers.push({x:x+Math.cos(a)*r,y:.4+rand()*.2,z:z+Math.sin(a)*r,s:.065+rand()*.035});}
  }
  function rock(x,z,s,yScale=.56){
    const geo=new THREE.IcosahedronGeometry(1,2),p=geo.attributes.position;
    for(let i=0;i<p.count;i++){const k=1+.11*Math.sin(p.getX(i)*7+p.getZ(i)*9)+.06*Math.cos(p.getY(i)*13);p.setXYZ(i,p.getX(i)*k,p.getY(i)*k,p.getZ(i)*k);}geo.computeVertexNormals();
    const mesh=new THREE.Mesh(geo,stone);mesh.position.set(x,.14+s*.16,z);mesh.rotation.y=rand()*6.28;mesh.scale.set(s,s*yScale,s*.76);mesh.castShadow=true;mesh.receiveShadow=true;garden.add(mesh);
  }
  // With the larger main house, planting stays in the side gardens.
  // Continuous routes wrap the relocated wings instead of crossing their floors.
  box(1.2,.045,7.6,-10.72,.11,20.5,M.path,garden);
  box(20.55,.045,1.1,-1.725,.11,23.8,M.path,garden);
  surface([[-2.15,23.6],[-.35,23.6],[2.22,29.4],[.42,29.4]],.12,M.path);
  for(const side of [-1,1])for(let z=25.2;z<28.8;z+=1.45){const x=-1.25+(z-23.6)*.443+side*1.46;if(inSite(x,z)){tuft(x,z,.66);if(side>0)whiteFlowers(x+.35,z+.4,.28);}}
  // West: timber tea terrace. Four armchairs all face the table.
  box(3.5,.065,3.4,-12.9,.12,24.8,M.path,garden);
  for(let i=0;i<13;i++)box(3.3,.035,.24,-12.9,.174,23.3+i*.25,timber,garden);
  const tea=new THREE.Group();tea.position.set(-12.9,.18,24.8);garden.add(tea);
  cylinder(.65,.65,.07,0,.68,0,stone,tea,48);cylinder(.19,.27,.64,0,.33,0,M.dark,tea,20);
  cylinder(.14,.1,.15,0,.8,0,M.clay,tea,24);cylinder(.036,.036,.12,0,.91,0,M.dark,tea,12);
  for(const [x,z]of [[.27,.15],[-.28,.08],[.05,-.3]])cylinder(.065,.05,.065,x,.77,z,M.path,tea,18);
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2,chair=new THREE.Group();chair.position.set(Math.sin(a)*1.18,0,Math.cos(a)*1.18);chair.rotation.y=a;tea.add(chair);
    box(.64,.09,.64,0,.43,0,timber,chair);box(.56,.09,.56,0,.52,0,cushion,chair);
    for(const x of [-.27,.27])for(const z of [-.26,.26])box(.045,.43,.045,x,.215,z,M.dark,chair);
    box(.61,.34,.06,0,.77,.29,timber,chair);box(.52,.28,.035,0,.78,.25,cushion,chair);
    for(const x of [-.31,.31]){box(.045,.24,.045,x,.61,.24,M.dark,chair);box(.06,.05,.62,x,.74,0,timber,chair);}
  }
  plantingBed([[-15.4,23.4],[-14.95,23.4],[-14.95,24.8],[-14.85,25.9],[-15.35,25.7],[-15.6,24.5]]);
  for(const p of [[-15.15,23.9,.25,.4],[-15.15,25.7,.28,.4]])shrub(...p);
  whiteFlowers(-15.2,24.45,.24);rock(-14.5,26.7,.28);
  // East: a curved reflecting pond; a planted buffer separates it from the path.
  const pondPoints=[[13.45,10.9],[15.35,10.25],[17.45,11.3],[17.85,13.8],[16.95,16.25],[14.8,16.8],[13.35,15.8],[12.9,13.6]];
  const pondCurve=curve(pondPoints,.17),outline=pondCurve.getPoints(112).map(p=>[p.x,p.z]);
  const data=new Uint8Array(64*64*4);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const i=(y*64+x)*4;data[i]=128+Math.sin(x*.25+y*.3)*17;data[i+1]=128+Math.cos(x*.32-y*.19)*17;data[i+2]=250;data[i+3]=255;}
  const normal=new THREE.DataTexture(data,64,64);normal.wrapS=normal.wrapT=THREE.RepeatWrapping;normal.needsUpdate=true;
  const water=new Water(new THREE.ShapeGeometry(shapeOf(outline)),{textureWidth:512,textureHeight:512,waterNormals:normal,waterColor:'#173c37',sunColor:'#ede6d8',sunDirection:new THREE.Vector3(.5,.8,.5),distortionScale:.19,fog:true});water.rotation.x=-Math.PI/2;water.position.y=.145;garden.add(water);
  water.material.fragmentShader=water.material.fragmentShader.replace('float rf0 = 0.3;','float rf0 = 0.055;').replace('worldPosition.xz * size','worldPosition.xz * size * 12.0').replace('sunColor * diffuseLight * 0.3','sunColor * diffuseLight * 0.03').replace('vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );','vec3 surfaceNormal = normalize(vec3(noise.x*.45 + sin(worldPosition.x*8.0+worldPosition.z*4.0-time*2.0)*.045, 1.0, noise.y*.45 + cos(worldPosition.z*9.0-time*1.7)*.04));');
  water.material.uniforms.waterColor.value.set('#276256');
  const rim=new THREE.Mesh(new THREE.TubeGeometry(pondCurve,112,.13,8,true),stone);rim.castShadow=true;rim.receiveShadow=true;garden.add(rim);
  plantingBed([[12.9,9.7],[15.1,9.25],[18.2,10.35],[19.2,12.4],[18.8,15.7],[17.3,17.65],[13.6,17.5],[12.8,16.1],[12.8,14.85],[13.25,16.4],[15,17.15],[17.3,16.8],[18.35,14.2],[18,11],[15.2,9.9],[13,10.6]]);
  for(const p of [[13.25,10.1,.45,.62],[15.5,9.8,.45,.52],[18,11,.6,.65],[18.55,13,.55,.5],[18.1,15.1,.7,.62],[17.1,17.1,.55,.44],[14,17.25,.48,.45]])shrub(...p);
  for(const p of [[12.95,15.1,.65],[13.1,16.6,.9],[16,17.2,.75],[18.8,14,.8],[17.1,10.1,.9]])tuft(...p);
  for(const p of [[13.25,10.1,.3],[18.15,15.6,.45],[15.1,17.3,.38]])whiteFlowers(...p);
  for(const p of [[16.9,10.7,.78,.7],[17.65,11.05,.46,.55],[17.1,11.5,.38,.45],[13.55,16.1,.56,.45],[15.3,17.05,.4,.52]])rock(...p);
  surface([[11.4,3.2],[12.6,3.2],[12.6,16.8],[12.411,17.237],[9.2,20.437],[9.2,23.7],[8.55,24.35],[8,24.35],[8,19.74],[11.4,16.54]],.11,M.path);
  box(2.25,.04,1.2,13.3,.11,7.8,M.path,garden);
  plantingBed([[4.55,24.7],[5.6,24.55],[7.25,24.55],[7.65,25.05],[7.2,25.65],[5.65,25.55],[4.6,25.25]]);
  for(const p of [[5.2,24.95,.3,.4],[7.25,25.1,.3,.55],[6.1,25.4,.35,.36]])shrub(...p);
  tuft(4.8,25.1,.6);tuft(7.2,25.6,.65);whiteFlowers(5.7,25.1,.3);rock(6.8,25.6,.38);
  box(3.05,.04,2.4,15.15,.11,7.5,M.path,garden);
  box(2.4,.09,.5,15.15,.59,7.05,timber,garden);for(const x of [14.25,16.05])box(.12,.43,.38,x,.33,7.05,M.dark,garden);
  // One light bamboo screen, away from windows and walking space.
  const bambooMat=new THREE.MeshStandardMaterial({color:'#818c50',roughness:.83});
  for(let i=0;i<15;i++){
    const x=18.25+rand()*.8,z=8.6+rand()*.95,h=2.3+rand()*1.05;
    cylinder(.025,.039,h,x,h/2+.1,z,bambooMat,garden,7);
    for(let y=.5;y<h;y+=.32)cylinder(.035,.035,.018,x,y,z,M.leafDark,garden,7);
    for(let j=0;j<24;j++){const a=rand()*6.28,r=rand()*.55;leaves.push({x:x+Math.cos(a)*r,y:h*.55+rand()*h*.45,z:z+Math.sin(a)*r,s:.3+rand()*.22,a,tint:.24});}
  }
  for(const p of [[20,4.4],[21.6,8],[20.9,16.9],[18.9,18.5],[-22.4,5.7],[-15.6,24.4],[3,28.9]]){
    if(inSite(...p)){shrub(p[0],p[1],.55,.48);tuft(p[0]-.65,p[1]+.1,.7);}
  }
  for(const p of [[19.8,5.7,.8],[19.8,17.8,.65],[-17.7,20.3,.5]])rock(...p);
  // Low groundcover makes each border continuous, with taller clumps above it.
  for(const bed of beds){
    const minX=Math.min(...bed.map(p=>p[0])),maxX=Math.max(...bed.map(p=>p[0])),minZ=Math.min(...bed.map(p=>p[1])),maxZ=Math.max(...bed.map(p=>p[1]));
    for(let i=0;i<700;i++){const x=minX+rand()*(maxX-minX),z=minZ+rand()*(maxZ-minZ);if(contains(bed,x,z))leaves.push({x,y:.17+rand()*.07,z,s:.14+rand()*.12,a:rand()*6.28,tint:.25+rand()*.03});}
  }
  const leafMat=new THREE.MeshStandardMaterial({color:'#849b66',roughness:.84,side:THREE.DoubleSide});
  const leafMesh=new THREE.InstancedMesh(leafGeometry(),leafMat,leaves.length);
  leaves.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(-.3+rand()*.85,p.a,rand()*.5);dummy.scale.setScalar(p.s);dummy.updateMatrix();leafMesh.setMatrixAt(i,dummy.matrix);leafMesh.setColorAt(i,colour.setHSL(p.tint,.22+rand()*.2,.37+rand()*.27));});leafMesh.castShadow=true;leafMesh.receiveShadow=true;garden.add(leafMesh);
  const bladeGeo=new THREE.BufferGeometry();bladeGeo.setAttribute('position',new THREE.Float32BufferAttribute([-.032,0,0,.032,0,0,-.024,.38,.04,.024,.38,.04,0,.74,.27],3));bladeGeo.setIndex([0,1,2,2,1,3,2,3,4]);bladeGeo.computeVertexNormals();
  const bladeMat=new THREE.MeshStandardMaterial({color:'#8f9e67',roughness:.9,side:THREE.DoubleSide});const grasses=new THREE.InstancedMesh(bladeGeo,bladeMat,grass.length);
  grass.forEach((p,i)=>{dummy.position.set(p.x,.15,p.z);dummy.rotation.set(0,p.a,0);dummy.scale.setScalar(p.s);dummy.updateMatrix();grasses.setMatrixAt(i,dummy.matrix);});grasses.receiveShadow=true;garden.add(grasses);
  const petalGeo=new THREE.SphereGeometry(1,5,3),petalMat=new THREE.MeshStandardMaterial({color:'#f0edd6',roughness:.8}),petals=new THREE.InstancedMesh(petalGeo,petalMat,flowers.length*5);
  flowers.forEach((p,i)=>{for(let j=0;j<5;j++){const a=j*6.28/5;dummy.position.set(p.x+Math.sin(a)*p.s*.6,p.y,p.z+Math.cos(a)*p.s*.6);dummy.rotation.set(0,a,0);dummy.scale.set(p.s*.45,p.s*.23,p.s*.68);dummy.updateMatrix();petals.setMatrixAt(i*5+j,dummy.matrix);}});petals.castShadow=true;garden.add(petals);
  // Shielded warm lighting along the garden edges.
  const glow=new THREE.MeshStandardMaterial({color:'#fff0cf',emissive:'#ffc780',emissiveIntensity:.35,roughness:.5}),lamps=[];
  for(const [x,z]of [[-4.05,21.9],[1.55,21.9],[-11.45,22.6],[-11.2,26.4],[12.8,10.4],[12.85,16.8],[16.8,8],[2.4,27.4]]){
    box(.09,.5,.09,x,.37,z,M.dark,garden);box(.17,.035,.17,x,.635,z,M.dark,garden);box(.085,.045,.085,x,.598,z,glow,garden);
    const light=new THREE.PointLight('#ffda9c',0,3.6,2);light.position.set(x,.55,z);garden.add(light);lamps.push(light);
  }
  function setLight(dusk,rain){glow.emissiveIntensity=dusk?2.4:rain?1:.35;lamps.forEach(l=>l.intensity=dusk?3.2:rain?.9:0);}
  function excludesGrass(x,z){return (x>-14.75&&x<-11.05&&z>23&&z<26.6)||(x>-11.4&&x<-10.05&&z>16.6&&z<24.4)||(x>-12.1&&x<8.65&&z>23.15&&z<24.45)||(x>10.1&&x<19.5&&z>3&&z<19.8)||surfaceBounds.some(p=>contains(p,x,z));}
  return {water,garden,setLight,excludesGrass};
}
