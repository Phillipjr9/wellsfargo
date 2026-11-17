import type { PageSpec } from "@/components/page-template";
import { divisionPages } from "@/lib/pages-divisions";
import { personalPages } from "@/lib/pages-personal";
import { supportPages } from "@/lib/pages-support";
import type { Metadata } from "next";

export const allCatalogPages: PageSpec[] = [...personalPages, ...divisionPages, ...supportPages];
const pageBySlug = new Map<string, PageSpec>(allCatalogPages.map((p) => [p.slug, p]));

export function getCatalogPage(segments: string[]): PageSpec | undefined {
  return pageBySlug.get(segments.join("/").toLowerCase());
}

export function buildCatalogMetadata(segments: string[]): Metadata {
  const page = getCatalogPage(segments);
  if (!page) return { title: "Page Not Found | Wells Fargo" };
  return {
    title: `${page.title} | Wells Fargo`,
    description: page.subtitle,
  };
}
