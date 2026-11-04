"use client";

import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

import { UMKM_SUB_CATEGORIES } from "@/features/umkm/types";

import type { BusinessCategory } from "./types";

const fallback = UMKM_SUB_CATEGORIES.map((name) => ({ id: name, name, slug: name }));
const CategoryContext = createContext<{
  categories: BusinessCategory[];
  addCategory: (category: BusinessCategory) => void;
}>({ categories: fallback, addCategory: () => {} });
export function CategoryProvider({
  initialCategories,
  children,
}: {
  initialCategories: BusinessCategory[];
  children: ReactNode;
}) {
  const [added, setAdded] = useState<BusinessCategory[]>([]);
  const categories = useMemo(
    () => [
      ...new Map(
        [...initialCategories, ...added].map((category) => [category.id, category]),
      ).values(),
    ],
    [initialCategories, added],
  );

  return (
    <CategoryContext.Provider
      value={{
        categories,
        addCategory: (category) =>
          setAdded((items) => [...items.filter((item) => item.id !== category.id), category]),
      }}
    >
      {children}
    </CategoryContext.Provider>
  );
}
export function useCategories() {
  return useContext(CategoryContext);
}
export function useCategoryNames() {
  return useCategories().categories.map((category) => category.name);
}
