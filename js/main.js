import * as THREE from "three";
//import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { EXRLoader } from "three/addons/loaders/EXRLoader.js";

import LightController from './LightController.js';
var GUI = lil.GUI;
const  fragment = `
uniform float time;
uniform float progress;
uniform sampler2D texture1;
uniform sampler2D texture2;
uniform vec4 resolution;

varying vec2 vUv;
varying float vFrontShadow;
// varying float vBackShadow;
// varying float vProgress;

void main() {
  vec2 newUV = (vUv - vec2(0.5))*resolution.zw + vec2(0.5);

  gl_FragColor = texture2D(texture1,newUV);
    gl_FragColor.rgb *=vFrontShadow;
    gl_FragColor.a = clamp(progress*5.,0.,1.);
}
`;
const vertex = `
uniform float time;
uniform float angle;
uniform float progress;
uniform vec4 resolution;
varying vec2 vUv;
varying float vFrontShadow;
// varying float vBackShadow;
// varying float vProgress;

uniform sampler2D texture1;
uniform sampler2D texture2;
uniform vec2 pixels;

const float pi = 3.1415925;

mat4 rotationMatrix(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    
    return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                0.0,                                0.0,                                0.0,                                1.0);
}
vec3 rotate(vec3 v, vec3 axis, float angle) {
  mat4 m = rotationMatrix(axis, angle);
  return (m * vec4(v, 1.0)).xyz;
}




void main() {
  vUv = uv;
  float pi = 3.14159265359;


  float finalAngle = angle - 0.*0.3*sin(progress*6.);

  // @todo account for aspect ratio!!!
  vec3 newposition = position;

  // float angle = pi/10.;
  float rad = 0.1;
  float rolls = 8.;
  // rot
  newposition = rotate(newposition - vec3(-.5,.5,0.), vec3(0.,0.,1.),-finalAngle) + vec3(-.5,.5,0.);

  float offs = (newposition.x + 0.5)/(sin(finalAngle) + cos(finalAngle)) ; // -0.5..0.5 -> 0..1
  float tProgress = clamp( (progress - offs*0.99)/0.01 , 0.,1.);

  // shadows
  vFrontShadow = clamp((progress - offs*0.95)/0.05,0.7,1.);
  // vBackShadow = 1. - clamp(abs((progress - offs*0.9)/0.1),0.,1.);
  // vProgress = clamp((progress - offs*0.95)/0.05,0.,1.);

  

  newposition.z =  rad + rad*(1. - offs/2.)*sin(-offs*rolls*pi - 0.5*pi);
  newposition.x =  - 0.5 + rad*(1. - offs/2.)*cos(-offs*rolls*pi + 0.5*pi);
  // // rot back
  newposition = rotate(newposition - vec3(-.5,.5,0.), vec3(0.,0.,1.),finalAngle) + vec3(-.5,.5,0.);
  // unroll
  newposition = rotate(newposition - vec3(-.5,0.5,rad), vec3(sin(finalAngle),cos(finalAngle),0.), -pi*progress*rolls);
  newposition +=  vec3(
    -.5 + progress*cos(finalAngle)*(sin(finalAngle) + cos(finalAngle)), 
    0.5 - progress*sin(finalAngle)*(sin(finalAngle) + cos(finalAngle)),
    rad*(1.-progress/2.)
  );

  // animation
  vec3 finalposition = mix(newposition,position,tProgress);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(finalposition, 1.0 );
}
`;

//import fragment from "./shader/fragment.glsl";
//import vertex from "./shader/vertex.glsl";
//import GUI from "lil-gui";
//import gsap from "gsap";
const disp = "./img/displacement.exr";
const normals = "./img/normal.png";
const map = "./img/stickers.svg";


