export interface MoveResult {
  success: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: any;
}

export interface ElectronBridge {
  getPath: (id: string, title: string) => Promise<string | undefined>;
  start: (sourceDirectory: string, destinationDirectory: string, categoryNames: string[]) => Promise<string[]>;
  move: (fileName: string, categoryName: string) => Promise<MoveResult>;
  undo: (fileName: string, categoryName: string) => Promise<MoveResult>;
}

export function fetchTimeout() {
  // AbortSignal.timeout seems to be unrecognised by webpack, but it's actually available on both sides.
  // eslint-disable-next-line
  // @ts-ignore
  return AbortSignal.timeout(300_000);
}

export enum Commands {
  GetPath = "ps-get-path",
  Start = "ps-start",
  Move = "ps-move",
  Undo = "ps-undo",
}

const imageExtensions = ["gif", "heic", "jpg", "jpeg", "png", "webp"];
const videoExtensions = ["m4v", "mkv", "mov", "mp4", "webm"];

export function getFileType(fileName: string): "image" | "video" | undefined {
  const split = fileName.split(".");
  const extension = split[split.length - 1].toLowerCase();
  if (imageExtensions.indexOf(extension) !== -1) return "image";
  if (videoExtensions.indexOf(extension) !== -1) return "video";
  return undefined;
}
