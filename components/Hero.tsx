"use client";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { MapPin, Zap, Bot, Tag, Search } from "lucide-react";
import { useState } from "react";
import { supabase } from "../src/integrations/supabase/client";

const Hero = () => {
  const [url, setUrl] = useState("");

  const handleSaveLink = async () => {
    if (!url.trim()) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      // Store URL in sessionStorage and redirect to auth
      sessionStorage.setItem('pendingBookmarkUrl', url);
      window.location.href = '/auth';
    } else {
      // User is logged in, redirect to app with URL
      sessionStorage.setItem('pendingBookmarkUrl', url);
      window.location.href = '/app';
    }
  };

  return (
    <div className="min-h-[80vh]" style={{ backgroundColor: "hsl(var(--background))" }}>
      {/* Main Content - Header is now in Navbar component */}

      {/* Main Content */}
      <div className="container mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column */}
          <div className="space-y-8">
            <Badge variant="secondary" className="w-fit text-sm px-3 py-1 font-medium">
              Beta
            </Badge>
            
            <div className="space-y-4">
              <h1 className="text-5xl font-bold tracking-tight leading-tight">
                Organize nothing. Find everything.
              </h1>
              <p className="text-xl text-muted-foreground max-w-lg">
                Save it now—find it in seconds, whether it&apos;s an article, video, post, or tool.
              </p>
            </div>

            {/* Features List */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Instant capture</h3>
                  <p className="text-sm text-muted-foreground">
                    Paste any URL and it&apos;s safely stored—no friction.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">AI summaries</h3>
                  <p className="text-sm text-muted-foreground">
                    Get the key takeaways of articles and videos without reopening them.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Tag className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Auto-tagging</h3>
                  <p className="text-sm text-muted-foreground">
                    Your library organizes itself—no folders, no mess.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Search className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Advanced AI Search</h3>
                  <p className="text-sm text-muted-foreground">
                    Type an idea; and our AI will always find the most relevant, guaranteed.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <div className="w-4 h-4 text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold">Visual previews</h3>
                  <p className="text-sm text-muted-foreground">
                    Thumbnails and screenshots help you spot what you need at a glance.
                  </p>
                </div>
              </div>
            </div>

            <Button size="lg" className="w-full lg:w-auto" onClick={() => window.location.href = '/auth'}>
              Get started
            </Button>
          </div>

          {/* Right Column - Demo Card */}
          <div className="space-y-6">
            <Card className="p-6 bg-accent/30 border-accent">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  <span className="font-medium">Add a bookmark</span>
                </div>
                <p className="text-sm text-muted-foreground">Paste any URL and it&apos;s safely stored—no friction.</p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
                    <span>Save any website</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
                    <span>Our IA will save, screenshot & index all the page</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
                    <span>Find any bookmark even years later by searching for it</span>
                  </div>
                </div>
                
                <div className="space-y-3 mt-4">
                  <Input 
                    placeholder="https://example.com" 
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                  <Button 
                    onClick={handleSaveLink}
                    className="w-full"
                    disabled={!url.trim()}
                  >
                    Save this link
                  </Button>
                </div>
              </div>
            </Card>
            
            {/* Demo Video Placeholder */}
            <Card className="p-8 bg-muted/50 aspect-video flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
                  <div className="w-0 h-0 border-l-[8px] border-l-primary border-y-[6px] border-y-transparent ml-1" aria-hidden="true"></div>
                </div>
                <p className="text-sm text-muted-foreground">Demo Video</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;