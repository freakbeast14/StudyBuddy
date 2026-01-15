import Link from "next/link";
import { BookOpen, LayoutList, Sparkles, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/upload", label: "Upload", icon: UploadCloud },
  { href: "/course", label: "Courses", icon: BookOpen },
  { href: "/search", label: "Search", icon: BookOpen },
  { href: "/daily", label: "Daily", icon: Sparkles },
  { href: "/progress", label: "Progress", icon: LayoutList },
];

export function SiteHeader({ className }: { className?: string }) {
  return (
    <header className={cn("sticky top-0 z-40 w-full border-b bg-background/90 backdrop-blur", className)}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-5 w-5 text-primary" />
          StudyBuddy AI
        </Link>
        <nav className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-1 rounded-md px-3 py-2 transition-colors hover:bg-muted hover:text-foreground"
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden sm:flex items-center gap-2">
          <Button variant="secondary" asChild>
            <Link href="/daily">10-min session</Link>
          </Button>
          <Button asChild>
            <Link href="/upload">New upload</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
