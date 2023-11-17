/**
 * This file contains the code that sets up the canvas and WebGL context
 */
import Camera from './Camera';
import ModelGL from './ModelGL';
import PPMFileLoader from './PPMFileLoader';

import shaderSourceCodeMap from './ShaderManager';
import SceneData from './SceneData';
import ScenesManager from './ScenesManager';
import { GLPointLight, GLLights } from './GLLights';
import { request } from 'http';
import { mat4, vec3 } from 'gl-matrix';


// measure the FPS
let fps = 0;
let lastTime = 0;
let frameNumber = 0;

let currentScene = "";

const scenesManager = ScenesManager.getInstance();

let gl: WebGLRenderingContext | null = null;



// Set up the canvas and WebGL context so that our rendering loop can draw on it
// We store the gl context in the sceneData object so that we can access it later
export const setupCanvas = function () {

    if (gl !== null) {
        return;
    }

    var canvas = document.getElementById('glCanvas') as HTMLCanvasElement;
    if (!canvas) {
        alert('Canvas not found');
        return;
    }

    // Get the WebGL context NOte we need WebGL2 for this application
    gl = canvas.getContext('webgl2') || canvas.getContext('experimental-webgl') as WebGLRenderingContext;
    if (!gl) {
        alert('WebGL not supported');
        return;
    }
    // console.log the version of WebGL we are using
    console.log(gl!.getParameter(gl!.VERSION));

    // Set the clear color to be purple
    gl.clearColor(1.0, 0.0, 1.0, 1.0);
    // Clear the color buffer with clear color
    gl.clear(gl.COLOR_BUFFER_BIT);

}

// for now the scene is contained here in glCanvas when a scene is pulled out
// then this needs to go outside of this file.
export function updateSceneData(camera: Camera | null): void {

    let currentScene = scenesManager.getScene(scenesManager.getActiveScene());
    if (currentScene === undefined) {
        console.log("wait for the scenes before we do any camera work")
        return;
    }
    currentScene.camera = camera;
    if (camera !== null) {
        requestUpdate();
    }
}

function compileProgram(gl: WebGLRenderingContext, model: ModelGL) {

    let sceneData = scenesManager.getScene(scenesManager.getActiveScene())!;

    if (!sceneData.camera) {
        return null;
    }

    if (!gl) {
        return null;
    }

    if (model.shaderProgram) {
        return;
    }

    const vertexShaderName = model.getVertexShaderName();
    const fragmentShaderName = model.getFragmentShaderName();


    console.log(`vertexShaderName: ${vertexShaderName}`);
    console.log(`fragmentShaderName: ${fragmentShaderName}`);

    // ******************************************************
    // Create the vertex shader program
    // ******************************************************   
    const vertexShaderProgram = gl.createShader(gl.VERTEX_SHADER);

    if (!vertexShaderProgram) {
        throw new Error('Failed to create vertex shader');
    }

    // get the vertex shader source code from the shader map
    const vertexShader = shaderSourceCodeMap.get(vertexShaderName) as string;

    // Now that we have the code let's compile it compile it
    // attach the shader source code to the vertex shader
    gl.shaderSource(vertexShaderProgram, vertexShader);

    // compile the vertex shader
    gl.compileShader(vertexShaderProgram);

    // check if the vertex shader compiled successfully
    const vertexShaderCompiled = gl.getShaderParameter(vertexShaderProgram, gl.COMPILE_STATUS);
    if (!vertexShaderCompiled) {
        console.log(vertexShader)
        console.log('tried to compile ' + vertexShaderName);
        console.log(gl.getShaderInfoLog(vertexShaderProgram));
        console.error('Failed to compile vertex shader');
        return null;
    }

    // ******************************************************
    // create the fragment shader
    // ******************************************************
    const fragmentShaderObject = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fragmentShaderObject) {
        throw new Error('Failed to create fragment shader');
    }

    // get the fragment shader source code from the shader map 
    const fragmentShader = shaderSourceCodeMap.get(fragmentShaderName) as string;

    // attach the shader source code to the fragment shader
    gl.shaderSource(fragmentShaderObject, fragmentShader);

    // compile the fragment shader
    gl.compileShader(fragmentShaderObject);

    // check if the fragment shader compiled successfully
    const fragmentShaderCompiled = gl.getShaderParameter(fragmentShaderObject, gl.COMPILE_STATUS);
    if (!fragmentShaderCompiled) {
        console.log(fragmentShader);
        console.log('tried to compile ' + fragmentShaderName);
        console.log(gl.getShaderInfoLog(fragmentShaderObject));
        console.error('Failed to compile fragment shader');
        return null;
    }

    // ******************************************************
    // create a shader program
    // ******************************************************
    const shaderProgram = gl.createProgram();
    if (!shaderProgram) {
        throw new Error('Failed to create shader program');
    }

    // attach the vertex shader to the shader program
    gl.attachShader(shaderProgram, vertexShaderProgram);

    // attach the fragment shader to the shader program
    gl.attachShader(shaderProgram, fragmentShaderObject);

    // link all attached shaders
    gl.linkProgram(shaderProgram);

    // clean up the shaders
    gl.deleteShader(vertexShaderProgram);
    gl.deleteShader(fragmentShaderObject);


    // check if the shader program linked successfully
    const shaderProgramLinked = gl.getProgramParameter(shaderProgram, gl.LINK_STATUS);
    if (!shaderProgramLinked) {
        console.error('Failed to link shader program');
        return null;
    }
    // cache the shader program
    model.shaderProgram = shaderProgram;

}

