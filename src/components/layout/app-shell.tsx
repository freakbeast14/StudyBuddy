"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, LayoutList, Search, Sparkles, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ToastProvider } from "@/components/ui/toaster";

interface CourseRow {
  id: string;
  title: string;
}

const navItems = [
  { href: "/daily", label: "Daily", icon: Sparkles },
  { href: "/course", label: "Courses", icon: BookOpen },
  { href: "/search", label: "Search", icon: Search },
  { href: "/progress", label: "Progress", icon: LayoutList },
  { href: "/upload", label: "Upload", icon: UploadCloud },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [activeCourseId, setActiveCourseId] = useState<string>("");

  useEffect(() => {
    fetch("/api/courses", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: CourseRow[]) => {
        setCourses(data);
        if (!activeCourseId && data.length) {
          setActiveCourseId(data[0].id);
        }
      })
      .catch(() => null);
  }, [activeCourseId]);

  useEffect(() => {
    const match = pathname.match(/^\/course\/([^/]+)/);
    if (match?.[1]) {
      setActiveCourseId(match[1]);
    }
  }, [pathname]);

  const currentNav = useMemo(() => {
    if (pathname.startsWith("/course")) return "/course";
    if (pathname.startsWith("/lesson")) return "/course";
    if (pathname.startsWith("/search")) return "/search";
    if (pathname.startsWith("/progress")) return "/progress";
    if (pathname.startsWith("/upload")) return "/upload";
    if (pathname.startsWith("/daily")) return "/daily";
    return "";
  }, [pathname]);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background lg:flex">
        <div className="hidden min-h-screen w-64 flex-col border-r bg-muted/40 px-4 py-6 lg:flex">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-5 w-5 text-primary" />
            StudyBuddy AI
          </Link>
          <div className="mt-6 space-y-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Navigation
          </div>
          <nav className="mt-3 flex flex-col gap-1 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  currentNav === item.href && "bg-background text-foreground shadow-sm"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-6 space-y-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">Course</div>
          <select
            value={activeCourseId}
            onChange={(event) => {
              setActiveCourseId(event.target.value);
              router.push(`/course/${event.target.value}`);
            }}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            aria-label="Switch course"
          >
            <option value="" disabled>
              {courses.length ? "Select course" : "No courses"}
            </option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
          <Button asChild className="mt-6">
            <Link href="/upload">New upload</Link>
          </Button>
        </div>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b bg-background/90 px-6 py-4 backdrop-blur">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 text-base font-semibold lg:hidden">
                <Sparkles className="h-5 w-5 text-primary" />
                StudyBuddy AI
              </Link>
              <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
                Local-first study workspace
              </div>
              <div className="flex items-center gap-2 lg:hidden">
                <Button asChild size="sm">
                  <Link href="/upload">Upload</Link>
                </Button>
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl px-6 pb-24 pt-8">{children}</main>
        </div>

        <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t bg-background/95 px-4 py-2 lg:hidden">
          {navItems.slice(0, 5).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 text-xs text-muted-foreground",
                currentNav === item.href && "text-foreground"
              )}
              aria-label={item.label}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </ToastProvider>
  );
}
