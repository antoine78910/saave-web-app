import { Card } from "@/components/ui/card";

const OrganizationSection = () => {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-6">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
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