import Camera from "./Camera";
import ModelGL from "./ModelGL";

import { GLPointLight, GLLights } from "./GLLights";

/**
 * A scene is a collection of objects, lights, and a camera.
 * 
 * This class is used to store the data for a scene.
 */


class SceneData {

    // Store the primary camera
    camera: Camera | null = null;

    models: Map<string, ModelGL> = new Map<string, ModelGL>();
    lights: GLLights = new GLLights();

    postLoadCommands: Map<string, string[]> = new Map<string, string[]>();


    source: string = '__loading__';
    name: string = '';





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

    getSceneObjects(): string[] {

        let objectNames = this.models.keys();

        // make a copy of the object names
        let objectNamesCopy: string[] = [];
        for (let objectName of objectNames) {
            objectNamesCopy.push(objectName);
        }
        return objectNamesCopy;
    }

    getObject(objectName: string): ModelGL | undefined {
        return this.models.get(objectName);
    }




}

export default SceneData;