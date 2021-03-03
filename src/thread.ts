import { Worker } from "worker_threads";
import TaskProcessor, { IResult } from "./task-processor";
import TaskManager, { ITask } from "./task-manager";

export default class Thread {
    private worker: Worker;
    private tasksManager: TaskManager;

    constructor() {
        this.worker = new Worker(TaskProcessor.fileName);
        this.tasksManager = new TaskManager();
        this.setUpWorker();
    }

    setUpWorker = () => {
        this.worker.on('error', () => {
            new Error(`Thread '${this.worker.threadId}' got an error.`);
        });
        this.worker.on('exit', (code) => {
            if (code !== 0) {
                new Error(`Thread '${this.worker.threadId}' stopped with exit code ${code}`);
            }
        });
        this.worker.on('message', (result: IResult) => {
            if (Object.keys(result).includes('result') || Object.keys(result).includes('error')) {
                const unfinishedTask = this.tasksManager.remove(result.id);
                if (result.error) {
                    if (unfinishedTask?.reject) unfinishedTask?.reject(result.error);
                } else {
                    if (unfinishedTask?.resolve) unfinishedTask.resolve(result.result);
                }
                this.shutdown();
            }
        });
    }

    isOff = () => this.worker === null;

    getWorker = () => this.worker;

    getTaskQueueSize = () => this.tasksManager.getTaskQueueSize();

    createNewTask = () => {
        return this.tasksManager.createNewTask();
    }

    push = (task: ITask) => {
        return new Promise((resolve, reject) => {
            task.resolve = resolve;
            task.reject = reject;

            const taskToBeProcessed: ITask = {
                args: task.args,
                id: task.id,
                fn: task.fn,
                module: task.module,
            }

            task.fn = undefined;
            task.args = undefined;
            task.module = undefined;

            this.worker?.postMessage(taskToBeProcessed);
        });
    }

    shutdown = () => {
        if (this.tasksManager.getTaskQueueSize() > 0) return;

        const task: ITask = {
            fn: TaskProcessor.exit.name,
        }
        this.push(task);
    }
}