import Camera from "./Camera";
import ModelGL from "./ModelGL";

import { GLPointLight, GLLights } from "./GLLights";

/**
 * A scene is a collection of objects, lights, and a camera.
 * 
 * This class is used to store the data for a scene.
 */


class SceneData {
    // Store the WebGL rendering context
    glContext: WebGLRenderingContext | null = null;


    // Store the primary camera
    camera: Camera | null = null;
    model: ModelGL | null = null;
    // a map of models indexed by string name
    models: Map<string, ModelGL> = new Map<string, ModelGL>();
    lights: GLLights = new GLLights();


    source: string = '__loading__';
    name: string = '';

    // store the canvas width and height.
    width: number = 0;
    height: number = 0;



    renderMode: string = "solid";
    frameNumber: number = 0;

    modelsLoading = 0;
    modelsLoaded = 0;

    sceneLoaded(): boolean {
        if (this.modelsLoading === 0) {
            return false;
        }

        return this.modelsLoading === this.modelsLoaded;
    }



}

export default SceneData;