import SceneData from "./SceneData";
import ObjFileLoader from "./ObjFileLoader";
import ModelGL from "./ModelGL";
import Camera from "./Camera";
import { GLPointLight, GLDirectionalLight, GLSpotLight, GLLights } from "./GLLights";
import { vec3 } from "gl-matrix";
import { join } from "path";



// Manage the scenes for the different classes.
// This class is a singleton.
// it is responsible for cleaning up between scenes when a scene is changed.

class ScenesManager {
    private _scenes: Map<string, SceneData> = new Map<string, SceneData>();
    private _objLoader = ObjFileLoader.getInstance();
    private _activeScene: string = "";

    private static _instance: ScenesManager;
    sceneNames: string[] = [];

    private constructor() {
        // do nothing
    }

    public static getInstance(): ScenesManager {
        if (!ScenesManager._instance) {
            ScenesManager._instance = new ScenesManager();

        }
        return ScenesManager._instance;
    }


    // The scene getter.  This will return the scene data for the active scene.
    getScene(sceneName: string): SceneData | undefined {
        return this._scenes.get(sceneName);
    }



    // functions for the UI.  These functions are called by the UI
    getScenes(): string[] {
        return this.sceneNames;
    }


    getActiveScene(): string {
        return this._activeScene;
    }

    // this will only be called in response to a user action from a button that
    // is defined by the available scenes. So we don't need to check if the scene
    // exists.
    setActiveScene(sceneName: string) {
        if (this._scenes.has(sceneName)) {
            this._activeScene = sceneName;
        }
    }



    async addScene(sceneName: string): Promise<SceneData | undefined> {
        const model: ModelGL | undefined = await this._objLoader.getModel(sceneName);

        if (model === undefined) {
            console.log(`could not load ${sceneName}`);
            return;
        }

        const newScene = new SceneData();


        const newCamera = new Camera();
        newScene.camera = newCamera;

        this._scenes.set(sceneName, newScene);
        // if this is the first scene make it the active scene
        if (this._activeScene === undefined) {
            this._activeScene = sceneName;
        }
        return newScene;
    }



    parseSceneFile(sceneName: string, sceneSource: string) {
        // parse the scene file and add the scene to the list of scenes.
        // this._scenes.set(sceneName, sceneData);
        // a scene contains a camera a list of objects and a list of lights.
        // the format of the file is 

        // The first word is the command.
        // The rest of the words are the parameters for the command.

        // The commands are:
        // camera x y z lookatx lookaty lookatz upx upy upz
        // light point x y z r g b
        // light directional x y z r g b
        // light spot x y z r g b
        // object name objfile
        // # comment  Anything after a # is a comment.

        // The commands are not case sensitive.
        // The commands can be in any order.

        let resultingScene = new SceneData();
        resultingScene.name = sceneName;
        this._scenes.set(sceneName, resultingScene);
        if (this._activeScene === "") {
            this.setActiveScene(sceneName);
        }
        resultingScene.camera = new Camera();


        let lines = sceneSource.split('\n');
        // remove all trailing comments
        lines = lines.map(line => line.split('#')[0]);
        // remove trailing blanks
        lines = lines.map(line => line.trim());
        // remove all blank lines
        lines = lines.filter(line => line.length > 0);

        // now parse the lines
        for (let line in lines) {
            let tokens = lines[line].split(' ');
            let command = tokens[0].toLowerCase();
            let parameters = tokens.slice(1);

            switch (command) {
                case 'camera':
                    this.processCameraCommand(resultingScene, parameters);
                    break;
                case 'light':
                    this.processLightCommand(resultingScene, parameters);
                    break;
                case 'object':
                    this.processObjectCommand(resultingScene, parameters);
                    break;
                case 'rotate':
                    this.addPostTransformationCommand(resultingScene, tokens);
                    break;
                case 'translate':
                    this.addPostTransformationCommand(resultingScene, tokens);
                    break;
                case 'scale':
                    this.addPostTransformationCommand(resultingScene, tokens);
                    break;

                case 'child':
                    this.addPostChildCommand(resultingScene, tokens);
                    break;
                default:
                    console.log(`unknown command ${command}`);
                    throw new Error(`unknown command ${command}`);

            }
        }
        this.waitForLoadAndProcessPostCommands(resultingScene);
    }

