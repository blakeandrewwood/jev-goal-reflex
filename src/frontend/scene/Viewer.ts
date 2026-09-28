import * as THREE from "three/webgpu";
import type { WorldState } from "../../shared/protocol";

const BOX_SIZE = 1;
const DEFAULT_PLANE_SIZE = 40;
const GRID_HEIGHT = 0.1;
// Higher is snappier; eases the box between physics snapshots.
const SMOOTHING = 20;

export class Viewer {
  private readonly renderer: THREE.WebGPURenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly ground = new THREE.Group();
  private readonly box: THREE.Mesh;
  private readonly targetPosition = new THREE.Vector3(0, BOX_SIZE / 2, 0);
  private readonly targetRotation = new THREE.Quaternion();
  private lastTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    // Firefox's WebGPU freezes on macOS; its WebGL2 backend is stable.
    const forceWebGL = navigator.userAgent.includes("Firefox");
    this.renderer = new THREE.WebGPURenderer({
      canvas,
      antialias: true,
      forceWebGL,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.scene.background = new THREE.Color(0x171717);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 25, 30);
    this.camera.lookAt(0, 0, 0);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.5));
    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(10, 20, 10);
    this.scene.add(sun);

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x3f3f46 }));
    plane.rotation.x = -Math.PI / 2;
    const grid = new THREE.GridHelper(1, DEFAULT_PLANE_SIZE, 0x71717a, 0x52525b);
    grid.position.y = GRID_HEIGHT;
    this.ground.add(plane, grid);
    this.ground.scale.set(DEFAULT_PLANE_SIZE, 1, DEFAULT_PLANE_SIZE);
    this.scene.add(this.ground);

    this.box = new THREE.Mesh(
      new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE),
      new THREE.MeshStandardMaterial({ color: 0xf97316 }),
    );
    this.box.position.y = BOX_SIZE / 2;
    this.scene.add(this.box);

    window.addEventListener("resize", () => this.resize());
  }

  async start() {
    await this.renderer.init();
    this.renderer.setAnimationLoop((time) => this.frame(time));
  }

  update({ plane_size, player }: WorldState) {
    this.ground.scale.set(plane_size, 1, plane_size);
    this.targetPosition.set(player.x, player.y + BOX_SIZE / 2, player.z);
    this.targetRotation.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, THREE.MathUtils.degToRad(-parseFloat(player.yaw)));
  }

  private frame(time: number) {
    const dt = (time - this.lastTime) / 1000;
    this.lastTime = time;
    const blend = 1 - Math.exp(-SMOOTHING * dt);
    this.box.position.lerp(this.targetPosition, blend);
    this.box.quaternion.slerp(this.targetRotation, blend);
    this.renderer.render(this.scene, this.camera);
  }

  private resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
