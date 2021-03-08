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
    new: ()=>({
        tasksQueue: [] as ITask[],
        taskId: 0,
    }),
    createNewTask(tm: ITaskManager) {
        const task: ITask = { id: ++tm.taskId };
        tm.tasksQueue.push(task);
        return task;
    },
    createNewTaskFromTask(task: ITask, tm: ITaskManager) {
        task.id = ++tm.taskId
        tm.tasksQueue.push(task);
    },
    remove(id: number, tm: ITaskManager) {
        for (let index = 0; index < tm.tasksQueue.length; index++) {
            if (id === tm.tasksQueue[index].id) {
                return tm.tasksQueue.splice(index, 1)[0];
            }
        }
    }
}