    async waitForLoadAndProcessPostCommands(scene: SceneData) {
        while (!scene.sceneLoaded()) {
            // sleep for 100 ms
            console.log('waiting for load')
            await new Promise(resolve => setTimeout(resolve, 100));

        }
        this.processPostLoadCommands(scene);
    }

    processCameraCommand(scene: SceneData, parameters: string[]) {
        if (scene.camera === undefined) {
            scene.camera = new Camera();
        } else {
            console.log('Camera already defined');
            console.log('overwriting camera');
        }
        // camera x y z lookatx lookaty lookatz upx upy upz
        scene.camera!.setEyePosition(vec3.fromValues(
            parseFloat(parameters[0]),
            parseFloat(parameters[1]),
            parseFloat(parameters[2])
        ));
        scene.camera!.setLookAt(vec3.fromValues(
            parseFloat(parameters[3]),
            parseFloat(parameters[4]),
            parseFloat(parameters[5])
        ));
        scene.camera!.setUpVector(vec3.fromValues(
            parseFloat(parameters[6]),
            parseFloat(parameters[7]),
            parseFloat(parameters[8])
        ));
    }

    addPostLoadCommand(scene: SceneData, model_name: string, command: string) {
        let postLoadCommands = scene.postLoadCommands.get(model_name);
        if (postLoadCommands === undefined) {
            postLoadCommands = [];
        }
        postLoadCommands.push(command);
        scene.postLoadCommands.set(model_name, postLoadCommands);
        console.log(`adding postLoad ${command} to ${model_name}`);
    }

    addPostTransformationCommand(scene: SceneData, parameters: string[]) {
        let model_name = parameters[1];
        // make a string of the remaining parameters

        let transformation: string = parameters.join(' ');

        this.addPostLoadCommand(scene, model_name, transformation);
        console.log(`adding transformation ${transformation} to ${model_name}`);
    }

    addPostChildCommand(scene: SceneData, parameters: string[]) {
        let model_name = parameters[1];
        let child_name = parameters[2];


        let command_string = parameters.join(' ');
        this.addPostLoadCommand(scene, model_name, command_string);
    }



    processPostLoadCommands(scene: SceneData) {
        let models = scene.models.keys();
        for (let modelName of models) {
            this.processPostLoadCommandsForModel(scene, modelName);
        }

    }
    processPostLoadCommandsForModel(scene: SceneData, modelName: string) {
        let postLoadCommands = scene.postLoadCommands.get(modelName);
        let model = scene.models.get(modelName);

        if (model === undefined) {
            console.log(`model ${modelName} not found`);
            throw new Error(`model ${modelName} not found`);
        }

        if (postLoadCommands === undefined) {
            return;
        }
        for (let postLoadCommand of postLoadCommands) {
            let tokens = postLoadCommand.split(' ');
            let command = tokens[0].toLowerCase();

            // do a sanity check to make sure the model name matches
            let foundModelName = tokens[1];
            if (foundModelName !== modelName) {
                throw new Error(`model name ${foundModelName} does not match ${modelName}`);
            }

            let parameters = [tokens[0]].concat(tokens.slice(2));
            switch (command) {
                case 'rotate':
                    this.processRotateCommand(model, parameters);
                    break;
                case 'translate':
                    this.processTranslateCommand(model, parameters);
                    break;
                case 'scale':
                    this.processScaleCommand(model, parameters);
                    break;
                case 'child':
                    this.processChildCommand(scene, model, parameters);
                    break;
                default:
                    console.log(`unknown transformation ${command}`);
                    throw new Error(`unknown transformation ${command}`);
            }
        }

    }


    processRotateCommand(model: ModelGL, parameters: string[]) {
        let axis = parameters[1].toLowerCase();
        let angle = parseFloat(parameters[2]);
        switch (axis) {
            case 'x':
                model.rotateX += angle;
                break;
            case 'y':
                model.rotateY += angle;
                break;
            case 'z':
                model.rotateZ += angle;
                break;
            default:
                console.log(`unknown axis ${axis}`);
                console.log(`${parameters}`)
                throw new Error(`unknown axis ${axis}`);
        }
    }

