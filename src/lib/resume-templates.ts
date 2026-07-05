/**
 * Resume template presets. Every template renders the same document through
 * the same section renderers — a preset only parameterizes layout, palette
 * and typography, which is what keeps 20 templates maintainable.
 */

export type TemplateLayout =
  | "single" // one column, header on top
  | "sidebar-left" // colored rail on the left
  | "sidebar-right" // colored rail on the right
  | "banner" // full-width colored header band
  | "topline"; // slim accent line above a single column

export type TemplatePreset = {
  id: string;
  name: string;
  layout: TemplateLayout;
  /** Accent for headings, dots, chips, links */
  accent: string;
  /** Banner background (banner layout) — defaults to accent */
  headerBg?: string;
  /** Text color on the banner/sidebar when it has a dark background */
  onDark?: boolean;
  /** Sidebar background (sidebar layouts) */
  sidebarBg?: string;
  /** Sidebar uses light text */
  sidebarDark?: boolean;
  /** Heading treatment for section titles */
  headingStyle: "underline" | "bar" | "plain" | "caps";
  /** Skill/expertise chip treatment */
  chipStyle: "solid" | "outline" | "soft";
  /** Font pairing */
  font: "sans" | "serif" | "mixed"; // mixed = serif headings / sans body
};

export const RESUME_FONTS: Record<TemplatePreset["font"], { heading: string; body: string }> = {
  sans: {
    heading: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    body: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  },
  serif: {
    heading: "Georgia, 'Times New Roman', serif",
    body: "Georgia, 'Times New Roman', serif",
  },
  mixed: {
    heading: "Georgia, 'Times New Roman', serif",
    body: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  },
};

export const RESUME_TEMPLATES: TemplatePreset[] = [
  { id: "aurora", name: "Aurora", layout: "sidebar-left", accent: "#2563eb", sidebarBg: "#0f1f42", sidebarDark: true, headingStyle: "underline", chipStyle: "soft", font: "sans" },
  { id: "onyx", name: "Onyx", layout: "sidebar-left", accent: "#b98a2f", sidebarBg: "#16181d", sidebarDark: true, headingStyle: "caps", chipStyle: "outline", font: "mixed" },
  { id: "classic", name: "Classic", layout: "single", accent: "#1e3a5f", headingStyle: "underline", chipStyle: "outline", font: "serif" },
  { id: "minimal", name: "Minimal", layout: "single", accent: "#111827", headingStyle: "plain", chipStyle: "outline", font: "sans" },
  { id: "ember", name: "Ember", layout: "banner", accent: "#c2410c", headerBg: "#7c2d12", onDark: true, headingStyle: "bar", chipStyle: "soft", font: "sans" },
  { id: "ocean", name: "Ocean", layout: "banner", accent: "#0e7490", headerBg: "#164e63", onDark: true, headingStyle: "underline", chipStyle: "soft", font: "sans" },
  { id: "forest", name: "Forest", layout: "sidebar-left", accent: "#15803d", sidebarBg: "#ecf5ee", headingStyle: "underline", chipStyle: "soft", font: "sans" },
  { id: "plum", name: "Plum", layout: "sidebar-right", accent: "#7e22ce", sidebarBg: "#2e1065", sidebarDark: true, headingStyle: "bar", chipStyle: "soft", font: "sans" },
  { id: "slate", name: "Slate", layout: "sidebar-right", accent: "#2563eb", sidebarBg: "#eef1f6", headingStyle: "caps", chipStyle: "outline", font: "sans" },
  { id: "sky", name: "Sky", layout: "topline", accent: "#0284c7", headingStyle: "underline", chipStyle: "soft", font: "sans" },
  { id: "ivory", name: "Ivory", layout: "single", accent: "#92400e", headingStyle: "caps", chipStyle: "outline", font: "serif" },
  { id: "ruby", name: "Ruby", layout: "sidebar-left", accent: "#be123c", sidebarBg: "#4c0519", sidebarDark: true, headingStyle: "underline", chipStyle: "soft", font: "sans" },
  { id: "steel", name: "Steel", layout: "single", accent: "#475569", headingStyle: "bar", chipStyle: "solid", font: "sans" },
  { id: "mint", name: "Mint", layout: "banner", accent: "#0d9488", headerBg: "#ccfbf1", headingStyle: "underline", chipStyle: "soft", font: "sans" },
  { id: "cobalt", name: "Cobalt", layout: "topline", accent: "#1d4ed8", headingStyle: "bar", chipStyle: "solid", font: "mixed" },
  { id: "blush", name: "Blush", layout: "sidebar-right", accent: "#be185d", sidebarBg: "#fdf0f5", headingStyle: "underline", chipStyle: "soft", font: "mixed" },
  { id: "graphite", name: "Graphite", layout: "single", accent: "#1f2937", headingStyle: "bar", chipStyle: "solid", font: "sans" },
  { id: "citrus", name: "Citrus", layout: "banner", accent: "#b45309", headerBg: "#fef3c7", headingStyle: "underline", chipStyle: "soft", font: "sans" },
  { id: "midnight", name: "Midnight", layout: "banner", accent: "#3b82f6", headerBg: "#0b1220", onDark: true, headingStyle: "caps", chipStyle: "outline", font: "mixed" },
  { id: "sage", name: "Sage", layout: "topline", accent: "#3f6212", headingStyle: "caps", chipStyle: "outline", font: "serif" },
];

export const DEFAULT_TEMPLATE_ID = "aurora";

export function getTemplate(id: string | undefined): TemplatePreset {
  return RESUME_TEMPLATES.find((t) => t.id === id) ?? RESUME_TEMPLATES[0];
}

export const isTwoColumn = (layout: TemplateLayout) =>
  layout === "sidebar-left" || layout === "sidebar-right";
