import { cpus } from "os";
import Thread from "./thread";
import { parentPort, threadId } from "worker_threads";
import TaskManager, { ITask } from "./task-manager";
import { IResult } from "./task-processor";

export default class Tp4njs {
    private static threadPool: Thread[] = [];
    private static maxPoolSize: number = cpus().length;
    private taskManager: TaskManager;

    constructor() {
        this.taskManager = new TaskManager();
        this.setUpProcess();
    }

    setUpProcess() {
        if (parentPort) {
            parentPort.on('message', (result: IResult) => {
                if (Object.keys(result).includes('result') || Object.keys(result).includes('error')) {
                    const unfinishedTask = this.taskManager.remove(result.id);
                    if (result.error) {
                        if (unfinishedTask?.reject) unfinishedTask?.reject(result.error);
                    } else {
                        if (unfinishedTask?.resolve) unfinishedTask.resolve(result.result);
                    }
                }
            });
        }
    }

    pushTask = (taskDto: ITask) => {
        if (parentPort) {
            return this.pushToParent(taskDto);
        } else {
            return this.pushToThread(taskDto);
        }
    }

    private pushToParent = (taskDto: ITask) => new Promise((resolve, reject) => {
        const task = this.taskManager.createNewTask();
        task.resolve = resolve;
        task.reject = reject;

        const taskToBeProcessed: ITask = {
            args: taskDto.args,
            id: task.id,
            fn: taskDto.fn,
            module: taskDto.module,
            threadId: threadId,
        }

        parentPort?.postMessage(taskToBeProcessed);
    });

    private pushToThread = (taskDto: ITask) => {
        let lessBussyThreadIndex = 0;
        const threadPoolSize = Tp4njs.threadPool.length;
        for (let index = 1; index < threadPoolSize; index++) {
            if (Tp4njs.threadPool[index - 1].getTaskQueueSize() > Tp4njs.threadPool[index].getTaskQueueSize()) {
                lessBussyThreadIndex = index;
            }
        }
        const lessBussyThread = Tp4njs.threadPool[lessBussyThreadIndex];
        if (lessBussyThread && lessBussyThread.isOff() || threadPoolSize === Tp4njs.maxPoolSize) {
            console.log("reuse thread pipe: ", lessBussyThreadIndex);

            const task = lessBussyThread.createNewTask();
            task.args = taskDto.args;
            task.fn = taskDto.fn;
            task.module = taskDto.module;

            return lessBussyThread.push(task);
        } else {
            const thread = new Thread();
            const worker = thread.getWorker();
            worker.on('exit', () => {
                this.remove(thread);
            });
            worker.on('message', (task: ITask) => {
                if (task.fn) {
                    this.pushToThread(task).then(result => {
                        if (task.id) {
                            const resultToBeSent: IResult = {
                                id: task.id,
                                threadId: worker.threadId,
                                result,
                            };
                            Tp4njs.threadPool.find(current => current.getWorker().threadId === task.threadId)?.getWorker().postMessage(resultToBeSent);
                        } else {
                            throw new Error('Every task should have an ID except the exit task.');
                        }
                    }).catch(error => {
                        const resultToBeSent: IResult = {
                            id: task.id || -1,
                            threadId: worker.threadId,
                            error,
                        };
                        Tp4njs.threadPool.find(current => current.getWorker().threadId === task.threadId)?.getWorker().postMessage(resultToBeSent);
                    });
                }
            });
            Tp4njs.threadPool.push(thread);

            const task = thread.createNewTask();
            task.args = taskDto.args;
            task.fn = taskDto.fn;
            task.module = taskDto.module;

            return thread.push(task);
        }
    }

    private remove(thread: Thread) {
        const newThreadPool = [];
        for (const currentThread of Tp4njs.threadPool) {
            if (currentThread !== thread) {
                newThreadPool.push(currentThread);
            }
        }
        Tp4njs.threadPool = newThreadPool;
    }
}