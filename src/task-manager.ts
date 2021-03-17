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
    remove: (id: number, tm: ITaskManager) => {
        const length = tm.tasksQueue.length
        let index = -1
        for(let i = 0; i < length; i++){
            if(tm.tasksQueue[i].id === id){
                index = i
                break
            }
        }
        return tm.tasksQueue.splice(index, 1)[0]
    },
}