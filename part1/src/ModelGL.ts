import Material from "./Material";
import { mat4 } from "gl-matrix";

/**
 *  @class VertexAccumulator
 *  @description VertexAccumulator class
 * 
 * Uses the strings in the Wavefront obj file to record whether or not
 * a vertex has been recorded.  It only stores the string that represents the
 * vertex in the face line of the obj file.
 * 
 * It also records the data of the first vertex it is given and then 
 * checks other vertices to ensure the same data is being stored per
 * vertex.
 */
class VertexAccumulator {
    private _vertices: string[] = [];
    private _expectedFormat: string[] = [];
    private _expectedFormatMessage: string = "";


    constructor() {
        this._vertices = [];

    }

    /**
     * 
     * @param vertex 
     * 
     * Check to see if the vertex is of the expected format
     */
    private checkVertexFormat(vertex: string) {

        const tokens: string[] = vertex.split('/');


        // the vertexTokens array will have 1 or 3
        if (tokens.length > 3) {
            throw new Error("A vertex in a face must be of format v or v/t or v//n or v/t/n");
        }

        // if this is the first vertex store its format
        if (this._expectedFormat.length === 0) {

            switch (tokens.length) {
                case 1:// format is n
                    this._expectedFormat = ['+'] // expect one value
                    break;
                case 2:// format is v/t

                    this._expectedFormat = ['+', '+'] // expect two values
                    break;
                case 3:// format is v/t/n or v//n or v/t/ 
                    this._expectedFormat = ['+', '+', '+'] // expect three values
                    const expectVertex = '+'
                    let expectTexture = ''
                    let expectNormal = ''
                    if (tokens[1] !== '') {
                        expectTexture = '+'
                    }
                    if (tokens[2] !== '') {
                        expectNormal = '+'
                    }
                    this._expectedFormat = [expectVertex, expectTexture, expectNormal];
                    break;
            }
        }

        if (tokens.length !== this._expectedFormat.length) {
            throw new Error("Inconsistent Vertex Format")
        }

        for (let i = 0; i < tokens.length; i++) {
            const expected = this._expectedFormat[i].length;
            const found = tokens[i].length === 0 ? 0 : 1;
            if (expected !== found) {
                throw new Error("Inconsistent Vertex Format")
            }

        }
    }


    // add a vertex to the list of vertices
    // if the vertex is already in the list, return the index of the vertex
    // otherwise, add the vertex to the list and return the index of the vertex
    // the first return value indicates whether the vertex was added or not
    addVertex(vertex: string): [boolean, number] {
        this.checkVertexFormat(vertex);
        if (this._vertices.indexOf(vertex) === -1) {
            this._vertices.push(vertex);
            return [true, this._vertices.length - 1]
        }

        return [false, this._vertices.indexOf(vertex)];
    }

}


/**
 * ModelGL.ts
 * @description ModelGL class
 * @class ModelGL
 * 
 * This class will parse a model in wavefront .obj format
 * 
 * @property {Float32Array} packedVertexBuffer - the packed vertices of the model
 * @property {Uint16Array} vertexIndices - the indices of the model one per vertex found in the face data
 */
class ModelGL {
    packedVertexBuffer: Float32Array;
    vertexiIndices: Uint16Array;
    numVertices: number;
    numTriangles: number;
    materialFile?: string;
    material?: Material;
    modelPath: string = '';
    vertexShaderName: string = '';
    fragmentShaderName: string = '';
    shaderName: string = '';

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

    private _packedIndices: number[] = []
    private _packedBuffer: number[] = [];
    private _vertices: number[] = [];
    private _textureCoordinates: number[] = [];
    private _normals: number[] = [];

    private _vertexShader: string = "";
    private _fragmentShader: string = "";
    private _renderingProgram: WebGLProgram | null = null;

    private _vertexAccumulator: VertexAccumulator = new VertexAccumulator();
    private _useTexture: boolean = false;

    private _vertexStride: number = 0;
    private _vertexOffset: number = 0;
    private _textureOffset: number = 0;
    private _normalOffset: number = 0;


