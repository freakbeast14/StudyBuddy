"use client";

import { motion } from "framer-motion";
import { ArrowDown, BookOpen, Brain, FileText, Sparkles } from "lucide-react";
import { cardHoverTap } from "@/components/motion";

const steps = [
  { title: "Upload", description: "Drop in your PDF.", icon: FileText },
  { title: "Outline", description: "Auto-structured lessons.", icon: BookOpen },
  { title: "Cards", description: "Flashcards from key ideas.", icon: Brain },
  { title: "Daily", description: "Short focus sessions.", icon: Sparkles },
];

export function StudyTimeline() {
  return (
    <div className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-[0_24px_60px_-50px_rgba(15,23,42,0.4)]">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Your flow</p>
      <h2 className="mt-2 text-2xl font-semibold">Study timeline</h2>
      <div className="mt-6 space-y-4">
        {steps.map((step, index) => (
          <motion.div
            key={step.title}
            className="flex items-start gap-4 rounded-2xl border border-white/60 bg-white/80 p-4"
            {...cardHoverTap}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <step.icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{step.title}</p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/70 bg-white text-[11px] text-muted-foreground">
              {index + 1}
            </div>
          </motion.div>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-center text-xs text-muted-foreground">
        <ArrowDown className="mr-2 h-3 w-3" />
        Keep moving to stay consistent.
      </div>
    </div>
  );
}
