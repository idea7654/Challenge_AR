import * as THREE from "https://unpkg.com/three/build/three.module.js";
import { ColladaLoader } from "https://threejs.org/examples/jsm/loaders/ColladaLoader.js";

let renderer = null;
let scene = null;
let camera = null;
let gps = null;
let compassDegree = null;
let watch = null;
let controller = null;
let model = null;
let otherPlayer = null;
let playerVector = null;
let otherObject = null;
const info = document.getElementById("info");
const socket = io.connect("https://79b6e8a67dc2.ngrok.io");

const initScene = (gl, session) => {
  //-- scene, camera(threeJs의 카메라, 씬 설정)
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  //---

  //--- light(빛 설정, 빛 설정을 하지 않으면 오브젝트가 검정색으로밖에 보이지 않는다)
  const light = new THREE.PointLight(0xffffff, 2, 100); // soft white light
  scene.add(light);
  //---
  // create and configure three.js renderer with XR support
  //XR을 사용하기 위해 threeJs의 renderer를 만들고 설정
  renderer = new THREE.WebGLRenderer({
    antialias: true, //위신호 제거
    alpha: true, //캔버스에 알파(투명도)버퍼가 있는지 여부
    autoClear: true, //프레임을 렌더링하기 전에 출력을 자동적으로 지우는지 여부
    context: gl, //기존 RenderingContext에 렌더러를 연결(gl)
  });

  const loader = new ColladaLoader();
  loader.load("model.dae", (collada) => {
    const box = new THREE.Box3().setFromObject(collada.scene);
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    collada.scene.position.set(-c.x, size.y / 2 - c.y, -c.z);
    //collada.scene.scale.set(0.001, 0.001, 0.001);
    model = new THREE.Object3D();
    model.add(collada.scene);
  });

  controller = renderer.xr.getController(0);
  renderer.setPixelRatio(window.devicePixelRatio); //장치 픽셀 비율 설정
  renderer.setSize(window.innerWidth, window.innerHeight); //사이즈 설정
  renderer.xr.enabled = true; //renderer로 xr을 사용할지 여부
  renderer.xr.setReferenceSpaceType("local"); //
  renderer.xr.setSession(session);
  document.body.appendChild(renderer.domElement);

  getGPS();
  //---
};

// AR세션을 시작하는 버튼
const xrButton = document.getElementById("xr-button");
// xrSession
let xrSession = null;
// xrReferenceSpace
let xrRefSpace = null;

//렌더링을 위한 캔버스 OpenGL 컨텍스트
let gl = null;

const fakeGps = {
  lat: 36.31774,
  lon: 127.370634,
};

function checkXR() {
  if (!window.isSecureContext) {
    //WebXR은 https환경에서만 사용가능.
    document.getElementById("warning").innerText =
      "WebXR unavailable. Please use secure context";
  }
  if (navigator.xr) {
    //navigator.xr을 지원하는지 여부
    navigator.xr.addEventListener("devicechange", checkSupportedState);
    checkSupportedState();
  } else {
    document.getElementById("warning").innerText =
      "WebXR unavailable for this browser";
  }
}

function checkSupportedState() {
  navigator.xr.isSessionSupported("immersive-ar").then((supported) => {
    //ArCore를 지원하는 디바이스의 크롬 브라우저인지 여부
    if (supported) {
      xrButton.innerHTML = "Enter AR";
      xrButton.addEventListener("click", onButtonClicked);
    } else {
      xrButton.innerHTML = "AR not found";
    }
    xrButton.disabled = !supported;
  });
}

function onButtonClicked() {
  if (!xrSession) {
    navigator.xr
      .requestSession("immersive-ar", {
        //세션요청
        optionalFeatures: ["dom-overlay"], //옵션(ex: dom-overlay, hit-test 등)
        //requiredFeatures: ['unbounded', 'hit-test'], //필수옵션
        domOverlay: {
          root: document.getElementById("overlay"),
        }, //dom-overlay사용시 어떤 요소에 적용할 것인지 명시
      })
      .then(onSessionStarted, onRequestSessionError);
  } else {
    xrSession.end();
  }
}

function onSessionStarted(session) {
  //세션요청을 성공하면 session값이 반환됨
  xrSession = session;
  xrButton.innerHTML = "Exit AR";

  if (session.domOverlayState) {
    info.innerHTML = "오브젝트가 설치될 때까지 움직이지 말아주세요!"; //session의 dom overlay타입 명시. Ar환경에서는
  }

  // create a canvas element and WebGL context for rendering
  //렌더링을 위한 캔버스 요소와 WebGL 컨텍스트를 만듬
  session.addEventListener("end", onSessionEnded);
  let canvas = document.createElement("canvas"); //HTML5 Canvas
  gl = canvas.getContext("webgl", {
    xrCompatible: true,
  });
  session.updateRenderState({
    baseLayer: new XRWebGLLayer(session, gl),
  }); //세션의 레이어 설정

  // here we ask for viewer reference space, since we will be casting a ray
  // from a viewer towards a detected surface. The results of ray and surface intersection
  session.requestReferenceSpace("viewer").then((refSpace) => {
    xrRefSpace = refSpace;
    //xrRefSpace -> viewer ReferenceSpace
    session.requestAnimationFrame(onXRFrame);
    //onXRFrame을 호출
  });

  // three.js의 씬을 초기화
  initScene(gl, session);
}

function onRequestSessionError(ex) {
  info.innerHTML = "Failed to start AR session.";
  console.error(ex.message);
}

function onSessionEnded(event) {
  //세션을 끝냈을때
  xrSession = null;
  xrButton.innerHTML = "Enter AR";
  info.innerHTML = "";
  gl = null;
}