/** 
 * set up lights for gl to use
 * @param gl
 * uses sceneData.lights
 */
function setUpLights(gl: WebGLRenderingContext, model: ModelGL) {
    if (!gl) {
        return;
    }
    let shaderProgram = model.shaderProgram!;

    let sceneData = scenesManager.getScene(scenesManager.getActiveScene())!;

    if (!sceneData.lights) {
        return;
    }

    // we only do this for a program that has a VerteTextureNormalNormalMapShader
    if (model.getVertexShaderName() !== 'vertexTextureNormalNormalMapShader') {
        return;
    }

    // get the light position attribute location
    const lightPositionsLocation = gl.getUniformLocation(shaderProgram, 'lightsUniform');
    if (lightPositionsLocation === null) {
        throw new Error('Failed to get the storage location of lightsUniform');
    }
    let lightPositions = sceneData.lights.getPositionsFloat32();
    gl.uniform3fv(lightPositionsLocation, lightPositions);

    // get the light color attribute location
    const lightColorsLocation = gl.getUniformLocation(shaderProgram, 'lightColors');
    if (lightColorsLocation === null) {
        throw new Error('Failed to get the storage location of lightColor');
    }
    const colors = sceneData.lights.getColorsFloat32();
    gl.uniform3fv(lightColorsLocation, colors);


}


/**
 * setUpTexture for gl to use.   
 * @param gl 
 * @param model 
 * @param shaderProgram 
 * @param textureUnit 
 * @param textureType 
 * @param samplerName 
 * @returns 
 */
function setUpTexture(gl: WebGLRenderingContext,
    model: ModelGL,
    shaderProgram: WebGLProgram,
    textureUnit: number,
    textureType: string,
    samplerName: string): WebGLTexture | null {
    if (!gl) {
        return null;
    }



    if (!model) {
        return null;
    }

    // get the texture coordinate attribute location
    const texCoordLocation = gl.getAttribLocation(shaderProgram, 'textureCoord');
    // check to see if we got the attribute location
    if (texCoordLocation === -1) {
        console.log('Failed to get the storage location of texCoord');
    }

    // enable the texture coordinate attribute
    gl.enableVertexAttribArray(texCoordLocation);

    // tell the texture coordinate attribute how to get data out of the texture coordinate buffer
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, model.vertexStride, model.textureOffset);

    // create a texture
    let texture = gl.createTexture();
    if (!texture) {
        console.log('Failed to create the texture object');
        return null
    }


    // bind the texture to the texture unit
    gl.activeTexture(gl.TEXTURE0 + textureUnit);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // set the parameters for the texture
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    // set the filtering for the texture
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    const diffuseTextureName = model.textures.get(textureType) as string;

    // load the texture data
    // The PPMFileLoader caches the ppm files so if the file has already been loaded
    // so it is ok to just call this here since it will not load the file again
    const ppmIMG = PPMFileLoader.getInstance().loadFile(diffuseTextureName);


    if (ppmIMG === undefined) {
        console.log("ppmFile is undefined");
        return null
    }
    // load the texture data into the texture
    if (ppmIMG.data === undefined) {
        console.log("ppmFile.data is undefined");
        return null;
    }

    // set the value of the uniorm sampler to the texture unit
    let textureLocation = gl.getUniformLocation(shaderProgram, samplerName);
    if (textureLocation === null) {
        throw new Error(`The sampler name ${samplerName} was not found in the program`)
    }
    gl.uniform1i(textureLocation, textureUnit);

    // bind the data to the texture
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, ppmIMG.width, ppmIMG.height, 0, gl.RGB, gl.UNSIGNED_BYTE, ppmIMG.data);
    gl.generateMipmap(gl.TEXTURE_2D);

    return texture;
}

