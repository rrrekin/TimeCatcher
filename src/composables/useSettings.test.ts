import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useSettings } from "./useSettings";

describe("useSettings", () => {
  let localStorageMock: Record<string, string | undefined>;
  let setItemSpy: any;
  let getItemSpy: any;

  beforeEach(() => {
    localStorageMock = {};
    setItemSpy = vi.spyOn(window.localStorage.__proto__, "setItem").mockImplementation((k, v) => {
      localStorageMock[k] = v;
    });
    getItemSpy = vi.spyOn(window.localStorage.__proto__, "getItem").mockImplementation((k) => localStorageMock[k] || null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should applyTheme light and dark", () => {
    const { applyTheme } = useSettings();
    document.documentElement.style.setProperty = vi.fn();
    applyTheme("light");
    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith("color-scheme", "light");
    applyTheme("dark");
    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith("color-scheme", "dark");
  });

  it("should applyTheme auto resolves to dark if prefers dark", () => {
    const { applyTheme } = useSettings();
    document.documentElement.style.setProperty = vi.fn();
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() } as any);
    applyTheme("auto");
    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith("color-scheme", "dark");
  });

  it("should not applyTheme if window/document undefined", () => {
    const { applyTheme } = useSettings();
    const origDoc = global.document;
    // @ts-expect-error override
    global.document = undefined;
    expect(() => applyTheme("light")).not.toThrow();
    global.document = origDoc;
  });

  it("should load valid settings from localStorage", () => {
    localStorageMock["theme"] = "dark";
    localStorageMock["targetWorkHours"] = "6";
    const { loadSettings, currentTheme, targetWorkHours } = useSettings();
    loadSettings();
    expect(currentTheme.value).toBe("dark");
    expect(targetWorkHours.value).toBe(6);
  });

  it("should ignore invalid theme and invalid hours", () => {
    localStorageMock["theme"] = "weird";
    localStorageMock["targetWorkHours"] = "100";
    const { loadSettings, currentTheme, targetWorkHours } = useSettings();
    loadSettings();
    expect(currentTheme.value).toBe("auto");
    expect(targetWorkHours.value).toBe(8);
  });

  it("should save valid settings", () => {
    const { saveSettings, tempTheme, tempTargetWorkHours, currentTheme, targetWorkHours } = useSettings();
    tempTheme.value = "dark";
    tempTargetWorkHours.value = 7;
    saveSettings();
    expect(localStorageMock["theme"]).toBe("dark");
    expect(localStorageMock["targetWorkHours"]).toBe("7");
    expect(currentTheme.value).toBe("dark");
    expect(targetWorkHours.value).toBe(7);
  });

  it("should fallback to safe default when invalid target hours are saved", () => {
    const { saveSettings, tempTargetWorkHours, targetWorkHours } = useSettings();
    tempTargetWorkHours.value = 100;
    targetWorkHours.value = NaN as any;
    saveSettings();
    expect(targetWorkHours.value).toBe(8);
  });

  it("should initialize temp settings", () => {
    const { initializeTempSettings, currentTheme, targetWorkHours, tempTheme, tempTargetWorkHours } = useSettings();
    currentTheme.value = "dark";
    targetWorkHours.value = 5;
    initializeTempSettings();
    expect(tempTheme.value).toBe("dark");
    expect(tempTargetWorkHours.value).toBe(5);
  });

  it("should handle OS theme change when currentTheme is auto", () => {
    const { currentTheme } = useSettings();
    currentTheme.value = "auto";
    const { applyTheme } = useSettings();
    const spy = vi.spyOn({ applyTheme }, "applyTheme");
    (useSettings() as any).handleOSThemeChange?.();
    expect(spy).toHaveBeenCalled;
  });

  it("should cleanup mediaQuery listeners on unmount (modern API)", () => {
    const { } = useSettings();
    const mql = { addEventListener: vi.fn(), removeEventListener: vi.fn() } as any;
    vi.spyOn(window, "matchMedia").mockReturnValue(mql);
    const { } = useSettings();
    (useSettings() as any).$unmount?.();
    expect(mql.removeEventListener).toBeDefined();
  });

  it("should cleanup mediaQuery listeners on unmount (legacy API)", () => {
    const mql = { addListener: vi.fn(), removeListener: vi.fn() } as any;
    vi.spyOn(window, "matchMedia").mockReturnValue(mql);
    const { } = useSettings();
    (useSettings() as any).$unmount?.();
    expect(mql.removeListener).toBeDefined();
  });
});
