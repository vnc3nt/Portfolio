export type PortfolioLanguage = 'de' | 'en';

export interface LocalizedProjectContent {
  title?: string | null;
  title_en?: string | null;
  description?: string | null;
  description_en?: string | null;
  date?: string | null;
  technologies?: string[] | null;
  platforms?: Record<string, string> | null;
  images?: string[] | null;
  githubUrl?: string | null;
  collaborators?: unknown[] | null;
}

export function hasProjectContentChanges(
  current: LocalizedProjectContent,
  original: LocalizedProjectContent,
): boolean {
  return JSON.stringify({
    title: current.title,
    title_en: current.title_en,
    description: current.description,
    description_en: current.description_en,
    date: current.date,
    technologies: current.technologies,
    platforms: current.platforms,
    images: current.images,
    githubUrl: current.githubUrl,
    collaborators: current.collaborators,
  }) !== JSON.stringify({
    title: original.title,
    title_en: original.title_en,
    description: original.description,
    description_en: original.description_en,
    date: original.date,
    technologies: original.technologies,
    platforms: original.platforms,
    images: original.images,
    githubUrl: original.githubUrl,
    collaborators: original.collaborators,
  });
}

export function localizedText(
  language: PortfolioLanguage,
  defaultText: string,
  translatedText?: string | null,
): string {
  return language === 'en' && translatedText?.trim() ? translatedText : defaultText;
}
