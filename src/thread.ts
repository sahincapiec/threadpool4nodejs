import { Worker } from "worker_threads";
import TaskProcessor, { IResult } from "./task-processor";
import TaskManager, { ITask, ITaskManager } from "./task-manager";

export interface IThread {
    worker: Worker
    tasksManager: ITaskManager
}

export default {
    new() {
        const thread = {
            worker: new Worker(TaskProcessor.fileName),
            tasksManager: TaskManager.new(),
        }
        this.setUpWorker(thread)
        return thread
    },
    setUpWorker(thread: IThread) {
        thread.worker.on('error', () => {            
            throw `Thread '${thread.worker.threadId}' got an error.`
        });
        thread.worker.on('exit', (code: any) => {
            if (code !== 0) {
                throw `Thread '${thread.worker.threadId}' stopped with exit code ${code}`
            }
        });
        thread.worker.on('message', (result: IResult) => {
            const k = Object.keys(result)
            if(k.includes(`result`)) {
                const unfinishedTask = TaskManager.remove(result.id, thread.tasksManager);
                if (unfinishedTask?.resolve) {
                    unfinishedTask.resolve(result.result);
                }
                this.shutdown(thread);
            } else if (k.includes(`error`)) {
                const unfinishedTask = TaskManager.remove(result.id, thread.tasksManager);
                if (unfinishedTask?.reject) {
                    unfinishedTask?.reject(result.error);
                }
                this.shutdown(thread);
            } 
        });
    },
    isOff(thread: IThread) {
        return thread.worker === null;
    },
    createNewTask(thread: IThread) {
        return TaskManager.createNewTask(thread.tasksManager);
    },
    createNewTaskFromTask(task: ITask, thread: IThread) {
        return TaskManager.createNewTaskFromTask(task, thread.tasksManager);
    },
    push(task: ITask, thread: IThread) {
        return new Promise((resolve, reject) => {
            thread.worker?.postMessage(task);

            task.resolve = resolve;
            task.reject = reject;
            task.fn = undefined;
            task.args = undefined;
            task.module = undefined;
        });
    },
    shutdown(thread: IThread) {
        if (thread.tasksManager.tasksQueue.length > 0) return;

        this.push({
            fn: TaskProcessor.exit.name,
        }, thread);
    }
}