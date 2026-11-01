import { setRequestLocale } from "next-intl/server";
import { ProjectsDashboard } from "@/components/projects-dashboard";

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ProjectsDashboard />;
}

