import basicScene from './scenes/basic.scene';
import ScenesManager from './ScenesManager';




async function loadSceneSourceFile(sceneName: string, sceneSource: string) {
    const scenesManager = ScenesManager.getInstance();
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

        })
        .catch(error => {
            console.log(error);
        })
    //sceneSourceMap.set(sceneName, sceneSource);
}




export function loadAndCacheSceneSourceFiles() {
    console.log('In loadAndCacheScenes');
    loadSceneSourceFile('basic', basicScene);

}
