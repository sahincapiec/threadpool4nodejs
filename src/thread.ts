import { Worker } from "worker_threads";
import TaskProcessor from "./task-processor";
import TaskManager, { ITask, ITaskManager } from "./task-manager";

export interface IThread {
    worker: Worker
    tasksManager: ITaskManager
}

export default {
    new: ()=>({
        worker: new Worker(TaskProcessor.FILE_NAME),
        tasksManager: {
            taskId: 0,
            tasksQueue: []
        },
    }),
    isOff: (t: IThread) => t.worker === null,
    getWorker: (t: IThread) => t.worker,
    createNewTaskFromTask: (task: ITask, t: IThread) => {
        TaskManager.createNewTaskFromTask(task, t.tasksManager);
    },
    push: (task: ITask, t: IThread) => {
        return new Promise((resolve, reject) => {
            t.worker.postMessage(task);
            task.resolve = resolve;
            task.reject = reject;

            task.fn = undefined;
            task.args = undefined;
            task.module = undefined;
        });
    },
    shutdown(t: IThread){
        if (t.tasksManager.tasksQueue.length > 0) return;

        this.push({
            fn: TaskProcessor.exit.name,
        }, t);
    }
}