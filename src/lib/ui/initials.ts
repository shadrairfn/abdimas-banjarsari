/** Build a short avatar label consistently across account lists, menus, and audit entries. */
export function getInitials(fullName: string): string {
  const nameParts = fullName.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  return nameParts
    .map((namePart) => namePart[0])
    .join("")
    .toLocaleUpperCase("id-ID");
}
