import { PageTemplate } from "@/components/page-template";
import { buildCatalogMetadata, getCatalogPage } from "@/lib/catalog-lookup";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const { section } = await params;
  return buildCatalogMetadata([section]);
}

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const page = getCatalogPage([section]);
  if (!page) notFound();
  return <PageTemplate page={page} />;
}