    constructor() {
        this.packedVertexBuffer = new Float32Array();
        this.vertexiIndices = new Uint16Array();
        this.materialFile = "";
        this.numVertices = 0;
        this.numTriangles = 0;
        this._packedIndices = [];
        this._packedBuffer = [];

    }

    /**
     * Get the rendering program for this model
     * @returns WebGLProgram
     * @memberof ModelGL
     * @method getRenderingProgram
     */
    get renderingProgram(): WebGLProgram | null {
        return this._renderingProgram;
    }

    /**
     * Set the rendering program for this model
     * @memberof ModelGL
     * @method setRenderingProgram
     */
    set renderingProgram(program: WebGLProgram | null) {
        this._renderingProgram = program;
    }

    /** 
     * Get useTexture
     * @returns boolean
     * @memberof ModelGL
     * @method getUseTexture
     */
    get useTexture(): boolean {
        return this._useTexture;
    }


    // each model has its own transforms now, we will provide a computed
    // model matrix to the renderer
    getModelMatrix(): mat4 {
        let modelMatrix: mat4 = mat4.create();
        mat4.translate(modelMatrix, modelMatrix, [this.translateX, this.translateY, this.translateZ]);
        mat4.rotateX(modelMatrix, modelMatrix, this.rotateX / 180 * Math.PI);
        mat4.rotateY(modelMatrix, modelMatrix, this.rotateY / 180 * Math.PI);
        mat4.rotateZ(modelMatrix, modelMatrix, this.rotateZ / 180 * Math.PI);
        mat4.scale(modelMatrix, modelMatrix, [this.scaleX, this.scaleY, this.scaleZ]);
        return modelMatrix;
    }




    /**
     * The data that the CanvasGL renderer will use to set up the draw call(s) for the model
     */

    public set vertexStride(stride: number) {
        this._vertexStride = stride;
    }
    public get vertexStride(): number {
        return this._vertexStride;
    }

    public set textureOffset(offset: number) {
        this._textureOffset = offset;
    }

    public get textureOffset(): number {
        return this._textureOffset;
    }

    public set vertexOffset(offset: number) {
        this._vertexOffset = offset;
    }
    public get vertexOffset(): number {
        return this._vertexOffset;
    }

    public set normalOffset(offset: number) {
        this._normalOffset = offset;
    }

    public get normalOffset(): number {
        return this._normalOffset;
    }



    /**
     * Parse a model in wavefront .obj format
     */
    parseModel(model: string, modelPath: string): void {
        this.modelPath = modelPath;
        console.log(`modelPath: ${this.modelPath}`)
        // split the model into lines
        let lines: string[] = model.split("\n");
        for (let line of lines) {
            // strip off any leading white space
            line = line.trim();
            let tokens: string[] = line.split(" ");
            if (tokens[0] === "v") {
                this._vertices.push(parseFloat(tokens[1]));
                this._vertices.push(parseFloat(tokens[2]));
                this._vertices.push(parseFloat(tokens[3]));
            } else if (tokens[0] === "f") {
                this.parseFace(line);
            } else if (tokens[0] === "vt") {
                this._textureCoordinates.push(parseFloat(tokens[1]));
                this._textureCoordinates.push(parseFloat(tokens[2]));
            } else if (tokens[0] === "vn") {
                this._normals.push(parseFloat(tokens[1]));
                this._normals.push(parseFloat(tokens[2]));
                this._normals.push(parseFloat(tokens[3]));
            } else if (tokens[0] === "mtllib") {
                this.materialFile = tokens[1];
                console.log("Material file: " + this.materialFile);
            } else if (tokens[0] === "usemtl") {
                // TODO: handle material
            }
        }

        // now that we have parsed the file, we need to 
        // build the vertex buffer and index buffer

        this.packedVertexBuffer = new Float32Array(this._packedBuffer);
        this.vertexiIndices = new Uint16Array(this._packedIndices);
        this.numVertices = this._packedIndices.length;
        this.numTriangles = this._packedIndices.length / 3;

        this.calculateVertexShaderName();
        this.calculateFragmentShaderName();
    }

