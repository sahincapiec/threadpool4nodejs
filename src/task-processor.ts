import { parentPort, threadId } from "worker_threads";
import { ITask } from "./task-manager";

export interface IResult {
    id: number,
    result?: unknown,
    error?: Error,
    threadId: number,
}

let queue = 0;

const exit = () => {
    if(queue > 1){
        return
    }
    process.exit();
}

const getFunction = (localModule: NodeModule, task: ITask) => {
    const fnName = task.fn || '';
    if(task.module){
        const taskModule = require(task.module)
        return taskModule.default[fnName] || taskModule[fnName];
    } 
    const taskModule = localModule.exports
    return taskModule.default[fnName] || taskModule[fnName];
}

if(parentPort && parentPort!==null){
    const pPort = parentPort
    pPort.on('message', async (task: ITask) => {
        if (typeof(task[`fn`])!==`string`) {
            return;
        }
        ++queue;

        const fn = getFunction(module, task);
        const result = await fn(task.args)
        pPort.postMessage({ id: task.id, result, threadId } as IResult);
        
        --queue
    });    
}

export default {
    FILE_NAME: __filename,
    exit,
}