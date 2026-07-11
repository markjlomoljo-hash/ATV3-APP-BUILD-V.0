import { TaskBoardScreen } from "@/components/tasks/TaskBoardScreen";

export default function TasksPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-slate-950">Task Board</h1>
      <TaskBoardScreen />
    </div>
  );
}
