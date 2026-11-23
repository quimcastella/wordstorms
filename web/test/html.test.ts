import { describe, expect, it } from 'vitest';
import type { PlacedWord } from '../src/core/storm.ts';
import { stormToHtml } from '../src/render/html.ts';

const word = (text: string): PlacedWord => ({
  text,
  x: 10,
  y: 10,
  width: 40,
  height: 20,
  originX: 0,
  originY: 20,
  fontSize: 20,
  angle: 0,
  color: '#123456',
  opacity: 1,
  light: false,
  weight: 1,
  cloudCount: 2,
});

const storm = {
  width: 200,
  height: 100,
  background: '#fafafa',
  clouds: [
    { name: 'Tom & Jerry', skipped: [], words: [word('cat'), word('mouse')] },
    { name: 'Second', skipped: [], words: [word('cat')] },
  ],
};

describe('stormToHtml', () => {
  const html = stormToHtml(storm, { css: '@font-face{font-family:"X"}' });

  it('has one card per cloud, with its name escaped', () => {
    expect(html.match(/<figure>/g)).toHaveLength(2);
    expect(html).toContain('<figcaption>Tom &amp; Jerry</figcaption>');
  });

  it('inlines the clouds as SVG, tagged for highlighting', () => {
    expect(html.match(/<svg /g)).toHaveLength(2);
    expect(html.match(/data-word="cat"/g)).toHaveLength(2);
    expect(html).toContain('background:#fafafa');
  });

  it('includes the given CSS and a default title', () => {
    expect(html).toContain('@font-face{font-family:"X"}');
    expect(html).toContain('<title>Word storm of 2 documents</title>');
  });

  it('uses a given title', () => {
    expect(stormToHtml(storm, { title: 'Holmes <novels>' })).toContain('<h1>Holmes &lt;novels&gt;</h1>');
  });
});
