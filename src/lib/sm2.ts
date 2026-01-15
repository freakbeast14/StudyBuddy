import { addDays } from "date-fns";

export type Sm2Rating = "Again" | "Hard" | "Good" | "Easy";

export interface SrsState {
  easeFactor: number; // scaled by 1000 (e.g., 2500 == EF 2.5)
  intervalDays: number;
  repetitions: number;
  dueAt: Date;
  lastReviewedAt?: Date | null;
}

export function updateSm2(state: SrsState, rating: Sm2Rating, now = new Date()): SrsState {
  const clampEf = (value: number) => Math.max(1300, value);
  let easeFactor = state.easeFactor;
  let interval = state.intervalDays;
  let repetitions = state.repetitions;

  if (rating === "Again") {
    repetitions = 0;
    interval = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * (easeFactor / 1000));
    }

    const quality = rating === "Easy" ? 5 : rating === "Good" ? 4 : 3; // Hard == 3
    easeFactor = clampEf(easeFactor + Math.round(0.1 * quality * 100) - 80 + (quality - 3) * 30);
  }

  return {
    easeFactor,
    intervalDays: interval,
    repetitions,
    lastReviewedAt: now,
    dueAt: addDays(now, interval),
  };
}
