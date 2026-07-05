/**
 * Resume-builder document model.
 *
 * The whole resume is one JSON document (basics + ordered sections + settings)
 * stored verbatim by the backend. Section *types* are described declaratively
 * in SECTION_DEFS: what fields an item carries, how it renders, and the sample
 * content shown in the "Add a section" gallery and inserted on add.
 */

export type SectionType =
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "languages"
  | "courses"
  | "projects"
  | "volunteering"
  | "expertise"
  | "interests"
  | "mytime"
  | "social"
  | "certifications"
  | "awards"
  | "references"
  | "philosophy"
  | "publications"
  | "books"
  | "additional-experience"
  | "signature"
  | "custom";

/** How a section's items are drawn (shared by all templates). */
export type SectionKind =
  | "text" // one description paragraph (summary)
  | "entries" // title/subtitle/date/location/description/bullets
  | "tags" // chips (skills, expertise)
  | "levels" // name + proficiency label + dots (languages)
  | "donut" // time-allocation donut with letter badges (my time)
  | "contacts" // network + username (find me online)
  | "quote" // philosophy quote + attribution
  | "signature"; // cursive sign-off

export type ResumeItem = {
  id: string;
  title?: string;
  subtitle?: string;
  date?: string;
  location?: string;
  link?: string;
  description?: string;
  bullets?: string[];
  /** 1–5 proficiency (levels kind) */
  level?: number;
  /** e.g. "Proficient" (levels kind) */
  levelLabel?: string;
  /** relative share (donut kind) */
  value?: number;
};

export type ResumeSection = {
  id: string;
  type: SectionType;
  title: string;
  /** Which column two-column templates place this section in. */
  column: "main" | "side";
  items: ResumeItem[];
};

export type ResumeBasics = {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  website: string;
};

export type ResumeDocument = {
  basics: ResumeBasics;
  sections: ResumeSection[];
  settings: { fontScale: number };
};

/* ------------------------------------------------------------------ */

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);

type FieldKey = "title" | "subtitle" | "date" | "location" | "link" | "description" | "bullets";

export type SectionDef = {
  type: SectionType;
  /** Gallery card label */
  label: string;
  defaultTitle: string;
  kind: SectionKind;
  /** custom sections may be added any number of times */
  repeatable?: boolean;
  defaultColumn: "main" | "side";
  /** Which item fields the entries editor exposes */
  fields: FieldKey[];
  /** Sample items — shown in the gallery preview and inserted on add */
  sample: Omit<ResumeItem, "id">[];
};

const entriesFields: FieldKey[] = ["title", "subtitle", "date", "location", "description", "bullets"];

