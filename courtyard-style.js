import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { timberColumn, galleryCanopy, repeatedBeams } from './architecture-kit.js';
import { siteData } from './site-data.js';

export function enclosedCourtyard({scene,M,box,cylinder,openingWall,upperGroup,landscape}){
  const wingRoofs=new THREE.Group();scene.add(wingRoofs);
  const galleryRoofs=new THREE.Group();scene.add(galleryRoofs);
  const roofs=[];const dummy=new THREE.Object3D();
  function wingRoof(x,z){
    const group=new THREE.Group();group.position.set(x,0,z);wingRoofs.add(group);
    const positions=[-2.45,3.58,-3.98,0,4.22,-3.98,2.45,3.58,-3.98,-2.45,3.58,4.45,0,4.22,4.45,2.45,3.58,4.45];
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex([0,3,1,1,3,4,1,4,2,2,4,5]);geo.computeVertexNormals();const roof=new THREE.Mesh(geo,M.roof);roof.castShadow=true;roof.receiveShadow=true;group.add(roof);
    const tg=new THREE.CylinderGeometry(.07,.085,.31,8,1,true,0,Math.PI);tg.rotateX(Math.PI/2);const tiles=new THREE.InstancedMesh(tg,M.roof,18*45);
    for(let i=0;i<18;i++)for(let j=0;j<45;j++){const xx=-2.42+i*.285;dummy.position.set(xx,3.62+(1-Math.abs(xx)/2.45)*.64,-3.92+j*.186);dummy.rotation.set(0,Math.PI/2,xx<0?.25:-.25);dummy.updateMatrix();tiles.setMatrixAt(i*45+j,dummy.matrix);}tiles.castShadow=true;tiles.receiveShadow=true;group.add(tiles);
    for(const xx of [-2.37,2.37]){
      box(.15,.22,8.43,xx,3.49,.235,M.timber,group);
      box(.155,.03,8.43,xx,3.39,.235,M.bronze,group);
      box(.36,.04,8.23,xx<0?-2.20:2.20,3.48,.205,M.soffit,group);
      const rafters=[];for(let zz=-3.92;zz<4.3;zz+=.28)rafters.push([xx<0?-2.20:2.20,3.465,zz]);
      repeatedBeams(.4,.07,.065,rafters,M.soffit,group);
      box(.022,.016,8.12,xx<0?-2.12:2.12,3.425,.17,M.warmGlow,group);
    }
    for(const zz of [-3.98,3.88]){const face=new THREE.BufferGeometry();face.setAttribute('position',new THREE.Float32BufferAttribute([-2,3.4,zz,2,3.4,zz,0,4.1,zz],3));face.computeVertexNormals();const material=M.wall.clone();material.side=THREE.DoubleSide;const triangle=new THREE.Mesh(face,material);group.add(triangle);}
    const ridge=cylinder(.09,.09,8.43,0,4.28,.235,M.roofEdge,group,12);ridge.rotation.x=Math.PI/2;
  }
  for(const [x,inner,outer,galleryX,postX] of [[-8,-6.12,-9.88,-5.1,-4.35],[5.5,3.62,7.38,2.6,1.85]]){
    const z=19,g=new THREE.Group();scene.add(g);
    box(4,.18,8,x,.13,z,M.base,g);box(3.52,.08,7.76,x,.26,z,M.path,g);
    for(const xx of [inner,outer]){
      const wall=new THREE.Group();wall.position.set(xx,0,z);wall.rotation.y=Math.PI/2;
      openingWall(8,1.88,0,[{x:-1.7,w:2.25,sill:.08,height:2.48},{x:1.6,w:2.05,sill:.65,height:1.91}],wall);g.add(wall);
    }
    const south=new THREE.Group();south.position.x=x;g.add(south);
    openingWall(4,1.88,22.88,[{x:0,w:1.8,sill:.85,height:1.65}],south);
    // Main-house south wall is shared. Only the west wing's exposed north tail is closed.
    if(x<0)box(1.2,3.12,.24,-9.4,1.88,15.12,M.facade,g);
    wingRoof(x,z);
    box(1.5,.12,8,galleryX,.16,19,M.paving,g);
    galleryCanopy(1.9,5.45,galleryX,20.275,M,box,galleryRoofs);
    for(const zz of [16.3,19.15,22.7])timberColumn(postX,zz,M,box,g);
    for(const xx of [x-2.025,x+2.025])box(.075,.30,8,xx,.475,z,M.cutStone,g);
    box(4.08,.30,.08,x,.475,23.025,M.cutStone,g);
  }
  const cx=siteData.design.courtyardCenterX;
  for(const x of [cx-2.49,cx+2.49])box(.12,3.12,.20,x,5.18,15.03,M.timber,upperGroup);
  for(const x of [cx-.8,cx+.8])box(.035,3.12,.08,x,5.18,14.96,M.dark,upperGroup);
  const curtain=M.fabric.clone();curtain.color.set('#d8d6c8');
  for(const x of [cx-2.12,cx+2.12])box(.5,3.05,.05,x,5.18,14.68,curtain,upperGroup);
  for(const edge of [-8.4,10.5])for(let i=0;i<6;i++)box(.045,2.9,.045,edge+i*.07,5.18,15.03,M.timber,upperGroup);

  // Wet stone blends its real texture with the reflected courtyard.
  const shader=THREE.UniformsUtils.clone(Reflector.ReflectorShader.uniforms);
  shader.stoneMap={value:M.paving.map};
  const wetShader={uniforms:shader,
    vertexShader:Reflector.ReflectorShader.vertexShader.replace('varying vec4 vUv;','varying vec4 vUv; varying vec2 stoneUv;').replace('vUv = textureMatrix','stoneUv = uv; vUv = textureMatrix'),
    fragmentShader:Reflector.ReflectorShader.fragmentShader.replace('varying vec4 vUv;','varying vec4 vUv; varying vec2 stoneUv; uniform sampler2D stoneMap;').replace('vec4( blendOverlay( base.rgb, color ), 1.0 )','vec4( mix(texture2D(stoneMap,stoneUv*vec2(1.82,3.38)).rgb*.28,base.rgb,.32),1.0 )')};
  const wet=new Reflector(new THREE.PlaneGeometry(5.6,4.86),{color:'#62696a',textureWidth:innerWidth<640?256:768,textureHeight:innerWidth<640?256:768,clipBias:.003,shader:wetShader,multisample:0});
  wet.rotation.x=-Math.PI/2;wet.position.set(cx,.122,20);scene.add(wet);
  // Reflection passes cannot recursively render each other.
  const beforeWet=wet.onBeforeRender;wet.onBeforeRender=function(...args){const v=landscape.water.visible;landscape.water.visible=false;beforeWet.apply(this,args);landscape.water.visible=v;};
  const beforeWater=landscape.water.onBeforeRender;landscape.water.onBeforeRender=function(...args){const v=wet.visible;wet.visible=false;beforeWater.apply(this,args);wet.visible=v;};

  const positions=new Float32Array(1800*6);let seed=18;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<1800;i++){const at=i*6,x=(rand()-.5)*44,y=rand()*16,z=rand()*34;positions.set([x,y,z,x+.025,y-.24,z+.015],at);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const rain=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:'#c1d1d7',transparent:true,opacity:.20,depthWrite:false}));scene.add(rain);
  function update(dt){if(!rain.visible)return;for(let i=0;i<positions.length;i+=6){positions[i+1]-=dt*7;positions[i+4]-=dt*7;if(positions[i+1]<0){positions[i+1]+=16;positions[i+4]+=16;}}geometry.attributes.position.needsUpdate=true;}
  function weather(active){rain.visible=active;wet.visible=active;}
  return {wingRoofs,galleryRoofs,wet,rain,update,weather};
}