export default class Sketch {
  constructor(options) {
    this.scene = new THREE.Scene();

    this.container = options.dom;
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    //this.renderer = new THREE.WebGLRenderer();
    this.renderer = new THREE.WebGLRenderer({
       outputColorSpace: THREE.sRGBEncoding,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.width, this.height);
    this.renderer.setClearColor(0xeeeeee, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
    // this.renderer.physicallyCorrectLights = true;
    //this.renderer.outputEncoding = THREE.sRGBEncoding;

    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.001,
      1000
    );

    // var frustumSize = 10;
    // var aspect = window.innerWidth / window.innerHeight;
    // this.camera = new THREE.OrthographicCamera( frustumSize * aspect / - 2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / - 2, -1000, 1000 );
    this.camera.position.set(0, 0, 2.8);
    //this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.time = 0;

    this.dracoLoader = new DRACOLoader();
    /*this.dracoLoader.setDecoderPath(
      "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/js/libs/draco/"
    ); */// use a full url path
    this.gltf = new GLTFLoader();
    this.gltf.setDRACOLoader(this.dracoLoader);

    this.isPlaying = true;

    let r = new THREE.AmbientLight(0xffffff,0.75);
    this.scene.add(r);
    let s = new THREE.DirectionalLight(0xffffff,0.75);
    s.position.set(0, 10, 0);
    s.castShadow = true;
    this.scene.add(s);
     let pl = new THREE.PointLight(0xffffff,100);
     pl.castShadow = true;
     pl.position.set(2, 5, 2);
     this.scene.add(pl);

    //this.scene.add(r,s,pl);

    //const lightHelper = new THREE.PointLightHelper(pl);
    //this.scene.add(lightHelper);

    new EXRLoader().load(disp, (texture, textureData) => {
      this.displacementTexture = texture;
      this.addObjects();
      this.resize();
      this.render();
      this.setupResize();
    });

    this.settings();
  }

  settings() {
              let that = this;
              this.settings = {
                    progress: window.pageYOffset > this.container.offsetHeight ? 2 : (window.pageYOffset / this.container.offsetHeight) * 2,
                    progress1: 0,
                    rot: 0,
                    ambientLightIntensity: 0.75,
                    directionalLightIntensity: 0.75,
                    directionalLightPosition: [0, 10, 0],
                    directionalLightColor: 0xffffff,
                    pointLightIntensity: 100,
                    pointLightPosition: [2, 5, 2],
                    pointLightColor: 0xffffff,
            };

            this.gui = new GUI();
            this.gui.add(this.settings, "progress", -1, 1, 0.01);
            this.gui.add(this.settings, "progress1", -1, 1, 0.01);
            this.gui.add(this.settings, "rot", -3, 3, 0.01);

            this.ambientLight = new THREE.AmbientLight(this.settings.ambientLightColor, this.settings.ambientLightIntensity);
            this.scene.add(this.ambientLight);

            this.directionalLight = new THREE.DirectionalLight(this.settings.directionalLightColor, this.settings.directionalLightIntensity);
            this.directionalLight.position.set(this.settings.directionalLightPosition[0], this.settings.directionalLightPosition[1], this.settings.directionalLightPosition[2]);
            this.scene.add(this.directionalLight);
               
            this.pointLight = new THREE.PointLight(this.settings.pointLightColor, this.settings.pointLightIntensity);
            this.pointLight.castShadow = true; 
            this.pointLight.position.set(this.settings.pointLightPosition[0], this.settings.pointLightPosition[1], this.settings.pointLightPosition[2]);
            this.scene.add(this.pointLight);
          
            new LightController(
                this.renderer,
                this.scene,
                this.gui,
                this.settings
            );

  }

  setupResize() {
    window.addEventListener("resize", this.resize.bind(this));
    document.addEventListener('mousemove', this.onDocumentMouseMove.bind(this), false);
    //window.addEventListener('wheel', this.onWindowScroll.bind(this), false);
    window.addEventListener('scroll', this.onWindowScroll.bind(this), false);
  }
  onDocumentMouseMove(event) {
    this.mouseX = -(event.clientX / window.innerWidth) * 2 + 1;
    this.mouseY = +(event.clientY / window.innerHeight) * 2 - 1;
  }
  
  onWindowScroll(event) {
    if( window.pageYOffset < this.container.offsetHeight  ){
        const delta = event.deltaY * 0.005;
        const newProgress = this.settings.progress + delta;
        //this.settings.progress = Math.max(Math.min(newProgress, 2), -1);
        this.settings.progress = (window.pageYOffset / this.container.offsetHeight) * 2;
      }
  }

  resize() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;

    this.camera.updateProjectionMatrix();
  }

