// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { ipcRenderer, contextBridge } from "electron";
import { Commands, ElectronBridge, MoveResult } from "./common";

contextBridge.exposeInMainWorld("electron", {
  async getPath(id: string, title: string): Promise<string | undefined> {
    return await ipcRenderer.invoke(Commands.GetPath, id, title);
  },

  async start(sourceDirectory: string, destinationDirectory: string, categoryNames: string[]): Promise<string[]> {
    return await ipcRenderer.invoke(Commands.Start, sourceDirectory, destinationDirectory, categoryNames);
  },

  async move(fileName: string, categoryName: string): Promise<MoveResult> {
    return await ipcRenderer.invoke(Commands.Move, fileName, categoryName);
  },

  async undo(fileName: string, categoryName: string): Promise<MoveResult> {
    return await ipcRenderer.invoke(Commands.Undo, fileName, categoryName);
  },
} as ElectronBridge);
