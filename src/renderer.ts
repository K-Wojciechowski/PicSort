/**
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/latest/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import { ElectronBridge, getFileType } from "./common";
import "./index.css";
import { SetupResult, State } from "./renderer/models";
import { addSetupListeners, ensureEnoughSetupRows } from "./renderer/setup";
import { addSorterListeners, showLayer, startSorting } from "./renderer/sorter";

declare global {
  interface Window {
    electron: ElectronBridge;
  }
}

export const state: State = {
  mode: "setup",
  source: "",
  destination: "",
  includeImages: false,
  includeVideos: false,
  autoplay: false,
  loop: false,
  muted: false,
  categories: [],
  files: [],
  history: [],
  index: 0,
  lock: true,
};

export function applyMode() {
  if (state.mode === "sorter") {
    document.getElementById("setup").classList.add("hidden");
    document.getElementById("sorter").classList.remove("hidden");
  } else {
    document.getElementById("setup").classList.remove("hidden");
    document.getElementById("sorter").classList.add("hidden");
  }
}

async function start(setupResult: SetupResult) {
  state.mode = "sorter";
  state.source = setupResult.source;
  state.destination = setupResult.destination;
  state.includeImages = setupResult.includeImages;
  state.includeVideos = setupResult.includeVideos;
  state.autoplay = setupResult.autoplay;
  state.loop = setupResult.loop;
  state.muted = setupResult.muted;
  state.categories = setupResult.categories;
  state.index = 0;
  state.files = [];
  state.history = [];
  state.lock = true;

  applyMode();
  showLayer("placeholder-wait");

  const categoryNames = state.categories.map((c) => c.name);

  const files = await window.electron.start(setupResult.source, setupResult.destination, categoryNames);

  const filteredFiles = files
    .sort()
    .map((name) => {
      const type = getFileType(name);
      const include = (type === "image" && state.includeImages) || (type === "video" && state.includeVideos);
      return include ? { name, type } : undefined;
    })
    .filter((f) => f != undefined);
  state.files = filteredFiles;
  await startSorting();
}

addSetupListeners((setupResult) => start(setupResult));
addSorterListeners();
ensureEnoughSetupRows();
applyMode();
