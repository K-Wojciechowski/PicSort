import { chain, every } from "lodash";
import { Category, SetupResult } from "./models";

let _setupClicked: ((setupResult: SetupResult) => void) | undefined = undefined;

export function addSetupListeners(setupClicked: (setupResult: SetupResult) => void) {
  _setupClicked = setupClicked;
  document.getElementById("source-btn").addEventListener("click", async () => {
    const path = await window.electron.getPath("source", "Select destination directory");
    if (path === undefined) return;
    const source = document.getElementById("source") as HTMLInputElement;
    const destination = document.getElementById("destination") as HTMLInputElement;
    const destinationValue = destination.value.trim();

    if (destinationValue === "" || destinationValue == source.value.trim()) {
      destination.value = path;
    }
    source.value = path;
  });
  document.getElementById("destination-btn").addEventListener("click", async () => {
    const path = await window.electron.getPath("destination", "Select destination directory");
    if (path === undefined) return;
    const destination = document.getElementById("destination") as HTMLInputElement;
    destination.value = path;
  });

  document.getElementById("start-btn").addEventListener("click", finishSetup);

  document
    .querySelectorAll(".category-template")
    .forEach((btn: HTMLInputElement) => btn.addEventListener("click", () => applyTemplate(btn.dataset.template)));
}

function finishSetup() {
  const setupResults = gatherSetupResults();
  if (setupResults != undefined && _setupClicked != undefined) _setupClicked(setupResults);
}

// https://www.heavy.ai/blog/12-color-palettes-for-telling-better-stories-with-your-data
const colors = ["#87bc45", "#ea5545", "#27aeef", "#ede15b", "#b33dc6", "#bdcf32", "#ef9b20", "#f46a9b", "#edbf33"];

const templates: { [key: string]: Category[] } = {
  goodbad: [
    { index: 0, name: "good", key: "A", color: colors[0] },
    { index: 1, name: "bad", key: "L", color: colors[1] },
  ],
  images: [
    { index: 0, name: "person", key: "P", color: colors[0] },
    { index: 1, name: "landscape", key: "S", color: colors[2] },
    { index: 2, name: "landmark", key: "M", color: colors[3] },
    { index: 3, name: "trash", key: "T", color: colors[1] },
  ],
  clear: [],
};

function tryStartSorting(event: KeyboardEvent) {
  if (event.key !== "Enter" || !event.ctrlKey) return;

  finishSetup();
  return true;
}

function tryFocusNextInput(event: KeyboardEvent) {
  if (event.key !== "Enter") return;

  if (event.ctrlKey) {
    return;
  }

  const targetIndex = parseInt((event.target as HTMLInputElement).dataset.index) + 1;
  const newRow = document.querySelector(`tr.category-row[data-index="${targetIndex}"]`);
  if (newRow == undefined) {
    return;
  }
  (newRow.querySelector("input.category-name") as HTMLInputElement).focus();
}

export function ensureEnoughSetupRows() {
  const nameInputs = [...document.querySelectorAll("input.category-name")];
  const keyInputs = [...document.querySelectorAll("input.category-key")];
  const needNewRow =
    nameInputs.length === 0 ||
    every(nameInputs, (input: HTMLInputElement) => input.value.trim() !== "") ||
    every(keyInputs, (input: HTMLInputElement) => input.value.trim() !== "");

  if (needNewRow) {
    createRow(nameInputs.length, "", "", colors[nameInputs.length % colors.length]);
  }
}

function findBestNewKey(index: number, name: string): string {
  const indexString = index.toString();
  const existingOtherKeys = [...document.querySelectorAll("input.category-key")]
    .filter((i) => (i as HTMLInputElement).dataset.index !== indexString)
    .map((i) => (i as HTMLInputElement).value)
    .filter((i) => i.length == 1);

  for (const lowercaseCandidate of name) {
    const candidate = lowercaseCandidate.toUpperCase();
    if (candidate.match(/[A-Z0-9]/) && existingOtherKeys.indexOf(candidate) === -1) {
      return candidate;
    }
  }
  return "";
}

