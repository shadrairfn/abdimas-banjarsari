"use server";

import { createCategory } from "@/features/categories/category-service";
import type { BusinessCategory } from "@/features/categories/types";
import { type DataActionState, runActionWithData } from "@/lib/http/run-action";

/** Create a category after server-side validation and authorization. */
export async function createCategoryAction(
  name: string,
): Promise<DataActionState<BusinessCategory>> {
  return runActionWithData(() => createCategory(name));
}
