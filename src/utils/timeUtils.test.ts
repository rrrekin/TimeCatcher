import { describe, it, expect, vi } from "vitest";
import { parseTimeString, formatDurationMinutes, getLastTaskEndTime, MINUTES_PER_DAY } from "./timeUtils";

describe("timeUtils", () => {
  describe("parseTimeString", () => {
    it("should parse valid HH:mm", () => {
      expect(parseTimeString("09:30")).toBe(570);
    });

    it("should parse valid HH:mm:ss", () => {
      expect(parseTimeString("09:30:30")).toBeCloseTo(570.5, 1);
    });

    it("should return null for invalid formats", () => {
      expect(parseTimeString("")).toBeNull();
      expect(parseTimeString("25:00")).toBeNull();
      expect(parseTimeString("12:60")).toBeNull();
      expect(parseTimeString("12:30:99")).toBeNull();
      expect(parseTimeString("abc")).toBeNull();
    });
  });

  describe("formatDurationMinutes", () => {
    it("should format minutes less than 60", () => {
      expect(formatDurationMinutes(45)).toBe("45m");
    });

    it("should format hours and minutes", () => {
      expect(formatDurationMinutes(125)).toBe("2h 5m");
    });

    it("should round fractional minutes", () => {
      expect(formatDurationMinutes(90.7)).toBe("1h 31m");
    });

    it("should clamp negative values to 0", () => {
      expect(formatDurationMinutes(-50)).toBe("0m");
    });
  });

  describe("getLastTaskEndTime", () => {
    it("should return start time for invalid date", () => {
      expect(getLastTaskEndTime("invalid-date", 100)).toBe(100);
      expect(getLastTaskEndTime("2025-13-01", 200)).toBe(200);
      expect(getLastTaskEndTime("2025-02-31", 300)).toBe(300);
    });

    it("should return 1440 for past dates", () => {
      const pastDate = "2000-01-01";
      expect(getLastTaskEndTime(pastDate, 100)).toBe(MINUTES_PER_DAY);
    });

    it("should return start time for future dates", () => {
      const futureDate = "2999-01-01";
      expect(getLastTaskEndTime(futureDate, 200)).toBe(200);
    });

    it("should return now minutes for today if start time <= now", () => {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;
      const result = getLastTaskEndTime(todayStr, 0);
      expect(result).toBeLessThanOrEqual(MINUTES_PER_DAY - 1);
    });

    it("should return start time if start time is in the future today", () => {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;
      const result = getLastTaskEndTime(todayStr, MINUTES_PER_DAY - 1);
      expect(result).toBe(MINUTES_PER_DAY - 1);
    });
  });
});
