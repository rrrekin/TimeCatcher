// Fixed duplicate imports
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref } from "vue";
import { useAutoRefresh } from "./useAutoRefresh";

describe("useAutoRefresh", () => {
  let mockCallback: ReturnType<typeof vi.fn>;
  let selectedDate = ref(new Date());

  beforeEach(() => {
    vi.useFakeTimers();
    mockCallback = vi.fn();
    selectedDate.value = new Date();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should call callback every 15s when date is today", () => {
    const { startAutoRefresh, stopAutoRefresh } = useAutoRefresh(selectedDate, mockCallback);
    startAutoRefresh();

    expect(mockCallback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(15000);
    expect(mockCallback).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(30000);
    expect(mockCallback).toHaveBeenCalledTimes(3);

    stopAutoRefresh();
  });

  it("should not start auto-refresh if date is not today", () => {
    const { startAutoRefresh } = useAutoRefresh(selectedDate, mockCallback);
    // set date to yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    selectedDate.value = yesterday;

    startAutoRefresh();
    vi.advanceTimersByTime(60000);
    expect(mockCallback).not.toHaveBeenCalled();
  });

  it("should stop refreshing when stopAutoRefresh is called", () => {
    const { startAutoRefresh, stopAutoRefresh } = useAutoRefresh(selectedDate, mockCallback);
    startAutoRefresh();

    vi.advanceTimersByTime(30000);
    expect(mockCallback).toHaveBeenCalledTimes(2);

    stopAutoRefresh();
    vi.advanceTimersByTime(60000);
    expect(mockCallback).toHaveBeenCalledTimes(2);
  });

  it("should restart when restartAutoRefresh is called", () => {
    const { startAutoRefresh, restartAutoRefresh, stopAutoRefresh } = useAutoRefresh(selectedDate, mockCallback);
    startAutoRefresh();

    vi.advanceTimersByTime(15000);
    expect(mockCallback).toHaveBeenCalledTimes(1);

    restartAutoRefresh();
    vi.advanceTimersByTime(15000);
    expect(mockCallback).toHaveBeenCalledTimes(2);

    stopAutoRefresh();
  });
});
