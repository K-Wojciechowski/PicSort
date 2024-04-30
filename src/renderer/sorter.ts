import { applyMode, state } from "../renderer";
import { Loader } from "./loader";

const loader = new Loader();

export function showLayer(id: string) {
  [...document.querySelector("main").children].forEach((n) => (n as HTMLElement).classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
  document.getElementById("content-image-item")?.remove();
  document.getElementById("content-video-item")?.remove();
}

export async function startSorting() {
  loader.start(state.files);
  const buttons = document.querySelectorAll("category-button");
  [...buttons].forEach((c) => c.remove());

  const footer = document.querySelector("footer");
  const firstToolButton = document.querySelector(".category-tool-button");

  document.querySelectorAll(".category-button").forEach((b) => b.remove());

  for (const category of state.categories) {
    const button = document.createElement("button") as HTMLButtonElement;
    button.innerText = category.name;
    button.title = `${category.name} (${category.key})`;
    button.className = "category-button";
    button.style.background = category.color;
    button.dataset.index = category.index.toString();
    button.dataset.key = category.key;
    button.dataset.name = category.name;
    button.addEventListener("click", async () => await assignCategory(category.name));
    footer.insertBefore(button, firstToolButton);
  }

  await loadContent(false);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let waitCursorTimeout: any;

function startWork(showOverlay = true) {
  setLock(true);
  if (!showOverlay) return;
  document.getElementById("overlay-wait").classList.remove("hidden");
  (document.getElementById("content-video-item") as HTMLVideoElement)?.pause();
  waitCursorTimeout = setTimeout(addWaitCursorToOverlay, 500);
}

function addWaitCursorToOverlay() {
  const overlay = document.getElementById("overlay-wait");
  if (!overlay.classList.contains("hidden")) overlay.classList.add("cursor-wait");
}

function stopWork() {
  clearTimeout(waitCursorTimeout);
  setLock(false);
  const overlay = document.getElementById("overlay-wait");
  overlay.classList.add("hidden");
  overlay.classList.remove("cursor-wait");
}

function showError(message: string) {
  (document.querySelector("#placeholder-error p") as HTMLParagraphElement).innerText = message;
  showLayer("placeholder-error");
  loader.stop();
  stopWork();
  setLock(true);
}

async function loadContent(showOverlay = true) {
  document.querySelectorAll("footer button").forEach((b: HTMLButtonElement) => b.classList.remove("keydown"));
  const filenameBox = document.getElementById("filename");

  if (state.index >= state.files.length) {
    filenameBox.innerText = "";
    showLayer("placeholder-done");
    loader.stop();
    setLock(true);
    return;
  }

  startWork(showOverlay);
  const file = state.files[state.index];
  loader.setIndex(state.index);
  const src = await loader.get(file.name);
  filenameBox.innerText = file.name;

  if (file.type === "image") {
    showLayer("content-image");
    const box = document.getElementById("content-image");
    const img = document.createElement("img");
    img.src = src;
    img.id = "content-image-item";
    img.addEventListener("click", () => img.classList.toggle("zoom"));
    box.innerHTML = "";
    box.appendChild(img);
  } else if (file.type === "video") {
    showLayer("content-video");
    const box = document.getElementById("content-video");
    const video = document.createElement("video");
    video.controls = true;
    video.autoplay = state.autoplay;
    video.loop = state.loop;
    video.muted = state.muted;
    video.preload = "auto";
    const source = document.createElement("source");
    source.src = src;
    video.id = "content-video-item";
    box.innerHTML = "";
    video.appendChild(source);
    box.appendChild(video);
  } else {
    showError("Unable to load content");
    return;
  }
  stopWork();
}

function applyLock() {
  document.querySelectorAll("footer button").forEach((b: HTMLButtonElement) => (b.disabled = state.lock));
  if (
    state.lock &&
    state.history.length > 0 &&
    !document.getElementById("placeholder-done").classList.contains("hidden")
  ) {
    (document.getElementById("undo") as HTMLButtonElement).disabled = false;
  }
}

function setLock(newState: boolean) {
  state.lock = newState;
  applyLock();
}

async function assignCategory(categoryName: string) {
  if (state.lock) return;

  const file = state.files[state.index];
  if (file == undefined) return;

  const fileName = file.name;

  startWork();

  const result = await window.electron.move(fileName, categoryName);
  if (!result.success) {
    showError(result.error);
    return;
  }

  state.history.push({ categoryName, fileName });
  ++state.index;
  await loadContent();
}

async function undo() {
  if (
    state.lock &&
    (state.history.length === 0 || document.getElementById("placeholder-done").classList.contains("hidden"))
  )
    return;

  const historyEntry = state.history.pop();
  if (historyEntry == undefined) {
    alert("Nothing to undo");
    return;
  }

  startWork();
  const result = await window.electron.undo(historyEntry.fileName, historyEntry.categoryName);
  if (!result.success) {
    showError(result.error);
    return;
  }
  --state.index;
  const wasDone = !document.getElementById("placeholder-done").classList.contains("hidden");
  await loadContent();

  if (wasDone) loader.restart();
}

async function skip() {
  if (state.lock) return;
  ++state.index;
  startWork();
  await loadContent();
}

function handleKeyDown(event: KeyboardEvent) {
  if (state.lock) {
    return true;
  }
  const pressedKey = event.key.toUpperCase();
  if (event.ctrlKey && pressedKey === "Z") {
    document.getElementById("undo").classList.add("keydown");
  } else if (event.ctrlKey && pressedKey === "K") {
    document.getElementById("skip").classList.add("keydown");
  } else {
    document.querySelector(`.category-button[data-key='${pressedKey}']`)?.classList?.add("keydown");
  }
}

async function handleKeyUp(event: KeyboardEvent) {
  const pressedKey = event.key.toUpperCase();
  if (event.ctrlKey && pressedKey === "Z") {
    // Special handling for undo of last item
    await undo();
    return;
  }

  if (state.lock) {
    return true;
  }
  if (event.ctrlKey && pressedKey === "K") {
    await skip();
  } else {
    const button = document.querySelector(`.category-button[data-key='${pressedKey}']`);
    if (button == undefined) return true;
    await assignCategory((button as HTMLButtonElement).dataset.name);
  }
}

export function addSorterListeners() {
  document.addEventListener("keydown", (event) => handleKeyDown(event));
  document.addEventListener("keyup", async (event) => await handleKeyUp(event));

  document.getElementById("undo").addEventListener("click", async () => await undo());
  document.getElementById("skip").addEventListener("click", async () => await skip());
  document.getElementById("sorter-setup-btn").addEventListener("click", () => {
    showLayer("placeholder-wait");
    state.mode = "setup";
    applyMode();
  });
}