/**
 * setUpTextures based on what the model needs.
 * If the model already has the textures then we are done.
 * @param gl 
 * @param model 
 * @param shaderProgram 
 * @returns 
 */
function setUpTextures(gl: WebGLRenderingContext,
    model: ModelGL,
    shaderProgram: WebGLProgram): boolean {

    let texture: WebGLTexture | null = null;
    if (!gl) {
        return false;
    }
    if (!model) {
        return false;
    }

    if (model.hasDiffuseMap) {
        if (model.diffuseTexture === null) {
            model.diffuseTexture = setUpTexture(gl, model, shaderProgram, 0, 'map_Kd', 'textureSampler');
        }
        if (model.diffuseTexture === null) {
            throw new Error("Failed to set up diffuse texture, it was expected to be there but it was not");
        }
    }

    if (model.hasNormalMap) {
        if (model.normalTexture === null) {
            model.normalTexture = setUpTexture(gl, model, shaderProgram, 1, 'map_Bump', 'normalSampler');
        }
        if (model.normalTexture === null) {
            throw new Error("Failed to set up normal texture, it was expected to be there but it was not");
        }
        const uvOffsetLocation = gl.getUniformLocation(shaderProgram, 'uvOffset');

        // get the now time
        let now = performance.now();

        const period = 25000;

        now = now % period;

        now = now / period * 2 * Math.PI;




        const uvData = new Float32Array([Math.sin(now), 0]);
        gl.uniform2fv(uvOffsetLocation, uvData);


    }

    return true;

}

function cleanUpTextures(gl: WebGLRenderingContext, model: ModelGL) {
    if (!gl) {  // this should probably throw an error
        return;
    }
    if (!model) {  // as should this, also throw an error
        return;
    }

    if (model.hasDiffuseMap) {
        if (model.diffuseTexture !== null) {
            gl.deleteTexture(model.diffuseTexture);
            model.diffuseTexture = null;
        }
    }

    if (model.hasNormalMap) {
        if (model.normalTexture !== null) {
            gl.deleteTexture(model.normalTexture);
            model.normalTexture = null;
        }
    }
    // if (model.positionBuffer !== null) {
    //     gl.deleteBuffer(model.positionBuffer);
    //     model.positionBuffer = null;
    // }

    // if (model.indexBuffer !== null) {
    //     gl.deleteBuffer(model.indexBuffer);
    //     model.indexBuffer = null;
    // }
}

function setUpVertexBuffer(gl: WebGLRenderingContext,
    model: ModelGL,
    shaderProgram: WebGLProgram) {

    // create a buffer for Vertex data
    model.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, model.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, model.packedVertexBuffer, gl.STATIC_DRAW);



    // create an index buffer
    model.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.vertexIndices, gl.STATIC_DRAW);

    // ******************************************************
    // Now we need to figure out where the input data is going to go
    // ******************************************************

    // get the position attribute location
    const positionLocation = gl.getAttribLocation(shaderProgram, 'position');

    // enable the position attribute
    gl.enableVertexAttribArray(positionLocation);

    // tell the position attribute how to get data out of the position buffer
    // the position attribute is a vec3 (3 values per vertex) and then there are three
    // colors per vertex
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, model.vertexStride, 0);
}





