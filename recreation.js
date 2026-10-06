import * as THREE from 'three';

// Dimensions are proposed design dimensions in metres. The basketball area is
// deliberately a domestic shooting area, not a regulation half court.
export const recreationFootprints = {
  courtBuffer: [-15.7,-4.7,15.5,24.5],
  courtPlaying: [-14.2,-6.2,17,23],
  courtEntrance: [-5.1,-4.7,19.3,20.7]
};

export function createRecreation({scene,M,box,cylinder,inSite}) {
  const group=new THREE.Group();group.name='A-domestic-shooting-area';scene.add(group);
  const court=new THREE.Group();court.name='basketball-11x9-buffer-8x6-shooting';group.add(court);
  for(const key of ['courtBuffer']) {
    const [x0,x1,z0,z1]=recreationFootprints[key];
    if(inSite && ![[x0,z0],[x1,z0],[x1,z1],[x0,z1]].every(([x,z])=>inSite(x,z))) {
      throw new Error(`Recreation footprint outside site: ${key}`);
    }
  }
  const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.8,...extra});
  const metal=material('#364d47',{metalness:.62,roughness:.35});
  const glass=new THREE.MeshPhysicalMaterial({color:'#a7c9c6',metalness:.08,roughness:.12,
    transparent:true,opacity:.19,depthWrite:false,side:THREE.DoubleSide});
  const markings=material('#fff5dc');
  function namedBox(name,w,h,d,x,y,z,mat,parent) {
    const obj=box(w,h,d,x,y,z,mat,parent);obj.name=name;return obj;
  }
  function tube(points,r,mat,parent,closed=false) {
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),closed,'catmullrom',.1);
    const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(16,points.length*3),r,6,closed),mat);
    mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function strip(x0,z0,x1,z1,width,y,mat,parent) {
    const mesh=box(Math.hypot(x1-x0,z1-z0),.006,width,(x0+x1)/2,y,(z0+z1)/2,mat,parent);
    mesh.rotation.y=-Math.atan2(z1-z0,x1-x0);return mesh;
  }

  const buffer=material('#889989'),sport=material('#b98264'),keyPaint=material('#6f8883');
  const baseY=.12,paintY=.127;
  namedBox('court-level-buffer-11x9',11,.085,9,-10.2,.0775,20,buffer,court);
  namedBox('shooting-area-8x6',8,.005,6,-10.2,.1225,20,sport,court);
  namedBox('shooting-key',2.8,.004,3.7,-10.2,.126,21.15,keyPaint,court);
  for(const [x0,z0,x1,z1] of [[-14.2,17,-6.2,17],[-6.2,17,-6.2,23],[-6.2,23,-14.2,23],[-14.2,23,-14.2,17],
    [-11.6,23,-11.6,19.3],[-11.6,19.3,-8.8,19.3],[-8.8,19.3,-8.8,23]])strip(x0,z0,x1,z1,.045,paintY+.006,markings,court);
  function arc(cx,cz,r,start,end) {
    const pts=[];for(let i=0;i<=48;i++){const a=start+(end-start)*i/48;pts.push([cx+Math.cos(a)*r,paintY+.009,cz+Math.sin(a)*r]);}
    tube(pts,.022,markings,court);
  }
  arc(-10.2,19.3,1.3,Math.PI,Math.PI*2);
  const radius=4.3,edge=3.68,cut=Math.acos(edge/radius);
  arc(-10.2,22.66,radius,Math.PI+cut,Math.PI*2-cut);
  const endZ=22.66-Math.sin(cut)*radius;
  strip(-10.2-edge,23,-10.2-edge,endZ,.045,paintY+.006,markings,court);
  strip(-10.2+edge,23,-10.2+edge,endZ,.045,paintY+.006,markings,court);
  arc(-10.2,22.66,1.05,Math.PI,Math.PI*2);

  const hoop=new THREE.Group();hoop.name='basketball-hoop-rim-3.05m-above-court';court.add(hoop);
  const hoopX=-10.2,rimZ=22.66,rimY=baseY+3.05;
  box(.22,3.58,.22,hoopX,baseY+1.79,23.58,metal,hoop);
  box(.43,1.30,.43,hoopX,baseY+.65,23.58,keyPaint,hoop);
  box(.22,.19,.88,hoopX,baseY+3.43,23.22,metal,hoop);
  const board=box(1.8,1.05,.045,hoopX,baseY+3.575,23.07,glass,hoop);board.material=glass.clone();board.material.opacity=.52;
  for(const x of [hoopX-.9,hoopX+.9])box(.045,1.10,.075,x,baseY+3.575,23.07,markings,hoop);
  for(const y of [baseY+3.05,baseY+4.1])box(1.8,.045,.075,hoopX,y,23.07,markings,hoop);
  for(const x of [hoopX-.295,hoopX+.295])box(.035,.45,.025,x,baseY+3.275,23.035,markings,hoop);
  for(const y of [baseY+3.05,baseY+3.50])box(.59,.035,.025,hoopX,y,23.035,markings,hoop);
  box(.20,.06,.28,hoopX,rimY,22.94,material('#bd7140',{metalness:.35}),hoop);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.225,.014,7,28),material('#e58b43',{metalness:.35}));
  rim.rotation.x=Math.PI/2;rim.position.set(hoopX,rimY,rimZ);rim.castShadow=true;hoop.add(rim);
  for(let i=0;i<12;i++) {
    const a=i*Math.PI/6,pts=[];
    for(let j=0;j<4;j++){const q=j/3,r=.225-.09*q,b=a+.1*Math.sin(q*Math.PI);pts.push([hoopX+Math.cos(b)*r,rimY-q*.40,rimZ+Math.sin(b)*r]);}
    tube(pts,.005,markings,hoop);
  }
  for(const q of [.35,.7,1]) {
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.225-.09*q,.004,4,24),markings);
    ring.rotation.x=Math.PI/2;ring.position.set(hoopX,rimY-.4*q,rimZ);hoop.add(ring);
  }
  const ball=new THREE.Mesh(new THREE.SphereGeometry(.12,18,12),material('#be632e',{roughness:.9}));
  ball.name='basketball';ball.position.set(-8.12,baseY+.12,20.55);ball.castShadow=true;court.add(ball);
  const seamMat=material('#42352e');
  for(const rotate of [[0,0,0],[Math.PI/2,0,0],[0,Math.PI/2,0]]) {
    const seam=new THREE.Mesh(new THREE.TorusGeometry(.1203,.003,4,32),seamMat);seam.rotation.set(...rotate);seam.position.copy(ball.position);court.add(seam);
  }
  // 3 m ball-stop mesh keeps the parking edge and neighbours separated. The east
  // side stays open, connecting the court to the principal garden path.
  const ballStop=new THREE.Group();ballStop.name='court-north-west-south-ball-stop-3m';court.add(ballStop);
  const wirePositions=[];
  function ballFence(x0,z0,x1,z1) {
    const length=Math.hypot(x1-x0,z1-z0),n=Math.ceil(length/2.3);
    for(let i=0;i<=n;i++) {const t=i/n;cylinder(.038,.045,3,x0+(x1-x0)*t,baseY+1.5,z0+(z1-z0)*t,metal,ballStop,8);}
    for(const y of [baseY+.08,baseY+3]) {
      const rail=box(length,.05,.05,(x0+x1)/2,y,(z0+z1)/2,metal,ballStop);rail.rotation.y=-Math.atan2(z1-z0,x1-x0);
    }
    const count=Math.ceil(length/.15);
    for(let i=0;i<=count;i++) {const t=i/count,x=x0+(x1-x0)*t,z=z0+(z1-z0)*t;wirePositions.push(x,baseY+.08,z,x,baseY+3,z);}
    for(let y=baseY+.18;y<baseY+3;y+=.15)wirePositions.push(x0,y,z0,x1,y,z1);
  }
  ballFence(-15.64,15.57,-4.78,15.57);ballFence(-15.64,15.57,-15.64,24.43);ballFence(-15.64,24.43,-4.78,24.43);
  const wires=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(wirePositions,3)),
    new THREE.LineBasicMaterial({color:'#3a584c',transparent:true,opacity:.53}));
  wires.name='ball-stop-fine-mesh';ballStop.add(wires);

  return {
    group,footprints:recreationFootprints,
    anchors:{court:[-10.2,.4,20],courtEntrance:[-4.7,.12,20]},
    setLight(dusk=false,rain=false) {},
    update(dt) {}
  };
}