    processTranslateCommand(model: ModelGL, parameters: string[]) {
        let xDelta = parseFloat(parameters[1]);
        let yDelta = parseFloat(parameters[2]);
        let zDelta = parseFloat(parameters[3]);
        model.translateX += xDelta;
        model.translateY += yDelta;
        model.translateZ += zDelta;
    }

    processScaleCommand(model: ModelGL, parameters: string[]) {
        let xScale = parseFloat(parameters[1]);
        let yScale = parseFloat(parameters[2]);
        let zScale = parseFloat(parameters[3]);
        model.scaleX *= xScale;
        model.scaleY *= yScale;
        model.scaleZ *= zScale;
    }

    processChildCommand(scene: SceneData, model: ModelGL, parameters: string[]) {
        let childName = parameters[1];
        let childModel = scene.models.get(childName);

        if (parameters.length < 5) {
            console.log(`not enough parameters for child ${childName}`);
            throw new Error(`not enough parameters for child ${childName}`);
        }


        let childXtranslate = parseFloat(parameters[2]);
        let childYtranslate = parseFloat(parameters[3]);
        let childZtranslate = parseFloat(parameters[4]);


        if (childModel === undefined) {
            console.log(`child ${childName} not found`);
            throw new Error(`child ${childName} not found`);
        }

        console.log(`translation for child is ${childXtranslate} ${childYtranslate} ${childZtranslate}`)

        console.log(`adding child ${childName} to ${model}`)
        model.addChild(childModel);
        childModel.parent = model;
        childModel.fromParentTranslate = [childXtranslate, childYtranslate, childZtranslate];
        // model.addChild(childName);
    }

    processLightCommand(scene: SceneData, parameters: string[]) {
        // light point x y z r g b
        // light directional x y z r g b
        // light spot x y z  r g b directionx directiony directionz cutoff exponent
        let lightType = parameters[0].toLowerCase();
        // check to see if there are enough parameters
        if (parameters[0] in ['point', 'directional'] && parameters.length < 7) {
            console.log(`not enough parameters for ${lightType}`);
            throw new Error(`not enough parameters for ${lightType}`);
        }
        if (parameters[0] === 'spot' && parameters.length < 12) {
            console.log(`not enough parameters for ${lightType}`);
            throw new Error(`not enough parameters for ${lightType}`);
        }

        let lightPosition = [
            parseFloat(parameters[1]),
            parseFloat(parameters[2]),
            parseFloat(parameters[3])
        ];

        let lightColor = [
            parseFloat(parameters[4]),
            parseFloat(parameters[5]),
            parseFloat(parameters[6])
        ];




        switch (lightType) {
            case 'point':
                const pointLight = new GLPointLight(lightPosition, lightColor);
                scene.lights.addPointLight(pointLight);
                break;
            case 'directional':
                const directionalLight = new GLDirectionalLight(lightPosition, lightColor);
                scene.lights.addDirectionalLight(directionalLight);
                break;
            case 'spot':
                let lightDirection = [
                    parseFloat(parameters[7]),
                    parseFloat(parameters[8]),
                    parseFloat(parameters[9])
                ];
                let cutoff = parseFloat(parameters[10]);
                let exponent = parseFloat(parameters[11]);
                const spotLight = new GLSpotLight(lightPosition,
                    lightColor, lightDirection,
                    cutoff, exponent);
                scene.lights.addSpotLight(spotLight);
                break;
            default:
                console.log(`unknown light type ${lightType}`);
                throw new Error(`unknown light type ${lightType}`);
        }

    }

    async processObjectCommand(scene: SceneData, parameters: string[]) {
        // object name objfile
        let objectName = parameters[0];
        let objectFile = parameters[1];
        const objFileLoader = ObjFileLoader.getInstance();

        scene.modelsLoading += 1;
        if (objectFile === undefined) {
            throw new Error(`object file undefined for ${objectName}`);
        }
        let newModel = await objFileLoader.getModel(objectFile);
        if (newModel !== undefined) {
            scene.models.set(objectName, newModel);
        }
        scene.modelsLoaded += 1;
    }

    scenesLoaded(): boolean {
        if (this._scenes.size === 0)
            return false;
        for (let scene of this._scenes.values()) {
            if (!scene.sceneLoaded()) {
                return false;
            }
        }
        return true;
    }




}

export default ScenesManager;