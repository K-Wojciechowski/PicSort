import { fetchTimeout } from "../common";
import { File } from "./models";

const maxCacheWeight = 7;

export class Loader {
  private cache: { [fileName: string]: string };
  private files: File[];
  private currentIndex: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private timeoutId: any | undefined;
  private updating: boolean;
  private fetching: boolean;
  private fastFetching: boolean;

  constructor() {
    this.cache = {};
    this.files = [];
    this.currentIndex = 0;
    this.timeoutId = undefined;
    this.updating = false;
    this.fetching = false;
    this.fastFetching = false;
  }

  start(files: File[]) {
    this.files = files;
    this.currentIndex = 0;
    this.timeoutId = setTimeout(async () => await this.ensureCache(), 10);
  }

  restart() {
    this.timeoutId = setTimeout(async () => await this.ensureCache(), 10);
  }

  stop() {
    if (this.timeoutId !== undefined) {
      clearTimeout(this.timeoutId);
    }
    for (const [key, value] of [...Object.entries(this.cache)]) {
      URL.revokeObjectURL(value);
      delete this.cache[key];
    }
  }

  async get(fileName: string): Promise<string> {
    console.log("Loader: get", fileName);
    this.fastFetching = true;
    try {
      const cachedUrl = this.cache[fileName];
      if (cachedUrl !== undefined) {
        console.log("Loader: fastFetch OK", fileName);
        return cachedUrl;
      }
    } finally {
      this.fastFetching = false;
    }

    console.log("Loader: fastFetch failed", fileName);

    if (this.updating) {
      console.log("Loader: get waiting for update to finish", fileName);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    while (this.updating) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    this.fetching = true;
    console.log("Loader: starting fetch", fileName);
    try {
      // Retry fast fetch.
      this.fastFetching = true;
      try {
        const cachedUrl = this.cache[fileName];
        if (cachedUrl !== undefined) {
          console.log("Loader: retryFastFetch OK", fileName);
          this.fetching = true;
          return cachedUrl;
        }
      } finally {
        this.fastFetching = false;
      }

      return this.fetchAndStore(fileName);
    } finally {
      console.log("Loader: finishing fetch", fileName);
      this.fetching = false;
    }
  }

  private async ensureCache() {
    let nextRunMs = 1000;
    if (this.fetching || this.updating || this.fastFetching) {
      console.log("Loader: ensureCache waiting for update/fetch to finish");
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    while (this.fetching || this.updating || this.fastFetching) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    try {
      this.updating = true;

      let weight = 0;
      const expectedItems: string[] = [];

      for (let i = this.currentIndex; i < this.files.length; i++) {
        const file = this.files[i];
        const itemWeight = file.type === "image" ? 1 : 2;
        if (weight + itemWeight > maxCacheWeight) break;
        weight += itemWeight;
        expectedItems.push(file.name);
      }

      const previousIndex = this.currentIndex - 1;
      const previousFile = previousIndex >= 0 ? this.files[previousIndex] : undefined;
      if (previousFile != undefined && previousFile.type === "image" && this.cache[previousFile.name] != undefined) {
        // Keep last image for fast undo
        expectedItems.push(previousFile.name);
      }

      for (const expectedItem of expectedItems) {
        if (this.cache[expectedItem] === undefined) {
          console.log("Loader: cache miss", expectedItem);
          await this.fetchAndStore(expectedItem);
          // In case the user is waiting, exit early and try to let the waiting method continue
          nextRunMs = 55;
          return;
        }
      }

      while (this.fastFetching || this.fetching) {
        console.log("Loader: ensureCache waiting for fetch to finish");
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      for (const [key, value] of [...Object.entries(this.cache)]) {
        if (expectedItems.indexOf(key) === -1) {
          console.log("Loader: cache cleanup", key);
          URL.revokeObjectURL(value);
          delete this.cache[key];
        }
      }
    } finally {
      this.updating = false;
      this.timeoutId = setTimeout(async () => await this.ensureCache(), nextRunMs);
    }
  }

  async fetchAndStore(fileName: string): Promise<string> {
    console.log("Loader: fetching file", fileName);
    const res = await fetch(`media://src/${fileName}`, { signal: fetchTimeout() });
    console.log("Loader: fetched", fileName);
    const url = URL.createObjectURL(await res.blob());
    this.cache[fileName] = url;
    console.log("Loader: cached", fileName);
    return url;
  }

  setIndex(index: number) {
    this.currentIndex = index;
  }
}