function getGPS() {
  window.addEventListener("deviceorientationabsolute", handleMotion, true);
  function success(position) {
    gps = {
      lat: position.coords.latitude,
      lon: position.coords.longitude,
    };

    socket.emit("sendPlayerInfo", {
      id: socket.id,
      //gps: gps,
      gps: fakeGps,
      degree: compassDegree,
    });
  }

  function error() {
    //alert("error");
    console.log("error");
  }
  const options = {
    enableHighAccuracy: true,
    maximumAge: 300000,
    timeout: 27000,
  };
  watch = navigator.geolocation.watchPosition(success, error, options);
}

function handleMotion(event) {
  const compass = event.webkitCompassHeading || Math.abs(event.alpha - 360);
  compassDegree = Math.ceil(compass);
}

// function touchObj(event) {
//   event.preventDefault();
//   const x = (event.targetTouches[0].pageX / window.innerWidth) * 2 + -1;
//   const y = -(event.targetTouches[0].pageY / window.innerHeight) * 2 + 1;

//   const vector = new THREE.Vector2(x, y);
//   const raycast = new THREE.Raycaster();

//   raycast.setFromCamera(vector, camera);
//   const intersects = raycast.intersectObjects(objects, true);
//   //const div = document.getElementById("artInfo");
//   console.log(intersects);
//   if (intersects.length !== 0) {
//     console.log(intersects[0].object.parent.parent.parent.parent.name);
//   } else {
//     //div.style.visibility = "hidden";
//   }
// }

function updateAnimation() {
  //threeJs의 오브젝트들의 애니메이션을 넣는 곳
}

function onXRFrame(t, frame) {
  let session = frame.session; //매 프레임의 session
  let xrViewerPose = frame.getViewerPose(xrRefSpace); //xrViewerPose
  if (xrViewerPose) {
    const viewPos = xrViewerPose.views[0].transform.position;
    playerVector = new THREE.Vector3(viewPos.x, viewPos.y, viewPos.z);
  }
  session.requestAnimationFrame(onXRFrame); //onXRFrame을 반복 호출

  updateAnimation();
  //WebXr로 생성된 gl 컨텍스트를 threeJs 렌더러에 바인딩
  gl.bindFramebuffer(gl.FRAMEBUFFER, session.renderState.baseLayer.framebuffer);
  //threeJs의 씬을 렌더링
  renderer.render(scene, camera);
}

checkXR(); //브라우저가 로딩되면 checkXR을 실행
//getGPS();

//socket

socket.on("sendPlayerInfo", async (data) => {
  //players
  const index = await data.findIndex((i) => i.id == socket.id);
  await data.splice(index, 1);
  otherPlayer = await data[0];
  socket.emit("success", "데이터 받아오기 성공");
  if (otherPlayer && !otherObject) {
    //const dlat = -(otherPlayer.gps.lat - gps.lat);
    //const dlon = -(otherPlayer.gps.lon - gps.lon);
    const dlat = -(otherPlayer.gps.lon - fakeGps.lat);
    const dlon = -(otherPlayer.gps.lon - fakeGps.lon);
    const x = dlat * 111000;
    const z = dlon * 111000;
    model.position.set(0, 0, z).applyMatrix4(controller.matrixWorld);
    model.quaternion.setFromRotationMatrix(controller.matrixWorld);
    // const pivot = new THREE.Object3D();
    // pivot.position.set(playerVector.x, playerVector.y, playerVector.z);
    // pivot.add(model);
    // pivot.rotation.y += (compassDegree * Math.PI) / 360;
    // scene.add(pivot);
    // console.log(model.getWorldPosition(), compassDegree);

    otherObject = new THREE.Object3D();
    //otherObject.position.set(playerVector.x, playerVector.y, playerVector.z);
    otherObject.add(model);
    const angle = (Math.atan2(z, x) * 180) / Math.PI - compassDegree + 20;
    // const result = angle - compassDegree - 20;
    let realAngle = 0;
    if (angle < 0) {
      realAngle = angle + 360;
    }
    if (angle > 360) {
      realAngle = angle - 360;
    }
    otherObject.rotateY((-realAngle / 180) * Math.PI);
    otherObject.name = otherPlayer.id;
    scene.add(otherObject);
    info.innerHTML = `확인해보세요! 당신의 compass값은${compassDegree}`;
    socket.emit("working", { realAngle, x, z });
  }
  if (otherPlayer && otherObject) {
    //const dlat = -(otherPlayer.gps.lat - gps.lat);
    //const dlon = -(otherPlayer.gps.lon - gps.lon);
    const dlat = -(otherPlayer.gps.lat - fakeGps.lat);
    const dlon = -(otherPlayer.gps.lon - fakeGps.lon);
    const x = dlat * 111000;
    const z = dlon * 111000;
    model.position.set(0, 0, z).applyMatrix4(controller.matrixWorld);
    model.quaternion.setFromRotationMatrix(controller.matrixWorld);

    const angle = (Math.atan2(z, x) * 180) / Math.PI - compassDegree + 20;
    info.innerHTML = `확인해보세요! 당신의 compass값은${compassDegree}`;
    let realAngle = 0;
    if (angle < 0) {
      realAngle = angle + 360;
    }
    if (angle > 360) {
      realAngle = angle - 360;
    }

    const targetObj = scene.getObjectByName(otherPlayer.id, true);
    targetObj.rotation.set(0, 0, 0);
    targetObj.rotateY((-realAngle / 180) * Math.PI);

    //otherObject.position.set(playerVector.x, playerVector.y, playerVector.z);
    //otherObject.rotation.y += (compass * Math.PI) / 360;
    //생각해보자
    //1. 설치
    //2. 현재 있는것 -> 거리(z), 각도.
  }
});
