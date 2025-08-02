
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Globe, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AddBookmarkDialogProps {
  onAdd?: (bookmark: {
    url: string;
    title: string;
    description: string;
    tags: string[];
  }) => void;
  showTrigger?: boolean;
}

export const AddBookmarkDialog = ({ onAdd, showTrigger = true }: AddBookmarkDialogProps) => {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Store bookmark data in session storage for later use
        sessionStorage.setItem('pendingBookmark', JSON.stringify({
          url: url.trim(),
          title: title || ((() => {
            try {
              const domain = new URL(url).hostname;
              return domain.replace('www.', '');
            } catch {
              return url;
            }
          })()),
          description,
          tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        }));
        
        toast({
          title: "Authentication required",
          description: "Please sign in to save your bookmark",
        });
        
        navigate('/auth');
        return;
      }

      // Auto-fetch title if not provided
      let finalTitle = title;
      
      if (!title.trim()) {
        try {
          const domain = new URL(url).hostname;
          finalTitle = domain.replace('www.', '');
        } catch {
          finalTitle = url;
        }
      }

      const bookmarkData = {
        url: url.trim(),
        title: finalTitle || "Untitled",
        description,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
      };

      // If onAdd is provided (from /app), use it, otherwise navigate to /app
      if (onAdd) {
        onAdd(bookmarkData);
      } else {
        // Store bookmark data and navigate to app
        sessionStorage.setItem('newBookmark', JSON.stringify(bookmarkData));
        navigate('/app');
        return;
      }

      // Reset form
      setUrl("");
      setTitle("");
      setDescription("");
      setTags("");
      setOpen(false);
      
      toast({
        title: "Bookmark saved!",
        description: "Your bookmark has been added successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save bookmark. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Add Bookmark
          </Button>
        </DialogTrigger>
      )}
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Add New Bookmark
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">URL *</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Website title (auto-detected if empty)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the website..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              placeholder="web, design, tools (comma separated)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isLoading} className="flex-1 gap-2">
              <Save className="h-4 w-4" />
              {isLoading ? "Saving..." : "Save Bookmark"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
