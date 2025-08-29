import { describe, it, expect, beforeEach, vi } from "vitest";
import { useCategories } from "./useCategories";
import type { Category } from "../shared/types";

describe("useCategories", () => {
  let mockCategories: Category[];

  beforeEach(() => {
    mockCategories = [
      { id: 1, name: "Work", is_default: true },
      { id: 2, name: "Personal", is_default: false },
    ];
    (window as any).electronAPI = {
      getCategories: vi.fn().mockResolvedValue(mockCategories),
      addCategory: vi.fn().mockImplementation((name: string) => Promise.resolve({ id: 3, name, is_default: false })),
      updateCategory: vi.fn().mockResolvedValue(undefined),
      deleteCategory: vi.fn().mockResolvedValue(undefined),
      setDefaultCategory: vi.fn().mockResolvedValue(undefined),
      getDefaultCategory: vi.fn().mockResolvedValue(mockCategories[0]),
      categoryExists: vi.fn().mockResolvedValue(true),
    };
  });

  it("should load categories", async () => {
    const { loadCategories, categories, isLoadingCategories } = useCategories();
    await loadCategories();
    expect(categories.value).toEqual(mockCategories);
    expect(isLoadingCategories.value).toBe(false);
  });

  it("should handle loadCategories error", async () => {
    (window as any).electronAPI.getCategories.mockRejectedValue(new Error("fail"));
    const { loadCategories } = useCategories();
    await expect(loadCategories()).rejects.toThrow("fail");
  });

  it("should add category", async () => {
    const { addCategory, categories } = useCategories();
    const newCat = await addCategory("New");
    expect(newCat.name).toBe("New");
    expect(categories.value.find(c => c.name === "New")).toBeTruthy();
  });

  it("should not add empty category", async () => {
    const { addCategory } = useCategories();
    await expect(addCategory("   ")).rejects.toThrow("Category name cannot be empty");
  });

  it("should update category", async () => {
    const { updateCategory, categories } = useCategories();
    categories.value = [...mockCategories];
    await updateCategory(1, "  Updated  ");
    expect(categories.value[0].name).toBe("Updated");
    expect((window as any).electronAPI.updateCategory).toHaveBeenCalledWith(1, "Updated");
  });

  it("should not update with empty name", async () => {
    const { updateCategory } = useCategories();
    await expect(updateCategory(1, "   ")).rejects.toThrow("Category name cannot be empty");
  });

  it("should delete category", async () => {
    const { deleteCategory, categories } = useCategories();
    categories.value = [...mockCategories];
    await deleteCategory(1);
    expect(categories.value.find(c => c.id === 1)).toBeFalsy();
  });

  it("should set default category", async () => {
    const { setDefaultCategory, categories } = useCategories();
    categories.value = [...mockCategories];
    await setDefaultCategory(2);
    expect(categories.value.find(c => c.id === 2)?.is_default).toBe(true);
    expect(categories.value.find(c => c.id === 1)?.is_default).toBe(false);
  });

  it("should get default category", async () => {
    const { getDefaultCategory } = useCategories();
    const def = await getDefaultCategory();
    expect(def?.id).toBe(1);
  });

  it("should return null if getDefaultCategory fails", async () => {
    (window as any).electronAPI.getDefaultCategory.mockRejectedValue(new Error("fail"));
    const { getDefaultCategory } = useCategories();
    const def = await getDefaultCategory();
    expect(def).toBeNull();
  });

  it("should check category existence", async () => {
    const { categoryExists } = useCategories();
    const exists = await categoryExists("  Work  ");
    expect(exists).toBe(true);
    expect((window as any).electronAPI.categoryExists).toHaveBeenCalledWith("Work");
  });

  it("should return false for empty name in categoryExists", async () => {
    const { categoryExists } = useCategories();
    const exists = await categoryExists("   ");
    expect(exists).toBe(false);
  });

  it("should return false if categoryExists throws", async () => {
    (window as any).electronAPI.categoryExists.mockRejectedValue(new Error("fail"));
    const { categoryExists } = useCategories();
    const exists = await categoryExists("Work");
    expect(exists).toBe(false);
  });

  it("should resolve undefined if electronAPI is missing in loadCategories", async () => {
    delete (window as any).electronAPI;
    const { loadCategories } = useCategories();
    await expect(loadCategories()).resolves.toBeUndefined();
  });

  it("should throw if electronAPI is missing in addCategory", async () => {
    delete (window as any).electronAPI;
    const { addCategory } = useCategories();
    await expect(addCategory("Test")).rejects.toThrow("Electron API not available");
  });

  it("should throw if electronAPI is missing in updateCategory", async () => {
    delete (window as any).electronAPI;
    const { updateCategory } = useCategories();
    await expect(updateCategory(1, "Test")).rejects.toThrow("Electron API not available");
  });

  it("should throw if electronAPI is missing in deleteCategory", async () => {
    delete (window as any).electronAPI;
    const { deleteCategory } = useCategories();
    await expect(deleteCategory(1)).rejects.toThrow("Electron API not available");
  });

  it("should throw if electronAPI is missing in setDefaultCategory", async () => {
    delete (window as any).electronAPI;
    const { setDefaultCategory } = useCategories();
    await expect(setDefaultCategory(1)).rejects.toThrow("Electron API not available");
  });

  it("should return null if electronAPI is missing in getDefaultCategory", async () => {
    delete (window as any).electronAPI;
    const { getDefaultCategory } = useCategories();
    const def = await getDefaultCategory();
    expect(def).toBeNull();
  });

  it("should return false if electronAPI is missing in categoryExists", async () => {
    delete (window as any).electronAPI;
    const { categoryExists } = useCategories();
    const exists = await categoryExists("Work");
    expect(exists).toBe(false);
  });
});
