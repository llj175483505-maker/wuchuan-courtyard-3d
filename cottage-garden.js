import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';

// A scheme: a domestic west-facing cottage garden within the surveyed boundary.
// Ground surfaces are level at 0.085 m; entrance and parking routes stay unobstructed.
export const gardenFootprints = {
  teaDeck: [-14.8, -11.2, 22.05, 25.45],
  reflectingPool: [-10.55, -4.8, 20.95, 24.2],
  westConnection: [-13.15, -10.1, 18.4, 22.4],
  cottageWalk: [-10.6, -3.8, 12.1, 20.05],
  westFlowerBorder: [-10.02, -8.3, 13.4, 18.8],
  terraceFlowerBorder: [-5.3, -4.05, 14.3, 19.0],
  easternBorder: [5, 9.25, 20.65, 23.85],
  centralTree: [-2.25, 1.05, 21.3, 24.35],
  southernBorder: [-.65, 1.05, 25.1, 30.1],
};

function leafGeometry() {
  const positions = [], indices = [], uvs = [];
  for (const [xx, zz, angle] of [[-.12,.05,-.8],[.12,.12,.8],[-.1,.28,-.7],[.11,.34,.8],[0,.46,0]]) {
    const base = positions.length / 3, c = Math.cos(angle), s = Math.sin(angle);
    for (const [x,y,z] of [[0,0,0],[-.055,.008,.1],[0,0,.25],[.055,.008,.1],[0,.025,.11]]) {
      positions.push(xx + x*c + z*s, y, zz - x*s + z*c);
    }
    uvs.push(.5,0,0,.4,.5,1,1,.4,.5,.5);
    indices.push(base,base+1,base+4,base+1,base+2,base+4,base+2,base+3,base+4,base+3,base,base+4);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

export function createGarden({scene,M,box,cylinder,inSite}) {
  const garden = new THREE.Group(); garden.name = 'A-west-facing-cottage-garden'; scene.add(garden);
  const leaves = [], grasses = [], flowers = [], beds = [], surfaces = [], lamps = [];
  const dummy = new THREE.Object3D(), colour = new THREE.Color();
  let seed = 82119;
  const rand = () => { seed = (seed*1664525 + 1013904223) >>> 0; return seed/4294967296; };
  const stone = M.base.clone(); stone.color.set('#96968a'); stone.roughness = .84;
  const paleStone = M.path.clone(); paleStone.color.set('#dad4c5'); paleStone.roughness = .87;
  const timber = M.woodLight.clone(); timber.color.set('#b8a082'); timber.roughness = .86;
  const cushion = M.fabric.clone(); cushion.color.set('#e2decb');
  const soil = M.soil.clone(); soil.color.set('#676753'); soil.roughness = 1;
  const edging = M.dark.clone(); edging.color.set('#5b6155');
  const glow = new THREE.MeshStandardMaterial({color:'#fff5db',emissive:'#ffd699',emissiveIntensity:.15,roughness:.5});

  function inside(points,x,z) {
    let yes = false;
    for (let i=0,j=points.length-1;i<points.length;j=i++) {
      const [a,b] = points[i], [c,d] = points[j];
      if ((b>z)!==(d>z) && x<(c-a)*(z-b)/(d-b)+a) yes = !yes;
    }
    return yes;
  }
  function blocked(x,z,r=0) {
    return [[-2.4,11.4,2.65,19.95],[-3.8,-1.75,3.8,19],[-11.6,-10.1,3.25,18.8],[-11.6,-3.8,10.5,12.1],[-3.8,4.95,19.3,20.9],[-3.75,-2.25,18.8,19.9],[1.8,3.8,19.1,29],[-8.1,-6.6,12.1,14.9],[-7.65,-6.25,14.9,20.05],[-10.6,-7.4,19,20.05],[-6.7,-3.8,14.65,16],[-20.75,-12.35,9.2,14.7],[-22.15,-12.35,3.2,9.2]].some(([x0,x1,z0,z1])=>x+r>x0&&x-r<x1&&z+r>z0&&z-r<z1);
  }
  function safe(x,z,r=0) {
    for (let i=0;i<12;i++) if (!inSite(x+Math.cos(i*Math.PI/6)*r,z+Math.sin(i*Math.PI/6)*r)) return false;
    return inSite(x,z);
  }
  function shape(points) {
    const result = new THREE.Shape();
    points.forEach(([x,z],i) => i ? result.lineTo(x,-z) : result.moveTo(x,-z));
    result.closePath(); return result;
  }
  function curve(points,y=.12) {
    return new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,y,z)),true,'catmullrom',.16);
  }
  function surface(points,y,material) {
    if (!points.every(([x,z])=>safe(x,z,.025))) throw new Error('A garden surface exceeds the surveyed boundary');
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape(points)),material);
    mesh.rotation.x = -Math.PI/2; mesh.position.y = y; mesh.receiveShadow = true;
    garden.add(mesh); surfaces.push(points); return mesh;
  }
  function bed(points) {
    const outline = curve(points,.11), sample = outline.getPoints(100).map(p=>[p.x,p.z]);
    surface(sample,.094,soil); beds.push(sample);
    const rim = new THREE.Mesh(new THREE.TubeGeometry(outline,100,.027,5,true),edging);
    rim.receiveShadow = true; garden.add(rim); return sample;
  }
  function shrub(x,z,r=.4,h=.4) {
    for (let i=0;i<Math.round(r*410);i++) {
      const a=rand()*Math.PI*2, d=Math.sqrt(rand())*r;
      const xx=x+Math.cos(a)*d, zz=z+Math.sin(a)*d;
      if (!safe(xx,zz,.16)) continue;
      if (blocked(xx,zz,.22)) continue;
      leaves.push({x:xx,y:.17+Math.sqrt(Math.max(0,1-d*d/(r*r)))*h*(.7+rand()*.3),z:zz,s:.23+rand()*.26,a:rand()*6.28,tint:.24+rand()*.055});
    }
  }
  function tuft(x,z,s=.65) {
    if (!safe(x,z,s*.5)||blocked(x,z,s*.5)) return;
    for (let i=0;i<24;i++) {
      const a=rand()*6.28, r=rand()*.12*s;
      grasses.push({x:x+Math.cos(a)*r,z:z+Math.sin(a)*r,s:s*(.75+rand()*.38),a});
    }
  }
  function whiteFlowers(x,z,r=.3,tone=0) {
    shrub(x,z,r,.23);
    for (let i=0;i<17;i++) {
      const a=rand()*6.28,d=Math.sqrt(rand())*r;
      const xx=x+Math.cos(a)*d,zz=z+Math.sin(a)*d;
      if(safe(xx,zz,.1)&&!blocked(xx,zz,.1)) flowers.push({x:xx,y:.34+rand()*.12,z:zz,s:.045+rand()*.024,tone});
    }
  }
  function rock(x,z,s=.34) {
    if (!safe(x,z,s*1.1)) return;
    const geometry = new THREE.IcosahedronGeometry(1,2), p = geometry.attributes.position;
    for(let i=0;i<p.count;i++) {
      const d = 1+.08*Math.sin(p.getX(i)*7+p.getZ(i)*8)+.05*Math.cos(p.getY(i)*11);
      p.setXYZ(i,p.getX(i)*d,p.getY(i)*d,p.getZ(i)*d);
    }
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry,stone); mesh.position.set(x,.16,z);
    mesh.scale.set(s,s*.38,s*.72); mesh.rotation.y = rand()*6.28;
    mesh.castShadow = mesh.receiveShadow = true; garden.add(mesh);
  }
  function branch(a,b,r1,r2) {
    const direction = b.clone().sub(a), mesh = new THREE.Mesh(new THREE.CylinderGeometry(r2,r1,direction.length(),7),M.trunk);
    mesh.position.copy(a).add(b).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
    mesh.castShadow = true; garden.add(mesh);
  }
  function tree(x,z,height,radius) {
    const origin = new THREE.Vector3(x,.11,z), fork = new THREE.Vector3(x+.13,height*.52,z+.07);
    branch(origin,fork,.14,.073);
    const crowns=[];
    for(let i=0;i<12;i++) {
      const a=i*2.399, d=radius*(.3+rand()*.48);
      const end=new THREE.Vector3(x+Math.cos(a)*d,height*(.73+rand()*.2),z+Math.sin(a)*d);
      const elbow=fork.clone().lerp(end,.57);elbow.y+=.13;
      branch(fork,elbow,.041,.025);branch(elbow,end,.025,.012); crowns.push(end);
    }
    for(let i=0;i<2400;i++) {
      const centre=crowns[i%crowns.length],a=rand()*6.28,d=Math.sqrt(rand())*radius*.36;
      const xx=centre.x+Math.cos(a)*d,zz=centre.z+Math.sin(a)*d;
      // A small transparent canopy stays clear of the cottage roof and front door.
      if (!safe(xx,zz,.25)||blocked(xx,zz,.25)) continue;
      leaves.push({x:xx,y:centre.y+(rand()-.5)*height*.23,z:zz,s:.49+rand()*.27,a:rand()*6.28,tint:.25+rand()*.05});
    }
  }

  // Continuous stone circulation: the path connects the villa terrace to the tea deck.
  surface([[-11.6,18.4],[-10.1,18.4],[-10.1,20.1],[-11.1,22.4],[-13.15,22.4],[-13.15,21.1],[-11.6,19.4]],.085,paleStone);
  // Broad flush stone strips meander through the front garden, never crossing the pond.
  surface([[-8.1,12.1],[-6.7,12.1],[-6.7,14.7],[-6.25,16.3],[-6.25,18.6],[-6.6,20.05],[-8.0,20.05],[-7.65,18.45],[-7.65,16.5],[-8.1,14.9]],.085,paleStone);
  surface([[-6.7,14.65],[-3.8,14.65],[-3.8,16.0],[-6.4,16.0]],.085,paleStone);
  surface([[-10.6,19.0],[-7.4,19.0],[-7.4,20.05],[-10.6,20.05]],.085,paleStone);
  for(let z=12.35;z<19.9;z+=.72) {
    const x=z<15 ? -7.4 : z<18.5 ? -6.95 : -7.2;
    box(1.19,.005,.011,x,.088,z,stone,garden);
  }
  box(3.6,.075,3.4,-13,.0475,23.75,paleStone,garden);
  surfaces.push([[-14.8,22.05],[-11.2,22.05],[-11.2,25.45],[-14.8,25.45]]);
  for(let i=0;i<14;i++) box(3.44,.025,.22,-13,.0725,22.18+i*.24,timber,garden);
  // Solid seat backs and generous arm rests; no steps or bridge on the walking route.
  const tea = new THREE.Group();tea.position.set(-13,.085,23.75);garden.add(tea);
  cylinder(.6,.6,.065,0,.66,0,stone,tea,40);
  cylinder(.16,.25,.63,0,.32,0,M.dark,tea,16);
  for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]) {
    const chair = new THREE.Group(); chair.position.set(Math.sin(a)*1.11,0,Math.cos(a)*1.11);chair.rotation.y=a;tea.add(chair);
    box(.61,.07,.64,0,.42,0,timber,chair);box(.54,.09,.55,0,.5,0,cushion,chair);
    for(const x of [-.265,.265])for(const z of [-.26,.26])box(.045,.4,.045,x,.2,z,M.dark,chair);
    box(.59,.37,.065,0,.76,.28,timber,chair);box(.51,.27,.035,0,.75,.24,cushion,chair);
    for(const x of [-.3,.3]) {box(.045,.29,.045,x,.58,.24,M.dark,chair);box(.065,.045,.62,x,.72,0,timber,chair);}
  }
  cylinder(.12,.09,.14,0,.77,0,M.clay,tea,20);
  for(const [x,z]of [[.25,.15],[-.25,.12],[.02,-.26]]) cylinder(.058,.046,.055,x,.72,z,paleStone,tea,16);

  // Low, planted mirror pool. A broad dry margin separates it from every entrance route.
  const pondPoints=[[-10.28,21.71],[-8.9,21.09],[-6.37,21.18],[-4.98,21.85],[-5.2,23.37],[-6.8,24.07],[-9.15,23.91],[-10.36,23]];
  const pondCurve=curve(pondPoints,.19), pondOutline=pondCurve.getPoints(128).map(p=>[p.x,p.z]);
  if (!pondOutline.every(([x,z])=>safe(x,z,.18))) throw new Error('A mirror pool exceeds the surveyed boundary');
  surface(pondOutline,.116,M.water);
  const normalData=new Uint8Array(64*64*4);
  for(let y=0;y<64;y++)for(let x=0;x<64;x++) {
    const i=(y*64+x)*4;normalData[i]=128+Math.sin(x*.25+y*.31)*13;
    normalData[i+1]=128+Math.cos(x*.28-y*.19)*13;normalData[i+2]=252;normalData[i+3]=255;
  }
  const normal = new THREE.DataTexture(normalData,64,64);normal.wrapS=normal.wrapT=THREE.RepeatWrapping;normal.needsUpdate=true;
  const water = new Water(new THREE.ShapeGeometry(shape(pondOutline)),{textureWidth:512,textureHeight:512,waterNormals:normal,waterColor:'#244942',sunColor:'#e8e5d7',sunDirection:new THREE.Vector3(.5,.8,.5),distortionScale:.11,fog:true});
  water.rotation.x=-Math.PI/2;water.position.y=.145;garden.add(water);
  water.material.fragmentShader=water.material.fragmentShader.replace('float rf0 = 0.3;','float rf0 = 0.07;').replace('worldPosition.xz * size','worldPosition.xz * size * 10.0').replace('sunColor * diffuseLight * 0.3','sunColor * diffuseLight * 0.04');
  const pondEdge=new THREE.Mesh(new THREE.TubeGeometry(pondCurve,128,.115,8,true),stone);
  pondEdge.castShadow=pondEdge.receiveShadow=true;garden.add(pondEdge);
  // Fine concentric ripples remain entirely inside the water outline.
  const ripples=[];
  const rippleMaterial=new THREE.MeshBasicMaterial({color:'#b2c2ad',transparent:true,opacity:.12,depthWrite:false,side:THREE.DoubleSide});
  for(let i=0;i<3;i++) {
    const mesh=new THREE.Mesh(new THREE.RingGeometry(.48,.494,56),rippleMaterial.clone());
    mesh.rotation.x=-Math.PI/2;mesh.position.set(-7.85,.151,22.45);garden.add(mesh);ripples.push(mesh);
  }

  bed([[-11.05,23.8],[-9.5,24.2],[-7.45,24.25],[-5.85,23.85],[-5.35,24.25],[-6.95,24.71],[-9.3,24.69],[-11.05,24.27]]);
  bed([[-9.95,20.47],[-9.2,20.39],[-7,20.43],[-5.25,20.6],[-4.62,21.03],[-5.2,21.18],[-7.4,20.71],[-9.2,20.73],[-9.96,21.06]]);
  bed([[-15.2,20.25],[-13.9,20.3],[-13.55,20.9],[-14.13,21.7],[-15.52,22.12],[-16.05,21.38]]);
  // Low flower borders leave views between the cottage, lawn and southern tea court.
  bed([[5.05,21.52],[6.7,21.52],[8.17,21.05],[9.1,21.7],[8.82,23.1],[7.35,23.65],[5.88,23.38],[5.1,22.1]]);
  bed([[-1.82,21.35],[-.42,21.35],[.9,21.45],[1.07,23.55],[.34,24.25],[-1.47,24.12],[-2.02,22.7]]);
  bed([[-.34,25.17],[.88,25.3],[1.02,27.45],[.78,29.9],[.15,30.08],[-.42,28.55],[-.65,26.65]]);
  bed([[-15.28,23.19],[-15.06,23.73],[-15.04,25.45],[-14.73,25.85],[-15.12,26.04],[-15.56,25.27],[-15.82,24.28]]);
  for(const p of [[-9.7,20.46,.37,.46],[-6.5,20.45,.4,.43],[-5.04,20.88,.25,.35],[-10.1,24.44,.32,.4],[-8.3,24.43,.4,.4],[-6.3,24.36,.27,.3],[-15.22,20.77,.44,.48],[-15.18,25.48,.25,.4],[5.58,21.97,.43,.52],[7.58,23.15,.48,.47],[8.57,21.79,.3,.48],[-1.35,23.69,.36,.4],[.58,23.86,.3,.39],[.53,26.2,.32,.37],[.18,29.43,.25,.32]]) shrub(...p);
  for(const p of [[-9.85,20.55,.45],[-7.78,20.48,.64],[-5.52,24.18,.5],[-9.06,24.44,.5],[-15.03,21.47,.66],[-15.43,24.74,.49],[5.49,21.80,.6],[6.12,23.13,.65],[8.56,22.77,.58],[-1.36,21.48,.6],[.68,22.6,.62],[.57,27.3,.67],[-.15,28.35,.57]]) tuft(...p);
  for(const p of [[-6.74,20.52,.22],[-9.28,24.44,.2],[-15.44,21.33,.25],[5.71,22.52,.26],[8.4,22.9,.22],[.24,24.05,.22],[.41,28.48,.23]]) whiteFlowers(...p);
  for(const p of [[-6,23.72,.29],[-10.02,21.14,.24],[-15.34,21.6,.29],[5.8,21.81,.28],[8.48,22.87,.3],[-1.53,23.73,.29],[.43,29.52,.22]]) rock(...p);
  tree(-14.85,20.9,3.5,1.15);
  tree(-.6,22.7,4.8,1.4);
  tree(7.2,21.9,3.7,1.05);
  tree(-9.0,17.25,4.2,1.05);

  // Soft cottage planting: violet, white and blush pink instead of clipped topiary.
  bed([[-9.9,13.65],[-8.86,13.42],[-8.64,14.25],[-8.43,15.7],[-8.53,17.75],[-8.45,18.0],[-8.91,18.7],[-9.92,18.4],[-9.89,16.5]]);
  bed([[-5.23,16.45],[-4.18,16.48],[-4.14,18.73],[-4.69,18.96],[-5.21,18.31]]);
  bed([[-5.2,12.62],[-4.18,12.61],[-4.16,14.05],[-4.75,14.18],[-5.2,13.8]]);
  bed([[-8.8,7.2],[-7.7,6.88],[-6.56,7.26],[-6.29,8.12],[-6.73,9.1],[-8.28,9.25],[-8.94,8.5]]);
  for(const p of [[-9.36,14.1,.38,.52],[-9.12,16.35,.43,.43],[-9.27,18.0,.42,.53],[-4.69,17.3,.35,.6],[-4.62,13.2,.3,.5],[-7.43,7.57,.48,.53],[-8.23,8.39,.36,.4]]) shrub(...p);
  for(const p of [[-9.45,15.35,.32,1],[-9.38,17.82,.36,0],[-8.87,18.05,.3,2],[-4.62,18.3,.33,1],[-4.53,13.8,.26,2],[-7.19,8.67,.34,0],[-8.18,7.63,.31,2]]) whiteFlowers(...p);
  for(const p of [[-9.03,13.88,.46],[-8.8,16.12,.52],[-9.52,17.9,.55],[-4.59,16.72,.43],[-4.44,13.0,.47],[-6.93,7.53,.55]]) tuft(...p);
  for(const p of [[-9.15,18.35,.29],[-4.61,18.85,.25],[-8.54,8.94,.24]]) rock(...p);
  // A compact backed bench faces the shaded front lawn, well south of the front door.
  box(.5,.08,1.85,-5.55,.5,18.05,timber,garden);
  box(.06,.38,1.85,-5.28,.73,18.05,timber,garden);
  for(const z of [17.32,18.78]) {box(.38,.37,.09,-5.55,.29,z,edging,garden);box(.54,.06,.065,-5.55,.7,z,timber,garden);}

  // Low contemporary bench facing the water; softened ends leave the middle path clear.
  box(.56,.09,2.6,-3.5,.49,22.3,timber,garden);
  for(const z of [21.35,23.25])box(.38,.32,.12,-3.5,.285,z,edging,garden);
  box(.55,.035,2.6,-3.5,.34,22.3,stone,garden);

  // Dense, small instanced leaves give the planting volume without large polygonal balls.
  for(const outline of beds) {
    const xs=outline.map(p=>p[0]),zs=outline.map(p=>p[1]);
    const x0=Math.min(...xs),x1=Math.max(...xs),z0=Math.min(...zs),z1=Math.max(...zs);
    for(let i=0;i<650;i++) {
      const x=x0+rand()*(x1-x0),z=z0+rand()*(z1-z0);
      if(inside(outline,x,z)&&safe(x,z,.15)&&!blocked(x,z,.1)) leaves.push({x,y:.145+rand()*.07,z,s:.14+rand()*.11,a:rand()*6.28,tint:.245+rand()*.045});
    }
  }
  const leafMaterial=new THREE.MeshStandardMaterial({color:'#8fa473',roughness:.91,side:THREE.DoubleSide});
  const leafMesh=new THREE.InstancedMesh(leafGeometry(),leafMaterial,leaves.length);
  leaves.forEach((p,i)=> {
    dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(-.65+rand()*1.8,p.a,rand()*.6);
    dummy.scale.setScalar(p.s);dummy.updateMatrix();leafMesh.setMatrixAt(i,dummy.matrix);
    leafMesh.setColorAt(i,colour.setHSL(p.tint,.2+rand()*.23,.38+rand()*.24));
  });
  leafMesh.castShadow=leafMesh.receiveShadow=true;leafMesh.computeBoundingSphere();garden.add(leafMesh);
  const bladeGeometry=new THREE.BufferGeometry();
  bladeGeometry.setAttribute('position',new THREE.Float32BufferAttribute([-.03,0,0,.03,0,0,-.025,.34,.035,.025,.34,.035,0,.67,.25],3));
  bladeGeometry.setIndex([0,1,2,2,1,3,2,3,4]);bladeGeometry.computeVertexNormals();
  const grassMesh=new THREE.InstancedMesh(bladeGeometry,new THREE.MeshStandardMaterial({color:'#93a075',roughness:1,side:THREE.DoubleSide}),grasses.length);
  grasses.forEach((p,i)=> {dummy.position.set(p.x,.14,p.z);dummy.rotation.set(0,p.a,0);dummy.scale.setScalar(p.s);dummy.updateMatrix();grassMesh.setMatrixAt(i,dummy.matrix);});
  grassMesh.receiveShadow=true;grassMesh.computeBoundingSphere();garden.add(grassMesh);
  const petals=new THREE.InstancedMesh(new THREE.SphereGeometry(1,5,3),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.94}),flowers.length*5);
  const flowerColours=['#f6f0df','#a48dc9','#d590b1'];
  flowers.forEach((p,i)=> {for(let j=0;j<5;j++) {
    const a=j*6.28/5;dummy.position.set(p.x+Math.sin(a)*p.s*.6,p.y,p.z+Math.cos(a)*p.s*.6);
    dummy.rotation.set(0,a,0);dummy.scale.set(p.s*.48,p.s*.23,p.s*.7);dummy.updateMatrix();petals.setMatrixAt(i*5+j,dummy.matrix);petals.setColorAt(i*5+j,colour.set(flowerColours[p.tone||0]));
  }});petals.computeBoundingSphere();garden.add(petals);

  for(const [x,z]of [[-8.45,13.2],[-8.42,18.65],[-5.72,16.32],[-6.07,8.8],[-9.82,20.15],[-14.8,22],[-11.15,25.2],[-4.55,21.4],[1.33,24.1],[4.22,23.9],[4.18,27.6],[4.95,21.67]]) {
    if(!safe(x,z,.18)||blocked(x,z,.18))continue;
    box(.09,.42,.09,x,.33,z,edging,garden);box(.16,.03,.16,x,.555,z,edging,garden);box(.075,.04,.075,x,.52,z,glow,garden);
    const light=new THREE.PointLight('#ffdeaa',0,3.4,2);light.position.set(x,.53,z);garden.add(light);lamps.push(light);
  }
  const treeLight=new THREE.SpotLight('#ffe6bd',0,7,Math.PI/5,.9,1.7);
  treeLight.position.set(-1.6,.2,23.4);treeLight.target.position.set(-.6,3.5,22.7);garden.add(treeLight,treeLight.target);
  function setLight(dusk,rain=false) {
    glow.emissiveIntensity=dusk?2.25:rain?.55:.15;
    lamps.forEach(light=>{light.intensity=dusk?2.1:rain?.35:0;});
    treeLight.intensity=dusk?12:0;
  }
  let elapsed=0;
  function update(dt) {
    elapsed+=Math.max(0,Math.min(dt,.1));
    const t=elapsed;
    water.material.uniforms.time.value=t*.32;
    ripples.forEach((mesh,i)=> {const phase=(t*.16+i/3)%1;mesh.scale.setScalar(.45+phase*1.85);mesh.material.opacity=.14*(1-phase);});
  }
  function excludesGrass(x,z) {return surfaces.some(outline=>inside(outline,x,z));}
  return {garden,water,setLight,update,excludesGrass,footprints:gardenFootprints};
}
