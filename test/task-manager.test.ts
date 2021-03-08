import TaskManager from "../src/task-manager"

test("New created task must have a new id", ()=>{
    const tm = TaskManager.new()
    const task = TaskManager.createNewTask(tm)
    expect(task.id).toBe(1)
})