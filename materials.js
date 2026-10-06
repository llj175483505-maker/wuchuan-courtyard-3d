import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

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
