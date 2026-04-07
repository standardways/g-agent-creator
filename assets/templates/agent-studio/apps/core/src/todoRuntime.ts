import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type TodoItem = {
  id: string;
  ownerId: string;
  title: string;
  status: "pending" | "in_progress" | "completed";
  createdAt: string;
};

type TodoState = {
  items: TodoItem[];
};

const DEFAULT_STATE: TodoState = {
  items: [],
};

export async function loadTodoState(dataDir: string) {
  const filePath = path.join(dataDir, "todos.json");
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify(DEFAULT_STATE, null, 2), "utf8");
    return { filePath, state: DEFAULT_STATE };
  }
  return {
    filePath,
    state: { ...DEFAULT_STATE, ...(JSON.parse(await readFile(filePath, "utf8")) as TodoState) },
  };
}

async function saveTodoState(filePath: string, state: TodoState) {
  await writeFile(filePath, JSON.stringify(state, null, 2), "utf8");
}

export async function listTodos(dataDir: string, ownerId: string) {
  return (await loadTodoState(dataDir)).state.items.filter((item) => item.ownerId === ownerId);
}

export async function addTodo(dataDir: string, item: TodoItem) {
  const loaded = await loadTodoState(dataDir);
  loaded.state.items.unshift(item);
  await saveTodoState(loaded.filePath, loaded.state);
  return item;
}

export async function updateTodo(dataDir: string, id: string, status: TodoItem["status"]) {
  const loaded = await loadTodoState(dataDir);
  loaded.state.items = loaded.state.items.map((item) => (item.id === id ? { ...item, status } : item));
  await saveTodoState(loaded.filePath, loaded.state);
  return loaded.state.items.find((item) => item.id === id) ?? null;
}
