import { objectFileMap } from './ObjectFileMap';
import ScenesManager from './ScenesManager';
import React, { useState, useEffect } from 'react';
import LocalServerStatus from './LocalServerStatus';
import ModelGl from './ModelGL';

// Styles for the sliders
import './ControlComponent.css';



// Instantiate the ScenesManager

const scenesManager = ScenesManager.getInstance();


// define the ControlComponentProps interface
interface ControlComponentProps {

    // the current object and mode
    renderObject: string;
    updateRenderObject: (newObject: string) => void;

    modelGLDeprecated: ModelGl | null;
}


// define the ControlComponent
function ControlComponent({ renderObject,
    updateRenderObject, modelGLDeprecated }: ControlComponentProps) {
    const [modelGL, setModelGL] = useState<ModelGl | null>(null);
    const [translateX, setTranslateX] = useState(modelGL?.translateX ?? 0);
    const [translateY, setTranslateY] = useState(modelGL?.translateX ?? 0);
    const [translateZ, setTranslateZ] = useState(modelGL?.translateX ?? 0);
    const [rotateX, setRotateX] = useState(modelGL?.rotateX ?? 0)
    const [rotateY, setRotateY] = useState(modelGL?.rotateY ?? 0);
    const [rotateZ, setRotateZ] = useState(modelGL?.rotateZ ?? 0);
    const [scaleX, setScaleX] = useState(modelGL?.scaleX ?? 1);
    const [scaleY, setScaleY] = useState(modelGL?.scaleY ?? 1);
    const [scaleZ, setScaleZ] = useState(modelGL?.scaleZ ?? 1);
    const [uniformScale, setUniformScale] = useState(true);
    const [sceneName, setSceneName] = useState("");

    function updateControlledModelGL(modelName: string) {
        if (sceneName === "") {
            return;
        }

        const currentScene = scenesManager.getScene(sceneName);
        if (!currentScene) {
            return;
        }

        const newModel = currentScene.getObject(modelName);
        if (!newModel) {
            return;
        }
        updateRenderObject(modelName);
        setModelGL(newModel);
    }

    function updateState() {
        setTranslateX(modelGL?.getTranslateX() ?? 0);
        setTranslateY(modelGL?.getTranslateY() ?? 0);
        setTranslateZ(modelGL?.getTranslateZ() ?? 0);
        setRotateX(modelGL?.getRotateX() ?? 0);
        setRotateY(modelGL?.getRotateY() ?? 0);
        setRotateZ(modelGL?.getRotateZ() ?? 0);
        setScaleX(modelGL?.scaleX ?? 1);
        setScaleY(modelGL?.scaleY ?? 1);
        setScaleZ(modelGL?.scaleZ ?? 1);
    }

    useEffect(() => {
        updateState();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [modelGL]);


    function handleSlideChangeRot(event: React.ChangeEvent<HTMLInputElement>, axis: string) {
        const valueString = event.target.value;
        const value = parseFloat(valueString);
        if (!modelGL) {
            return;
        }
        switch (axis) {
            case "x":
                modelGL.setRotateX(value);
                setRotateX(value);
                break;
            case "y":
                modelGL.setRotateY(value);
                setRotateY(value);
                break;
            case "z":
                modelGL.setRotateZ(value);
                setRotateZ(value);
                break;
        }
        updateState();
    }

    /**
     *  handle the slider change for the translation
     * @param event 
     * @param axis 
     * @returns 
     */
    function handleSliderChangeTranslate(event: React.ChangeEvent<HTMLInputElement>, axis: string) {
        // convert the string value to a number
        const value = event.target.value;
        const numValue = parseFloat(value);
        if (!modelGL) {
            return;
        }
        switch (axis) {
            case "x":
                modelGL.setTranslateX(numValue);
                setTranslateX(numValue);
                break;
            case "y":
                modelGL.setTranslateY(numValue);
                setTranslateY(numValue);
                break;
            case "z":
                modelGL.setTranslateZ(numValue);
                setTranslateZ(numValue);
                break;
        }
        updateState();
    }

    /**
     *  handle the slider change for the scale
     * @param event 
     * @param axis 
     * @returns 
     */
    function handleSlideChangeScale(event: React.ChangeEvent<HTMLInputElement>, axis: string) {
        // convert the string value to a number
        const value = event.target.value;
        const numValue = parseFloat(value);
        if (!modelGL) {
            return;
        }

        if (uniformScale) {
            modelGL.scaleX = numValue;
            modelGL.scaleY = numValue;
            modelGL.scaleZ = numValue;

        } else {
            switch (axis) {
                case "x":
                    modelGL.scaleX = numValue;
                    break;
                case "y":
                    modelGL.scaleY = numValue;
                    break;
                case "z":
                    modelGL.scaleZ = numValue;
                    break;
            }
        }
        updateState();

    }


    /**
     * reset all the sliders to their initial values
     */
    function resetAllSliders() {
        if (!modelGL) {
            return;
        }
        modelGL.translateX = 0;
        modelGL.translateY = 0;
        modelGL.translateZ = 0;

        modelGL.rotateX = 0;
        modelGL.rotateY = 0;
        modelGL.rotateZ = 0;


        modelGL.scaleX = 1;
        modelGL.scaleY = 1;
        modelGL.scaleZ = 1;

        setUniformScale(true);
        updateState();


    }

    function updateSceneName(sceneName: string) {
        scenesManager.setActiveScene(sceneName);
        setSceneName(sceneName);
    }


    /**
     * make the sliders for the translation
     * 
     * @returns three sliders for translation
     */
    function makeTranslateSliders() {

        return (
            <div>
                <table className="tableWidth">
                    <thead>
                        <tr>
                            <th className="leftAlign">
                                Translate
                            </th>
                            <th className="rightAlign">
                                <label htmlFor="myRangeX">X:</label>
                                <input name="x" type="range" min="-50" max="50" step="any"
                                    value={translateX} className="slider"
                                    onChange={(event) => handleSliderChangeTranslate(event, "x")} id="myRangeX">

                                </input>
                                <br />
                                <label htmlFor="myRangeY">Y:</label>
                                <input name="y" type="range" min="-50" max="50" step="any"
                                    value={translateY} className="slider"
                                    onChange={(event) => handleSliderChangeTranslate(event, "y")} id="myRangeY">

                                </input>
                                <br />
                                <label htmlFor="myRangeZ">Z:</label>
                                <input name="z" type="range" min="-50" max="50" step="any"
                                    value={translateZ} className="slider"
                                    onChange={(event) => handleSliderChangeTranslate(event, "z")} id="myRangeZ">
                                </input>
                            </th>
                        </tr>
                    </thead>
                </table>
            </div>
        );
    }

    /**
     * make the sliders for the scale
     * 
     * @returns three sliders for scale plus a check box for uniform scaling
     */
    function makeScaleSliders() {
        return (
            <div>
                <table className="tableWidth">
                    <thead>
                        <tr>
                            <th className="leftAlign">Scale</th>
                            <th className="rightAlign">
                                <input type="checkbox" id="uniformScale" name="uniformScale"
                                    checked={uniformScale} onChange={() => setUniformScale(!uniformScale)}>

                                </input>
                                <label htmlFor="uniformScale">Uniform</label>
                            </th>
                            <th className="rightAlign">
                                <label htmlFor="scaleX">X:</label>
                                <input name="scaleX" type="range" min="0.1" max="2" step="any"
                                    value={scaleX} className="slider"
                                    onChange={(event) => handleSlideChangeScale(event, "x")} id="scaleX">

                                </input>
                                <br />
                                <label htmlFor="scaleY">Y:</label>
                                <input name="scaleY" type="range" min="0.1" max="2" step="any"
                                    value={scaleY} className="slider"
                                    onChange={(event) => handleSlideChangeScale(event, "y")} id="scaleY">

                                </input>
                                <br />
                                <label htmlFor="scaleZ">Z:</label>
                                <input name="scaleZ" type="range" min="0.1" max="2" step="any"
                                    value={scaleZ} className="slider"
                                    onChange={(event) => handleSlideChangeScale(event, "z")} id="scaleZ">

                                </input>
                            </th>
                        </tr>
                    </thead>
                </table>
            </div>
        );
    }


    /**
     * creates the rotation sliders and calls handleSlideChangeRot when the user changes the slider
     * The second parameter is the axis of rotation
     * @returns three sliders for rotation
     * */
    function makeRotationSliders() {

        return (
            <div>
                <table className="tableWidth">
                    <thead>
                        <tr>
                            <th className="leftAlign">Rotate</th>
                            <th className="rightAlign">
                                <label htmlFor="rotateX">X:</label>
                                <input name="rotz" type="range" min="0" max="360" step="any"
                                    value={rotateX} className="slider"
                                    onChange={(event) => handleSlideChangeRot(event, "x")} id="rotateX">
                                </input>
                                <br />
                                <label htmlFor="rotateY">Y:</label>
                                <input name="rotz" type="range" min="0" max="360" step="any"
                                    value={rotateY} className="slider"
                                    onChange={(event) => handleSlideChangeRot(event, "y")} id="rotateY">
                                </input>
                                <br />
                                <label htmlFor="rotateZ">Z:</label>
                                <input name="rotz" type="range" min="0" max="360" step="any"
                                    value={rotateZ} className="slider"
                                    onChange={(event) => handleSlideChangeRot(event, "z")} id="rotateZ">
                                </input>
                            </th>
                        </tr>
                    </thead>
                </table>
            </div>
        );
    }

    /**
     * make the buttons for the scenes
     * 
     * @returns HTML component with as many buttons as there are scenes
     */
    function makeScenesButtons() {
        const scenes = scenesManager.getScenes();

        const currentScene = scenesManager.getActiveScene();
        let buttonCount = 0;
        // put five buttons on a row
        function makeRow() {
            buttonCount += 1;
            if (buttonCount % 5 === 0) {
                return <br />;
            }
        }

        return (
            <div>
                <table className="tableWidth">
                    <thead>
                        <tr>
                            <th className="leftAlign">Scenes:</th>
                            <th className="rightAlign">
                                {scenes.map((scene) => (
                                    <React.Fragment key={scene}>
                                        <button
                                            key={scene}
                                            onClick={() => updateSceneName(scene)}
                                            style={{
                                                backgroundColor: (scene === currentScene) ? 'blue' : 'gray',
                                                fontSize: '20px',
                                                fontWeight: 'bold',
                                            }}
                                        >
                                            {scene}
                                        </button>
                                        {makeRow()}
                                    </React.Fragment>

                                ))}

                            </th>
                        </tr>
                    </thead>
                </table>
            </div>
        );
    }

    /**
     * 
     * @param string[]
     * 
     * @returns HTML component with as many buttons as there are strings in the array
     */
    function makeObjectButtons(title: string, value: string, callback: (model: string) => void) {

        const currentSceneName = scenesManager.getActiveScene();
        const currentScene = scenesManager.getScene(currentSceneName);
        let objects: string[] = [];


        if (currentScene !== null && currentScene !== undefined) {
            objects = currentScene.getSceneObjects();
        }

        if (renderObject === "") {
            updateRenderObject(objects[0]);
        }


        let buttonCount = 0;
        // put five buttons on a row
        function makeRow() {
            buttonCount += 1;
            if (buttonCount % 5 === 0) {
                return <br />;
            }
        }

        return (
            <div>
                <table className="tableWidth">
                    <thead>
                        <tr>
                            <th className="leftAlign">{title}</th>
                            <th className="rightAlign">
                                {objects.map((string) => (
                                    <React.Fragment key={string}>
                                        <button
                                            key={string}
                                            onClick={() => callback(string)}
                                            style={{
                                                backgroundColor: value === string ? 'blue' : 'gray',
                                                fontSize: '20px',
                                                fontWeight: 'bold',
                                            }}
                                        >
                                            {string}
                                        </button>
                                        {makeRow()}
                                    </React.Fragment>

                                ))}

                            </th>
                        </tr>
                    </thead>
                </table>
            </div>
        );
    }

    function makeControlButtons() {
        return (
            <div>
                <table className="tableWidth">
                    <thead>
                        <tr>
                            <th className="leftAlign">
                                Control
                            </th>
                            <th className="rightAlign">
                                <button onClick={resetAllSliders}>Reset</button>
                            </th>
                        </tr>
                    </thead>
                </table>
            </div>
        );
    }


    // make a panel with two rows of buttons.
    // the first row has two buttons, one for the triangle and one for the square
    // the second row has one button for solid and one button for wireframe
    // return the html component that contains the buttons


    return (
        <div>
            <table>
                <thead>
                    <tr>
                        <th className="leftAlign">
                            <hr className="lineWidth" />
                            <LocalServerStatus />
                            <hr className="lineWidth" />
                            {makeScenesButtons()}
                            <hr className="lineWidth" />
                            {makeObjectButtons("Objects:", renderObject, updateControlledModelGL)}
                            <hr className="lineWidth" />
                        </th>
                        <th className="rightAlign">
                            <hr className="lineWidth" />
                            {makeTranslateSliders()}
                            <hr className="lineWidth" />
                            {makeRotationSliders()}
                            <hr className="lineWidth" />
                            {makeScaleSliders()}
                            <hr className="lineWidth" />
                            {makeControlButtons()}
                            <hr className="lineWidth" />
                        </th>
                    </tr>

                </thead>
            </table>
        </div>


    );
}

// export the ControlComponent
export default ControlComponent;