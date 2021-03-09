export interface ITask {
    args?: unknown,
    id?: number,
    fn?: string,
    module?: string,
    resolve?: (value: any) => void,
    reject?: (reason?: any) => void,
    threadId?: number,
}

export interface ITaskManager {
    tasksQueue: ITask[]
    taskId: number
}

export default {
    createNewTaskFromTask: (task: ITask, tm: ITaskManager) => {
        task.id = ++tm.taskId
        tm.tasksQueue.push(task);
    },
    remove: (id: number, tm: ITaskManager) => tm.tasksQueue.splice(tm.tasksQueue.findIndex(unfinishedTask => unfinishedTask.id === id), 1)[0],
}