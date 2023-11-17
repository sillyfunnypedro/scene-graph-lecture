import Material from "./Material";
import { mat4 } from "gl-matrix";


/**
 * ModelGL.ts
 * @description ModelGL class
 * @class ModelGL
 * 
 * Container for the model data.
 * 
 * @property {Float32Array} packedVertexBuffer - the packed vertices of the model
 * @property {Uint16Array} vertexIndices - the indices of the model one per vertex found in the face data
 */
class ModelGL {
    packedVertexBuffer: Float32Array = new Float32Array();
    vertexIndices: Uint16Array = new Uint16Array();
    numVertices: number = 0;
    numTriangles: number = 0;
    materialFile?: string = undefined;
    material?: Material = undefined;
    modelPath: string = '';
    modelName: string = '';
    shaderName: string = '';
    children: Array<ModelGL> = [];
    parent: ModelGL | null = null;
    fromParentTranslate: number[] = [0, 0, 0];
    fromParentRotate: number[] = [0, 0, 0];

    positionBuffer: WebGLBuffer | null = null;
    normalBuffer: WebGLBuffer | null = null;
    indexBuffer: WebGLBuffer | null = null;
    hierarchicalMatrix: mat4 | null = null;



    // the parameters for the model transformation
    rotateX: number = 0;
    rotateY: number = 0;
    rotateZ: number = 0;
    scaleX: number = 1;
    scaleY: number = 1;
    scaleZ: number = 1;
    translateX: number = 0;
    translateY: number = 0;
    translateZ: number = 0;

    textures: Map<string, string> = new Map<string, string>();


    shaderProgram: WebGLProgram | null = null;
    loaded: boolean = false;


    public setRotateX(degrees: number): void {
        if (this.parent !== null || this.children.length > 0) {
            this.fromParentRotate[0] = degrees;
        } else {
            this.rotateX = degrees;
        }
    }

    public getRotateX(): number {
        if (this.parent !== null || this.children.length > 0) {
            return this.fromParentRotate[0];
        } else {
            return this.rotateX;
        }
    }

    public setRotateY(degrees: number): void {
        if (this.parent !== null || this.children.length > 0) {
            this.fromParentRotate[1] = degrees;
        } else {
            this.rotateY = degrees;
        }
    }

    public getRotateY(): number {
        if (this.parent !== null || this.children.length > 0) {
            return this.fromParentRotate[1];
        } else {
            return this.rotateY;
        }
    }

    public setRotateZ(degrees: number): void {
        if (this.parent !== null || this.children.length > 0) {
            this.fromParentRotate[2] = degrees;
        } else {
            this.rotateZ = degrees;
        }
    }

    public getRotateZ(): number {
        if (this.parent !== null || this.children.length > 0) {
            return this.fromParentRotate[2];
        } else {
            return this.rotateZ;
        }
    }


    public setTranslateX(scale: number): void {
        if (this.parent !== null || this.children.length > 0) {
            this.fromParentTranslate[0] = scale;
        } else {
            this.translateX = scale;
        }
    }

    public getTranslateX(): number {
        if (this.parent !== null || this.children.length > 0) {
            return this.fromParentTranslate[0];
        } else {
            return this.translateX;
        }
    }

    public setTranslateY(scale: number): void {
        if (this.parent !== null || this.children.length > 0) {
            this.fromParentTranslate[1] = scale;
        } else {
            this.translateY = scale;
        }
    }

    public getTranslateY(): number {
        if (this.parent !== null || this.children.length > 0) {
            return this.fromParentTranslate[1];
        } else {
            return this.translateY;
        }
    }

    public setTranslateZ(scale: number): void {
        if (this.parent !== null || this.children.length > 0) {
            this.fromParentTranslate[2] = scale;
        } else {
            this.translateZ = scale;
        }
    }

    public getTranslateZ(): number {
        if (this.parent !== null || this.children.length > 0) {
            return this.fromParentTranslate[2];
        } else {
            return this.translateZ;
        }
    }

    public get hasDiffuseMap(): boolean {
        if (this.material === undefined) {
            return false;
        }

        if (this.material.map_Kd !== '') {
            return true;
        }
        return false;
    }
    diffuseTexture: WebGLTexture | null = null;
    // make it simpler to determine what maps to use for the model

    public get hasNormalMap(): boolean {
        if (this.material === undefined) {
            return false;
        }

        if (this.material.map_Bump === undefined) {
            return false;
        }

        if (this.material.map_Bump !== '') {
            return true;
        }
        return false;
    }
    normalTexture: WebGLTexture | null = null;

    hasSpecularMap: boolean = false;
    specularTexture: WebGLTexture | null = null;

    vertexStride: number = 0;
    vertexOffset: number = 0;
    textureOffset: number = 0;
    normalOffset: number = 0;

    getShaderCoreName(): string {
        let shaderName = '';
        if (this.textureOffset > 0) {
            shaderName += 'Texture';
        }
        if (this.normalOffset > 0) {
            shaderName += 'Normal';
        }
        if (this.hasNormalMap) {
            shaderName += 'NormalMap';
        }
        return shaderName;
    }

    getVertexShaderName(): string {
        // every vertex shader starts with vertex and ends with shader
        let shaderName = 'vertex';
        shaderName += this.getShaderCoreName();
        shaderName += 'Shader';
        return shaderName;
    }

    getFragmentShaderName(): string {
        // every fragment shader starts with fragment and ends with shader
        let shaderName = 'fragment';
        shaderName += this.getShaderCoreName();
        shaderName += 'Shader';
        return shaderName;
    }

    addChild(model: ModelGL): void {
        this.children.push(model);
    }




    // each model has its own transforms now, we will provide a computed
    // model matrix to the renderer
    getModelMatrix(): mat4 {
        if (this.hierarchicalMatrix !== null) {
            return this.hierarchicalMatrix;
        }

        let modelMatrix: mat4 = mat4.create();
        mat4.translate(modelMatrix, modelMatrix, [this.translateX, this.translateY, this.translateZ]);
        mat4.rotateX(modelMatrix, modelMatrix, this.rotateX / 180 * Math.PI);
        mat4.rotateY(modelMatrix, modelMatrix, this.rotateY / 180 * Math.PI);
        mat4.rotateZ(modelMatrix, modelMatrix, this.rotateZ / 180 * Math.PI);
        mat4.scale(modelMatrix, modelMatrix, [this.scaleX, this.scaleY, this.scaleZ]);
        return modelMatrix;
    }

    setHierarichalMatrix(mat: mat4 | null): void {
        this.hierarchicalMatrix = mat;
    }

}

export default ModelGL;
