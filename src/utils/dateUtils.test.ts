import { describe, it, expect, vi } from "vitest";
import { toYMDLocal, isToday, formatDateString } from "./dateUtils";

describe("dateUtils", () => {
  it("should format date to YYYY-MM-DD with toYMDLocal", () => {
    const date = new Date(2025, 0, 5); // Jan 5, 2025
    expect(toYMDLocal(date)).toBe("2025-01-05");
  });

  it("should check if date string is today with isToday", () => {
    const today = new Date();
    const todayStr = toYMDLocal(today);
    expect(isToday(todayStr)).toBe(true);
    expect(isToday("2000-01-01")).toBe(false);
  });

  it("should format date string to readable format with default locale", () => {
    const formatted = formatDateString("2025-01-15");
    expect(formatted).toMatch(/2025/);
    // Should contain weekday and month name in some locale
    expect(formatted.split(" ").length).toBeGreaterThan(2);
  });

  it("should format date string with custom locale", () => {
    const formatted = formatDateString("2025-01-15", "en-GB");
    expect(formatted).toMatch(/15 January 2025/);
  });

  it("should handle leap year dates correctly", () => {
    const formatted = formatDateString("2024-02-29", "en-US");
    expect(formatted).toMatch(/February 29, 2024/);
  });

  it("should handle invalid but parseable date strings gracefully", () => {
    const formatted = formatDateString("2025-12-01");
    expect(formatted).toContain("2025");
  });
});
