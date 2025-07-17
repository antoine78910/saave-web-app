import { Card } from "@/components/ui/card";

const OrganizationSection = () => {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-6">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold">Embrace the mess.</h2>
            <h3 className="text-2xl text-muted-foreground">And say goodbye to folders</h3>
          </div>
          
          <div className="space-y-6">
            <h4 className="text-xl font-semibold">Organizing into folders? For what?</h4>
            <p className="text-muted-foreground">
              Never going to find anything, and you know it.
            </p>
          </div>
          
          {/* Visual representation of the folder problem */}
          <div className="grid md:grid-cols-3 gap-6 py-8">
            <Card className="p-6 bg-secondary/50">
              <div className="space-y-3">
                <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                  📁
                </div>
                <h5 className="font-medium">Folders</h5>
                <p className="text-xs text-muted-foreground">Complex hierarchy</p>
              </div>
            </Card>
            
            <Card className="p-6 bg-destructive/10">
              <div className="space-y-3">
                <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                  🌊
                </div>
                <h5 className="font-medium">Mess</h5>
                <p className="text-xs text-muted-foreground">Everything everywhere</p>
              </div>
            </Card>
            
            <Card className="p-6 bg-primary/10">
              <div className="space-y-3">
                <div className="w-8 h-8 bg-primary/20 rounded flex items-center justify-center">
                  🏷️
                </div>
                <h5 className="font-medium">Smart Tags</h5>
                <p className="text-xs text-muted-foreground">Auto-organized</p>
              </div>
            </Card>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-xl font-semibold">Say welcome to <span className="text-primary">Intelligent Search™</span></h4>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Just write what you remember about the website and I'll find it.
            </p>
          </div>
          
          {/* Demo Video Placeholder */}
          <Card className="p-8 bg-background aspect-video max-w-2xl mx-auto flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
                <div className="w-0 h-0 border-l-[12px] border-l-primary border-y-[9px] border-y-transparent ml-1"></div>
              </div>
              <h5 className="text-lg font-semibold">30 seconds demo 👇</h5>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default OrganizationSection;