  addObjects(mapObj) {
    let that = this;
    let Da = 1.7;
    this.material = new THREE.MeshPhongMaterial({
      transparent: !0,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      //color: 0xFFFFFF,
      map:  new THREE.TextureLoader().load(map),
      displacementMap: this.displacementTexture,
      normalMap: new THREE.TextureLoader().load(normals),
    });

    this.aspect = 1;
    this.scale = 0.5;
    this.rotation = 0;

    this.material.onBeforeCompile = (shader) => {
      shader.uniforms.translate = {
        value: new THREE.Vector2(0, 0),
      };
      shader.uniforms.scale = {
        value: new THREE.Vector2(this.scale, this.scale * 6),
      };
      shader.uniforms.aspect = {
        value: new THREE.Vector2(this.aspect * 2, 2),
      };
      shader.uniforms.rotation = {
        value: THREE.MathUtils.degToRad(this.rotation),
      };
      shader.uniforms.distance = {
        value: this.distance,
      };
      shader.vertexShader = shader.vertexShader.replace(
        "#include <clipping_planes_pars_vertex>",
        `
#include <clipping_planes_pars_vertex>
uniform float rotation;
uniform float distance;
uniform vec2 aspect;
uniform vec2 translate;
uniform vec2 scale;

varying vec2 vDisplacementUv;

#define BASE_DISTANCE 1.4
#define DISPLACEMENT_DISTANCE 1.25

float map(float value, float min1, float max1, float min2, float max2) {
  return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

vec2 rotate(vec2 v, float a) {
  float s = sin(a);
  float c = cos(a);
  mat2 m = mat2(c, -s, s, c);
  return m * v;
}
`
      );
      shader.vertexShader = shader.vertexShader.replace(
        "#include <project_vertex>",
        `
        // #include <project_vertex>
// vec2 offset = (position.xy / 2.);
// vec2 rotated = offset;
//vec2 pos = position.xy/2. *scale+ translate;
vec2 offset = (position.xy / aspect);
vec2 rotated = rotate(offset, rotation);
vec2 pos = rotated * scale + translate;

// pos = position.xy;
float u = fract(pos.x + 0.5);
float v = fract(map(pos.y, -${Da}, ${Da}, 0.0, 1.0));
// v = pos.y/4.;
vec2 displacementUv = vec2(u, v);
float displacement = (texture2D(displacementMap, displacementUv).r - 0.5) * 2.0;

float baseDist = BASE_DISTANCE + DISPLACEMENT_DISTANCE * displacement;
vec2 positionOnCircle = rotate(vec2(0.0, baseDist + distance), pos.x * PI2);
vec3 displacedPosition = vec3(positionOnCircle.x, pos.y, positionOnCircle.y);
vec4 mvPosition = vec4(displacedPosition, 1.0);

vDisplacementUv = displacementUv;
//vDisplacementUv = vec2(u,v);
mvPosition = modelViewMatrix * mvPosition;
 gl_Position = projectionMatrix * viewMatrix * vec4(displacedPosition, 1.0);
`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        `
#include <common>
varying vec2 vDisplacementUv;
`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <normal_fragment_maps>",
        `
#include <normal_fragment_maps>
normal = texture2D(normalMap, vDisplacementUv).xyz * 2.0 - 1.0;
 //diffuseColor.rgb= vec3(vDisplacementUv,0.);
`
      );
      this.material.userData.shader = shader;
    };

    let a = new THREE.PlaneGeometry(2, 2, 100, 100);
    this.mesh = new THREE.Mesh(a, this.material);
    this.mesh.castShadow = true; //default is false
    this.mesh.receiveShadow = false; //default
    this.scene.add(this.mesh);
  }

  stop() {
    this.isPlaying = false;
  }

  play() {
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.render();
    }
  }

  render() {
    if (!this.isPlaying) return;
    requestAnimationFrame(this.render.bind(this));

    // Update camera position based on mouse movement
    this.vector = new THREE.Vector3(this.mouseX, this.mouseY, 0.5).unproject(this.camera);
    this.lookAt = this.vector.sub(this.camera.position).normalize();
    const damping = 0.1; 
    this.camera.position.x += (this.lookAt.x * 0.5 - this.camera.position.x) * damping;
    this.camera.position.y += (this.lookAt.y * 0.5 - this.camera.position.y) * damping;
    //this.camera.position.z = 2;
    this.camera.lookAt(this.scene.position);


    this.renderer.render(this.scene, this.camera);
    if(typeof this.material !== 'undefined' && this.material.userData.shader) {

      this.material.userData.shader.uniforms.translate.value.x = this.settings.progress/5;
      this.material.userData.shader.uniforms.translate.value.y = this.settings.progress;
      this.material.userData.shader.uniforms.rotation.value = this.settings.rot;
    }
  }
}

new Sketch({
  dom: document.getElementById("threedface"),
});
