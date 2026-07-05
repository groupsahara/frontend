"use client";

/**
 * Template-aware resume renderer + inline editor.
 *
 * One renderer serves all 20 template presets: the preset parameterizes
 * layout (single / sidebar / banner / topline), palette and typography while
 * the section renderers stay shared. With `editable`, every text run is an
 * inline contentEditable and sections/items grow hover toolbars.
 */

import { Fragment, useEffect, useRef, useState } from "react";
import {
  SECTION_DEFS,
  createItem,
  donutShades,
  uid,
  type ResumeDocument,
  type ResumeItem,
  type ResumeSection,
} from "@/src/lib/resume";
import {
  RESUME_FONTS,
  isTwoColumn,
  type TemplatePreset,
} from "@/src/lib/resume-templates";
import { Editable } from "@/src/components/resume-builder/editable";

export type AiTarget = {
  sectionId: string;
  itemId: string;
  /** description text or bullets joined with newlines */
  text: string;
  usesBullets: boolean;
  context: string;
};

export type Updater = (mutate: (doc: ResumeDocument) => ResumeDocument) => void;

interface CanvasProps {
  doc: ResumeDocument;
  template: TemplatePreset;
  editable?: boolean;
  onChange?: Updater;
  onAiRequest?: (target: AiTarget) => void;
  /** Reports how many A4 pages the content currently fills. */
  onPageCount?: (pages: number) => void;
}

/* Paper ink tokens — the page is always white, independent of app theme. */
const INK = "#1f2937";
const INK_MUTED = "#6b7280";
const PAPER = "#ffffff";

export const RESUME_PAGE_WIDTH = 794; // A4 @ 96dpi
export const RESUME_PAGE_HEIGHT = 1123; // A4 @ 96dpi — matches print pagination

