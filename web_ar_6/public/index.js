// import * as THREE from "../node_modules/three/build/three.module.js";
// import { ColladaLoader } from "../node_modules/three/examples/jsm/loaders/ColladaLoader.js";
// import { Interaction } from "../node_modules/three.interaction/build/three.interaction.module.js";
//import * as THREE from "three";
// import { ColladaLoader } from "three/examples/jsm/loaders/ColladaLoader";
import * as THREE from "https://unpkg.com/three/build/three.module.js";
import { ColladaLoader } from "https://threejs.org/examples/jsm/loaders/ColladaLoader.js";

let renderer = null;
let scene = null;
let camera = null;
export let buildInfo = [];
let gps = null;
let map = null;
let service = null;
let compassDegree = null;
let watch = null;
let sortArr = [];
let playerVector = null;
let model = null;
let setFlag = true;
let pivot = null;
let controller = null;
let objects = [];

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
  loader.load("model2.dae", (collada) => {
    const box = new THREE.Box3().setFromObject(collada.scene);
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    collada.scene.position.set(-c.x, size.y / 2 - c.y, -c.z);
    collada.scene.scale.set(0.5, 0.5, 0.5);
    model = new THREE.Object3D();
    model.add(collada.scene);

    pivot = new THREE.Object3D();
    pivot.position.set(0, 0, 0);
    pivot.add(model);
    document.getElementById("overlay").addEventListener("touchstart", touchObj);
  });

  controller = renderer.xr.getController(0);
  renderer.setPixelRatio(window.devicePixelRatio); //장치 픽셀 비율 설정
  renderer.setSize(window.innerWidth, window.innerHeight); //사이즈 설정
  renderer.xr.enabled = true; //renderer로 xr을 사용할지 여부
  renderer.xr.setReferenceSpaceType("local"); //
  renderer.xr.setSession(session);
  document.body.appendChild(renderer.domElement);
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
    info.innerHTML = "DOM Overlay type: " + session.domOverlayState.type; //session의 dom overlay타입 명시. Ar환경에서는
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

    async function initMap(lat, lon) {
      const pyrmont = await new google.maps.LatLng(lat, lon);
      map = await new google.maps.Map(document.createElement("div"), {
        center: pyrmont,
        zoom: 15,
      });
      const request = await {
        location: pyrmont,
        radius: "100",
        types: ["school"],
      };
      service = await new google.maps.places.PlacesService(map);
      await service.nearbySearch(request, callback);
    }

    function callback(results, status) {
      //            if (status == google.maps.places.PlacesServiceStatus.OK) {
      //                buildInfo = results;
      //            }
      buildInfo = results;
    }
    const fakeGPS = {
      lat: 36.317737,
      lon: 127.367731,
    };

    if (buildInfo.length === 0) {
      // initMap(gps.lat, gps.lon);
      initMap(fakeGPS.lat, fakeGPS.lon);
    }

    if (buildInfo.length > 0) {
      buildInfo.forEach((data) => {
        const latitude = data.geometry.location.toJSON().lat;
        const longitude = data.geometry.location.toJSON().lng;
        // const distance = Math.sqrt(
        //   (latitude - gps.lat) * (latitude - gps.lat) +
        //     (longitude - gps.lon) * (longitude - gps.lon)
        // );
        // const x = latitude - gps.lat;
        // const y = longitude - gps.lon;
        const distance = Math.sqrt(
          (latitude - fakeGPS.lat) * (latitude - fakeGPS.lat) +
            (longitude - fakeGPS.lon) * (longitude - fakeGPS.lon)
        );
        const x = latitude - fakeGPS.lat;
        const y = longitude - fakeGPS.lon;
        const angle = (Math.atan2(y, x) * 180) / Math.PI;
        let realAngle = 0;
        if (angle < 0) {
          realAngle = angle + 360 - compassDegree + 20;
        } else {
          realAngle = angle - compassDegree + 20;
        }
        //유저 디바이스 - 90도
        //건물 - 200도
        sortArr.push({
          name: data.name,
          distance: distance,
          angle: realAngle,
          x: x,
          y: y,
        });
      });
      sortArr.sort((a, b) => {
        return a.angle < b.angle ? -1 : a.angle > b.angle ? 1 : 0;
      });
      // console.log(sortArr);
      navigator.geolocation.clearWatch(watch);
    }
  }

  function error() {
    alert("error");
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
  //    navigator.geolocation.clearWatch(watch);
  //const div = document.getElementById("artInfo");
  //div.style.visibility = "visible";
  //div.innerHTML = `gyro: ${compassDegree}`;
}

function touchObj(event) {
  event.preventDefault();
  const x = (event.targetTouches[0].pageX / window.innerWidth) * 2 + -1;
  const y = -(event.targetTouches[0].pageY / window.innerHeight) * 2 + 1;

  const vector = new THREE.Vector2(x, y);
  const raycast = new THREE.Raycaster();

  raycast.setFromCamera(vector, camera);
  const intersects = raycast.intersectObjects(objects, true);
  //const div = document.getElementById("artInfo");
  console.log(intersects);
  if (intersects.length !== 0) {
    console.log(intersects[0].object.parent.parent.parent.parent.name);
  } else {
    //div.style.visibility = "hidden";
  }
}

function updateAnimation() {
  //threeJs의 오브젝트들의 애니메이션을 넣는 곳
  if (playerVector && model && setFlag && sortArr.length !== 0) {
    model.position.set(0, -0.5, -3).applyMatrix4(controller.matrixWorld);
    model.quaternion.setFromRotationMatrix(controller.matrixWorld);
    model.rotateX(Math.PI);
    // document.getElementById(
    //   "warn"
    // ).innerHTML = `angle: ${sortArr[1].angle}, name: ${sortArr[1].name}`;
    //const arrow = sortArr[0];
    sortArr.forEach((data) => {
      const pivotClone = pivot.clone();
      const canvas1 = document.createElement("canvas");
      const context1 = canvas1.getContext("2d");
      context1.font = "Bold 10px Arial";
      context1.fillStyle = "rgba(0, 0, 0, 1)";
      context1.fillText(data.name, 0, 60);

      const texture1 = new THREE.Texture(canvas1);
      texture1.needsUpdate = true;
      const material1 = new THREE.MeshBasicMaterial({
        map: texture1,
        side: THREE.DoubleSide,
      });
      material1.transparent = true;

      const mesh1 = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material1);
      mesh1.position.set(0.5, -0.3, -2).applyMatrix4(controller.matrixWorld);
      mesh1.quaternion.setFromRotationMatrix(controller.matrixWorld);
      pivotClone.add(mesh1);
      pivotClone.rotateY((-data.angle * Math.PI) / 180);
      pivotClone.name = data.name;
      scene.add(pivotClone);
      objects.push(pivotClone);
    });
    setFlag = false;
  }
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
getGPS();

export { compassDegree };
