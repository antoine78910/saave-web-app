
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Globe, Save, Loader2 } from "lucide-react";
import { useToast } from "../src/hooks/use-toast";
import { supabase } from "../src/integrations/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getAppUrl } from "../lib/urls";

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
  const [isExtracting, setIsExtracting] = useState(false);
  const [favicon, setFavicon] = useState("");
  const [ogImage, setOgImage] = useState("");
  const { toast } = useToast();
  const router = useRouter();

  // Fonction pour extraire les métadonnées d'une URL valide
  const extractMetadata = async (urlToExtract: string) => {
    if (!urlToExtract.trim()) return;
    
    try {
      // Valider l'URL
      new URL(urlToExtract.trim());
      
      setIsExtracting(true);
      
      const response = await fetch('/api/extract-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: urlToExtract.trim() }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to extract metadata');
      }
      
      const data = await response.json();
      
      // Remplir les champs avec les métadonnées extraites
      if (data.title && !title) setTitle(data.title);
      if (data.description && !description) setDescription(data.description);
      if (data.tags && data.tags.length > 0 && !tags) {
        setTags(data.tags.join(', ')); // Afficher tous les tags générés
      }
      if (data.favicon) setFavicon(data.favicon);
      if (data.ogImage) setOgImage(data.ogImage);
      
    } catch (error) {
      console.error('Error extracting metadata:', error);
      // Ne pas afficher de toast pour ne pas déranger l'utilisateur
    } finally {
      setIsExtracting(false);
    }
  };
  
  // Appeler extractMetadata quand l'URL change et est valide
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    
    // Ne pas extraire les métadonnées si l'URL est vide ou si on est déjà en train d'extraire
    if (!newUrl.trim() || isExtracting) return;
    
    // Attendre que l'utilisateur ait fini de taper
    const timer = setTimeout(() => {
      try {
        new URL(newUrl.trim());
        extractMetadata(newUrl);
      } catch {
        // URL invalide, ne rien faire
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  };

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
    // Validation JS d'URL
    try {
      new URL(url.trim());
    } catch {
      toast({
        title: "URL invalide",
        description: "L'URL saisie n'est pas reconnue comme valide.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Si les métadonnées n'ont pas encore été extraites, essayer de le faire maintenant
      if (!title && !description && !tags) {
        await extractMetadata(url);
      }
      
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
          favicon,
          ogImage,
        }));
        
        toast({
          title: "Authentication required",
          description: "Please sign in to save your bookmark",
        });
        
        router.push('/auth');
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

      const bookmark = {
        url: url.trim(),
        title: finalTitle || "Untitled",
        description,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        thumbnail: favicon || null,
        ogImage: ogImage || null,
      };

      // If onAdd is provided (from /app), use it, otherwise navigate to /app
      if (onAdd) {
        onAdd(bookmark);
      } else {
        router.push(getAppUrl('/'));
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
    } catch {
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
            <div className="relative">
              <Input
                id="url"
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={handleUrlChange}
                required
                className={isExtracting ? "pr-10" : ""}
              />
              {isExtracting && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <div className="flex gap-2 items-center">
              {favicon && (
                <div className="w-6 h-6 flex-shrink-0 border border-gray-200 rounded bg-white flex items-center justify-center overflow-hidden">
                  <Image 
                    src={favicon} 
                    alt="Favicon" 
                    width={24}
                    height={24}
                    className="max-w-full max-h-full" 
                    onError={(e) => {
                      // NextJS Image ne peut pas utiliser style directement
                      // On cache l'élément parent à la place
                      const parent = e.currentTarget.parentElement;
                      if (parent) parent.style.display = 'none';
                    }} 
                  />
                </div>
              )}
              <Input
                id="title"
                placeholder="Website title (auto-detected if empty)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <div>
              {ogImage && (
                <div className="mb-2 border border-gray-200 rounded overflow-hidden aspect-video max-h-24 relative">
                  <Image 
                    src={ogImage} 
                    alt="Preview image" 
                    fill
                    className="object-cover w-full h-full" 
                    onError={(e) => {
                      // NextJS Image ne peut pas utiliser style directement
                      // On cache l'élément parent à la place
                      const parent = e.currentTarget.parentElement;
                      if (parent) parent.style.display = 'none';
                    }} 
                  />
                </div>
              )}
              <Textarea
                id="description"
                placeholder="Brief description of the website..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
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
