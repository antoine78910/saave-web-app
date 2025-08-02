import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { BookmarkCard } from "./BookmarkCard";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

export interface Category {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  description: string;
  thumbnail?: string | null;
  favicon?: string | null;
  screenshot?: string;
  tags: string[];
  category?: Category | null;
  created_at?: string;
  createdAt?: Date;
  isBestMatch?: boolean;
  notes?: string;
  personalNotes?: string;
  aiDescription?: string;
  status?: 'loading' | 'complete' | 'error';
  processingStep?: string;
  error?: string;
  screenshotDescription?: string;
  summary?: string;
}

interface BookmarkGridProps {
  bookmarks: Bookmark[];
  onDelete: (id: string) => void;
  onBookmarkClick?: (bookmark: Bookmark) => void;
}

export const BookmarkGrid = ({ bookmarks, onDelete, onBookmarkClick }: BookmarkGridProps) => {
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  
  const handleBookmarkClick = (bookmark: Bookmark) => {
    // Si le bookmark est en chargement ou en erreur, ne pas ouvrir le popup
    if (bookmark.status === 'loading' || bookmark.status === 'error') {
      return;
    }
    
    // Sinon, ouvrir le popup de détails
    if (onBookmarkClick) {
      onBookmarkClick(bookmark);
    } else {
      setOpenPopoverId(bookmark.id);
    }
  };
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {bookmarks.map((bookmark) => (
        <Popover key={bookmark.id} open={openPopoverId === bookmark.id} onOpenChange={(open) => setOpenPopoverId(open ? bookmark.id : null)}>
          <PopoverTrigger asChild>
            <div className="cursor-pointer">
              {/* Utiliser notre nouveau composant BookmarkCard */}
              <BookmarkCard 
                bookmark={bookmark} 
                onClick={handleBookmarkClick}
                onDelete={(bookmark) => onDelete(bookmark.id)}
              />
              
              {/* Afficher le badge Best Match si nécessaire */}
              {bookmark.isBestMatch && (
                <Badge className="absolute top-2 right-2 z-10 bg-primary text-primary-foreground">
                  Best Match
                </Badge>
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-48 p-2">
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-destructive hover:bg-destructive/10 rounded transition"
              onClick={() => {
                onDelete(bookmark.id);
                setOpenPopoverId(null);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Supprimer
            </button>
          </PopoverContent>
        </Popover>
      ))}
    </div>
  );
};