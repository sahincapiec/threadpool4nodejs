import { cpus } from "os";
import Thread, { IThread } from "./thread";
import { parentPort, threadId } from "worker_threads";
import TaskManager, { ITask } from "./task-manager";
import { IResult } from "./task-processor";

export default {
    threadPool: [] as IThread[],
    maxPoolSize: cpus().length,
    taskManager: TaskManager.new(),
    new() {
        if (parentPort) {
            parentPort.on('message', (result: IResult) => {
                const k = Object.keys(result)
                if(k.includes(`result`)) {
                    const unfinishedTask = TaskManager.remove(result.id, this.taskManager);
                    if (unfinishedTask?.resolve) {
                        unfinishedTask?.resolve(result.result);
                    }
                } else if (k.includes(`error`)) {
                    const unfinishedTask = TaskManager.remove(result.id, this.taskManager);
                    if (unfinishedTask?.reject) {
                        unfinishedTask?.reject(result.error);
                    }
                } 
            });
        }
    },
    pushTask(taskDto: ITask) {
        if (parentPort) {
            return this.pushToParent(taskDto);
        } 
        
        return this.pushToThread(taskDto);        
    },
    pushToParent(task: ITask) {
        new Promise((resolve, reject) => {
            TaskManager.createNewTaskFromTask(task, this.taskManager);
            task.threadId = threadId

            parentPort?.postMessage(task);

            task.resolve = resolve;
            task.reject = reject;
            task.fn = undefined;
            task.args = undefined;
            task.module = undefined;
        });
    },
    pushToThread(taskDto: ITask) {
        let lessBussyThreadIndex = 0;
        const threadPoolSize = this.threadPool.length;
        for (let index = 1; index < threadPoolSize; index++) {
            if ((this.threadPool[index - 1]).tasksManager.tasksQueue.length > (this.threadPool[index]).tasksManager.tasksQueue.length) {
                lessBussyThreadIndex = index;
            }
        }
        const lessBussyThread = this.threadPool[lessBussyThreadIndex];
        if (lessBussyThread && Thread.isOff(lessBussyThread) || threadPoolSize === this.maxPoolSize) {
            Thread.createNewTaskFromTask(taskDto, lessBussyThread);
            return Thread.push(taskDto, lessBussyThread);
        } else {
            const thread = Thread.new();
            const worker = thread.worker;
            worker.on('exit', () => {
                this.remove(thread);
            });
            worker.on('message', (task: ITask) => {
                if (!task.fn) {
                    return
                }
                this.pushToThread(task)
                    .then((result: any) => {
                        if (!task.id) {
                            throw 'Every task should have an ID except the exit task.';
                        }
                        const threadPoolLength = this.threadPool.length
                        for(let i = 0; i < threadPoolLength; i++){
                            const threadPool = this.threadPool[i]
                            if(threadPool.worker.threadId === task.threadId){
                                threadPool.worker.postMessage({
                                    id: task.id,
                                    threadId: worker.threadId,
                                    result,
                                })
                                break;
                            }
                        }
                    }).catch((error: any) => {
                        const threadPoolLength = this.threadPool.length
                        for(let i = 0; i < threadPoolLength; i++){
                            const threadPool = this.threadPool[i]
                            if(threadPool.worker.threadId === task.threadId){
                                threadPool.worker.postMessage({
                                    id: task.id || -1,
                                    threadId: worker.threadId,
                                    error,
                                })
                                break;
                            }
                        }
                    }); 
            });
            this.threadPool.push(thread);

            Thread.createNewTaskFromTask(taskDto, thread);
            return Thread.push(taskDto, thread);
        }
    },
    remove(thread: IThread) {
        const threadPoolLength = this.threadPool.length
        for(let i = 0; i < threadPoolLength; i++) {
            if (this.threadPool[i] !== thread) {
                this.threadPool.splice(i, 1);
                return
            }
        }
    }
}