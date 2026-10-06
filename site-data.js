// PDF vector boundary calibrated by the 55 m east-west projection.
// x points east; z points south. No surveyed elevations were supplied.
export const siteData = {
  sourceArea: 1130,
  boundary: [[55,0],[48.86272,20.92434],[41.46919,18.75208],[28.29170,34.70379],[22.87414,24.92862],[12.83726,28.26553],[0,3.00976],[41.40376,0]],
  annotations: [21.8,7.7,20.37,11.17,10.57,28.3,null,13.6],
  frontageProjection: 55,
  vectorArea: 1130.01,
  existingBuilding: {corners:[[34.72995,1.28242],[34.72995,13.15132],[23.72472,13.15132],[23.72472,1.28242]],center:[29.227335,7.21687]},
  design: {
    house:{x:4.5,z:11.3,rotation:-Math.PI/2},
    houseWidth:16,houseDepth:12.5,houseFootprint:200,floorHeight:3.3,
    wallHeight:2,wallCapHeight:.12,gatePierHeight:2.25,gateLeafTop:1.95,
    gateClearWidth:4,pedestrianGateClearWidth:1.2,roadWidth:5.5
  }
};
