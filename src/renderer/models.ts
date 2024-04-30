export interface State {
  mode: "setup" | "sorter";
  source: string;
  destination: string;
  includeImages: boolean;
  includeVideos: boolean;
  autoplay: boolean;
  loop: boolean;
  muted: boolean;
  categories: Category[];
  files: File[];
  history: MoveRecord[];
  index: number;
  lock: boolean;
}

export interface SetupResult {
  source: string;
  destination: string;
  includeImages: boolean;
  includeVideos: boolean;
  categories: Category[];
  autoplay: boolean;
  loop: boolean;
  muted: boolean;
}

export interface Category {
  index: number;
  name: string;
  key: string;
  color: string;
}

export interface File {
  name: string;
  type: "image" | "video";
}

export interface MoveRecord {
  fileName: string;
  categoryName: string;
}

export interface PendingOperation {
  fileName: string;
  type: "move" | "undo";
}
