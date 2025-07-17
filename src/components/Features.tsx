import { Card } from "@/components/ui/card";
import { Chrome, Target, DollarSign, Share2 } from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Chrome,
      title: "Chrome Extensions",
      description: "Save everything instantly with just one click. No more copy-pasting URLs."
    },
    {
      icon: Target,
      title: "No Bullshit",
      description: "Just one button and one search bar. Clean interface without unnecessary features."
    },
    {
      icon: DollarSign,
      title: "Free and Cheap",
      description: "Just $5 a month without any limitations. No premium tiers or hidden fees."
    },
    {
      icon: Share2,
      title: "Sharing",
      description: "Easy button to share and find everything. Collaborate with your team or friends."
    }
  ];

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl font-bold">Key Features</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Tools that help you organize and rediscover your digital knowledge
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="p-6 text-center space-y-4 border-accent/20 hover:border-accent/40 transition-colors">
              <div className="w-12 h-12 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;