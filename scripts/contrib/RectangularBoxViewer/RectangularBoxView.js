define(["backbone.marionette","app","communicator","./X3DOMView","jqueryui"],function(a,b,c,d){"use strict";var e=d.extend({createSceneVolume:function(){EarthServerGenericClient.MainScene.setTimeLog(!1),EarthServerGenericClient.MainScene.addLightToScene(!1),EarthServerGenericClient.MainScene.setBackground("0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2","0.9 1.5 1.57","0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2","0.9 1.5 1.57");var a=new EarthServerGenericClient.Model_LayerAndTime;a.setName("Volume"),a.setURL("http://earthserver.services.meeo.it/petascope"),a.setCoverage("MACC_Q_4326_1125"),a.setCoverageTime("1203113"),a.setLayers("1:7"),a.setScale(1,1,1),a.setDataModifier(1e4),EarthServerGenericClient.MainScene.addModel(a),EarthServerGenericClient.MainScene.createScene("x3dScene","scene",1,.8,1),EarthServerGenericClient.MainScene.createAxisLabels("Latitude","Height","Longitude");var b=new EarthServerGenericClient.createProgressBar("progressbar");EarthServerGenericClient.MainScene.setProgressCallback(b.updateValue),b=null,EarthServerGenericClient.MainScene.createModels(),EarthServerGenericClient.MainScene.createUI("x3domUI")},createScene:function(){EarthServerGenericClient.MainScene.setTimeLog(!1),EarthServerGenericClient.MainScene.addLightToScene(!0),EarthServerGenericClient.MainScene.setBackground("0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2","0.9 1.5 1.57","0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2","0.9 1.5 1.57"),EarthServerGenericClient.MainScene.OnClickFunction=function(a,b){var c=EarthServerGenericClient.MainScene.getDemValueAt3DPosition(a,b[0],b[2]);console.log("Height at clicked position: ",c)};var a=new EarthServerGenericClient.Model_WCPSDemWCPS;a.setName("BGS 2x WCPS"),a.setURLs("http://earthserver.bgs.ac.uk/petascope"),a.setCoverages("bgs_rs","os_dtm"),a.setAreaOfInterest(4e5,5e5,45e4,55e4),a.setResolution(500,500),a.setOffset(0,.2,0),a.setScale(1,.3,1),a.setCoordinateReferenceSystem("http://www.opengis.net/def/crs/EPSG/0/27700"),a.setSidePanels(!0);var b=new EarthServerGenericClient.Model_WCPSDemAlpha;b.setName("BGS Low Resolution"),b.setURL("http://earthserver.bgs.ac.uk/petascope"),b.setCoverages("bgs_rs","os_dtm"),b.setAreaOfInterest(4e5,5e5,45e4,55e4),b.setCoordinateReferenceSystem("http://www.opengis.net/def/crs/EPSG/0/27700"),b.setScale(1,.2,1),b.setOffset(0,.8,0),b.setResolution(200,200),b.setWCPSForChannelRED('scale(trim($CI.red, {x:$CRS($MINX:$MAXX), y:$CRS($MINY:$MAXY) }), {x:"CRS:1"(0:$RESX), y:"CRS:1"(0:$RESZ)}, {});'),b.setWCPSForChannelGREEN('scale(trim($CI.green, {x:$CRS($MINX:$MAXX), y:$CRS($MINY:$MAXY) }), {x:"CRS:1"(0:$RESX), y:"CRS:1"(0:$RESZ)}, {});'),b.setWCPSForChannelBLUE('scale(trim($CI.blue, {x:$CRS($MINX:$MAXX), y:$CRS($MINY:$MAXY) }), {x:"CRS:1"(0:$RESX), y:"CRS:1"(0:$RESZ)}, {});'),b.setWCPSForChannelALPHA('(char) (((scale(trim($CD , {x:$CRS($MINX:$MAXX), y:$CRS($MINY:$MAXY)}), {x:"CRS:1"(0:$RESX), y:"CRS:1"(0:$RESZ)}, {})) / 1349) * 255)');var c=new EarthServerGenericClient.Model_WMSDemWCPS;c.setName("Bedrock geology on ground surface"),c.setURLs("http://ogc.bgs.ac.uk/cgi-bin/BGS_Bedrock_and_Superficial_Geology/wms","http://earthserver.bgs.ac.uk/petascope"),c.setCoverages("GBR_BGS_625k_BLS","os_dtm"),c.setAreaOfInterest(254750,659824.9,265250,670024.9),c.setWMSCoordinateReferenceSystem("CRS","EPSG:27700"),c.setWCPSCoordinateReferenceSystem("http://www.opengis.net/def/crs/EPSG/0/27700"),c.setScale(1,.3,1),c.setOffset(0,1,0),c.setResolution(256,256);var d=new EarthServerGenericClient.Model_WCPSDemWCPS;d.setName("Wilderness Till Formation"),d.setURLs("http://earthserver.bgs.ac.uk/petascope","http://earthserver.bgs.ac.uk/petascope"),d.setCoverages("glasgow_witi_t","glasgow_witi_t"),d.setAreaOfInterest(254750,659824.9,265250,670024.9),d.setCoordinateReferenceSystem("http://www.opengis.net/def/crs/EPSG/0/27700"),d.setScale(1,.3,1),d.setOffset(0,.4,0),d.setResolution(105,102),d.setDemNoDataValue(0),d.setHeightResolution(100);var e="for i in ( $CI ) ";e+="return encode( ",e+="{ ",e+="red: (char) 0; ",e+='green: (char) scale((i != -340282346638528859811704183484516925440.0) * 240, {x:"CRS:1"(0:$RESX), y:"CRS:1"(0:$RESZ)}, {}); ',e+="blue: (char) 0 ",e+="} ",e+=', "png", "nodata=0,0,0")',d.setWCPSImageQuery(e);var f="for i in ( glasgow_witi_t ) ";f+="return encode( ",f+=' scale((i != -340282346638528859811704183484516925440.0) * i, {x:"CRS:1"(0:$RESX), y:"CRS:1"(0:$RESZ)}, {}) ',f+=', "csv" )',d.setWCPSDemQuery(f),EarthServerGenericClient.MainScene.addModel(a),EarthServerGenericClient.MainScene.addModel(b),EarthServerGenericClient.MainScene.addModel(d),EarthServerGenericClient.MainScene.addModel(c),EarthServerGenericClient.MainScene.createScene("x3dScene","scene",1,.6,1),EarthServerGenericClient.MainScene.createAxisLabels("Latitude","Height","Longitude");var g=new EarthServerGenericClient.createProgressBar("progressbar");EarthServerGenericClient.MainScene.setProgressCallback(g.updateValue),EarthServerGenericClient.MainScene.createUI("x3domUI"),EarthServerGenericClient.MainScene.createModels()}});return e});