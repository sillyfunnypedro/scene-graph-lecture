import basic_triangle from './scenes/basic_triangle.scene';
import textured_triangle from './scenes/textured_triangle.scene';
import normal_square from './scenes/normal_square.scene';
import house_windmill from './scenes/house_windmill.scene';
import graph from './scenes/graph.scene';
import arm from './scenes/arm.scene';
import ScenesManager from './ScenesManager';




async function loadSceneSourceFile(sceneName: string, sceneSource: string) {

    const scenesManager = ScenesManager.getInstance();
    scenesManager.sceneNames.push(sceneName);

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

    //loadSceneSourceFile('basic_triangle', basic_triangle);
    //loadSceneSourceFile('textured_triangle', textured_triangle);
    //loadSceneSourceFile('normal_square', normal_square)
    //loadSceneSourceFile('house_windmill', house_windmill)
    loadSceneSourceFile('graph', graph)
    loadSceneSourceFile('arm', arm)

}


