import * as THREE from 'three';

export function repeatedBeams(w,h,d,positions,material,parent){
  const geometry=new THREE.BoxGeometry(w,h,d),p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv;
  for(let i=0;i<p.count;i++){if(Math.abs(n.getX(i))>.5)uv.setXY(i,p.getZ(i),p.getY(i));else if(Math.abs(n.getY(i))>.5)uv.setXY(i,p.getX(i),p.getZ(i));else uv.setXY(i,p.getX(i),p.getY(i));}
  const mesh=new THREE.InstancedMesh(geometry,material,positions.length),matrix=new THREE.Matrix4();
  positions.forEach((position,i)=>{matrix.makeTranslation(...position);mesh.setMatrixAt(i,matrix);});
  mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();parent.add(mesh);return mesh;
}

// Shared, restrained details for the main veranda and the two side galleries.
// Dimensions are metres; the existing canopy footprints are retained.
export function timberColumn(x,z,M,box,parent){
  const post=new THREE.Group();post.position.set(x,0,z);parent.add(post);
  box(.36,.20,.36,0,.31,0,M.cutStone,post);
  box(.40,.055,.40,0,.4375,0,M.cutStone,post);
  box(.245,2.51,.245,0,1.715,0,M.columnTimber,post);
  box(.263,.032,.263,0,.486,0,M.bronze,post);
  box(.31,.105,.31,0,2.895,0,M.timber,post);
  return post;
}

export function galleryCanopy(w,d,x,z,M,box,parent){
  const roof=new THREE.Group();roof.position.set(x,0,z);parent.add(roof);
  box(w,.075,d,0,3.235,0,M.roofEdge,roof);
  box(w-.16,.09,d-.16,0,3.08,0,M.soffit,roof);
  for(const xx of [-(w-.13)/2,(w-.13)/2]){
    box(.13,.255,d,xx,3.1025,0,M.timber,roof);
    box(.135,.032,d,xx,2.986,0,M.bronze,roof);
  }
  for(const zz of [-(d-.12)/2,(d-.12)/2]){
    box(w,.255,.12,0,3.1025,zz,M.timber,roof);
    box(w,.032,.125,0,2.986,zz,M.bronze,roof);
  }
  const rafters=[];for(let zz=-d/2+.21;zz<d/2-.12;zz+=.28)rafters.push([0,2.9975,zz]);
  repeatedBeams(w-.2,.075,.065,rafters,M.soffit,roof);
  for(const xx of [-w/2+.19,w/2-.19])box(.024,.018,d-.3,xx,2.95,0,M.warmGlow,roof);
  return roof;
}

export function stoneCourtyardFrame(M,box,parent,cx=0){
  // Flush bands frame the genuinely open middle, outside the rain reflector.
  for(const x of [-2.89,2.89])box(.16,.022,5.1,x+cx,.114,20,M.cutStone,parent);
  for(const z of [17.49,22.51])box(5.94,.022,.14,cx,.114,z,M.cutStone,parent);
  for(const x of [-3.07,3.07])box(.025,.012,5.1,x+cx,.118,20,M.bronze,parent);
}