function createRow(index: number, name: string, key: string, color: string) {
  const row = document.createElement("tr");
  const nameTd = document.createElement("td");
  const keyTd = document.createElement("td");
  const colorTd = document.createElement("td");

  row.className = "category-row";
  nameTd.className = "category-name-column";
  keyTd.className = "category-key-column";
  colorTd.className = "category-color-column";

  const nameInput = document.createElement("input");
  const keyInput = document.createElement("input");
  const colorInput = document.createElement("input");

  nameInput.classList.add("category-text-input", "category-name");
  nameInput.value = name;
  nameInput.addEventListener("input", () => {
    ensureEnoughSetupRows();
    if (keyInput.dataset.override !== "1" && nameInput.value.length > 0) {
      keyInput.value = findBestNewKey(index, nameInput.value);
    }
  });

  keyInput.classList.add("category-text-input", "category-key");
  keyInput.value = key;
  keyInput.maxLength = 1;
  keyInput.addEventListener("input", () => {
    ensureEnoughSetupRows();
    keyInput.value = keyInput.value.toUpperCase();
    keyInput.dataset.override = "1";
  });
  keyInput.addEventListener("focus", () => keyInput.select());

  nameInput.addEventListener("keyup", (event: KeyboardEvent) => tryFocusNextInput(event));
  keyInput.addEventListener("keyup", (event: KeyboardEvent) => tryFocusNextInput(event));

  nameInput.addEventListener("keydown", (event: KeyboardEvent) => tryStartSorting(event));
  keyInput.addEventListener("keydown", (event: KeyboardEvent) => tryStartSorting(event));

  colorInput.classList.add("category-color");
  colorInput.type = "color";
  colorInput.value = color;

  row.dataset.index = index.toString();
  nameInput.dataset.index = index.toString();
  keyInput.dataset.index = index.toString();
  colorInput.dataset.index = index.toString();

  nameTd.appendChild(nameInput);
  keyTd.appendChild(keyInput);
  colorTd.appendChild(colorInput);
  row.appendChild(nameTd);
  row.appendChild(keyTd);
  row.appendChild(colorTd);
  document.querySelector("#category-table tbody").appendChild(row);
}

function applyTemplate(name: string) {
  const categories = templates[name];
  if (categories == undefined) return;
  document.querySelectorAll(".category-row").forEach((row) => row.remove());
  for (const category of categories) {
    createRow(category.index, category.name, category.key, category.color);
  }
  ensureEnoughSetupRows();
}

function gatherSetupResults(): SetupResult | undefined {
  document.querySelectorAll(".invalid").forEach((e) => e.classList.remove("invalid"));
  const errors = [];

  const source = document.getElementById("source") as HTMLInputElement;
  const destination = document.getElementById("destination") as HTMLInputElement;
  const includeImages = document.getElementById("images") as HTMLInputElement;
  const includeVideos = document.getElementById("videos") as HTMLInputElement;

  if (source.value.trim() === "") {
    source.classList.add("invalid");
    errors.push("Source is empty.");
  }

  if (destination.value.trim() === "") {
    destination.classList.add("invalid");
    errors.push("Destination is empty.");
  }

  const categories: Category[] = [];

  let index = 0;
  document.querySelectorAll("tr.category-row").forEach((tr) => {
    const nameInput = tr.querySelector(".category-name") as HTMLInputElement;
    const keyInput = tr.querySelector(".category-key") as HTMLInputElement;
    const colorInput = tr.querySelector(".category-color") as HTMLInputElement;

    const name = nameInput.value.trim();
    const key = keyInput.value.trim();
    const color = colorInput.value.trim();

    if (name === "" && key === "") {
      return;
    } else if (name === "" || key === "") {
      nameInput.classList.add("invalid");
      keyInput.classList.add("invalid");
      errors.push(`Not all data was specified in row ${index + 1}.`);
      return;
    }

    if (name.match(/[<>:"/\\|?*]/)) {
      nameInput.classList.add("invalid");
      errors.push(`The name '${name}' contains invalid characters.`);
    }

    categories.push({ index, name, key, color });
    ++index;
  });

  if (categories.length === 0) {
    document.querySelectorAll(".category-name").forEach((e) => e.classList.add("invalid"));
    document.querySelectorAll(".category-key").forEach((e) => e.classList.add("invalid"));
    errors.push("No categories were specified.");
  }

  const duplicateNames = chain(categories)
    .countBy((c) => c.key)
    .pickBy((value) => value > 1)
    .keys()
    .toArray()
    .value();

  const duplicateKeys = chain(categories)
    .countBy((c) => c.key)
    .pickBy((value) => value > 1)
    .keys()
    .toArray()
    .value();

  if (duplicateNames.length > 0) {
    categories
      .filter((c) => duplicateNames.indexOf(c.key) !== -1)
      .forEach((c) => document.querySelector(`.category-name[data-index='${c.index}']`).classList.add("invalid"));
    errors.push("Some names are duplicated.");
  }

  if (duplicateKeys.length > 0) {
    categories
      .filter((c) => duplicateKeys.indexOf(c.key) !== -1)
      .forEach((c) => document.querySelector(`.category-key[data-index='${c.index}']`).classList.add("invalid"));
    errors.push("Some keys are duplicated.");
  }

  if (!includeImages.checked && !includeVideos.checked) {
    errors.push("No file types were selected.");
  }

  document.getElementById("setup-errors").innerText = errors.join("\n");

  if (errors.length === 0) {
    return {
      source: source.value.trim(),
      destination: destination.value.trim(),
      includeImages: includeImages.checked,
      includeVideos: includeVideos.checked,
      autoplay: (document.getElementById("autoplay") as HTMLInputElement).checked,
      loop: (document.getElementById("loop") as HTMLInputElement).checked,
      muted: (document.getElementById("muted") as HTMLInputElement).checked,
      categories: categories,
    };
  }
  return undefined;
}