function setUpNormalBuffer(gl: WebGLRenderingContext, model: ModelGL, shaderProgram: WebGLProgram) {

    const vertexShaderName = model.getVertexShaderName();
    // check to see if Normal is in the shader name
    if (vertexShaderName.includes('Normal')) {
        // get the normal attribute location
        const normalLocation = gl.getAttribLocation(model.shaderProgram!, 'normal');

        // enable the normal attribute

        gl.enableVertexAttribArray(normalLocation);

        // tell the normal attribute how to get data out of the normal buffer
        gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, model.vertexStride, model.normalOffset);
    }
}



function checkForUpdates(): void {
    updateRequested = false;
    if (!scenesManager.scenesLoaded()) {
        console.log('waiting for scenes to load');
        requestUpdate();

    }

    const sceneName = scenesManager.getActiveScene();

    if (sceneName !== currentScene) {

        // for (let model of sceneData!.models.values()) {
        //     cleanUpTextures(gl!, model);
        // }

        const newScene = scenesManager.getScene(sceneName);
        if (newScene === undefined) {
            throw new Error(`Scene ${sceneName} was not found`);
        }


        currentScene = sceneName;
    }


    renderLoop();
}

let updateRequested = false;

function requestUpdate(): void {
    if (!updateRequested) {
        updateRequested = true;
        requestAnimationFrame(checkForUpdates);
    }
}

function renderLoop(): void {
    const sceneName = scenesManager.getActiveScene();
    const sceneData = scenesManager.getScene(sceneName);
    if (sceneData === undefined) {
        throw new Error(`Scene ${sceneName} was not found`);
    }

    if (!sceneData.sceneLoaded()) {
        requestAnimationFrame(checkForUpdates);
        return;
    }


    // Clear the canvas to a purple color
    // currently in this code if you leave the clear in there
    // no image is seen.
    let color = (sceneData.frameNumber++ % 255) / 255.0;
    gl!.clearColor(color, .2, .6, 0.1);
    //gl!.clear(gl!.COLOR_BUFFER_BIT);

    //iterate over the models
    for (let model of sceneData.models.values()) {
        // if the model has not been loaded then load it
        // right now models in a hierarchy still feature in teh models array 
        // this stops child models from being displayed twice
        if (model.parent === null) {
            let parentMatrix = mat4.create();
            renderHierarchy(model, parentMatrix);
        }

    }
    // ******************************************************
    // Calculate the FPS
    // ******************************************************
    frameNumber++;
    const now = performance.now();

    if (now - lastTime > 1000) {
        fps = frameNumber;
        console.log("FPS: " + fps);
        frameNumber = 0;
        lastTime = now;
    }
    requestUpdate();
}

// In this basic implementation of the hierarchical scene model we are not going to be using translate and rotate for the objects
// rather we will be using the fromParent data in the model to calculate the translate and rotate for the object.
// the parent matrix will be a produc of all the fromParent data for the object and all of its parents.
function renderHierarchy(model: ModelGL, parentMatrix: mat4): void {

    // in this version the only thing in this matrix is the scale.   
    let modelMatrix = model.getModelMatrix();

    // let us get the data from the parent
    let fromParentTranslate = model.fromParentTranslate;
    let fromParentRotate = model.fromParentRotate;
    // For any root objects these will both be 0

    // now we need to calculate the fromParentMatrix that we will use to calculate the translation and rotation of the object
    let fromParentTranslateMatrix = mat4.create();
    mat4.translate(fromParentTranslateMatrix, fromParentTranslateMatrix, vec3.fromValues(fromParentTranslate[0], fromParentTranslate[1], fromParentTranslate[2]));

    let fromParentRotateMatrix = mat4.create();
    mat4.rotateX(fromParentRotateMatrix, fromParentRotateMatrix, (fromParentRotate[0] / 180) * Math.PI);
    mat4.rotateY(fromParentRotateMatrix, fromParentRotateMatrix, (fromParentRotate[1] / 180) * Math.PI);
    mat4.rotateZ(fromParentRotateMatrix, fromParentRotateMatrix, (fromParentRotate[2] / 180) * Math.PI);

    let fromParentMatrix = mat4.create();
    mat4.multiply(fromParentMatrix, fromParentRotateMatrix, fromParentTranslateMatrix,);


    // now we need to multiply the fromParentMatrix by the parentMatrix
    mat4.multiply(fromParentMatrix, parentMatrix, fromParentMatrix,);


    let localMatrix = mat4.create();
    // prepare the model matrix for this object
    mat4.multiply(localMatrix, fromParentMatrix, modelMatrix);

    // we stash the matrix in the model where our renderers can get it.
    // note that this does not overwrite the modelMatrix in the model
    model.setHierarichalMatrix(localMatrix);

    // now render the model
    renderModel(model);

    // clean up the hierarchical matrix
    model.setHierarichalMatrix(null);
    cleanUpTextures(gl!, model);


    // now render all children and we are done
    for (let child of model.children) {

        // In typescript arrays are passed as reference so to make sure ther is no polution
        // we make a copy of the matrix so the child does not have to worry about it.
        let hierarchyMatrix = mat4.create();
        mat4.copy(hierarchyMatrix, fromParentMatrix);

        renderHierarchy(child, hierarchyMatrix);


    }
}


