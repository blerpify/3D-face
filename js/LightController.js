export default class LightController {
  constructor(renderer, scene, gui, settings) {
    this.renderer = renderer;
    this.scene = scene;
    this.gui = gui;
    this.settings = settings;

    this.ambientLight = scene.children.find((child) => child.type === 'AmbientLight');
    this.directionalLight = scene.children.find((child) => child.type === 'DirectionalLight');
    this.pointLight = scene.children.find((child) => child.type === 'PointLight');

    if (this.ambientLight) {
      this.ambientLightIntensity = this.ambientLight.intensity;
      this.ambientLightColor = this.ambientLight.color;
    }

    if (this.directionalLight) {
      this.directionalLightIntensity = this.directionalLight.intensity;
      this.directionalLightColor = this.directionalLight.color;
      this.directionalLightPosition = this.directionalLight.position;
    }

    if (this.pointLight) {
      this.pointLightIntensity = this.pointLight.intensity;
      this.pointLightColor = this.pointLight.color;
      this.pointLightPosition = this.pointLight.position;
    }

    this.initializeGUI();
  }

  initializeGUI() {
    if (this.ambientLight) {
      this.gui.add(this.settings, 'ambientLightIntensity', 0, 10).name('Ambient Light Intensity').onChange(() => {
        this.updateLights();
      });

     /* this.gui.addColor(this.settings, 'ambientLightColor').name('Ambient Light Color').onChange(() => {
        this.updateLights();
      });*/
    }

    if (this.directionalLight) {
      this.gui.add(this.settings, 'directionalLightIntensity', 0, 10).name('Directional Light Intensity').onChange(() => {
        this.updateLights();
      });

      /*this.gui.addColor(this.settings, 'directionalLightColor').name('Directional Light Color').onChange(() => {
        this.updateLights();
      });*/
    }
    if (this.pointLight) {
      this.gui.add(this.settings, 'pointLightIntensity', 0, 500).name('Point Light Intensity').onChange(() => {
        this.updateLights();
      });

      /*this.gui.addColor(this.settings, 'pointLightColor').name('Point Light Color').onChange(() => {
        this.updateLights();
      });*/
    }
  }

  updateLights() {
    if (this.ambientLight) {
      this.ambientLight.intensity = this.settings.ambientLightIntensity;
      this.ambientLight.color.set(this.settings.ambientLightColor);
    }

    if (this.directionalLight) {
      this.directionalLight.intensity = this.settings.directionalLightIntensity;
      this.directionalLight.color.set(this.settings.directionalLightColor);
    }

    if (this.pointLight) {
      this.pointLight.intensity = this.settings.pointLightIntensity;
      this.pointLight.color.set(this.settings.pointLightColor);
    }
  }
}