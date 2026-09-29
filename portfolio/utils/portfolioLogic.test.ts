import assert from 'node:assert/strict';
import test from 'node:test';
import { hasProjectContentChanges, localizedText } from './portfolioLogic.ts';

const baseProject = {
  title: 'Arbeitszeiten',
  title_en: 'Work Hours',
  description: 'Eine WebApp.',
  description_en: 'A web app.',
  date: '2026',
  technologies: ['TypeScript'],
  platforms: { web: 'https://example.com' },
  images: ['image.jpg'],
  githubUrl: 'https://github.com/example',
  collaborators: [{ login: 'vnc3nt' }],
};

test('ignores layout and visibility metadata when detecting content changes', () => {
  assert.equal(
    hasProjectContentChanges(baseProject, baseProject),
    false,
  );
});

test('detects changes to translated content', () => {
  assert.equal(
    hasProjectContentChanges(
      { ...baseProject, description_en: 'An updated web app.' },
      baseProject,
    ),
    true,
  );
});

test('falls back to German text when English text is empty', () => {
  assert.equal(localizedText('en', 'Beschreibung', ''), 'Beschreibung');
  assert.equal(localizedText('en', 'Description', 'A description'), 'A description');
  assert.equal(localizedText('de', 'Beschreibung', 'Description'), 'Beschreibung');
});
