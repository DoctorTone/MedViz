import $ from "jquery";
import * as THREE from "three";

import { BaseApp } from "./baseApp";
import { APPCONFIG } from "./appConfig";
import { LabelManager } from "./LabelManager";
import bootstrap from "bootstrap";
// Shaders
const vshader = `
void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fshader = `
    precision mediump sampler3D;

    uniform vec3 u_color;
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform sampler3D u_data;

    float plot(vec2 st) {
        return smoothstep(0.01, 0.0, abs(st.y - st.x));
    }

    void main() {
        vec3 color = vec3(0.6);

        gl_FragColor = texture(u_data, gl_FragCoord.xyz);
        //gl_FragColor = vec4(vec3(0.0), 1.0);
        gl_FragColor.a = texture(u_data, gl_FragCoord.xyz).a;
    }
`

const uniforms = {
    u_color: { value: new THREE.Color(0xff0000)},
    u_time: { value: 0.0},
    u_mouse: { value: {x: 0.0, y: 0.0}},
    u_resolution: { value: {x:0, y:0}},
    u_data: { value: null}
};

class MedViz extends BaseApp {
    constructor() {
        super();
        this.labelManager = new LabelManager();
        this.cameraRotate = false;
        this.rotSpeed = Math.PI/20;
        this.rotDirection = 1;
        this.zoomingIn = false;
        this.zoomingOut = false;
        this.zoomSpeed = APPCONFIG.ZOOM_SPEED;

        //Temp variables
        this.tempVec = new THREE.Vector3();
    }

    setContainer(container) {
        this.container = container;
    }

    init(container) {
        if (!container) {
            container = document.getElementById("WebGL-Output");
            if (!container) {
                alert("No container specified!");
                return;
            }
        }
        this.container = container;
        super.init(container);
    }

    addGroundPlane() {
        const groundGeom = new THREE.PlaneBufferGeometry(APPCONFIG.GROUND_WIDTH, APPCONFIG.GROUND_HEIGHT, APPCONFIG.GROUND_SEGMENTS);
        const groundMat = new THREE.MeshLambertMaterial( {color: APPCONFIG.GROUND_MATERIAL} );
        const ground = new THREE.Mesh(groundGeom, groundMat);
        ground.rotation.x = -Math.PI/2;
        ground.position.y = 0;
        this.root.add(ground);
    }

    createScene() {
        // Init base createsScene
        super.createScene();
        // Create root object.
        this.root = new THREE.Object3D();
        this.addToScene(this.root);
        this.root.rotation.y = APPCONFIG.ROOT_ROTATE;

        // Add ground
        //this.addGroundPlane();
        uniforms.u_resolution.value.x = window.innerWidth;
        uniforms.u_resolution.value.y = window.innerHeight;
        /*
        let planeGeom = new THREE.PlaneBufferGeometry(10, 10);
        let planeMat = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: vshader,
            fragmentShader: fshader
        });

        let plane = new THREE.Mesh(planeGeom, planeMat);
        this.root.add(plane);
        */

        const TEXTURE_SIZE_X = 20;
        const TEXTURE_SIZE_Y = 20;
        const TEXTURE_SIZE_Z = 20;
        const totalBytes = TEXTURE_SIZE_X * TEXTURE_SIZE_Y * TEXTURE_SIZE_Z;
        let textureData = new Uint8Array(totalBytes);
        for (let i=0; i<totalBytes; ++i) {
            textureData[i] = 0;
        }

        let texture3D = new THREE.DataTexture3D(textureData, TEXTURE_SIZE_X, TEXTURE_SIZE_Y, TEXTURE_SIZE_Z);
        texture3D.format = THREE.LuminanceFormat;
        texture3D.type = THREE.UnsignedByteType;
        texture3D.minFilter = texture3D.magFilter = THREE.LinearFilter;
        texture3D.unpackAlignment = 1;

        uniforms.u_data.value = texture3D;

        let cubeMat = new THREE.ShaderMaterial({
            blending: THREE.NormalBlending,
            transparent: true,
            uniforms: uniforms,
            vertexShader: vshader,
            fragmentShader: fshader
        });

        let cubeGeom = new THREE.BoxBufferGeometry( TEXTURE_SIZE_X, TEXTURE_SIZE_Y, TEXTURE_SIZE_Z );
        let cube = new THREE.Mesh(cubeGeom, cubeMat);
        this.root.add(cube);
    }

    update() {
        let delta = this.clock.getDelta();
        uniforms.u_time.value = this.clock.getElapsedTime();

        if (this.cameraRotate) {
            this.root.rotation[this.rotAxis] += (this.rotSpeed * this.rotDirection * delta);
        }

        if(this.zoomingIn) {
            this.tempVec.copy(this.camera.position);
            this.tempVec.multiplyScalar(this.zoomSpeed * delta);
            this.root.position.add(this.tempVec);
            //DEBUG
            //console.log("Root = ", this.root.position);
        }

        if(this.zoomingOut) {
            this.tempVec.copy(this.camera.position);
            this.tempVec.multiplyScalar(this.zoomSpeed * delta);
            this.root.position.sub(this.tempVec);
            //DEBUG
            //console.log("Root = ", this.root.position);
        }

        super.update();
    }

    windowResize(event) {
        uniforms.u_resolution.value.x = window.innerWidth;
        uniforms.u_resolution.value.y = window.innerHeight;

        super.windowResize(event);
    }

    rotateCamera(status, direction) {
        switch (direction) {
            case APPCONFIG.RIGHT:
                this.rotDirection = 1;
                this.rotAxis = `y`;
                break;

            case APPCONFIG.LEFT:
                this.rotDirection = -1;
                this.rotAxis = `y`;
                break;

            case APPCONFIG.UP:
                this.rotDirection = 1;
                this.rotAxis = `x`;
                break;

            case APPCONFIG.DOWN:
                this.rotDirection = -1;
                this.rotAxis = `x`;
                break;

            default:
                break;
        };
         
        this.cameraRotate = status;
    }

    zoomIn(status) {
        this.zoomingIn = status;
    }

    zoomOut(status) {
        this.zoomingOut = status;
    }
}

$(document).ready( () => {
    
    const container = document.getElementById("WebGL-Output");
    const app = new MedViz();

    app.init(container);
    app.createScene();

    app.run();

    // Elements
    let rotateLeft = $("#rotateLeft");
    let rotateRight = $("#rotateRight");
    let rotateUp = $("#rotateUp");
    let rotateDown = $("#rotateDown");
    let zoomIn = $("#zoomIn");
    let zoomOut = $("#zoomOut");

    // Mouse interaction
    rotateLeft.on("mousedown", () => {
        app.rotateCamera(true, APPCONFIG.LEFT);
    });

    rotateLeft.on("mouseup", () => {
        app.rotateCamera(false);
    });

    rotateRight.on("mousedown", () => {
        app.rotateCamera(true, APPCONFIG.RIGHT);
    });

    rotateRight.on("mouseup", () => {
        app.rotateCamera(false);
    });

    rotateUp.on("mousedown", () => {
        app.rotateCamera(true, APPCONFIG.UP);
    });

    rotateUp.on("mouseup", () => {
        app.rotateCamera(false);
    });

    rotateDown.on("mousedown", () => {
        app.rotateCamera(true, APPCONFIG.DOWN);
    });

    rotateDown.on("mouseup", () => {
        app.rotateCamera(false);
    });

    zoomIn.on("mousedown", () => {
        app.zoomIn(true);
    });

    zoomIn.on("mouseup", () => {
        app.zoomIn(false);
    });

    zoomOut.on("mousedown", () => {
        app.zoomOut(true);
    });

    zoomOut.on("mouseup", () => {
        app.zoomOut(false);
    });

    zoomOut.on("mousedown", () => {
        app.zoomOut(true);
    });

    zoomOut.on("mouseup", () => {
        app.zoomOut(false);
    });

    // Touch interaction
    rotateLeft.on("touchstart", () => {
        app.rotateCamera(true, APPCONFIG.LEFT);
    });

    rotateLeft.on("touchend", () => {
        app.rotateCamera(false);
    });

    rotateRight.on("touchstart", () => {
        app.rotateCamera(true, APPCONFIG.RIGHT);
    });

    rotateRight.on("touchend", () => {
        app.rotateCamera(false);
    });

    rotateUp.on("touchstart", () => {
        app.rotateCamera(true, APPCONFIG.UP);
    });

    rotateUp.on("touchend", () => {
        app.rotateCamera(false);
    });

    rotateDown.on("touchstart", () => {
        app.rotateCamera(true, APPCONFIG.DOWN);
    });

    rotateDown.on("touchend", () => {
        app.rotateCamera(false);
    });

    zoomIn.on("touchstart", () => {
        app.zoomIn(true);
    });

    zoomIn.on("touchend", () => {
        app.zoomIn(false);
    });

    zoomOut.on("touchstart", () => {
        app.zoomOut(true);
    });

    zoomOut.on("touchend", () => {
        app.zoomOut(false);
    });

    $("#info").on("click", () => {
        $("#infoModal").modal();
    });
});
