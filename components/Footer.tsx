import { MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="py-12 bg-muted/30 border-t">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          <div className="text-center md:text-left">
            <h3 className="text-lg font-semibold mb-1">Saave.io</h3>
            <p className="text-sm text-muted-foreground">Never lose a link again. Save, search and organize your bookmarks with AI.</p>
          </div>
          
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Contact
            </a>
          </div>
          
          <div className="text-sm text-muted-foreground">
            © 2025 Saave.io. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;