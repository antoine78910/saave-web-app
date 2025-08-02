export type BookmarkStatus = 'loading' | 'complete' | 'error' | 'cancelled' | 'idle';

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  favicon?: string | null;
  created_at: string;
  tags?: string[];
  status: BookmarkStatus;
  processingStep?: string;
  source?: 'webapp' | 'extension';
  category_id?: string | null;
  personalNotes?: string | null;
}

export interface Category {
  id: string;
  name: string;
  user_id: string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}