export const SECTION_DEFS: Record<SectionType, SectionDef> = {
  summary: {
    type: "summary",
    label: "Summary",
    defaultTitle: "Summary",
    kind: "text",
    defaultColumn: "main",
    fields: ["description"],
    sample: [
      {
        description:
          "Passionate professional with 5+ years of experience turning ideas into shipped products. Known for pairing data-driven decisions with hands-on execution.",
      },
    ],
  },
  experience: {
    type: "experience",
    label: "Experience",
    defaultTitle: "Experience",
    kind: "entries",
    defaultColumn: "main",
    fields: entriesFields,
    sample: [
      {
        title: "Senior Product Manager",
        subtitle: "Acme Corp",
        date: "01/2021 - Present",
        location: "Bengaluru, India",
        bullets: [
          "Led a cross-functional team of 8 to launch 3 major product lines",
          "Increased quarterly revenue 32% by repositioning the pricing tiers",
          "Reduced churn 18% through a redesigned onboarding flow",
        ],
      },
    ],
  },
  education: {
    type: "education",
    label: "Education",
    defaultTitle: "Education",
    kind: "entries",
    defaultColumn: "main",
    fields: ["title", "subtitle", "date", "location", "description"],
    sample: [
      {
        title: "B.Tech, Computer Science",
        subtitle: "Indian Institute of Technology",
        date: "2014 - 2018",
        location: "Delhi, India",
      },
    ],
  },
  skills: {
    type: "skills",
    label: "Skills",
    defaultTitle: "Skills",
    kind: "tags",
    defaultColumn: "side",
    fields: ["title"],
    sample: [
      { title: "ReactJS" },
      { title: "TypeScript" },
      { title: "Node.js" },
      { title: "MongoDB" },
      { title: "Redis" },
      { title: "Webpack" },
    ],
  },
  languages: {
    type: "languages",
    label: "Languages",
    defaultTitle: "Languages",
    kind: "levels",
    defaultColumn: "side",
    fields: ["title"],
    sample: [
      { title: "English", levelLabel: "Proficient", level: 4 },
      { title: "Spanish", levelLabel: "Advanced", level: 3 },
    ],
  },
  courses: {
    type: "courses",
    label: "Training / Courses",
    defaultTitle: "Training / Courses",
    kind: "entries",
    defaultColumn: "main",
    fields: ["title", "description"],
    sample: [
      {
        title: "Creative Writing",
        description: "An intensive 4 week course for developing creative writing skills",
      },
      {
        title: "Introduction to Photoshop",
        description: "Basics of web design using the Adobe Photoshop application",
      },
    ],
  },
  projects: {
    type: "projects",
    label: "Projects",
    defaultTitle: "Projects",
    kind: "entries",
    defaultColumn: "main",
    fields: entriesFields,
    sample: [
      {
        title: "Tesla Model S for Kids",
        date: "11/2015 - 04/2016",
        bullets: [
          "Collaboration between Radio Flyer and Tesla to design & create a kid-friendly Model S car",
          "Shot the demo video and photography for the website",
          "Designed the packaging",
        ],
      },
    ],
  },
  volunteering: {
    type: "volunteering",
    label: "Volunteering",
    defaultTitle: "Volunteering",
    kind: "entries",
    defaultColumn: "main",
    fields: entriesFields,
    sample: [
      {
        title: "Executive Member",
        subtitle: "AIESEC",
        date: "09/2014 - Present",
        description:
          "AIESEC is an international non-governmental organisation that provides young people with leadership development and cross-cultural internships, with a focus to empower them to make a positive impact on society.",
      },
    ],
  },
  expertise: {
    type: "expertise",
    label: "Industry Expertise",
    defaultTitle: "Industry Expertise",
    kind: "tags",
    defaultColumn: "side",
    fields: ["title"],
    sample: [{ title: "Leadership" }, { title: "Management" }],
  },
  interests: {
    type: "interests",
    label: "Interests",
    defaultTitle: "Interests",
    kind: "entries",
    defaultColumn: "side",
    fields: ["title", "description"],
    sample: [
      {
        title: "TEDxBoston",
        description:
          "Recruited all speakers in last 3 years, scaled the team from 5 to 12 people, attracted 70% of sponsors",
      },
      {
        title: "My espresso",
        description: "Got certified after Blue Bottle's barista 3-month training",
      },
    ],
  },
  mytime: {
    type: "mytime",
    label: "My Time",
    defaultTitle: "My Time",
    kind: "donut",
    defaultColumn: "side",
    fields: ["title"],
    sample: [
      { title: "Designing", value: 30 },
      { title: "Drawing", value: 10 },
      { title: "Brainstorming brand identities", value: 25 },
      { title: "Lunch & beer mode", value: 10 },
      { title: "Discussing ideas", value: 15 },
      { title: "Relaxing", value: 10 },
    ],
  },
  social: {
    type: "social",
    label: "Find Me Online",
    defaultTitle: "Find Me Online",
    kind: "contacts",
    defaultColumn: "side",
    fields: ["title", "subtitle", "link"],
    sample: [
      { title: "LinkedIn", subtitle: "username", link: "https://linkedin.com/in/username" },
      { title: "GitHub", subtitle: "username", link: "https://github.com/username" },
    ],
  },
  certifications: {
    type: "certifications",
    label: "Certifications",
    defaultTitle: "Certifications",
    kind: "entries",
    defaultColumn: "side",
    fields: ["title", "subtitle"],
    sample: [
      { title: "Google Analytics Individual Qualification", subtitle: "Google" },
      { title: "Contextual Marketing", subtitle: "Hubspot Academy" },
    ],
  },
  awards: {
    type: "awards",
    label: "Awards",
    defaultTitle: "Awards",
    kind: "entries",
    defaultColumn: "side",
    fields: ["title", "subtitle"],
    sample: [
      { title: "Dean's List", subtitle: "Cornell School of Engineering" },
      { title: "Valedictorian", subtitle: "South Boston High School" },
    ],
  },
  references: {
    type: "references",
    label: "References",
    defaultTitle: "References",
    kind: "entries",
    defaultColumn: "main",
    fields: ["title", "subtitle", "description"],
    sample: [
      { title: "Thomas Brown", description: "thomas.brown@gmail.com\n1-503-254-1000" },
      { title: "John Silver", description: "jj.silva@horowitzandpartners.com" },
    ],
  },
  philosophy: {
    type: "philosophy",
    label: "My Life Philosophy",
    defaultTitle: "My Life Philosophy",
    kind: "quote",
    defaultColumn: "main",
    fields: ["description", "subtitle"],
    sample: [
      {
        description:
          "First they ignore you, then they laugh at you, then they fight you, then you win.",
        subtitle: "Mahatma Gandhi",
      },
    ],
  },
  publications: {
    type: "publications",
    label: "Publications",
    defaultTitle: "Publications",
    kind: "entries",
    defaultColumn: "main",
    fields: ["title", "subtitle", "date", "link", "description"],
    sample: [
      {
        title: "Dublin 101",
        subtitle: "Dublin Globe",
        link: "www.dublinglobe.com/101",
        description: "An intro to the startup ecosystem of Dublin",
      },
    ],
  },
  books: {
    type: "books",
    label: "Books",
    defaultTitle: "Books",
    kind: "entries",
    defaultColumn: "side",
    fields: ["title", "subtitle"],
    sample: [
      { title: "The Element", subtitle: "Ken Robinson" },
      { title: "Let My People Go Surfing", subtitle: "Yvon Chouinard" },
    ],
  },
  "additional-experience": {
    type: "additional-experience",
    label: "Additional Experience",
    defaultTitle: "Additional Experience",
    kind: "entries",
    defaultColumn: "main",
    fields: entriesFields,
    sample: [
      {
        title: "Deputy Finance Director",
        subtitle: "City of New York",
        date: "2013 - 2014",
        location: "New York, NY",
        bullets: [
          "Oversaw financial analysis of 70 buildings under the mayor's economic plan",
          "Anchored 6-person team with origination of $3 billion in municipal bonds",
          "Co-created advisory committee that cut federal review time by 75%",
        ],
      },
    ],
  },
  signature: {
    type: "signature",
    label: "Signature",
    defaultTitle: "Signature",
    kind: "signature",
    defaultColumn: "main",
    fields: ["title"],
    sample: [{ title: "Your Name" }],
  },
  custom: {
    type: "custom",
    label: "Custom",
    defaultTitle: "Custom Title",
    kind: "entries",
    repeatable: true,
    defaultColumn: "main",
    fields: entriesFields,
    sample: [
      {
        title: "Inspired & Challenged",
        date: "10/2014 - 06/2015",
        description:
          "Inspired more than 1 million children to love science, nature, and engineering through #ScienceForAll",
      },
    ],
  },
};

