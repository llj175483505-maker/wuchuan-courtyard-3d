import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Measured outer footprint: 16 × 12.5 m = 200 m², including the recessed porch.
// Upper floors: 16 × 7.8 + 6 × 4.7 = 153 m²; the first-floor roof terrace is 47 m².
// The local entrance faces +Z. Rotating the complete group -PI/2 makes it face west.
export function createCottage({scene, M, box, cylinder, x, z, rotation=-Math.PI/2}) {
  const root=new THREE.Group();root.name='朝西 · 200㎡田园住宅';root.position.set(x,0,z);scene.add(root);
  const finish=.18,storey=3.3,layers=[],ceilings=[],roofs=[];
  const cream=M.wall.clone();cream.color.set('#ecebdc');cream.roughness=.94;
  const trim=M.wall.clone();trim.color.set('#e7dfc9');trim.roughness=.88;
  const sage=M.wall.clone();sage.color.set('#d2d6c5');
  const stone=M.path.clone();stone.color.set('#c6bd9f');stone.roughness=.83;
  const timber=new THREE.MeshStandardMaterial({color:'#c39566',map:M.wood.map,normalMap:M.wood.normalMap,normalScale:new THREE.Vector2(.10,.10),roughness:.51,envMapIntensity:.4});
  const soffit=timber.clone();soffit.color.set('#d0aa7b');soffit.roughness=.8;
  const dark=new THREE.MeshStandardMaterial({color:'#333c39',roughness:.65,metalness:.35});
  const tiles=new THREE.MeshStandardMaterial({color:'#555d61',roughness:.94,normalMap:M.roof.normalMap,normalScale:new THREE.Vector2(.11,.11),envMapIntensity:.15});
  const brick=new THREE.MeshStandardMaterial({color:'#c3ab8c',map:M.facade?.map,normalMap:M.facade?.normalMap,normalScale:new THREE.Vector2(.20,.20),roughness:.95});
  const glass=M.glass.clone();glass.color.set('#c4d7d1');glass.opacity=.30;glass.roughness=.13;
  const fabric=M.fabric.clone();fabric.color.set('#e4dcc7');
  const leaf=M.leaf.clone();leaf.color.set('#496b3b');
  const flower=new THREE.MeshStandardMaterial({color:'#cd6b93',roughness:.84});
  const glow=new THREE.MeshStandardMaterial({color:'#fff2c9',emissive:'#ffd596',emissiveIntensity:.16,roughness:.55});
  const curtain=new THREE.MeshStandardMaterial({color:'#dfd6bd',roughness:1,side:THREE.DoubleSide});
  const bronze=new THREE.MeshStandardMaterial({color:'#958059',roughness:.42,metalness:.65});
  const b=(w,h,d,xx,yy,zz,m,p)=>box(w,h,d,xx,yy,zz,m,p);
  const c=(rt,rb,h,xx,yy,zz,m,p,n=12)=>cylinder(rt,rb,h,xx,yy,zz,m,p,n);

  function compact(group) {
    group.updateMatrixWorld(true);
    const inverse=new THREE.Matrix4().copy(group.matrixWorld).invert(),buckets=new Map(),remove=[];
    group.traverse(object=>{
      if(!object.isMesh||object.isInstancedMesh||Array.isArray(object.material))return;
      let geometry=object.geometry.clone();geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,object.matrixWorld));
      // Disparate primitive shapes all become a consistent non-indexed geometry.
      if(geometry.index){const flat=geometry.toNonIndexed();geometry.dispose();geometry=flat;}
      for(const key of Object.keys(geometry.attributes))if(!['position','normal','uv'].includes(key))geometry.deleteAttribute(key);
      if(!geometry.attributes.uv)geometry.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count*2),2));
      if(!buckets.has(object.material))buckets.set(object.material,[]);buckets.get(object.material).push(geometry);remove.push(object);
    });
    remove.forEach(object=>object.removeFromParent());
    for(const [material,geometries]of buckets){
      const geometry=mergeGeometries(geometries,false);if(!geometry)throw new Error('Cottage geometry merge failed');
      const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);geometries.forEach(g=>g.dispose());
    }
  }

  // Wall components surround real openings; glass never sits in front of a solid wall.
  function facade(parent,cx,cz,width,y,angle=0,{door=false,solid=false,sill=.65,opening}={}) {
    const g=new THREE.Group();g.position.set(cx,y,cz);g.rotation.y=angle;parent.add(g);
    const h=3.08,depth=.22;
    if(solid){b(width,h,depth,0,h/2,0,cream,g);return;}
    const ow=opening||Math.min(width-.85,3.65),oh=door?2.62:2.02,sy=door?.025:sill,pier=(width-ow)/2;
    for(const sign of [-1,1])b(pier,h,depth,sign*(ow+pier)/2,h/2,0,cream,g);
    if(sy>0)b(ow,sy,depth,0,sy/2,0,cream,g);
    b(ow,h-sy-oh,depth,0,(h+sy+oh)/2,0,cream,g);
    b(ow+.19,.10,.33,0,sy-.035,.025,trim,g);
    b(ow+.18,.10,.29,0,sy+oh+.05,.019,trim,g);
    for(const sign of [-1,1])b(.105,oh+.035,.17,sign*(ow-.08)/2,sy+oh/2,.02,timber,g);
    for(const yy of [sy+.04,sy+oh-.04])b(ow,.095,.17,0,yy,.022,timber,g);
    b(ow-.16,oh-.13,.025,0,sy+oh/2,.012,glass,g);
    b(.077,oh,.175,0,sy+oh/2,.045,timber,g);
    b(ow,.08,.175,0,sy+oh-.48,.04,timber,g);
    if(!door)for(const sign of [-1,1]){
      b(.047,oh,.15,sign*ow*.31,sy+oh/2,.04,timber,g);
      b(.30,oh-.1,.038,sign*(ow/2-.24),sy+oh/2,-.18,curtain,g);
    }
    if(door)for(const sign of [-1,1]){
      b(.036,.38,.038,sign*.13,1.18,.14,bronze,g);
      b(ow*.40,.50,.048,sign*ow*.245,.30,.014,timber,g);
    }
    return g;
  }

  function rail(parent,x1,z1,x2,z2,y) {
    const length=Math.hypot(x2-x1,z2-z1),g=new THREE.Group();g.position.set((x1+x2)/2,y,(z1+z2)/2);g.rotation.y=-Math.atan2(z2-z1,x2-x1);parent.add(g);
    b(length,.065,.072,0,1.04,0,dark,g);b(length,.045,.055,0,.14,0,dark,g);
    const divisions=Math.ceil(length/.125);
    for(let k=0;k<=divisions;k++)b(k%10===0?.055:.026,.9,k%10===0?.055:.026,-length/2+length*k/divisions,.59,0,dark,g);
  }

  function planter(parent,xx,yy,zz,flowers=false,scale=1) {
    c(.31*scale,.23*scale,.43*scale,xx,yy+.215*scale,zz,stone,parent,16);
    c(.32*scale,.32*scale,.055*scale,xx,yy+.435*scale,zz,trim,parent,16);
    const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(.35*scale,2),leaf);crown.position.set(xx,yy+.65*scale,zz);crown.scale.y=.7;crown.castShadow=true;parent.add(crown);
    if(flowers)for(let k=0;k<12;k++){
      const a=k*2.4,rr=.25*scale*Math.sqrt((k+.5)/12),bloom=new THREE.Mesh(new THREE.IcosahedronGeometry(.075*scale,1),flower);
      bloom.position.set(xx+Math.cos(a)*rr,yy+.77*scale+Math.sin(k*1.2)*.07*scale,zz+Math.sin(a)*rr);parent.add(bloom);
    }
  }

  function wallLamp(parent,xx,yy,zz,angle=0) {
    const g=new THREE.Group();g.position.set(xx,yy,zz);g.rotation.y=angle;parent.add(g);
    b(.15,.39,.045,0,0,0,dark,g);b(.20,.30,.14,0,.025,.115,glow,g);
    for(const sign of [-1,1])b(.025,.34,.16,sign*.11,.025,.115,dark,g);
    for(const sy of [-.15,.19])b(.26,.05,.23,0,sy,.115,dark,g);
    b(.29,.045,.25,0,.24,.12,dark,g);
  }

  function vent(parent,xx,yy,zz,angle=0) {
    const g=new THREE.Group();g.position.set(xx,yy,zz);g.rotation.y=angle;parent.add(g);
    b(.51,.51,.07,0,0,0,timber,g);b(.40,.39,.075,0,0,.022,dark,g);
    for(let k=0;k<6;k++)b(.42,.035,.09,0,-.15+k*.06,.055,timber,g);
  }

  function downpipe(parent,xx,zz,height,angle=0) {
    const g=new THREE.Group();g.position.set(xx,0,zz);g.rotation.y=angle;parent.add(g);
    c(.048,.048,height-.4,0,(height-.4)/2+.24,0,dark,g,8);
    const end=b(.09,.39,.09,0,height-.08,-.08,dark,g);end.rotation.x=-.4;
    for(let yy=.6;yy<height;yy+=2.3)b(.14,.065,.12,0,yy,-.005,dark,g);
  }

  function furnish(parent,y,level) {
    // Ground floor room layout is only a furnishing study, including a level-access bedroom.
    if(level===0){
      b(.15,2.83,9.1,-2.8,y+1.415,-1.40,cream,parent);b(.15,2.83,8.0,2.5,y+1.415,-2.12,cream,parent);
      b(4.95,2.83,.14,-5.35,y+1.415,-.3,cream,parent);b(5.2,2.83,.14,5.25,y+1.415,-.3,cream,parent);
      b(3.45,.28,.95,-5.12,y+.3,4.48,fabric,parent);b(3.48,.65,.17,-5.12,y+.59,4.88,fabric,parent);
      for(const sx of [-1,1])b(.17,.48,.94,-5.12+sx*1.67,y+.5,4.48,fabric,parent);
      b(1.40,.075,.80,-5.10,y+.47,2.81,timber,parent);
      for(const dx of [-.55,.55])for(const dz of [-.27,.27])b(.045,.40,.045,-5.1+dx,y+.24,2.81+dz,dark,parent);
      b(3.35,.026,2.90,-5.1,y+.025,3.43,fabric,parent);
    }
    for(const sx of level===0?[1]:[-1,1]){
      const xx=sx*5.16,zz=sx===-1?-.62:2.1;
      b(2.07,.29,2.25,xx,y+.26,zz,timber,parent);b(2.00,.24,2.18,xx,y+.51,zz,fabric,parent);
      b(2.16,.91,.15,xx,y+.66,zz-1.20,timber,parent);
      for(const dx of [-.5,.5])b(.75,.12,.40,xx+dx,y+.69,zz-.70,trim,parent);
      b(.44,.48,.47,xx+1.40,y+.24,zz-.85,timber,parent);
    }
    b(2.25,.075,1.12,0,y+.77,-1.23,timber,parent);
    for(const dx of [-.87,.87])for(const dz of [-.35,.35])b(.055,.71,.055,dx,y+.40,-1.23+dz,dark,parent);
    for(const dx of [-.70,.70])for(const dz of [-1,1]){
      b(.46,.085,.45,dx,y+.46,-1.23+dz,fabric,parent);b(.46,.55,.07,dx,y+.76,-1.23+dz*1.17,timber,parent);
    }
    for(let step=0;step<10;step++){
      b(.95,.09,.25,-1.38,y+.16+step*.165,-3.00-step*.255,stone,parent);
      b(.95,.09,.25,-.21,y+1.81+step*.165,-5.3+step*.255,stone,parent);
    }
    b(2.22,.10,.58,-.79,y+1.75,-5.62,stone,parent);
    c(.26,.26,.27,0,y+2.67,-1.2,glow,parent,16);c(.013,.013,.23,0,y+2.92,-1.2,dark,parent,8);
  }

  function arch(parent) {
    // The arch is a real open extrusion between two masonry piers.
    for(const sx of [-1,1]){
      b(.43,2.92,.45,sx*2.23,finish+1.46,6.0,cream,parent);
      b(.49,.66,.49,sx*2.23,finish+.33,6.0,brick,parent);
      b(.56,.10,.55,sx*2.23,finish+.71,6.0,trim,parent);
    }
    const shape=new THREE.Shape();shape.moveTo(-2.035,3.08);shape.lineTo(2.035,3.08);shape.lineTo(2.035,2.13);
    for(let k=1;k<=32;k++){const a=Math.PI*k/32;shape.lineTo(Math.cos(a)*2.035,2.13+Math.sin(a)*.62);}shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth:.24,bevelEnabled:false});
    const m=new THREE.Mesh(geo,cream);m.position.set(0,finish,5.88);m.castShadow=true;m.receiveShadow=true;parent.add(m);
    wallLamp(parent,-2.23,2.1,6.25);wallLamp(parent,2.23,2.1,6.25);
    planter(parent,-1.80,finish,5.47,false,.88);planter(parent,1.8,finish,5.47,true,.88);
  }

  for(let level=0;level<3;level++){
    const floor=new THREE.Group();floor.name=`田园住宅 · ${level+1}层`;root.add(floor);layers.push(floor);
    const y=finish+level*storey;
    if(level===0)b(16,.16,12.5,0,y-.08,0,stone,floor);
    else if(level===1)b(16,.17,12.5,0,y-.085,0,stone,floor);
    else {b(16,.17,7.8,0,y-.085,-2.35,stone,floor);b(6,.17,4.7,5,y-.085,3.9,stone,floor);}
    // Rear facade and long side walls; all four sides retain actual windows.
    for(const xx of [-6,-2,2,6])facade(floor,xx,-6.14,4,y,Math.PI,{opening:2.45});
    if(level===0){
      for(const side of [-1,1])for(const zz of [-4.17,0,4.17])facade(floor,side*7.89,zz,4.17,y,side*Math.PI/2,{opening:2.55});
      facade(floor,-5.25,6.14,5.5,y,0,{opening:3.80});facade(floor,5.25,6.14,5.5,y,0,{opening:3.8});
      facade(floor,0,4.4,4.78,y,0,{door:true,opening:2.25});
      for(const sx of [-1,1])b(.22,3.08,1.72,sx*2.5,y+1.54,5.27,cream,floor);
      arch(floor);b(4.54,.025,1.76,0,y-.0125,5.37,stone,floor);
      for(const xx of [-5.25,5.25]){
        b(5.5,.48,.16,xx,y+.24,6.17,brick,floor);b(5.5,.06,.20,xx,y+.51,6.17,trim,floor);
      }
      for(const sx of [-1,1])b(.14,.48,12.32,sx*7.93,y+.24,0,brick,floor);
      wallLamp(floor,-7.66,y+1.97,6.24);wallLamp(floor,7.66,y+1.97,6.24);
    }else{
      for(const zz of [-4.27,-.43])facade(floor,-7.89,zz,3.84,y,-Math.PI/2,{opening:2.32});
      for(const zz of [-4.17,0,4.17])facade(floor,7.89,zz,4.17,y,Math.PI/2,{opening:2.55});
      facade(floor,-5.46,1.44,4.87,y,0,{door:level===1,opening:3.32});
      facade(floor,-.49,1.44,5.07,y,0,{door:level===1,opening:2.70});
      facade(floor,5,6.14,6,y,0,{opening:3.89});
      facade(floor,2.11,3.9,4.7,y,-Math.PI/2,{opening:2.60});
      b(16,.14,.19,0,y-.09,-6.15,trim,floor);b(.19,.14,7.76,-7.91,y-.09,-2.35,trim,floor);
      b(.19,.14,12.40,7.91,y-.09,0,trim,floor);
      if(level===1){
        b(9.91,.16,.22,-2.99,y-.10,6.14,trim,floor);b(.22,.16,4.68,-7.90,y-.10,3.9,trim,floor);
        rail(floor,-7.76,6.10,1.83,6.10,y);rail(floor,-7.76,1.52,-7.76,6.10,y);rail(floor,1.84,4.54,1.84,6.10,y);
        for(const pp of [[-7.19,5.51],[1.14,5.45],[-7.13,2.23]])planter(floor,pp[0],y,pp[1],true,.85);
        b(1.18,.065,.67,-4.81,y+.69,3.39,timber,floor);
        for(const dx of [-.44,.44])for(const dz of [-.23,.23])b(.04,.64,.04,-4.81+dx,y+.36,3.39+dz,dark,floor);
        for(const xx of [-5.75,-3.88]){b(.51,.075,.54,xx,y+.43,3.39,soffit,floor);b(.065,.57,.56,xx+(xx<-4.8?-.22:.22),y+.74,3.39,soffit,floor);}
        wallLamp(floor,-2.95,y+2.13,1.57);
      }
    }
    furnish(floor,y,level);compact(floor);
    const ceiling=new THREE.Group();floor.add(ceiling);ceilings.push(ceiling);
    if(level===0)b(16,.22,12.5,0,y+3.19,0,cream,ceiling);
    else {b(16,.22,7.8,0,y+3.19,-2.35,cream,ceiling);b(6,.22,4.7,5,y+3.19,3.9,cream,ceiling);}
    compact(ceiling);
  }

  function triangle(parent,a,bb,cc,material){
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([...a,...bb,...cc],3));geo.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,.5,1],2));geo.computeVertexNormals();
    const m=new THREE.Mesh(geo,material);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  }
  function beam(parent,a,bb,width,depth,material){
    const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...bb),dir=bv.clone().sub(av);
    const m=b(width,dir.length(),depth,0,0,0,material,parent);m.position.copy(av.add(bv).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());return m;
  }

  // Every tile is a curved strip. Batching supplies roof texture without thousands of draw calls.
  const tileVertices=[],tileUv=[],tileIndex=[];
  for(let row=0;row<2;row++)for(let k=0;k<=6;k++){
    const a=Math.PI*k/6;tileVertices.push(Math.cos(a)*.117,Math.sin(a)*.047+row*.006,row*.35-.175);tileUv.push(k/6,row);
  }
  for(let k=0;k<6;k++)tileIndex.push(k,k+1,k+7,k+1,k+8,k+7);
  const tileGeometry=new THREE.BufferGeometry();tileGeometry.setAttribute('position',new THREE.Float32BufferAttribute(tileVertices,3));tileGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(tileUv,2));tileGeometry.setIndex(tileIndex);tileGeometry.computeVertexNormals();

  function roofSystem(oneStorey=false){
    const group=new THREE.Group();group.name=oneStorey?'首层完整坡屋顶':'L形交叉山墙屋顶';root.add(group);
    const rise=oneStorey?2.15:1.65;
    const specs=oneStorey?
      [{cx:0,cz:0,w:17.1,d:13.6,axis:'x',rise},{cx:5,cz:3.4,w:7.1,d:6.8,axis:'z',rise}]:
      [{cx:0,cz:-2.35,w:17.1,d:8.9,axis:'x',rise},{cx:5,cz:2.25,w:7.1,d:9.1,axis:'z',rise}];
    const inside=(s,xx,zz)=>Math.abs(xx-s.cx)<=s.w/2+.001&&Math.abs(zz-s.cz)<=s.d/2+.001;
    const height=(s,xx,zz)=>.08+s.rise*(1-(s.axis==='x'?Math.abs(zz-s.cz)/(s.d/2):Math.abs(xx-s.cx)/(s.w/2)));
    const exposed=(s,xx,zz)=>!specs.some(other=>other!==s&&inside(other,xx,zz)&&height(other,xx,zz)>height(s,xx,zz)+.015);
    for(const s of specs){
      const positions=[],uv=[],nx=Math.ceil(s.w/.20),nz=Math.ceil(s.d/.20);
      for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){
        const x0=s.cx-s.w/2+s.w*ix/nx,x1=s.cx-s.w/2+s.w*(ix+1)/nx,z0=s.cz-s.d/2+s.d*iz/nz,z1=s.cz-s.d/2+s.d*(iz+1)/nz;
        for(const points of [[[x0,z0],[x0,z1],[x1,z1]],[[x0,z0],[x1,z1],[x1,z0]]]){
          const xx=(points[0][0]+points[1][0]+points[2][0])/3,zz=(points[0][1]+points[1][1]+points[2][1])/3;if(!exposed(s,xx,zz))continue;
          for(const p of points){positions.push(p[0],height(s,...p),p[1]);uv.push(...p);}
        }
      }
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();
      const surface=new THREE.Mesh(geo,tiles);surface.castShadow=true;surface.receiveShadow=true;group.add(surface);
      // Warm timber soffits are thin strips under the eaves, not a solid slab across the valleys.
      if(s.axis==='x')for(const sign of [-1,1]){b(s.w,.13,.35,s.cx,-.02,s.cz+sign*(s.d/2-.08),soffit,group);b(s.w,.11,.09,s.cx,.065,s.cz+sign*s.d/2,dark,group);}
      else for(const sign of [-1,1]){
        const from=oneStorey?6.4:2.16,depth=6.85-from;
        b(.32,.13,depth,s.cx+sign*(s.w/2-.08),-.02,(from+6.85)/2,soffit,group);
        b(.08,.11,depth,s.cx+sign*s.w/2,.065,(from+6.85)/2,dark,group);
      }
      const placements=[];
      for(let xx=s.cx-s.w/2+.18;xx<s.cx+s.w/2-.18;xx+=.233)for(let zz=s.cz-s.d/2+.18;zz<s.cz+s.d/2-.18;zz+=.31){
        if(!exposed(s,xx,zz)||!exposed(s,xx+.06,zz)||!exposed(s,xx,zz+.07))continue;
        placements.push([xx,zz]);
      }
      const im=new THREE.InstancedMesh(tileGeometry,tiles,placements.length),matrix=new THREE.Matrix4(),col=new THREE.Color();
      placements.forEach(([xx,zz],i)=>{
        const sign=s.axis==='x'?Math.sign(zz-s.cz)||1:Math.sign(xx-s.cx)||1,gradient=s.rise/(s.axis==='x'?s.d/2:s.w/2);
        const down=new THREE.Vector3(s.axis==='z'?sign:0,-gradient,s.axis==='x'?sign:0).normalize();
        const normal=new THREE.Vector3(s.axis==='z'?sign*gradient:0,1,s.axis==='x'?sign*gradient:0).normalize();
        const across=new THREE.Vector3().crossVectors(normal,down).normalize();matrix.makeBasis(across,normal,down);matrix.setPosition(xx,height(s,xx,zz)+.021,zz);im.setMatrixAt(i,matrix);
        const variation=.88+((i*37)%101)/600;col.setRGB(variation,variation,variation);im.setColorAt(i,col);
      });im.castShadow=true;im.receiveShadow=true;im.computeBoundingSphere();group.add(im);
    }
    // Gable plaster closes the vertical walls beneath the inclined timber fascia.
    const main=specs[0],wallZMin=-6.25,wallZMax=oneStorey?6.25:1.55;
    for(const sign of [-1,1]){
      const xx=sign*7.995,low=height(main,xx,wallZMin),high=height(main,xx,wallZMax),mid=main.cz;
      const material=cream.clone();material.side=THREE.DoubleSide;
      triangle(group,[xx,low,wallZMin],[xx,high,wallZMax],[xx,.08+rise,mid],material);
      triangle(group,[xx,-.02,wallZMin],[xx,-.02,wallZMax],[xx,high,wallZMax],material);
      triangle(group,[xx,-.02,wallZMin],[xx,high,wallZMax],[xx,low,wallZMin],material);
      for(const zz of [main.cz-main.d/2,main.cz+main.d/2]){
        beam(group,[sign*8.56,.02,zz],[sign*8.56,rise+.10,main.cz],.145,.16,soffit);
        beam(group,[sign*8.59,.13,zz],[sign*8.59,rise+.21,main.cz],.085,.09,dark);
      }
      vent(group,sign*8.05,rise-.47,main.cz,sign*Math.PI/2);
    }
    const wing=specs[1],base=height(wing,2,6.14),gableMat=sage.clone();gableMat.side=THREE.DoubleSide;
    triangle(group,[2,base,6.14],[8,base,6.14],[5,rise+.08,6.14],gableMat);
    b(6,base+.03,.19,5,base/2,6.13,sage,group);
    for(const xx of [1.45,8.55]){
      beam(group,[xx,.01,6.78],[5,rise+.11,6.78],.15,.19,soffit);
      beam(group,[xx,.13,6.84],[5,rise+.22,6.84],.095,.09,dark);
    }
    vent(group,5,rise-.44,6.255,0);
    // Ridge sections stop where the perpendicular roof takes over.
    beam(group,[-8.55,rise+.13,main.cz],[8.55,rise+.13,main.cz],.16,.16,tiles);
    const crossStart=oneStorey?0:-2.25;
    beam(group,[5,rise+.13,crossStart],[5,rise+.13,6.79],.16,.16,tiles);
    compact(group);return group;
  }
  roofs.push(roofSystem(true),roofSystem(false));

  // A shallow tiled porch canopy tucked just under the terrace floor.
  const porchRoof=new THREE.Group();root.add(porchRoof);
  const canopyGeo=new THREE.PlaneGeometry(5.56,1.05,24,6);canopyGeo.rotateX(-Math.PI/2);canopyGeo.translate(0,0,6.325);
  const cp=canopyGeo.attributes.position;for(let i=0;i<cp.count;i++)cp.setY(i,3.30-(cp.getZ(i)-5.8)*.22);canopyGeo.computeVertexNormals();
  const canopy=new THREE.Mesh(canopyGeo,tiles);canopy.castShadow=true;canopy.receiveShadow=true;porchRoof.add(canopy);
  b(5.62,.12,.12,0,3.04,6.84,soffit,porchRoof);
  const pc=new THREE.InstancedMesh(tileGeometry,tiles,24*4),pd=new THREE.Object3D();
  for(let ix=0;ix<24;ix++)for(let iz=0;iz<4;iz++){
    const xx=-2.68+ix*.233,zz=5.91+iz*.266;pd.position.set(xx,3.30-(zz-5.8)*.22+.035,zz);pd.rotation.x=.217;pd.updateMatrix();pc.setMatrixAt(ix*4+iz,pd.matrix);
  }pc.castShadow=true;pc.receiveShadow=true;porchRoof.add(pc);

  const pipes=new THREE.Group();root.add(pipes);
  const porchLight=new THREE.PointLight('#ffd7a0',0,10,2);porchLight.position.set(0,2.7,5.1);root.add(porchLight);
  const terraceLight=new THREE.PointLight('#ffdeac',0,9,2);terraceLight.position.set(-2.9,5.2,2.0);root.add(terraceLight);
  let currentFloors=2;
  function setFloors(n=2,exterior=true){
    const next=Math.max(1,Math.min(3,Math.round(n)));
    layers.forEach((floor,i)=>floor.visible=i<next);ceilings.forEach((ceiling,i)=>ceiling.visible=exterior||i<next-1);
    roofs.forEach((roof,i)=>{roof.position.y=finish+next*storey;roof.visible=exterior&&(i===0?next===1:next>1);});
    porchRoof.visible=exterior;terraceLight.visible=next>1;
    if(currentFloors!==next||pipes.children.length===0){
      for(const child of [...pipes.children]){child.traverse(o=>{if(o.isMesh)o.geometry.dispose();});pipes.remove(child);}
      const h=finish+next*storey;
      downpipe(pipes,-7.85,-6.30,h,Math.PI);downpipe(pipes,8.13,6.04,h,Math.PI/2);
      downpipe(pipes,-7.90,next>1?1.64:6.31,h,0);compact(pipes);
    }
    currentFloors=next;root.updateMatrixWorld(true);
  }
  function setLight(dusk=false,rain=false){
    glow.emissiveIntensity=dusk?2.3:rain?.6:.16;glass.emissive.set('#c2925a');glass.emissiveIntensity=dusk?.035:0;
    porchLight.intensity=dusk?27:rain?3:0;terraceLight.intensity=dusk?19:rain?2:0;tiles.roughness=rain?.60:.94;stone.roughness=rain?.63:.83;
  }
  root.rotation.y=rotation;setFloors(2,true);setLight(false,false);
  return {root,setFloors,setLight,update(){},floorAreas:[0,200,353,506],terraceArea:47,footprint:200,width:16,depth:12.5,finishHeight:finish,storeyHeight:storey,roofBounds:{x:[-8.65,8.65],z:[-6.90,6.90]},height:8.70};
}
