import { PageTemplate } from "@/components/page-template";
import { buildCatalogMetadata, getCatalogPage } from "@/lib/catalog-lookup";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string; sub: string; leaf: string }>;
}): Promise<Metadata> {
  const { section, sub, leaf } = await params;
  return buildCatalogMetadata([section, sub, leaf]);
}

export default async function LeafSectionPage({
  params,
}: {
  params: Promise<{ section: string; sub: string; leaf: string }>;
}) {
  const { section, sub, leaf } = await params;
  const page = getCatalogPage([section, sub, leaf]);
  if (!page) notFound();
  return <PageTemplate page={page} />;
}
