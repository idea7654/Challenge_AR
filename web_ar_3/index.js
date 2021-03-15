import * as THREE from "https://unpkg.com/three/build/three.module.js";
import { ColladaLoader } from "https://threejs.org/examples/jsm/loaders/ColladaLoader.js";

let renderer = null;
let scene = null;
let camera = null;
let reticle = null; //hit-test결과를 3D 오브젝트로 표시
let xrHitTestSource = null;
let model = null;
let controller = null;
let initialX = null;

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

  const loader = new ColladaLoader();
  loader.load("model.dae", (collada) => {
    model = new THREE.Object3D();
    const box = new THREE.Box3().setFromObject(collada.scene);

    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    collada.scene.position.set(-c.x, size.y / 2 - c.y, -c.z);

    model.add(collada.scene);
  });

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
  renderer.setPixelRatio(window.devicePixelRatio); //장치 픽셀 비율 설정
  renderer.setSize(window.innerWidth, window.innerHeight); //사이즈 설정
  renderer.xr.enabled = true; //renderer로 xr을 사용할지 여부
  renderer.xr.setReferenceSpaceType("local"); //
  renderer.xr.setSession(session);
  document.body.appendChild(renderer.domElement);
  //---

  controller = renderer.xr.getController(0);
  controller.addEventListener("select", onSelect);
  scene.add(controller);

  reticle = new THREE.Mesh(
    new THREE.RingBufferGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
    new THREE.MeshPhongMaterial({
      color: 0x0fff00,
    })
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  document.getElementById("reset").onclick = (ev) => {
    ev.stopPropagation();
    if (model) {
      model.visible = false;
      reticle.visible = true;
      requestHitTestSource(xrSession);
      document.body.addEventListener("click", placeObject);
    }
  };
};
async function placeObject(e) {
  e.stopPropagation();
  model.position.setFromMatrixPosition(reticle.matrix);
  model.visible = true;
  reticle.visible = false;
  xrHitTestSource.cancel();
  xrHitTestSource = null;
  document.getElementById("warn").innerHTML = "";
  document.removeEventListener("click", placeObject);
}

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
        requiredFeatures: ["hit-test", "depth-sensing"], //필수옵션
        domOverlay: {
          root: document.getElementById("overlay"),
        }, //dom-overlay사용시 어떤 요소에 적용할 것인지 명시
        depthSensing: {
          usagePreference: ["gpu-optimized"],
          formatPreference: ["luminance-alpha"],
        },
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
    //info.innerHTML = "DOM Overlay type: " + session.domOverlayState.type; //session의 dom overlay타입 명시. Ar환경에서는
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

  requestHitTestSource(session);
  session.requestReferenceSpace("local").then((refSpace) => {
    xrRefSpace = refSpace;
    //xrRefSpace -> viewer ReferenceSpace
    session.requestAnimationFrame(onXRFrame);
    //onXRFrame을 호출
  });

  // three.js의 씬을 초기화
  initScene(gl, session);
}

function requestHitTestSource(session) {
  session.requestReferenceSpace("viewer").then((refSpace) => {
    //refSpace는 viewer
    session
      .requestHitTestSource({
        space: refSpace,
        offsetRay: new XRRay(), //XRRay를 지정하여 ray를 발사
        //entityTypes: ["mesh"] //hit-test의 인식타입. [mesh, plane, point]가 있으며 물체, 평면, 점을 인식한다
      })
      .then((hitTestSource) => {
        xrHitTestSource = hitTestSource; //hitTestSource -> 어떤 타입을 인식할 지를 결정한 소스
      });
  });
}

function onRequestSessionError(ex) {
  //info.innerHTML = "Failed to start AR session.";
  console.error(ex.message);
}

function onSessionEnded(event) {
  //세션을 끝냈을때
  xrSession = null;
  xrButton.innerHTML = "Enter AR";
  //info.innerHTML = "";
  gl = null;
  if (xrHitTestSource) xrHitTestSource.cancel(); //hitTestSource를 취소하여 더이상 트래킹을 하지 않음
  xrHitTestSource = null;
}

function updateAnimation() {
  //threeJs의 오브젝트들의 애니메이션을 넣는 곳
}

function onSelect() {
  if (reticle.visible && model) {
    model.position.setFromMatrixPosition(reticle.matrix);
    scene.add(model);
    reticle.visible = false;
    xrHitTestSource.cancel();
    xrHitTestSource = null;
    controller.removeEventListener("select", onSelect);
    document.body.addEventListener("touchstart", handleTouchStart);
    document.body.addEventListener("touchmove", handleTouchMove);
    document.body.addEventListener("touchend", handleTouchEnd);
  }
}

function handleTouchStart(e) {
  initialX = e.touches[0].clientX;
}

function handleTouchMove(e) {
  if (initialX !== null) {
    const currentX = e.touches[0].clientX;

    let diffX = initialX - currentX;

    if (diffX > 0) {
      setInterval((model.rotation.y -= 0.03), 33);
    } else {
      setInterval((model.rotation.y += 0.03), 33);
    }
  }
}

function handleTouchEnd() {
  initialX = null;
}

function onXRFrame(t, frame) {
  let session = frame.session; //매 프레임의 session
  let xrViewerPose = frame.getViewerPose(xrRefSpace); //xrViewerPose
  session.requestAnimationFrame(onXRFrame); //onXRFrame을 반복 호출
  // let depthInfo = null;
  // if (xrViewerPose) {
  //   depthInfo = frame.getDepthInformation(xrViewerPose.views[0]);
  // }

  // if (depthInfo) {
  // const x = 0.5;
  // const y = 0.5;
  //depthInMeters = depthInfo.getDepth(x, y);
  // for (let i = 0; i < depthInfo.width; i += 10) {
  //   for (let j = 0; j < depthInfo.height; j += 10) {
  //     let customMeters = depthInfo.getDepth(i, j);
  //     if (customMeters > 2) {
  //       console.log(i, j, customMeters);
  //     }
  //     //여기에 depth-sensing으로 겹쳐지면 안보이게 하는 로직 구현을 해야함
  //   }
  // }
  // }

  if (xrHitTestSource && xrViewerPose) {
    //AR view의 기기 화면 중앙에서 Ray를 발사하여 hit-test결과를 얻는다.
    //결과는 Ray가 하나 이상의 감지된 표면과 교차했음을 나타낸다.
    const hitTestResults = frame.getHitTestResults(xrHitTestSource);
    if (hitTestResults.length) {
      //교차점의 로컬좌표를 얻어옴
      const pose = hitTestResults[0].getPose(xrRefSpace);
      //교차점에 reticle오브젝트 설치
      reticle.matrix.fromArray(pose.transform.matrix);
      reticle.visible = true;
    }
  } else {
    //교차가 없으면 보이지 않음
    reticle.visible = false;
  }

  updateAnimation();
  //WebXr로 생성된 gl 컨텍스트를 threeJs 렌더러에 바인딩
  gl.bindFramebuffer(gl.FRAMEBUFFER, session.renderState.baseLayer.framebuffer);
  //threeJs의 씬을 렌더링
  renderer.render(scene, camera);
}

checkXR(); //브라우저가 로딩되면 checkXR을 실행
