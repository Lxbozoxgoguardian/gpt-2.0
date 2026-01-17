
export type Role = 'user' | 'assistant';

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: Date;
}

export interface ProjectFile {
  id: string;
  path: string; // e.g. "src/components/Button.tsx"
  content: string;
  language: string;
  isOpen?: boolean;
}

export interface Project {
  id: string;
  name: string;
  files: ProjectFile[];
  messages: Message[];
  lastModified: number;
}

export interface ProjectState {
  files: ProjectFile[];
  selectedFileId: string | null;
}
