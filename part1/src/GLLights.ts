/**
 * A class for storing the light data for a scene
 */

export class GLPointLight {
    position: number[] = [0, 0, 0];
    color: number[] = [0.5, 0.5, 0.5];


    constructor(position: number[],
        color: number[]) {
        this.position = position;
        this.color = color;
    }
}

export class GLDirectionalLight {
    direction: number[] = [0, 0, 0];
    color: number[] = [0.5, 0.5, 0.5];

    constructor(direction: number[],
        color: number[]) {
        this.direction = direction;
        this.color = color;
    }
}

export class GLSpotLight {
    position: number[] = [0, 0, 0];
    direction: number[] = [0, 0, 0];
    color: number[] = [0.5, 0.5, 0.5];
    cutoff: number = 0.0;
    exponent: number = 0.0;

    constructor(position: number[],
        direction: number[],
        color: number[],
        cutoff: number,
        exponent: number) {
        this.position = position;
        this.direction = direction;
        this.color = color;
        this.cutoff = cutoff;
        this.exponent = exponent;
    }
}

export class GLLights {
    private _pointLights: Array<GLPointLight> = [];
    private _directionalLights: Array<GLDirectionalLight> = [];
    private _spotLights: Array<GLSpotLight> = [];

    get pointLights(): Array<GLPointLight> {
        return this._pointLights;
    }

    get directionalLights(): Array<GLDirectionalLight> {
        return this._directionalLights;
    }

    get spotLights(): Array<GLSpotLight> {
        return this._spotLights;
    }

    getPositionsFloat32(): Float32Array {
        let positions: number[] = [];
        for (let light of this._pointLights) {
            positions.push(light.position[0]);
            positions.push(light.position[1]);
            positions.push(light.position[2]);
        }
        return new Float32Array(positions);
    }

    getColorsFloat32(): Float32Array {
        let colors: number[] = [];
        for (let light of this._pointLights) {
            colors.push(light.color[0]);
            colors.push(light.color[1]);
            colors.push(light.color[2]);
        }
        return new Float32Array(colors);
    }


    addPointLight(light: GLPointLight): void {
        this._pointLights.push(light);
    }

    addDirectionalLight(light: GLDirectionalLight): void {
        this._directionalLights.push(light);
    }

    addSpotLight(light: GLSpotLight): void {
        this._spotLights.push(light);
    }
}

