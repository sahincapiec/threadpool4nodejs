import { parentPort, threadId } from "worker_threads";
import { ITask } from "./task-manager";

export interface IResult {
    id: number,
    result?: unknown,
    error?: Error,
    threadId: number,
}

let queue = 0;

const exit = async () => {
    while (queue > 1) {
        await (() => new Promise(resolve => setTimeout(() => resolve(null), 100)))();
    }
    process.exit();
}

const getFunction = (localModule: NodeModule, task: ITask) => {
    const fnName = task.fn || '';
    const taskModule = task.module ? require(task.module) : localModule.exports;
    return taskModule.default[fnName] || taskModule[fnName];
}

parentPort?.on('message', (task: ITask) => {
    if (typeof(task[`fn`])===`undefined`) {
        return;
    }
    ++queue;
    const fn = getFunction(module, task);
    return new Promise(resolve => resolve(fn(task.args))).then(result => {
        parentPort?.postMessage({ id: task.id, result, threadId } as IResult);
    }).catch(error => {
        parentPort?.postMessage({ id: task.id, error, threadId } as IResult);
    }).finally(() => --queue);
});

export default {
    exit,
    fileName: __filename,
}