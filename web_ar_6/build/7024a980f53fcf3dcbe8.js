function asyncGeneratorStep(e,n,t,r,o,a,i){try{var l=e[a](i),s=l.value}catch(e){return void t(e)}l.done?n(s):Promise.resolve(s).then(r,o)}function _asyncToGenerator(e){return function(){var n=this,t=arguments;return new Promise((function(r,o){var a=e.apply(n,t);function i(e){asyncGeneratorStep(a,r,o,i,l,"next",e)}function l(e){asyncGeneratorStep(a,r,o,i,l,"throw",e)}i(void 0)}))}}import*as THREE from"../three/build/three.module.js";import{ColladaLoader}from"../three/examples/jsm/loaders/ColladaLoader.js";var renderer=null,scene=null,camera=null;export var buildInfo=[];var gps=null,map=null,service=null,compassDegree=null,watch=null,sortArr=[],playerVector=null,model=null,setFlag=!0,pivot=null,controller=null,objects=[];export var selectedObject=null;var initScene=function(e,n){scene=new THREE.Scene,camera=new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,.1,1e3);var t=new THREE.PointLight(16777215,2,100);scene.add(t),renderer=new THREE.WebGLRenderer({antialias:!0,alpha:!0,autoClear:!0,context:e}),(new ColladaLoader).load("model2.dae",(function(e){var n=(new THREE.Box3).setFromObject(e.scene),t=n.getCenter(new THREE.Vector3),r=n.getSize(new THREE.Vector3);e.scene.position.set(-t.x,r.y/2-t.y,-t.z),e.scene.scale.set(.5,.5,.5),(model=new THREE.Object3D).add(e.scene),(pivot=new THREE.Object3D).position.set(0,0,0),pivot.add(model),document.getElementById("overlay").addEventListener("touchstart",touchObj)})),controller=renderer.xr.getController(0),renderer.setPixelRatio(window.devicePixelRatio),renderer.setSize(window.innerWidth,window.innerHeight),renderer.xr.enabled=!0,renderer.xr.setReferenceSpaceType("local"),renderer.xr.setSession(n),document.body.appendChild(renderer.domElement)},xrButton=document.getElementById("xr-button"),xrSession=null,xrRefSpace=null,gl=null;function checkXR(){window.isSecureContext||(document.getElementById("warning").innerText="WebXR unavailable. Please use secure context"),navigator.xr?(navigator.xr.addEventListener("devicechange",checkSupportedState),checkSupportedState()):document.getElementById("warning").innerText="WebXR unavailable for this browser"}function checkSupportedState(){navigator.xr.isSessionSupported("immersive-ar").then((function(e){e?(xrButton.innerHTML="Enter AR",xrButton.addEventListener("click",onButtonClicked)):xrButton.innerHTML="AR not found",xrButton.disabled=!e}))}function onButtonClicked(){xrSession?xrSession.end():navigator.xr.requestSession("immersive-ar",{optionalFeatures:["dom-overlay"],domOverlay:{root:document.getElementById("overlay")}}).then(onSessionStarted,onRequestSessionError)}function onSessionStarted(e){xrSession=e,xrButton.innerHTML="Exit AR",e.domOverlayState&&(info.innerHTML="DOM Overlay type: "+e.domOverlayState.type),e.addEventListener("end",onSessionEnded);var n=document.createElement("canvas");gl=n.getContext("webgl",{xrCompatible:!0}),e.updateRenderState({baseLayer:new XRWebGLLayer(e,gl)}),e.requestReferenceSpace("viewer").then((function(n){xrRefSpace=n,e.requestAnimationFrame(onXRFrame)})),initScene(gl,e)}function onRequestSessionError(e){info.innerHTML="Failed to start AR session.",console.error(e.message)}function onSessionEnded(e){xrSession=null,xrButton.innerHTML="Enter AR",info.innerHTML="",gl=null}function getGPS(){window.addEventListener("deviceorientationabsolute",handleMotion,!0),watch=navigator.geolocation.watchPosition((function(e){function n(){return(n=_asyncToGenerator(regeneratorRuntime.mark((function e(n,r){var o,a;return regeneratorRuntime.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.next=2,new google.maps.LatLng(n,r);case 2:return o=e.sent,e.next=5,new google.maps.Map(document.createElement("div"),{center:o,zoom:15});case 5:return map=e.sent,e.next=8,{location:o,radius:"100",types:["school"]};case 8:return a=e.sent,e.next=11,new google.maps.places.PlacesService(map);case 11:return service=e.sent,e.next=14,service.nearbySearch(a,t);case 14:case"end":return e.stop()}}),e)})))).apply(this,arguments)}function t(e,n){buildInfo=e}gps={lat:e.coords.latitude,lon:e.coords.longitude};var r=36.317737,o=127.367731;0===buildInfo.length&&function(e,t){n.apply(this,arguments)}(r,o),buildInfo.length>0&&(buildInfo.forEach((function(e){var n,t=e.geometry.location.toJSON().lat,a=e.geometry.location.toJSON().lng,i=Math.sqrt((t-r)*(t-r)+(a-o)*(a-o)),l=t-r,s=a-o,c=180*Math.atan2(s,l)/Math.PI;n=c<0?c+360-compassDegree+20:c-compassDegree+20,sortArr.push({name:e.name,distance:i,angle:n,x:l,y:s})})),sortArr.sort((function(e,n){return e.angle<n.angle?-1:e.angle>n.angle?1:0})),navigator.geolocation.clearWatch(watch))}),(function(){alert("error")}),{enableHighAccuracy:!0,maximumAge:3e5,timeout:27e3})}function handleMotion(e){var n=e.webkitCompassHeading||Math.abs(e.alpha-360);compassDegree=Math.ceil(n)}function touchObj(e){e.preventDefault();var n=e.targetTouches[0].pageX/window.innerWidth*2-1,t=-e.targetTouches[0].pageY/window.innerHeight*2+1,r=new THREE.Vector2(n,t),o=new THREE.Raycaster;o.setFromCamera(r,camera);var a=o.intersectObjects(objects,!0);if(0!==a.length){var i=a[0].object.parent.parent.parent.parent.name;"배재대 김옥균관"===i&&(selectedObject=i),console.log(i,selectedObject)}}function updateAnimation(){playerVector&&model&&setFlag&&0!==sortArr.length&&(model.position.set(0,-.5,-3).applyMatrix4(controller.matrixWorld),model.quaternion.setFromRotationMatrix(controller.matrixWorld),model.rotateX(Math.PI),sortArr.forEach((function(e){var n=pivot.clone(),t=document.createElement("canvas"),r=t.getContext("2d");r.font="Bold 10px Arial",r.fillStyle="rgba(0, 0, 0, 1)",r.fillText(e.name,0,60);var o=new THREE.Texture(t);o.needsUpdate=!0;var a=new THREE.MeshBasicMaterial({map:o,side:THREE.DoubleSide});a.transparent=!0;var i=new THREE.Mesh(new THREE.PlaneGeometry(1,1),a);i.position.set(.5,-.3,-2).applyMatrix4(controller.matrixWorld),i.quaternion.setFromRotationMatrix(controller.matrixWorld),n.add(i),n.rotateY(-e.angle*Math.PI/180),n.name=e.name,scene.add(n),objects.push(n)})),setFlag=!1)}function onXRFrame(e,n){var t=n.session,r=n.getViewerPose(xrRefSpace);if(r){var o=r.views[0].transform.position;playerVector=new THREE.Vector3(o.x,o.y,o.z)}t.requestAnimationFrame(onXRFrame),updateAnimation(),gl.bindFramebuffer(gl.FRAMEBUFFER,t.renderState.baseLayer.framebuffer),renderer.render(scene,camera)}checkXR(),getGPS();export{compassDegree};