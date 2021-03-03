import TaskManager from "../src/task-manager"

test("New created task must have a new id", ()=>{
    const tm = new TaskManager()
    const task = tm.createNewTask()
    expect(task.id).toBe(1)
})