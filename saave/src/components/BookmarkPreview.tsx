import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ExternalLink, Bot, Edit3 } from "lucide-react";
import { useState, useEffect } from "react";
import { Bookmark } from "./BookmarkGrid";

interface BookmarkPreviewProps {
  bookmark: Bookmark | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onGenerateDescription: (url: string) => Promise<string>;
}

export const BookmarkPreview = ({ 
  bookmark, 
  isOpen, 
  onClose, 
  onUpdateNotes,
  onGenerateDescription 
}: BookmarkPreviewProps) => {
  const [notes, setNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiDescription, setAiDescription] = useState("");

  useEffect(() => {
    if (bookmark) {
      setNotes(bookmark.notes || "");
      setAiDescription(bookmark.aiDescription || "");
    }
  }, [bookmark]);

  if (!bookmark) return null;

  const handleGenerateDescription = async () => {
    setIsGenerating(true);
    try {
      const description = await onGenerateDescription(bookmark.url);
      setAiDescription(description);
    } catch (error) {
      console.error("Failed to generate description:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    onUpdateNotes(bookmark.id, value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6">
            <ExternalLink className="h-5 w-5" />
            {bookmark.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Screenshot */}
          <div className="aspect-video overflow-hidden rounded-lg bg-muted">
            <img
              src={bookmark.screenshot}
              alt={`Screenshot of ${bookmark.title}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://via.placeholder.com/400x300/f0f0f0/888888?text=${encodeURIComponent(bookmark.title)}`;
              }}
            />
          </div>

          {/* URL */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">URL</h4>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground flex-1 break-all">
                {bookmark.url}
              </span>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-primary hover:text-primary/80"
              >
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          {/* Meta Description */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Description</h4>
            <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
              {bookmark.description}
            </p>
          </div>

          {/* AI Generated Summary */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                AI Summary
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateDescription}
                disabled={isGenerating}
                className="text-xs"
              >
                {isGenerating ? "Generating..." : "Generate"}
              </Button>
            </div>
            {aiDescription ? (
              <p className="text-sm p-3 bg-primary/5 border border-primary/20 rounded-lg">
                {aiDescription}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                Click "Generate" to create an AI summary of this page.
              </p>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-orange-500/20 flex items-center justify-center">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              </span>
              Tags
            </h4>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">AI Generated</div>
              <div className="flex flex-wrap gap-2">
                {bookmark.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Personal Notes */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-yellow-500" />
              Personal Notes
            </h4>
            <Textarea
              placeholder="Add your personal notes about this bookmark..."
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};