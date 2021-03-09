import TaskManager, { ITask, ITaskManager } from "../src/task-manager"

test("New created task must have a new id", ()=>{
    const tm: ITaskManager = {
        taskId: 0,
        tasksQueue: []
    }
    const task: ITask = {}
    TaskManager.createNewTaskFromTask(task, tm)
    expect(task.id).toBe(1)
    expect(tm.tasksQueue.includes(task)).toBeTruthy()
})