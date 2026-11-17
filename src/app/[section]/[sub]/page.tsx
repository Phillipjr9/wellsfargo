import { PageTemplate } from "@/components/page-template";
import { buildCatalogMetadata, getCatalogPage } from "@/lib/catalog-lookup";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string; sub: string }>;
}): Promise<Metadata> {
  const { section, sub } = await params;
  return buildCatalogMetadata([section, sub]);
}

export default async function SubSectionPage({
  params,
}: {
  params: Promise<{ section: string; sub: string }>;
}) {
  const { section, sub } = await params;
  const page = getCatalogPage([section, sub]);
  if (!page) notFound();
  return <PageTemplate page={page} />;
}
