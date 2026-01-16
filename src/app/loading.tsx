export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="rounded-3xl border border-white/70 bg-white/80 px-6 py-8 text-center shadow-[0_30px_60px_-50px_rgba(15,23,42,0.35)]">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary/40 border-t-primary" />
        <p className="text-sm font-medium text-foreground">Loading your workspace...</p>
        <p className="mt-1 text-xs text-muted-foreground">This usually takes just a moment.</p>
      </div>
    </div>
  );
}
