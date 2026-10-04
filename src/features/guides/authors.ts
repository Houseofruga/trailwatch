// Guide bylines (SEO_PLAN.md). The photo is the one in the homepage's founder section.
export const AUTHORS = {
  chandan: {
    name: "Chandan Dongre",
    role: "Founder of Trailwatch",
    photo: "/chandanoriginal.webp",
    // Shown on the author card under each guide. One line for now; the owner
    // can add a second line about his background.
    bio: ["Founder of Trailwatch. He writes these guides from what he sees watching Shopify stores every day."],
  },
} as const;

export type AuthorId = keyof typeof AUTHORS;
