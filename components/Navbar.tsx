"use client";

import Link from "next/link";
import Image from "next/image";

const Navbar = () => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-b-[hsl(var(--border))] bg-[hsl(var(--background))]">
      <div className="container flex h-16 items-center px-4 sm:px-8">
        <Link href="/" className="flex items-center">
          <div className="relative h-24 w-40">
            <Image 
              src="/logo.png" 
              alt="Saave Logo" 
              fill
              priority
              className="object-contain"
            />
          </div>
        </Link>
        
        <div className="flex-1" />
        
        <nav className="flex items-center gap-6">
          <Link href="/" className="text-sm font-medium hover:text-primary transition-colors">
            Home
          </Link>
          <Link href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">
            Pricing
          </Link>
          <Link 
            href="/auth" 
            className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))/90] text-[hsl(var(--primary-foreground))] px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Sign In
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
