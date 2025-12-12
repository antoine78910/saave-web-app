
import { Card } from "@/components/ui/card";
import { AnimatedButton } from "@/components/ui/animated-button";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const Pricing = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const handleGetStarted = () => {
    console.log('🚀 Get Started cliqué');
    console.log('👤 Utilisateur actuel:', user);
    
    if (user) {
      console.log('🔄 Redirection vers /app (connecté)');
      navigate('/app');
    } else {
      console.log('🔄 Redirection vers /auth (pas connecté)');
      navigate('/auth');
    }
  };

  const handleStartTrial = () => {
    console.log('🎯 Start Trial cliqué');
    console.log('👤 Utilisateur actuel:', user);
    
    if (user) {
      console.log('🔄 Redirection vers /upgrade (connecté)');
      navigate('/upgrade');
    } else {
      console.log('🔄 Redirection vers /auth puis /upgrade (pas connecté)');
      sessionStorage.setItem('redirectAfterAuth', '/upgrade');
      navigate('/auth');
    }
  };

  const plans = [
    {
      name: "Free",
      price: "0",
      description: "Perfect for getting started",
      features: [
        "Up to 100 bookmarks",
        "Basic search",
        "Visual previews",
        "Chrome extension"
      ],
      cta: "Get started for free",
      popular: false,
      action: handleGetStarted
    },
    {
      name: "Pro",
      price: "5",
      description: "Everything you need to stay organized",
      features: [
        "Unlimited bookmarks",
        "Advanced AI search",
        "AI summaries",
        "Auto-tagging",
        "Sharing & collaboration",
        "Priority support"
      ],
      cta: "Start free trial",
      popular: true,
      action: handleStartTrial
    }
  ];

  return (
    <section id="pricing" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl font-bold">Pricing</h2>
          <p className="text-xl text-muted-foreground">
            Choose the right plan for your needs
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`p-8 relative ${
                plan.popular 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">{plan.name}</h3>
                  <p className="text-muted-foreground">{plan.description}</p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <AnimatedButton 
                  className="w-full" 
                  variant="green"
                  onClick={plan.action}
                >
                  {plan.cta}
                </AnimatedButton>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
