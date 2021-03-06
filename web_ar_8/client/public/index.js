import * as THREE from "./three/build/three.module.js";
import { GLTFLoader } from "./three/examples/jsm/loaders/GLTFLoader.js";

let renderer = null;
let scene = null;
let camera = null;
let playerVector = null;
let model = null;
let controller = null;
const mixers = [];
let then = 0;
const socket = io.connect("https://e5e8da1bda11.ngrok.io");
let itemValue = 0;
let socketID;
let scale = 0.1;
let reticle = null;
let xrHitTestSource = null;

socket.emit("firstConnect");

socket.on("firstConnect", (data) => {
  socketID = data;
});

socket.on("ReadPlayer", (data) => {
  itemValue = data.item;
  document.getElementById("info").innerHTML = `아이템 사용\n ${itemValue}개`;
});

const initScene = async (gl, session) => {
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
  renderer = await new THREE.WebGLRenderer({
    antialias: true, //위신호 제거
    alpha: true, //캔버스에 알파(투명도)버퍼가 있는지 여부
    autoClear: true, //프레임을 렌더링하기 전에 출력을 자동적으로 지우는지 여부
    context: gl, //기존 RenderingContext에 렌더러를 연결(gl)
  });

  const loader = new GLTFLoader();
  loader.load("./out.glb", (gltf) => {
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    gltf.scene.position.set(-c.x, size.y / 2 - c.y, -c.z);
    gltf.scene.scale.set(scale, scale, scale);
    const animsByName = {};
    gltf.animations.forEach((clip) => {
      animsByName[clip.name] = clip;
    });
    const mixer = new THREE.AnimationMixer(gltf.scene);
    const firstClip = Object.values(gltf.animations)[0];
    const action = mixer.clipAction(firstClip);
    action.play();
    mixers.push(mixer);

    model = new THREE.Object3D();
    model.add(gltf.scene);

    //scene.add(model);
  });
  renderer.setPixelRatio(window.devicePixelRatio); //장치 픽셀 비율 설정
  renderer.setSize(window.innerWidth, window.innerHeight); //사이즈 설정
  renderer.xr.enabled = true; //renderer로 xr을 사용할지 여부
  renderer.xr.setReferenceSpaceType("local"); //
  renderer.xr.setSession(session);
  document.body.appendChild(renderer.domElement);

  controller = renderer.xr.getController(0);
  controller.addEventListener("select", placeObject);
  document.getElementById("info").addEventListener("click", (e) => {
    e.stopPropagation();
    itemValue--;
    socket.emit("UseItem", socketID);
    scale += 0.03;
    model.children[0].scale.set(scale, scale, scale);
  });
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
  //---
};

function placeObject() {
  if (model && reticle.visible) {
    model.position.setFromMatrixPosition(reticle.matrix);
    scene.add(model);
    reticle.visible = false;
    xrHitTestSource.cancel();
    xrHitTestSource = null;
    controller.removeEventListener("select", placeObject);
  }
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
        requiredFeatures: ["hit-test"], //필수옵션
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

  session.requestReferenceSpace("viewer").then((refSpace) => {
    session
      .requestHitTestSource({
        space: refSpace,
        offsetRay: new XRRay(),
      })
      .then((hitTestSource) => {
        xrHitTestSource = hitTestSource;
      });
  });

  // here we ask for viewer reference space, since we will be casting a ray
  // from a viewer towards a detected surface. The results of ray and surface intersection
  session.requestReferenceSpace("local").then((refSpace) => {
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
  if (xrHitTestSource) xrHitTestSource.cancel();
  xrHitTestSource = null;
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
  if (intersects.length !== 0) {
    const object = intersects[0].object.parent.parent.parent.parent.name;
    if (object === "배재대 김옥균관") {
      selectedObject = object;
      xrSession.end();
    }
  } else {
    //div.style.visibility = "hidden";
  }
}

function updateAnimation(time) {
  //threeJs의 오브젝트들의 애니메이션을 넣는 곳
  time *= 0.001;
  const deltaTime = time - then;
  then = time;

  for (const mixer of mixers) {
    mixer.update(deltaTime);
  }
  socket.emit("ReadPlayer", socketID);
}

function onXRFrame(t, frame) {
  let session = frame.session; //매 프레임의 session
  let xrViewerPose = frame.getViewerPose(xrRefSpace); //xrViewerPose
  if (xrHitTestSource && xrViewerPose) {
    const hitTestResults = frame.getHitTestResults(xrHitTestSource);
    if (hitTestResults.length) {
      const pose = hitTestResults[0].getPose(xrRefSpace);
      reticle.matrix.fromArray(pose.transform.matrix);
      reticle.visible = true;
      xrButton.innerHTML = "준비완료";
    }
  } else {
    reticle.visible = false;
  }
  if (xrViewerPose) {
    const viewPos = xrViewerPose.views[0].transform.position;
    playerVector = new THREE.Vector3(viewPos.x, viewPos.y, viewPos.z);
  }
  session.requestAnimationFrame(onXRFrame); //onXRFrame을 반복 호출

  updateAnimation(t);
  //WebXr로 생성된 gl 컨텍스트를 threeJs 렌더러에 바인딩
  gl.bindFramebuffer(gl.FRAMEBUFFER, session.renderState.baseLayer.framebuffer);
  //threeJs의 씬을 렌더링
  renderer.render(scene, camera);
}

checkXR(); //브라우저가 로딩되면 checkXR을 실행
