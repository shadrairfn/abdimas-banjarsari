/** Run before first paint so a saved theme and sidebar width do not flash while React loads. */
export const INITIAL_THEME_SCRIPT = `
  try {
    const savedTheme = localStorage.getItem("app_theme");
    const prefersDarkTheme = matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldUseDarkTheme = savedTheme === "dark" || (!savedTheme && prefersDarkTheme);

    if (shouldUseDarkTheme) {
      document.documentElement.classList.add("dark");
    }

    const isSidebarExpanded = localStorage.getItem("rail_expanded_v2") !== "false";
    document.documentElement.dataset.railExpanded = String(isSidebarExpanded);
  } catch {
    // Keep the server defaults when browser storage is unavailable.
  }
`;
