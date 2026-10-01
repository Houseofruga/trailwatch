// Guide bylines (SEO_PLAN.md). The photo is the one in the homepage's founder section.
export const AUTHORS = {
  chandan: {
    name: "Chandan Dongre",
    role: "Founder of TrailWatch",
    photo: "/chandanoriginal.webp",
  },
} as const;

export type AuthorId = keyof typeof AUTHORS;