/** Gallery order — mirrors the reference "Add a new section" modal. */
export const SECTION_GALLERY_ORDER: SectionType[] = [
  "custom",
  "languages",
  "courses",
  "projects",
  "volunteering",
  "expertise",
  "interests",
  "mytime",
  "social",
  "certifications",
  "awards",
  "references",
  "philosophy",
  "publications",
  "books",
  "additional-experience",
  "skills",
  "summary",
  "education",
  "signature",
];

export function createSection(type: SectionType): ResumeSection {
  const def = SECTION_DEFS[type];
  return {
    id: uid(),
    type,
    title: def.defaultTitle,
    column: def.defaultColumn,
    items: def.sample.map((item) => ({ ...item, id: uid(), bullets: item.bullets?.slice() })),
  };
}

export function createItem(type: SectionType): ResumeItem {
  const def = SECTION_DEFS[type];
  const empty: ResumeItem = { id: uid() };
  switch (def.kind) {
    case "tags":
      return { ...empty, title: "New skill" };
    case "levels":
      return { ...empty, title: "Language", levelLabel: "Intermediate", level: 3 };
    case "donut":
      return { ...empty, title: "New activity", value: 10 };
    case "contacts":
      return { ...empty, title: "Network", subtitle: "username" };
    default:
      return {
        ...empty,
        title: def.fields.includes("title") ? "Title" : undefined,
        description: def.fields.includes("description") && !def.fields.includes("bullets") ? "Description" : undefined,
        bullets: def.fields.includes("bullets") ? ["Achievement or responsibility"] : undefined,
      };
  }
}

export function starterResume(): ResumeDocument {
  return {
    basics: {
      fullName: "Your Name",
      headline: "Your Professional Title",
      email: "you@example.com",
      phone: "+91 98765 43210",
      location: "City, Country",
      website: "",
    },
    sections: [
      createSection("summary"),
      createSection("experience"),
      createSection("education"),
      createSection("skills"),
      createSection("languages"),
    ],
    settings: { fontScale: 1 },
  };
}

/* ------------------------------------------------------------------ *
 *  Validated donut ramp                                               *
 * ------------------------------------------------------------------ *
 * Six one-hue steps derived from a template's accent. The exact mix
 * ratios were run through the dataviz palette validator (lightness band
 * + chroma floor PASS on a white page). Single-hue adjacency sits in the
 * CVD floor band, which is only legal with secondary encoding — so the
 * donut renderer ALWAYS pairs these fills with per-slice letter badges,
 * a letter-keyed legend, and 2px white gaps. Don't reuse the ramp for a
 * chart without those.                                                 */

function mixHex(hex: string, target: [number, number, number], t: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (
    "#" +
    c
      .map((v, i) =>
        Math.round(v + (target[i] - v) * t)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

export function donutShades(accent: string): string[] {
  const B: [number, number, number] = [0, 0, 0];
  const W: [number, number, number] = [255, 255, 255];
  return [
    mixHex(accent, B, 0.26),
    mixHex(accent, B, 0.13),
    accent,
    mixHex(accent, W, 0.18),
    mixHex(accent, W, 0.32),
    mixHex(accent, W, 0.44),
  ];
}
