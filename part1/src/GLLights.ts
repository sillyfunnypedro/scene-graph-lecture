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

export class GLLights {
    private _pointLights: Array<GLPointLight> = [];

    get pointLights(): Array<GLPointLight> {
        return this._pointLights;
    }

    addPointLight(light: GLPointLight): void {
        this._pointLights.push(light);
    }
}

