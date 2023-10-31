import ScenesManager from './ScenesManager';

import basicScene from './scenes/basic.scene';







const sceneSourceMap = new Map<string, string>();
const scenesManager = ScenesManager.getInstance();


async function loadSceneSourceFile(sceneName: string, sceneSource: string) {
    sceneSourceMap.set(sceneName, "__loading__");
    fetch(sceneSource)
        .then(
            response =>
                response.text())
        .then(data => {
            console.log('**********************************************************')
            console.log(`loaded ${sceneName}`);
            console.log('*********** Source Code Here *****************************')
            console.log(data);
            console.log('************ End of Source  ******************************')
            scenesManager.parseSceneFile(sceneName, data);
            sceneSourceMap.set(sceneName, data);
        })
        .catch(error => {
            console.log(error);
        })
    //sceneSourceMap.set(sceneName, sceneSource);
}

export function getSceneSource(sceneName: string): string | undefined {
    // wait until the scene is loaded
    return sceneSourceMap.get(sceneName);
}



export function loadAndCacheSceneSourceFiles() {
    console.log('In loadAndCacheScenes');
    loadSceneSourceFile('basic', basicScene);

}