    /**
     * Calculate the vertex shader name
     * @memberof ModelGL
     * @method calculateVertexShaderName
     */
    private calculateVertexShaderName() {
        if (this._textureCoordinates.length > 0 && this._normals.length > 0) {
            this.vertexShaderName = "vertexTextureNormalFullTransformationShader";
            this._useTexture = true;
        } else if (this._textureCoordinates.length > 0) {
            this.vertexShaderName = "vertexTextureFullTransformationShader";
            this._useTexture = true;
        } else {
            this.vertexShaderName = "vertexFullTransformationShader";
        }
    }

    /**
     * Calculate the fragment shader name
     * @memberof ModelGL
     * @method calculateFragmentShaderName
     */
    private calculateFragmentShaderName() {
        if (this._textureCoordinates.length > 0 && this._normals.length > 0) {
            this.fragmentShaderName = "fragmentTextureNormalShader";
            this._useTexture = true;
        } else if (this._textureCoordinates.length > 0) {
            this.fragmentShaderName = "fragmentTextureShader";
            this._useTexture = true;
        } else {
            this.fragmentShaderName = "fragmentShader";
        }
    }

    /**
     * Parse a triangle from the face data
     * @param {string[]} triangle

     * @memberof ModelGL
     * @method parseTriangle
     * @private
     */
    private parseTriangle(triangle: string[]) {
        for (let i = 0; i < 3; i++) {
            const vertex = triangle[i];
            const [needToAdd, vertexOutIndex] = this._vertexAccumulator.addVertex(vertex);

            this._packedIndices.push(vertexOutIndex);
            if (!needToAdd) {
                continue;
            }


            // The current vertex was not found and thus we will need to add this vertex to the vertex buffer
            // we parse the vertex coordinates, and texture coordinates, and normal coordinates
            // This code presumes that all the vertices in the model have the same number of coordinates
            let vertexTokens: string[] = vertex.split("/");


            // get the vertex values
            const vertexIndex = parseInt(vertexTokens[0]) - 1;
            const vertexOffset = vertexIndex * 3;
            const x = this._vertices[vertexOffset];
            const y = this._vertices[vertexOffset + 1];
            const z = this._vertices[vertexOffset + 2];

            this._packedBuffer.push(x);
            this._packedBuffer.push(y);
            this._packedBuffer.push(z);

            // if there is only a vertex value then we are done
            if (vertexTokens.length === 1) {
                continue;
            }

            if (vertexTokens[1] !== "") {
                if (this._textureCoordinates.length === 0) {
                    throw new Error("There are no texture coordinates defined");
                }
                const textureIndex = parseInt(vertexTokens[1]) - 1;
                const textureOffset = textureIndex * 2;
                const u = this._textureCoordinates[textureOffset];
                const v = this._textureCoordinates[textureOffset + 1];

                this._packedBuffer.push(u);
                this._packedBuffer.push(v);
            }
            if (vertexTokens.length === 3 && vertexTokens[2] !== "") {
                if (this._normals.length === 0) {
                    throw new Error("There are no normals defined");
                }
                const normalIndex = parseInt(vertexTokens[2]) - 1;
                const normalOffset = normalIndex * 3;
                const nx = this._normals[normalOffset];
                const ny = this._normals[normalOffset + 1];
                const nz = this._normals[normalOffset + 2];

                this._packedBuffer.push(nx);
                this._packedBuffer.push(ny);
                this._packedBuffer.push(nz);

            }
        }
    }

    /** 
     * parse face
     * @param {string} face
     * @returns Uint16Array
     * @memberof ModelGL
     * @method parseFace
     * @private
     * 
     * store the indices in this.tmpIndices so they can be converted to int16 later
     * */
    private parseFace(face: string) {
        let tokens: string[] = face.split(" ");
        let numVertices = tokens.length - 1;
        if (numVertices < 3) {
            throw new Error("A face must have at least 3 vertices");
        }

        /**
         * the face is a triangle, if we find 4 vertices we assume it is a fan
         */
        let triangles = [[tokens[1], tokens[2], tokens[3]]];
        if (numVertices === 4) {
            triangles = [[tokens[1], tokens[2], tokens[3]], [tokens[1], tokens[3], tokens[4]]];
        }

        for (let triangle of triangles) {
            this.parseTriangle(triangle);
        }

    }
}

export default ModelGL;
