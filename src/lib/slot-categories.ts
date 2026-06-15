/** The date + shift-slot booking flow applies to only two categories:
 *  "Chef" and "Helpers & Waiters". Every other category is an instant
 *  add-to-cart with no slot selection. Matched loosely on the category name
 *  so variants like "Executive Chef" or "Helpers & Waiter" still qualify. */
export function categoryUsesSlots(categoryName: string | null | undefined): boolean {
  if (!categoryName) return false;
  const name = categoryName.trim().toLowerCase();
  return name.includes("chef") || name.includes("helper") || name.includes("waiter");
}
