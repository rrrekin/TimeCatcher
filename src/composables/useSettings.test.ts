import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent } from "vue";
import { useSettings } from "./useSettings";

describe("useSettings", () => {
  let localStorageMock: Record<string, string | undefined>;
  let setItemSpy: any;
  let getItemSpy: any;

  beforeEach(() => {
    localStorageMock = {};
    setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation((k, v) => {
      localStorageMock[k] = v;
    });
    getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation((k) => localStorageMock[k] ?? null);
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
    const setPropertySpy = vi.spyOn(document.documentElement.style, "setProperty");

    // @ts-expect-error override
    global.document = undefined;
    expect(() => applyTheme("light")).not.toThrow();
    expect(setPropertySpy).not.toHaveBeenCalled();

    global.document = origDoc;
    setPropertySpy.mockRestore();
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
    const mockMediaQueryList = {
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any;

    const matchMediaSpy = vi.spyOn(window, "matchMedia").mockReturnValue(mockMediaQueryList);
    const setPropertySpy = vi.spyOn(document.documentElement.style, "setProperty");

    const TestComponent = defineComponent({
      setup() {
        const settings = useSettings();
        settings.currentTheme.value = "auto";
        return { settings };
      },
      template: "<div></div>",
    });

    const wrapper = mount(TestComponent);

    // Clear initial calls from component mount
    setPropertySpy.mockClear();

    // Simulate OS theme change
    const changeHandler = mockMediaQueryList.addEventListener.mock.calls[0][1];
    changeHandler();

    // Verify that applyTheme was called by checking DOM mutations
    expect(setPropertySpy).toHaveBeenCalled();

    matchMediaSpy.mockRestore();
    setPropertySpy.mockRestore();
    wrapper.unmount();
  });

  it("should cleanup mediaQuery listeners on unmount (modern API)", () => {
    const mql = { addEventListener: vi.fn(), removeEventListener: vi.fn() } as any;
    vi.spyOn(window, "matchMedia").mockReturnValue(mql);
    const wrapper = mount(defineComponent({
      setup() {
        useSettings();
        return {};
      },
      template: "<div/>",
    }));
    // Unmount should remove the registered listener
    wrapper.unmount();
    expect(mql.removeEventListener).toHaveBeenCalledTimes(1);
    expect(mql.removeEventListener.mock.calls[0][0]).toBe("change");
    expect(typeof mql.removeEventListener.mock.calls[0][1]).toBe("function");
  });

  it("should cleanup mediaQuery listeners on unmount (legacy API)", () => {
    const mql = { addListener: vi.fn(), removeListener: vi.fn() } as any;
    const matchMediaSpy = vi.spyOn(window, "matchMedia").mockReturnValue(mql);
    
    const TestComponent = defineComponent({
      setup() {
        const settings = useSettings();
        return { settings };
      },
      template: "<div></div>",
    });
    
    const wrapper = mount(TestComponent);
    // Unmount should trigger the legacy removeListener
    wrapper.unmount();
    
    expect(mql.removeListener).toHaveBeenCalled();
    matchMediaSpy.mockRestore();
  });
});