function renderModel(model: ModelGL, parentMatrix: mat4 | null = null): void {

    // we might get called early. lets bail out if the information is incomplete.
    let sceneData = scenesManager.getScene(scenesManager.getActiveScene());
    if (sceneData === null || sceneData === undefined) {
        return;
    }


    // sanity check just in case there is no gl context
    if (!gl) {
        return;
    }


    let camera = sceneData.camera;
    if (!camera) {
        return;
    }

    // ******************************************************
    // Compile the shader program if it has not been compiled yet
    // the compileProgram will store the compiled program in the 
    // current model in sceneData
    // ******************************************************
    compileProgram(gl, model!);

    if (!model!.shaderProgram) {
        return;
    }
    // use the shader program
    gl.useProgram(model.shaderProgram);





    setUpVertexBuffer(gl, model, model.shaderProgram!);

    setUpLights(gl, model);


    // SetUpTextures will set up any textures required by the model.
    setUpTextures(gl, model, model.shaderProgram!)


    setUpNormalBuffer(gl, model, model.shaderProgram!);

    camera.setViewPortWidth(gl.canvas.width);
    camera.setViewPortHeight(gl.canvas.height);



    // get the projection matrix location
    const projectionMatrixLocation = gl.getUniformLocation(model.shaderProgram!, 'projectionMatrix');

    // set the projection matrix
    gl.uniformMatrix4fv(projectionMatrixLocation, false, camera.projectionMatrix);

    // get the view matrix location
    const viewMatrixLocation = gl.getUniformLocation(model.shaderProgram!, 'viewMatrix');

    // set the view matrix
    gl.uniformMatrix4fv(viewMatrixLocation, false, camera.viewMatrix);




    // get the model matrix.
    const modelMatrix = model.getModelMatrix();


    // get the model matrix location
    const modelMatrixLocation = gl.getUniformLocation(model.shaderProgram!, 'modelMatrix');

    // set the model matrix
    gl.uniformMatrix4fv(modelMatrixLocation, false, modelMatrix);


    // ******************************************************
    // Ok we are good to go.   Lets make some graphics
    // ****************************************************** 
    // Clear the whole canvas
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);





    if (!sceneData.camera!.usePerspective) {
        // calculate the square that fits in the canvas make that the viewport
        let squareSize = gl.canvas.width;
        if (gl.canvas.width > gl.canvas.height) {
            squareSize = gl.canvas.height;
        }
        // calculate the offset for the square  
        const xOffset = (gl.canvas.width - squareSize) / 2;
        const yOffset = (gl.canvas.height - squareSize) / 2;


        gl.viewport(xOffset, yOffset, squareSize, squareSize);
    } else {
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    }

    // enable the z-buffer
    gl.enable(gl.DEPTH_TEST);



    // This is really slow but it is good for debugging.
    if (!camera.renderSolid) {
        for (let i = 0; i < model.numTriangles!; i++) {
            const index = i * 3;
            gl.drawElements(gl.LINE_LOOP, 3, gl.UNSIGNED_SHORT, index * 2);
        }
    } else {
        gl.drawElements(gl.TRIANGLES, model.vertexIndices.length, gl.UNSIGNED_SHORT, 0);
    }






    //requestAnimationFrame(checkForUpdates);
}