import { createClient } from "@/lib/supabase/server";

export type PageRow = {
  id: string;
  url: string;
  label: string;
  isActive: boolean;
  lastCheckedAt: string | null;
};

export type CompetitorRow = {
  id: string;
  name: string;
  createdAt: string;
  pages: PageRow[];
};

// Shared by the manage screen and the dashboard — both need "my competitors,
// each with their pages, newest competitor first."
export async function getCompetitorsWithPages(): Promise<CompetitorRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("competitors")
    .select(
      "id, name, created_at, pages ( id, url, label, is_active, last_checked_at, created_at )",
    )
    .order("created_at", { ascending: false })
    .order("created_at", { ascending: true, referencedTable: "pages" });

  if (error) throw error;

  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    createdAt: c.created_at,
    pages: (c.pages ?? []).map((p) => ({
      id: p.id,
      url: p.url,
      label: p.label,
      isActive: p.is_active,
      lastCheckedAt: p.last_checked_at,
    })),
  }));
}
