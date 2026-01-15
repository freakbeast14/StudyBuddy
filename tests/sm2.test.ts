import { describe, expect, it } from "vitest";
import { updateSm2, type SrsState } from "@/lib/sm2";

describe("SM-2 scheduling", () => {
  const baseState: SrsState = {
    easeFactor: 2500,
    intervalDays: 0,
    repetitions: 0,
    dueAt: new Date(),
    lastReviewedAt: null,
  };

  it("resets repetitions on Again", () => {
    const updated = updateSm2(baseState, "Again", new Date("2024-01-01"));
    expect(updated.repetitions).toBe(0);
    expect(updated.intervalDays).toBe(1);
    expect(updated.dueAt.toISOString()).toBe(new Date("2024-01-02").toISOString());
  });

  it("moves to 6 days on the second success", () => {
    const once = updateSm2(baseState, "Good", new Date("2024-01-01"));
    const twice = updateSm2({ ...once, dueAt: new Date(), intervalDays: once.intervalDays }, "Good", new Date("2024-01-02"));
    expect(twice.repetitions).toBe(2);
    expect(twice.intervalDays).toBe(6);
  });

  it("expands interval based on ease factor after third review", () => {
    const one = updateSm2(baseState, "Good", new Date("2024-01-01"));
    const two = updateSm2(one, "Good", new Date("2024-01-02"));
    const three = updateSm2(two, "Easy", new Date("2024-01-08"));
    expect(three.intervalDays).toBeGreaterThan(two.intervalDays);
    expect(three.easeFactor).toBeGreaterThan(two.easeFactor);
  });

  it("keeps repetitions but schedules 1 day on Hard for first success", () => {
    const updated = updateSm2(baseState, "Hard", new Date("2024-01-01"));
    expect(updated.repetitions).toBe(1);
    expect(updated.intervalDays).toBe(1);
  });

  it("clamps ease factor to a minimum of 1.3", () => {
    const lowState: SrsState = {
      easeFactor: 1300,
      intervalDays: 6,
      repetitions: 3,
      dueAt: new Date(),
      lastReviewedAt: new Date(),
    };
    const updated = updateSm2(lowState, "Hard", new Date("2024-01-02"));
    expect(updated.easeFactor).toBeGreaterThanOrEqual(1300);
  });
});
