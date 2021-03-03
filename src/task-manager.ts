export interface ITask {
    args?: unknown,
    id?: number,
    fn?: string,
    module?: string,
    resolve?: (value: any) => void,
    reject?: (reason?: any) => void,
    threadId?: number,
}

export default class TaskManager {
    private tasksQueue: ITask[];
    private taskId: number;

    constructor() {
        this.tasksQueue = [];
        this.taskId = 0;
    }

    createNewTask() {
        const task: ITask = { id: ++this.taskId };
        this.tasksQueue.push(task);
        return task;
    }

    getTaskQueueSize = () => this.tasksQueue.length;

    remove(id: number) {
        const unfinishedTasks = this.tasksQueue;
        const totalUnfinishedTasks = unfinishedTasks.length;
        for (let index = 0; index < totalUnfinishedTasks; index++) {
            const unfinishedTask = unfinishedTasks[index];
            if (id === unfinishedTask.id) {
                this.tasksQueue = this.tasksQueue.filter(currentTask => currentTask.id !== id);
                return unfinishedTask;
            }
        }
    }
}