export function ResumeCanvas({
  doc,
  template,
  editable = false,
  onChange,
  onAiRequest,
  onPageCount,
}: CanvasProps) {
  const fonts = RESUME_FONTS[template.font];
  const twoCol = isTwoColumn(template.layout);
  const update: Updater = (mutate) => onChange?.(mutate);

  const sectionCtx: SectionCtx = { template, editable, update, onAiRequest, sections: doc.sections };

  const main = twoCol ? doc.sections.filter((s) => s.column !== "side") : doc.sections;
  const side = twoCol ? doc.sections.filter((s) => s.column === "side") : [];

  const sidebarStyle: React.CSSProperties = {
    background: template.sidebarBg ?? "#f3f4f6",
    color: template.sidebarDark ? "#e5e9f0" : INK,
  };

  /* -------- A4 pagination: measure content, grow in whole pages -------- *
   * The measured refs wrap CONTENT only (the columns themselves stretch to
   * the paginated height, so measuring them would feed back into itself).
   * The browser's print pagination uses the same 794×1123 geometry, so the
   * on-screen page-break lines match the exported PDF.                    */
  const headerRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const sideRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(1);
  const onPageCountRef = useRef(onPageCount);
  useEffect(() => {
    onPageCountRef.current = onPageCount;
  }, [onPageCount]);

  useEffect(() => {
    const compute = () => {
      const header = headerRef.current?.offsetHeight ?? 0;
      const mainH = mainRef.current?.offsetHeight ?? 0;
      const sideH = sideRef.current?.offsetHeight ?? 0;
      const content = header + Math.max(mainH, sideH);
      const pages = Math.max(1, Math.ceil(content / RESUME_PAGE_HEIGHT));
      setPageCount((prev) => {
        if (prev !== pages) onPageCountRef.current?.(pages);
        return pages;
      });
    };
    compute();
    const observer = new ResizeObserver(compute);
    [headerRef.current, mainRef.current, sideRef.current].forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [template.layout]);

  const sideContent = (
    <div ref={sideRef} className="px-6 py-6">
      {side.map((s) => (
        <SectionView key={s.id} section={s} ctx={sectionCtx} inSidebar />
      ))}
      {editable && side.length === 0 && (
        <p className="text-[0.8em] opacity-50">Sections moved to the sidebar appear here.</p>
      )}
    </div>
  );

  return (
    <div
      id="resume-canvas"
      className="relative mx-auto flex flex-col shadow-xl print:shadow-none"
      style={{
        width: RESUME_PAGE_WIDTH,
        minHeight: pageCount * RESUME_PAGE_HEIGHT,
        background: PAPER,
        color: INK,
        fontFamily: fonts.body,
        fontSize: 13 * (doc.settings?.fontScale ?? 1),
        lineHeight: 1.45,
      }}
    >
      <div ref={headerRef}>
        <Header doc={doc} template={template} editable={editable} update={update} />
      </div>

      {twoCol ? (
        <div className="flex flex-1">
          {template.layout === "sidebar-left" && (
            <aside className="w-[34%] shrink-0" style={sidebarStyle} data-sidebar>
              {sideContent}
            </aside>
          )}
          <main className="min-w-0 flex-1">
            <div ref={mainRef} className="px-8 py-6">
              {main.map((s) => (
                <SectionView key={s.id} section={s} ctx={sectionCtx} />
              ))}
            </div>
          </main>
          {template.layout === "sidebar-right" && (
            <aside className="w-[34%] shrink-0" style={sidebarStyle} data-sidebar>
              {sideContent}
            </aside>
          )}
        </div>
      ) : (
        <main>
          <div ref={mainRef} className="px-10 py-6">
            {doc.sections.map((s) => (
              <SectionView key={s.id} section={s} ctx={sectionCtx} />
            ))}
          </div>
        </main>
      )}

      {/* On-screen page-break guides (hidden in print — the browser actually
          paginates there at the same heights) */}
      {Array.from({ length: pageCount - 1 }, (_, i) => (
        <div
          key={i}
          aria-hidden
          className="pointer-events-none absolute left-0 right-0 z-20 print:hidden"
          style={{ top: (i + 1) * RESUME_PAGE_HEIGHT }}
        >
          <div className="border-t-2 border-dashed border-sky-400/70" />
          <span className="absolute -top-2.5 right-2 rounded bg-sky-500 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
            Page {i + 2}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Header                                                             *
 * ------------------------------------------------------------------ */

function Header({
  doc,
  template,
  editable,
  update,
}: {
  doc: ResumeDocument;
  template: TemplatePreset;
  editable: boolean;
  update: Updater;
}) {
  const fonts = RESUME_FONTS[template.font];
  const { basics } = doc;
  const setBasic = (key: keyof typeof basics) => (value: string) =>
    update((d) => ({ ...d, basics: { ...d.basics, [key]: value } }));

  const isBanner = template.layout === "banner";
  const bannerBg = template.headerBg ?? template.accent;
  const dark = isBanner && template.onDark;
  const ink = dark ? "#f8fafc" : INK;
  const sub = dark ? "rgba(248,250,252,0.75)" : INK_MUTED;
  const headlineColor = dark ? "#ffffff" : template.accent;

  const contacts: Array<{ key: keyof typeof basics; ph: string }> = [
    { key: "email", ph: "email@example.com" },
    { key: "phone", ph: "+00 00000 00000" },
    { key: "location", ph: "City, Country" },
    { key: "website", ph: "portfolio / website" },
  ];

  return (
    <header
      className="px-10 pb-5 pt-8"
      style={{
        background: isBanner ? bannerBg : PAPER,
        borderTop: template.layout === "topline" ? `6px solid ${template.accent}` : undefined,
        borderBottom: !isBanner ? `1px solid #e5e7eb` : undefined,
      }}
    >
      <Editable
        as="h1"
        editable={editable}
        value={basics.fullName}
        onCommit={setBasic("fullName")}
        placeholder="Your Name"
        className="block text-[2.3em] font-bold leading-tight tracking-tight"
        style={{ color: ink, fontFamily: fonts.heading }}
      />
      <Editable
        as="p"
        editable={editable}
        value={basics.headline}
        onCommit={setBasic("headline")}
        placeholder="Professional headline"
        className="mt-0.5 block text-[1.15em] font-medium"
        style={{ color: headlineColor }}
      />
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[0.85em]" style={{ color: sub }}>
        {contacts.map(({ key, ph }) =>
          editable || basics[key] ? (
            <Editable
              key={key}
              editable={editable}
              value={basics[key]}
              onCommit={setBasic(key)}
              placeholder={ph}
            />
          ) : null,
        )}
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ *
 *  Sections                                                           *
 * ------------------------------------------------------------------ */

type SectionCtx = {
  template: TemplatePreset;
  editable: boolean;
  update: Updater;
  onAiRequest?: (target: AiTarget) => void;
  sections: ResumeSection[];
};

function mutateSection(
  update: Updater,
  sectionId: string,
  fn: (s: ResumeSection) => ResumeSection | null,
) {
  update((d) => ({
    ...d,
    sections: d.sections
      .map((s) => (s.id === sectionId ? fn(s) : s))
      .filter((s): s is ResumeSection => s !== null),
  }));
}

function SectionView({
  section,
  ctx,
  inSidebar = false,
}: {
  section: ResumeSection;
  ctx: SectionCtx;
  inSidebar?: boolean;
}) {
  const { template, editable, update } = ctx;
  const def = SECTION_DEFS[section.type];
  const fonts = RESUME_FONTS[template.font];
  const dark = inSidebar && template.sidebarDark;
  const ink = dark ? "#eef2f8" : INK;
  const muted = dark ? "rgba(238,242,248,0.65)" : INK_MUTED;
  const accent = dark ? "#ffffff" : template.accent;

  const setItems = (items: ResumeItem[]) =>
    mutateSection(update, section.id, (s) => ({ ...s, items }));

  const move = (dir: -1 | 1) =>
    update((d) => {
      const idx = d.sections.findIndex((s) => s.id === section.id);
      // move relative to neighbours in the same column so reordering matches
      // what the user sees in two-column layouts
      const peers = d.sections
        .map((s, i) => ({ s, i }))
        .filter(({ s }) => s.column === section.column || !isTwoColumn(template.layout));
      const pos = peers.findIndex(({ s }) => s.id === section.id);
      const swap = peers[pos + dir];
      if (!swap) return d;
      const next = d.sections.slice();
      [next[idx], next[swap.i]] = [next[swap.i], next[idx]];
      return { ...d, sections: next };
    });

  const headingStyles: Record<TemplatePreset["headingStyle"], React.CSSProperties> = {
    underline: { borderBottom: `2px solid ${dark ? "rgba(255,255,255,0.6)" : INK}`, paddingBottom: 3 },
    bar: { borderLeft: `4px solid ${accent}`, paddingLeft: 8 },
    plain: {},
    caps: { textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.9em" },
  };

  return (
    <section className="group/section relative mb-5 break-inside-avoid">
      {editable && (
        <div className="pointer-events-none absolute -right-1 -top-2 z-10 flex gap-0.5 opacity-0 transition group-hover/section:pointer-events-auto group-hover/section:opacity-100 print:hidden">
          <ToolBtn label="Move up" onClick={() => move(-1)}>↑</ToolBtn>
          <ToolBtn label="Move down" onClick={() => move(1)}>↓</ToolBtn>
          {isTwoColumn(template.layout) && (
            <ToolBtn
              label={section.column === "side" ? "Move to main column" : "Move to sidebar"}
              onClick={() =>
                mutateSection(update, section.id, (s) => ({
                  ...s,
                  column: s.column === "side" ? "main" : "side",
                }))
              }
            >
              ⇄
            </ToolBtn>
          )}
          {def.kind !== "text" && def.kind !== "quote" && def.kind !== "signature" && (
            <ToolBtn label="Add item" onClick={() => setItems([...section.items, createItem(section.type)])}>
              +
            </ToolBtn>
          )}
          <ToolBtn label="Remove section" danger onClick={() => mutateSection(update, section.id, () => null)}>
            ✕
          </ToolBtn>
        </div>
      )}

      <Editable
        as="h2"
        editable={editable}
        value={section.title}
        onCommit={(title) => mutateSection(update, section.id, (s) => ({ ...s, title }))}
        placeholder={def.defaultTitle}
        className="mb-2 block text-[1.15em] font-bold"
        style={{ color: ink, fontFamily: fonts.heading, ...headingStyles[template.headingStyle] }}
      />

      <SectionBody section={section} ctx={ctx} ink={ink} muted={muted} accent={accent} dark={!!dark} setItems={setItems} />
    </section>
  );
}

function ToolBtn({
  children,
  label,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={`flex h-6 w-6 items-center justify-center rounded border text-xs shadow-sm transition ${
        danger
          ? "border-red-200 bg-white text-red-600 hover:bg-red-50"
          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 *  Section bodies by kind                                             *
 * ------------------------------------------------------------------ */

function SectionBody({
  section,
  ctx,
  ink,
  muted,
  accent,
  dark,
  setItems,
}: {
  section: ResumeSection;
  ctx: SectionCtx;
  ink: string;
  muted: string;
  accent: string;
  dark: boolean;
  setItems: (items: ResumeItem[]) => void;
}) {
  const def = SECTION_DEFS[section.type];
  const { editable, onAiRequest } = ctx;

  const setItem = (id: string, patch: Partial<ResumeItem>) =>
    setItems(section.items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const removeItem = (id: string) => setItems(section.items.filter((i) => i.id !== id));

  const aiButton = (item: ResumeItem, context: string) => {
    if (!editable || !onAiRequest) return null;
    const usesBullets = !item.description && (item.bullets?.length ?? 0) > 0;
    const text = usesBullets ? (item.bullets ?? []).join("\n") : (item.description ?? "");
    if (!text.trim()) return null;
    return (
      <button
        type="button"
        title="Enhance with AI"
        onClick={() =>
          onAiRequest({ sectionId: section.id, itemId: item.id, text, usesBullets, context })
        }
        className="absolute -left-6 top-0 hidden h-5 w-5 items-center justify-center rounded text-[11px] opacity-70 transition hover:opacity-100 group-hover/item:flex print:!hidden"
        style={{ color: accent }}
      >
        ✨
      </button>
    );
  };

  switch (def.kind) {
    case "text":
    case "quote": {
      const item = section.items[0] ?? { id: "none" };
      const isQuote = def.kind === "quote";
      return (
        <div className="group/item relative">
          {aiButton(item, `${section.title} paragraph`)}
          <Editable
            as="p"
            editable={editable}
            value={item.description ?? ""}
            onCommit={(v) =>
              section.items.length
                ? setItem(item.id, { description: v })
                : setItems([{ id: uid(), description: v }])
            }
            placeholder={isQuote ? "A quote you live by…" : "Write a short professional summary…"}
            multiline
            className={`block text-[0.95em] ${isQuote ? "italic" : ""}`}
            style={{ color: isQuote ? accent : ink, fontWeight: isQuote ? 500 : undefined }}
          />
          {isQuote && (item.subtitle || editable) && (
            <Editable
              as="p"
              editable={editable}
              value={item.subtitle ?? ""}
              onCommit={(v) => setItem(item.id, { subtitle: v })}
              placeholder="Attribution"
              className="mt-1 block text-right text-[0.85em]"
              style={{ color: muted }}
            />
          )}
        </div>
      );
    }

    case "tags": {
      const chipStyle: React.CSSProperties =
        ctx.template.chipStyle === "solid"
          ? { background: accent, color: dark ? "#111827" : "#ffffff" }
          : ctx.template.chipStyle === "soft"
            ? { background: dark ? "rgba(255,255,255,0.14)" : `${ctx.template.accent}1a`, color: ink }
            : { border: `1px solid ${dark ? "rgba(255,255,255,0.5)" : accent}`, color: ink };
      return (
        <div className="flex flex-wrap gap-1.5">
          {section.items.map((item) => (
            <span
              key={item.id}
              className="group/item relative rounded px-2 py-0.5 text-[0.85em] font-medium"
              style={chipStyle}
            >
              <Editable
                editable={editable}
                value={item.title ?? ""}
                onCommit={(v) => (v ? setItem(item.id, { title: v }) : removeItem(item.id))}
                placeholder="Skill"
              />
              {editable && (
                <button
                  type="button"
                  title="Remove"
                  onClick={() => removeItem(item.id)}
                  className="absolute -right-1.5 -top-1.5 hidden h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-700 text-[9px] text-white group-hover/item:flex print:!hidden"
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      );
    }

    case "levels":
      return (
        <div className="grid grid-cols-2 gap-x-5 gap-y-2">
          {section.items.map((item) => (
            <div key={item.id} className="group/item relative">
              {editable && <RemoveItemBtn onClick={() => removeItem(item.id)} />}
              <Editable
                editable={editable}
                value={item.title ?? ""}
                onCommit={(v) => setItem(item.id, { title: v })}
                placeholder="Language"
                className="block text-[0.95em] font-semibold"
                style={{ color: ink }}
              />
              <Editable
                editable={editable}
                value={item.levelLabel ?? ""}
                onCommit={(v) => setItem(item.id, { levelLabel: v })}
                placeholder="Proficiency"
                className="block text-[0.8em]"
                style={{ color: muted }}
              />
              <div className="mt-1 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={!editable}
                    onClick={() => setItem(item.id, { level: n })}
                    title={editable ? `Set level ${n}` : undefined}
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      background:
                        n <= (item.level ?? 0)
                          ? accent
                          : dark
                            ? "rgba(255,255,255,0.25)"
                            : "#e5e7eb",
                      cursor: editable ? "pointer" : "default",
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      );

    case "donut":
      return (
        <TimeDonut
          items={section.items}
          accent={ctx.template.accent}
          ink={ink}
          muted={muted}
          dark={dark}
          editable={editable}
          onChangeItem={setItem}
          onRemoveItem={removeItem}
        />
      );

    case "contacts":
      return (
        <div className="space-y-1.5">
          {section.items.map((item) => (
            <div key={item.id} className="group/item relative flex items-baseline gap-2">
              {editable && <RemoveItemBtn onClick={() => removeItem(item.id)} />}
              <span
                className="inline-flex h-4 w-4 shrink-0 translate-y-0.5 items-center justify-center rounded-sm text-[9px] font-bold text-white"
                style={{ background: accent, color: dark ? "#111827" : "#fff" }}
              >
                {(item.title ?? "•").charAt(0)}
              </span>
              <div className="min-w-0">
                <Editable
                  editable={editable}
                  value={item.title ?? ""}
                  onCommit={(v) => setItem(item.id, { title: v })}
                  placeholder="Network"
                  className="text-[0.95em] font-semibold"
                  style={{ color: ink }}
                />{" "}
                <Editable
                  editable={editable}
                  value={item.subtitle ?? ""}
                  onCommit={(v) => setItem(item.id, { subtitle: v })}
                  placeholder="username"
                  className="text-[0.85em]"
                  style={{ color: muted }}
                />
              </div>
            </div>
          ))}
        </div>
      );

    case "signature": {
      const item = section.items[0] ?? { id: "none" };
      return (
        <Editable
          editable={editable}
          value={item.title ?? ""}
          onCommit={(v) =>
            section.items.length ? setItem(item.id, { title: v }) : setItems([{ id: uid(), title: v }])
          }
          placeholder="Your Name"
          className="block text-[2em]"
          style={{
            color: ink,
            fontFamily: "'Snell Roundhand', 'Segoe Script', 'Brush Script MT', cursive",
          }}
        />
      );
    }

    case "entries":
    default:
      return (
        <div className="space-y-3">
          {section.items.map((item) => (
            <div key={item.id} className="group/item relative">
              {editable && <RemoveItemBtn onClick={() => removeItem(item.id)} />}
              {aiButton(item, `${section.title} entry${item.title ? ` “${item.title}”` : ""}`)}
              <EntryItem
                item={item}
                fields={def.fields}
                editable={editable}
                ink={ink}
                muted={muted}
                accent={accent}
                onPatch={(patch) => setItem(item.id, patch)}
              />
            </div>
          ))}
        </div>
      );
  }
}

function RemoveItemBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      title="Remove item"
      onClick={onClick}
      className="absolute -right-2 top-0 hidden h-5 w-5 items-center justify-center rounded border border-red-200 bg-white text-[11px] text-red-600 shadow-sm group-hover/item:flex print:!hidden"
    >
      ✕
    </button>
  );
}

/* ------------------------------------------------------------------ */

function EntryItem({
  item,
  fields,
  editable,
  ink,
  muted,
  accent,
  onPatch,
}: {
  item: ResumeItem;
  fields: SectionDefFields;
  editable: boolean;
  ink: string;
  muted: string;
  accent: string;
  onPatch: (patch: Partial<ResumeItem>) => void;
}) {
  const has = (f: string) => fields.includes(f as never);
  const bullets = item.bullets ?? [];

  const setBullet = (idx: number, value: string) => {
    const next = bullets.slice();
    if (value.trim() === "") next.splice(idx, 1);
    else next[idx] = value;
    onPatch({ bullets: next });
  };

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        {has("title") && (
          <Editable
            editable={editable}
            value={item.title ?? ""}
            onCommit={(v) => onPatch({ title: v })}
            placeholder="Title"
            className="text-[1em] font-bold"
            style={{ color: ink }}
          />
        )}
        {has("date") && (editable || item.date) && (
          <Editable
            editable={editable}
            value={item.date ?? ""}
            onCommit={(v) => onPatch({ date: v })}
            placeholder="MM/YYYY - MM/YYYY"
            className="text-[0.8em]"
            style={{ color: muted }}
          />
        )}
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        {has("subtitle") && (editable || item.subtitle) && (
          <Editable
            editable={editable}
            value={item.subtitle ?? ""}
            onCommit={(v) => onPatch({ subtitle: v })}
            placeholder="Organization"
            className="text-[0.92em] font-medium"
            style={{ color: accent }}
          />
        )}
        {has("location") && (editable || item.location) && (
          <Editable
            editable={editable}
            value={item.location ?? ""}
            onCommit={(v) => onPatch({ location: v })}
            placeholder="Location"
            className="text-[0.8em]"
            style={{ color: muted }}
          />
        )}
      </div>
      {has("link") && (editable || item.link) && (
        <Editable
          editable={editable}
          value={item.link ?? ""}
          onCommit={(v) => onPatch({ link: v })}
          placeholder="Link"
          className="block text-[0.82em] underline"
          style={{ color: accent }}
        />
      )}
      {has("description") && (editable || item.description) && (
        <Editable
          as="p"
          editable={editable}
          value={item.description ?? ""}
          onCommit={(v) => onPatch({ description: v })}
          placeholder="Description"
          multiline
          className="mt-0.5 block text-[0.92em]"
          style={{ color: ink }}
        />
      )}
      {has("bullets") && (bullets.length > 0 || editable) && (
        <ul className="mt-1 space-y-0.5 pl-4">
          {bullets.map((b, i) => (
            <li key={`${item.id}-${i}-${b}`} className="list-disc text-[0.92em]" style={{ color: ink }}>
              <Editable editable={editable} value={b} onCommit={(v) => setBullet(i, v)} placeholder="Bullet" multiline />
            </li>
          ))}
          {editable && (
            <li className="list-none print:hidden">
              <button
                type="button"
                onClick={() => onPatch({ bullets: [...bullets, "New achievement"] })}
                className="text-[0.8em] opacity-60 transition hover:opacity-100"
                style={{ color: accent }}
              >
                + Add bullet
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

type SectionDefFields = (typeof SECTION_DEFS)[keyof typeof SECTION_DEFS]["fields"];

/* ------------------------------------------------------------------ *
 *  My-time donut                                                      *
 * ------------------------------------------------------------------ *
 * Colors come from the validated one-hue ramp (see donutShades). That
 * ramp's CVD separation sits in the floor band, which is only legal with
 * secondary encoding — hence the mandatory per-slice letter badges, the
 * letter-keyed legend, and 2px paper gaps between slices.               */

function TimeDonut({
  items,
  accent,
  ink,
  muted,
  dark,
  editable,
  onChangeItem,
  onRemoveItem,
}: {
  items: ResumeItem[];
  accent: string;
  ink: string;
  muted: string;
  dark: boolean;
  editable: boolean;
  onChangeItem: (id: string, patch: Partial<ResumeItem>) => void;
  onRemoveItem: (id: string) => void;
}) {
  const shades = donutShades(accent);
  const letters = "ABCDEFGHIJ";
  const slices = items.slice(0, 6).filter((i) => (i.value ?? 0) > 0);
  const total = slices.reduce((s, i) => s + (i.value ?? 0), 0) || 1;

  const R = 42;
  const CX = 60;
  const CY = 60;
  const HOLE = 22;

  const fracs = slices.map((i) => (i.value ?? 0) / total);
  const starts = fracs.map(
    (_, idx) => -Math.PI / 2 + fracs.slice(0, idx).reduce((s, f) => s + f, 0) * Math.PI * 2,
  );
  const paths = slices.map((_, idx) => {
    const a0 = starts[idx];
    const a1 = a0 + fracs[idx] * Math.PI * 2;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p = (a: number, r: number) => `${CX + r * Math.cos(a)},${CY + r * Math.sin(a)}`;
    const d = `M ${p(a0, HOLE)} L ${p(a0, R)} A ${R} ${R} 0 ${large} 1 ${p(a1, R)} L ${p(a1, HOLE)} A ${HOLE} ${HOLE} 0 ${large} 0 ${p(a0, HOLE)} Z`;
    const mid = (a0 + a1) / 2;
    return { d, fill: shades[idx % shades.length], mid, letter: letters[idx] };
  });

  const badgeInk = dark ? "#0b1220" : "#ffffff";

  return (
    <div className="flex items-center gap-4">
      <svg width={120} height={120} viewBox="0 0 120 120" role="img" aria-label="Time allocation chart">
        {paths.map((s) => (
          <Fragment key={s.letter}>
            {/* 2px paper gap between fills */}
            <path d={s.d} fill={s.fill} stroke={dark ? "#0f1f42" : "#ffffff"} strokeWidth={2} />
          </Fragment>
        ))}
        {paths.map((s) => {
          const bx = CX + (R + 9) * Math.cos(s.mid);
          const by = CY + (R + 9) * Math.sin(s.mid);
          return (
            <Fragment key={`b-${s.letter}`}>
              <circle cx={bx} cy={by} r={7} fill={dark ? "#ffffff" : "#1f2937"} />
              <text
                x={bx}
                y={by + 3}
                textAnchor="middle"
                fontSize={8.5}
                fontWeight={700}
                fill={dark ? "#111827" : badgeInk}
              >
                {s.letter}
              </text>
            </Fragment>
          );
        })}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1">
        {slices.map((item, idx) => (
          <li key={item.id} className="group/item relative flex items-start gap-1.5 text-[0.82em]">
            {editable && <RemoveItemBtn onClick={() => onRemoveItem(item.id)} />}
            <span
              className="mt-px inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold"
              style={{ background: dark ? "#ffffff" : "#1f2937", color: dark ? "#111827" : "#ffffff" }}
            >
              {letters[idx]}
            </span>
            <Editable
              editable={editable}
              value={item.title ?? ""}
              onCommit={(v) => onChangeItem(item.id, { title: v })}
              placeholder="Activity"
              className="min-w-0"
              style={{ color: ink }}
            />
            {editable && (
              <input
                type="number"
                min={1}
                max={99}
                value={item.value ?? 10}
                onChange={(e) => onChangeItem(item.id, { value: Math.max(1, Number(e.target.value) || 1) })}
                title="Relative share"
                className="ml-auto w-11 shrink-0 rounded border border-gray-300 bg-white px-1 text-right text-[10px] text-gray-700 print:hidden"
              />
            )}
          </li>
        ))}
        {slices.length === 0 && <li className="text-[0.82em]" style={{ color: muted }}>Add activities with the + button.</li>}
      </ul>
    </div>
  );
}
