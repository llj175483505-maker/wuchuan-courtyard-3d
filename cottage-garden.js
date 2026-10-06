import * as THREE from 'three';
import { createRearGarden, rearGardenPlan } from './rear-garden.js?v=a6-pond-pavilion';

// A scheme: a domestic west-facing cottage garden within the surveyed boundary.
// Ground surfaces are level at 0.085 m; entrance and parking routes stay unobstructed.
export const gardenFootprints = {
  rearGarden: rearGardenPlan,
  teaDeck: [-2.5, 2.5, 21.2, 24.2],
  vegetableBeds: [[-2.1,-.9,25.5,27.5],[.3,1.5,25.5,27.5],[2.7,3.9,25.5,27.5]],
  vegetableNorthWalk: [-2.1,5.3,24.3,25.5],
  vegetableSouthWalk: [-2.1,5.3,27.5,28.7],
  familyGardenWalk: [4.1,5.3,20.7,28.7],
  chickenRun: [6.3,9.5,21,23.5],
  chickenCoop: [8.195,9.445,21.25,22.87],
  chickenAccess: [7.05,8.25,20.7,21.08],
  teaAccess: [-1.2,0,20.9,21.3],
  westFlowerBorder: [-9.4,-5,4.5,9.65]
};
export const gardenAnchors = {
  rearGarden: rearGardenPlan.anchor, tea: [0,.8,22.7], vegetables: [1,.5,26.6], chickens: [7.9,.9,22.25],
  garden: [1.8,.5,23.1]
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
  const clearAreas = [
    [-2.4,11.4,2.65,19.95], [-3.8,-1.75,3.8,19], [-11.6,-10.1,3.25,14.5],
    [-11.6,-3.8,10.5,12.1], [-3.8,11.4,19.3,20.9], [-3.75,-2.25,18.8,19.9],
    [-20.75,-12.35,9.2,14.7], [-22.15,-12.35,3.2,9.2],
    [-15.7,-4.7,15.5,24.5],
    [-3.8,12.8,1.55,2.8], [-3.8,-2.25,2.8,3.9],
    [11.4,12.8,1.5,19.3], [12.8,14,7.8,9.2], [10.7,12.8,18.7,20.3],
    [-2.5,2.5,21.2,24.2], [-1.2,0,20.9,21.3],
    [4.1,5.3,20.7,28.7], [-2.1,5.3,24.3,25.5], [-2.1,5.3,27.5,28.7],
    [-.9,.3,25.5,27.5], [1.5,2.7,25.5,27.5], [3.9,4.1,25.5,27.5],
    [6.3,9.5,21,23.5], [7.05,8.25,20.7,21.08]
  ];
  function blocked(x,z,r=0) {
    return clearAreas.some(([x0,x1,z0,z1])=>x+r>x0&&x-r<x1&&z+r>z0&&z-r<z1);
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

  // A compact southern tea terrace and fully connected kitchen-garden paths.
  function rectSurface(rect,y=.085,material=paleStone) {
    const [x0,x1,z0,z1]=rect;
    return surface([[x0,z0],[x1,z0],[x1,z1],[x0,z1]],y,material);
  }
  for(const key of ['teaDeck','teaAccess','vegetableNorthWalk','vegetableSouthWalk','familyGardenWalk','chickenAccess']) rectSurface(gardenFootprints[key]);
  for(const rect of [[-.9,.3,25.5,27.5],[1.5,2.7,25.5,27.5],[3.9,4.1,25.5,27.5]]) rectSurface(rect);
  // Terrace joins the eastern garden walk across a 1.2 m flush link.
  rectSurface([2.5,4.1,22.95,24.15]);
  clearAreas.push([2.5,4.1,22.95,24.15]);
  for(let i=0;i<18;i++) box(4.82,.014,.15,0,.093,21.3+i*.16,timber,garden);
  const tea=new THREE.Group();tea.name='family-tea-terrace';tea.position.set(0,.085,22.65);garden.add(tea);
  cylinder(.59,.59,.065,0,.66,0,stone,tea,40);cylinder(.16,.25,.63,0,.32,0,M.dark,tea,16);
  for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]) {
    const chair=new THREE.Group();chair.position.set(Math.sin(a)*1.13,0,Math.cos(a)*1.05);chair.rotation.y=a;tea.add(chair);
    box(.61,.07,.64,0,.42,0,timber,chair);box(.54,.09,.55,0,.5,0,cushion,chair);
    for(const x of [-.265,.265])for(const z of [-.26,.26])box(.045,.4,.045,x,.2,z,M.dark,chair);
    box(.59,.37,.065,0,.76,.28,timber,chair);box(.51,.27,.035,0,.75,.24,cushion,chair);
    for(const x of [-.3,.3]) {box(.045,.29,.045,x,.58,.24,M.dark,chair);box(.065,.045,.62,x,.72,0,timber,chair);}
  }
  cylinder(.12,.09,.14,0,.77,0,M.clay,tea,20);
  for(const [x,z]of [[.25,.15],[-.25,.12],[.02,-.26]])cylinder(.058,.046,.055,x,.72,z,paleStone,tea,16);

  // Reachable 1.2 m raised beds, with 1.2 m aisles and planted crop rows.
  const cropMaterial=new THREE.MeshStandardMaterial({color:'#689044',roughness:.94,side:THREE.DoubleSide});
  const cropLeaf=leafGeometry();
  const cropData=[];
  gardenFootprints.vegetableBeds.forEach(([x0,x1,z0,z1],index)=> {
    const x=(x0+x1)/2,z=(z0+z1)/2;
    rectSurface([x0,x1,z0,z1],.25,soil);
    box(x1-x0,.25,.07,x,.18,z0+.035,timber,garden);box(x1-x0,.25,.07,x,.18,z1-.035,timber,garden);
    box(.07,.25,z1-z0,x0+.035,.18,z,timber,garden);box(.07,.25,z1-z0,x1-.035,.18,z,timber,garden);
    for(let row=0;row<3;row++)for(let col=0;col<6;col++) {
      const xx=x0+.24+row*.36,zz=z0+.2+col*.31;
      for(let leaf=0;leaf<6;leaf++)cropData.push({x:xx,y:.27,z:zz,a:leaf*Math.PI/3,s:index===1?.38:.48,t:index});
      if(index===1) {
        cylinder(.012,.014,.72,xx,.61,zz,M.wood,garden,5);
        for(let fruit=0;fruit<3;fruit++) {
          const tomato=new THREE.Mesh(new THREE.SphereGeometry(.046,7,5),new THREE.MeshStandardMaterial({color:fruit===0?'#bf6241':'#bd9f43',roughness:.7}));
          tomato.position.set(xx+.055*Math.cos(fruit*2.1),.51+fruit*.10,zz+.055*Math.sin(fruit*2.1));garden.add(tomato);
        }
      }
    }
    const marker=box(.23,.13,.018,x0+.26,.55,z0+.18,paleStone,garden);marker.rotation.x=-.17;
    cylinder(.012,.012,.29,x0+.26,.36,z0+.18,timber,garden,6);
  });
  const cropMesh=new THREE.InstancedMesh(cropLeaf,cropMaterial,cropData.length);
  cropData.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(-.5,p.a,.15);dummy.scale.setScalar(p.s);dummy.updateMatrix();cropMesh.setMatrixAt(i,dummy.matrix);cropMesh.setColorAt(i,colour.setHSL(.235+p.t*.035,.35,.31+rand()*.15));});
  cropMesh.castShadow=cropMesh.receiveShadow=true;cropMesh.computeBoundingSphere();garden.add(cropMesh);

  // A small 8 m² enclosed poultry corner. The north gate opens onto the service walk.
  const run=gardenFootprints.chickenRun;
  rectSurface(run,.088,soil);
  const wireMaterial=new THREE.LineBasicMaterial({color:'#637568',transparent:true,opacity:.57});
  function meshPanel(x0,z0,x1,z1,y0=.12,y1=1.78) {
    const length=Math.hypot(x1-x0,z1-z0),points=[];
    for(let u=0;u<=length+.001;u+=.115) {
      const t=Math.min(u/length,1),x=x0+(x1-x0)*t,z=z0+(z1-z0)*t;
      points.push(x,y0,z,x,y1,z);
    }
    for(let y=y0;y<=y1+.001;y+=.115)points.push(x0,y,z0,x1,y,z1);
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
    const mesh=new THREE.LineSegments(geometry,wireMaterial);garden.add(mesh);
  }
  function fenceRail(x0,z0,x1,z1,y) {
    const length=Math.hypot(x1-x0,z1-z0),rail=box(length,.055,.055,(x0+x1)/2,y,(z0+z1)/2,timber,garden);
    rail.rotation.y=-Math.atan2(z1-z0,x1-x0);
  }
  for(const [x,z]of [[6.3,21],[7.05,21],[8.25,21],[9.5,21],[9.5,23.5],[6.3,23.5]])box(.065,1.75,.065,x,.96,z,timber,garden);
  for(const seg of [[6.3,21,7.05,21],[8.25,21,9.5,21],[9.5,21,9.5,23.5],[9.5,23.5,6.3,23.5],[6.3,23.5,6.3,21]]) {
    meshPanel(...seg);fenceRail(...seg,.17);fenceRail(...seg,1.78);
  }
  // Closed, visually distinct 1.2 m service gate with latch and hinges.
  meshPanel(7.08,21,8.22,21,.15,1.72);
  for(const y of [.17,1.71])box(1.14,.065,.065,7.65,y,21,timber,garden);
  for(const x of [7.08,8.22])box(.065,1.55,.065,x,.94,21,timber,garden);
  box(.13,.045,.08,8.15,1.08,20.96,M.dark,garden);
  // Overhead mesh keeps the run fully enclosed while retaining daylight.
  const roofWire=[];
  for(let x=6.3;x<=9.5;x+=.14)roofWire.push(x,1.79,21,x,1.79,23.5);
  for(let z=21;z<=23.5;z+=.14)roofWire.push(6.3,1.79,z,9.5,1.79,z);
  const topGeometry=new THREE.BufferGeometry();topGeometry.setAttribute('position',new THREE.Float32BufferAttribute(roofWire,3));garden.add(new THREE.LineSegments(topGeometry,wireMaterial));
  // Timber coop set inside the run; eaves never project outside the enclosure.
  box(1.04,1.05,1.36,8.82,.91,22.06,timber,garden);
  for(const x of [8.35,9.29])for(const z of [21.45,22.67])box(.085,.4,.085,x,.29,z,M.dark,garden);
  for(let z=21.46;z<22.7;z+=.14)box(.018,.95,.017,8.291,.94,z,M.wood,garden);
  const roofLeft=box(.67,.065,1.62,8.53,1.51,22.06,M.roof,garden);roofLeft.rotation.z=.23;
  const roofRight=box(.67,.065,1.62,9.11,1.51,22.06,M.roof,garden);roofRight.rotation.z=-.23;
  box(.028,.34,.34,8.286,.71,22.02,M.dark,garden);
  const ramp=box(.67,.045,.3,7.965,.36,22.02,timber,garden);ramp.rotation.z=.37;
  for(let x=7.69;x<8.24;x+=.12) {const slat=box(.035,.025,.31,x,.255+(x-7.69)*.38,22.02,M.wood,garden);slat.rotation.z=.37;}
  box(.028,.24,.34,8.287,1.22,21.54,M.dark,garden);
  for(const z of [21.42,21.50,21.58,21.66])box(.035,.24,.018,8.27,1.22,z,timber,garden);
  const feeder=M.clay.clone();feeder.color.set('#bf8b65');
  cylinder(.14,.19,.23,6.7,.235,21.45,feeder,garden,20);cylinder(.22,.22,.055,6.7,.145,21.45,M.dark,garden,24);
  cylinder(.13,.16,.24,6.73,.255,23.01,M.white,garden,20);cylinder(.23,.23,.055,6.73,.145,23.01,M.water,garden,24);
  function hen(x,z,a,tone) {
    const h=new THREE.Group();h.position.set(x,.105,z);h.rotation.y=a;garden.add(h);
    const feathers=new THREE.MeshStandardMaterial({color:tone,roughness:.98});
    function egg(rx,ry,rz,xx,yy,zz,mat) {const m=new THREE.Mesh(new THREE.SphereGeometry(1,9,6),mat);m.scale.set(rx,ry,rz);m.position.set(xx,yy,zz);m.castShadow=true;h.add(m);return m;}
    egg(.115,.13,.185,0,.27,0,feathers);egg(.063,.10,.065,0,.4,.14,feathers);
    egg(.03,.035,.055,0,.49,.15,feeder);egg(.042,.035,.035,0,.395,.208,feeder);
    for(const x of [-.045,.045]) {cylinder(.009,.009,.14,x,.1,0,feeder,h,5);box(.027,.013,.074,x,.028,.02,feeder,h);egg(.008,.008,.008,x*.95,.425,.184,M.black);}
    const tail=egg(.07,.12,.055,0,.32,-.17,feathers);tail.rotation.x=-.55;
  }
  hen(7.15,22.15,.65,'#eee6d8');hen(7.57,22.96,2.2,'#9c6c42');hen(8.01,21.54,3.8,'#d3b286');

  const rearGarden=createRearGarden({parent:garden,M,box,cylinder,inSite});

  // Flower garden kept clear of sports, entrances and farm circulation.
  bed([[-9.45,5.1],[-8.9,4.67],[-6.4,4.75],[-5.4,5.5],[-5.2,6.5],[-6.4,6.72],[-8.65,6.5],[-9.42,6.1]]);
  bed([[-9.1,7.4],[-8,7.05],[-6.1,7.3],[-5.14,8.45],[-5.6,9.55],[-8.8,9.35]]);
  bed([[-9.7,12.52],[-8.1,12.5],[-6.15,12.85],[-5.18,13.68],[-5.4,14.5],[-7.7,14.51],[-9.6,14.2]]);
  bed([[-4.25,21.35],[-3.0,21.2],[-2.85,22.5],[-2.92,23.99],[-3.61,24.1],[-4.23,22.9]]);
  bed([[2.65,21.25],[3.63,21.2],[3.76,22.15],[3.52,22.74],[2.78,22.72],[2.66,22.02]]);
  bed([[5.7,21.15],[6.01,21.25],[6.01,23.9],[5.65,24.03],[5.61,22.65]]);
  bed([[-1.17,29.32],[.95,29.18],[2.46,29.57],[2.79,30.6],[1.14,31.48],[-.61,30.79]]);
  for(const p of [[-8.85,5.42,.36,.55],[-6.01,5.74,.46,.55],[-8.13,8.77,.42,.48],[-5.95,8.55,.35,.47],[-9.01,13.32,.43,.49],[-6.02,13.72,.4,.52],[-3.69,21.86,.42,.65],[-3.42,23.48,.36,.56],[3.19,21.57,.3,.42],[5.85,21.7,.14,.9],[5.85,22.4,.14,.93],[5.84,23.25,.14,.88],[-.57,29.84,.4,.5],[1.89,30.51,.4,.4]])shrub(...p);
  for(const p of [[-8.39,5.7,.38,1],[-7.05,5.38,.34,2],[-8.67,8.11,.35,0],[-6.58,9.03,.35,1],[-8.09,13.23,.35,2],[-6.92,14.12,.28,0],[-3.65,23.8,.27,1],[3.23,22.26,.22,2],[-.3,29.75,.33,1],[2.2,30.19,.31,0]])whiteFlowers(...p);
  for(const p of [[-9.01,5.74,.47],[-6.4,6.22,.5],[-7.37,8.83,.54],[-8.74,13.97,.54],[-5.89,13.44,.48],[-3.23,21.63,.45],[3.15,22.53,.37],[1.1,30.82,.59]])tuft(...p);
  for(const p of [[-8.7,6.12,.26],[-5.78,8.62,.25],[-6.06,14.09,.29],[-3.39,23.87,.23],[.87,30.79,.24]])rock(...p);
  tree(-7.95,5.66,3.6,1.02);
  tree(-3.46,22.4,3.85,.82);
  tree(.71,30.14,4.2,.95);
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

  for(const [x,z]of [[-9.35,6.87],[-5.05,9.68],[-6.01,14.68],[-3.95,21.02],[3.65,21.02],[3.71,24.17],[5.68,25.16],[5.63,27.5],[-2.42,27.12],[6.05,20.93]]) {
    if(!safe(x,z,.18)||blocked(x,z,.18))continue;
    box(.09,.42,.09,x,.33,z,edging,garden);box(.16,.03,.16,x,.555,z,edging,garden);box(.075,.04,.075,x,.52,z,glow,garden);
    const light=new THREE.PointLight('#ffdeaa',0,3.4,2);light.position.set(x,.53,z);garden.add(light);lamps.push(light);
  }
  const treeLight=new THREE.SpotLight('#ffe6bd',0,7,Math.PI/5,.9,1.7);
  treeLight.position.set(-3.96,.2,23.4);treeLight.target.position.set(-3.46,3.1,22.4);garden.add(treeLight,treeLight.target);
  function setLight(dusk,rain=false) {
    glow.emissiveIntensity=dusk?2.25:rain?.55:.15;
    lamps.forEach(light=>{light.intensity=dusk?2.1:rain?.35:0;});
    treeLight.intensity=dusk?12:0;
    rearGarden.setLight(dusk,rain);
  }
  function update(dt) { rearGarden.update(dt); }
  function excludesGrass(x,z) {return rearGarden.excludesGrass(x,z)||surfaces.some(outline=>inside(outline,x,z));}
  return {garden,setLight,update,excludesGrass,footprints:gardenFootprints,anchors:gardenAnchors};
}
