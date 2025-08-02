import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Trash2 } from "lucide-react";

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  description: string;
  screenshot: string;
  tags: string[];
  createdAt: Date;
  isBestMatch?: boolean;
  notes?: string;
  aiDescription?: string;
}

interface BookmarkGridProps {
  bookmarks: Bookmark[];
  onDelete: (id: string) => void;
  onBookmarkClick: (bookmark: Bookmark) => void;
}

export const BookmarkGrid = ({ bookmarks, onDelete, onBookmarkClick }: BookmarkGridProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {bookmarks.map((bookmark) => (
        <Card 
          key={bookmark.id} 
          className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 bg-card border-border/50 cursor-pointer"
          onClick={() => onBookmarkClick(bookmark)}
        >
          {bookmark.isBestMatch && (
            <Badge className="absolute top-2 right-2 z-10 bg-primary text-primary-foreground">
              Best Match
            </Badge>
          )}
          
          <div className="aspect-video overflow-hidden bg-muted">
            <img
              src={bookmark.screenshot}
              alt={`Screenshot of ${bookmark.title}`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://via.placeholder.com/300x200/f0f0f0/888888?text=${encodeURIComponent(bookmark.title)}`;
              }}
            />
          </div>
          
          <CardContent className="p-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-card-foreground line-clamp-1">
                {bookmark.title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {bookmark.description}
              </p>
              <div className="flex flex-wrap gap-1">
                {bookmark.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-4 pt-2 border-t border-border/20">
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-primary hover:text-primary/80"
                onClick={(e) => e.stopPropagation()}
              >
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Visit
                </a>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(bookmark.id);
                }}
                className="text-destructive hover:text-destructive/80 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};