"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MotionConfig } from "framer-motion";
import { BookOpen, LayoutDashboard, LayoutList, Search, Sparkles, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ToastProvider } from "@/components/ui/toaster";
import { AppTransitions } from "@/components/layout/app-transitions";

interface CourseRow {
  id: string;
  title: string;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
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
    if (pathname.startsWith("/dashboard")) return "/dashboard";
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
      <MotionConfig reducedMotion="user">
        <div className="min-h-screen bg-background lg:flex">
          <div className="sticky top-0 hidden h-screen w-72 flex-col border-r border-white/60 bg-gradient-to-b from-white via-amber-50/60 to-emerald-50/60 px-6 py-6 lg:flex">
            <Link href="/" className="flex items-center gap-2 text-xl font-semibold">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <span className="font-display">StudyBuddy</span>
            </Link>
            <div className="mt-8 text-xs uppercase tracking-[0.2em] text-muted-foreground">Explore</div>
            <nav className="mt-3 flex flex-col gap-2 text-sm">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-muted-foreground transition-all hover:-translate-y-0.5 hover:bg-white/80 hover:text-foreground",
                    currentNav === item.href && "bg-white text-foreground shadow-sm"
                  )}
                >
                  <item.icon className="h-4 w-4 text-primary" />
                  {item.label}
                </Link>
              ))}
            </nav>
            {/* <div className="mt-8 text-xs uppercase tracking-[0.2em] text-muted-foreground">Your course</div>
            <select
              value={activeCourseId}
              onChange={(event) => {
                setActiveCourseId(event.target.value);
                router.push(`/course/${event.target.value}`);
              }}
              className="mt-2 h-11 rounded-md border border-input/70 bg-white/80 px-3 text-sm shadow-sm transition-all hover:border-primary/40"
              aria-label="Switch course"
            >
              <option value="" disabled>
                {courses.length ? "Select a course" : "No courses yet"}
              </option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
            <Button asChild className="mt-6">
              <Link href="/upload" className="flex items-center gap-2">
                <UploadCloud className="h-4 w-4" />
                Upload
              </Link>
            </Button> */}
          </div>

          <div className="flex min-h-screen flex-1 flex-col">
            <header className="sticky top-0 z-40 border-b border-white/60 bg-background/80 px-6 py-4 backdrop-blur">
              <div className="flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 text-base font-semibold lg:hidden">
                  <Sparkles className="h-5 w-5 text-primary" />
                  StudyBuddy
                </Link>
              <div className="hidden lg:flex flex-col text-sm">
                <span className="font-medium text-foreground">Your study hub</span>
                <span className="text-xs text-muted-foreground">Stay consistent. Learn faster.</span>
              </div>
                <div className="flex items-center gap-2 lg:hidden">
                  <Button asChild size="sm">
                    <Link href="/upload">Upload</Link>
                  </Button>
                </div>
              </div>
            </header>
            <main className="mx-auto w-full max-w-6xl px-6 pb-24 pt-8">
              <AppTransitions>{children}</AppTransitions>
            </main>
          </div>

          <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-white/60 bg-background/95 px-4 py-2 lg:hidden">
            {navItems.slice(0, 5).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 text-xs text-muted-foreground transition-colors",
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
      </MotionConfig>
    </ToastProvider>
  );
}
