import { cpus } from "os";
import Thread, { IThread } from "./thread";
import { parentPort, threadId } from "worker_threads";
import TaskManager, { ITask, ITaskManager } from "./task-manager";
import { IResult } from "./task-processor";

export interface ITP4NJS {
    taskManager: ITaskManager
}

export default {
    threadPool: [] as IThread[],
    maxPoolSize: cpus().length,
    new: ()=>{
        const tp4njs: ITP4NJS = {
            taskManager: {
                taskId: 0,
                tasksQueue: []
            }
        }
        parentPort?.on('error', () => {
            throw `Thread '${threadId}' got an error.`;
        });
        parentPort?.on('exit', (code) => {
            if (code !== 0) {
                throw `Thread '${threadId}' stopped with exit code ${code}`;
            }
        });
        parentPort?.on('message', (result: IResult) => {
            const unfinishedTask: any = TaskManager.remove(result.id, tp4njs.taskManager);
            if (result.error) {
                unfinishedTask?.reject(result.error);
                return
            } 
            unfinishedTask?.resolve(result.result);
        });
        return tp4njs
    },
    pushTask(taskDto: ITask, tp4njs: ITP4NJS) {
        if (parentPort) {
            return this.pushToParent(taskDto, tp4njs);
        } 
        
        return this.pushToThread(taskDto);
    },
    pushToParent: (taskDto: ITask, tp4njs: ITP4NJS) => new Promise((resolve, reject) => {
        TaskManager.createNewTaskFromTask(taskDto, tp4njs.taskManager);
        taskDto.threadId = threadId
        parentPort?.postMessage(taskDto);
        taskDto.resolve = resolve;
        taskDto.reject = reject;

        taskDto.fn = undefined;
        taskDto.args = undefined;
        taskDto.module = undefined;
    }),
    pushToThread(taskDto: ITask) {
        let lessBussyThreadIndex = 0;
        const threadPoolSize = this.threadPool.length;
        for (let index = 1; index < threadPoolSize; index++) {
            if (this.threadPool[index - 1].tasksManager.tasksQueue.length > this.threadPool[index].tasksManager.tasksQueue.length) {
                lessBussyThreadIndex = index;
            }
        }
        const lessBussyThread = this.threadPool[lessBussyThreadIndex];
        if (lessBussyThread && Thread.isOff(lessBussyThread) || threadPoolSize === this.maxPoolSize) {
            Thread.createNewTaskFromTask(taskDto, lessBussyThread);
            return Thread.push(taskDto, lessBussyThread);
        } 

        const thread = Thread.new();
        const worker = Thread.getWorker(thread);
        worker.on('error', () => {
            throw `Thread '${worker.threadId}' got an error.`;
        });
        worker.on('exit', (code) => {
            if (code !== 0) {
                throw `Thread '${worker.threadId}' stopped with exit code ${code}`;
            }
            this.remove(thread);
        });
        worker.on('message', (msg: any) => {
            if (msg.fn) {
                this.pushToThread(msg).then((result:any) => {
                    msg.threadId = worker.threadId
                    msg.result = result
                    Thread.getWorker(this.threadPool.find(current => Thread.getWorker(current).threadId === msg.threadId) || {} as IThread).postMessage(msg);  
                })
                return
            }

            const unfinishedTask: any = TaskManager.remove(msg.id, thread.tasksManager);
            if (msg.error) {
                unfinishedTask?.reject(msg.error);
                Thread.shutdown(thread);
                return
            } 
            unfinishedTask?.resolve(msg.result);
            Thread.shutdown(thread);
        });
        this.threadPool.push(thread);

        Thread.createNewTaskFromTask(taskDto, thread);
        return Thread.push(taskDto, thread);
    },
    remove(thread: IThread) {
        this.threadPool.splice(this.threadPool.indexOf(thread))
    }
}
