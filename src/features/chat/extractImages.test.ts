/**
 * Tests for extractImages — image extraction from markdown text.
 */
import { describe, it, expect } from 'vitest';
import { extractImages } from './extractImages';

describe('extractImages', () => {
  describe('markdown images', () => {
    it('extracts ![alt](url) pattern', () => {
      const { cleaned, images } = extractImages('Look: ![photo](https://example.com/img.png)');
      expect(images).toHaveLength(1);
      expect(images[0].url).toBe('https://example.com/img.png');
      expect(images[0].alt).toBe('photo');
      expect(images[0].isLocal).toBe(false);
      expect(cleaned).not.toContain('![');
    });

    it('extracts multiple images', () => {
      const text = '![a](https://x.com/a.jpg) text ![b](https://x.com/b.png)';
      const { images } = extractImages(text);
      expect(images).toHaveLength(2);
    });

    it('deduplicates same URL', () => {
      const text = '![a](https://x.com/img.png) ![b](https://x.com/img.png)';
      const { images } = extractImages(text);
      expect(images).toHaveLength(1);
    });

    it('does not extract non-image markdown links', () => {
      const text = '![doc](https://example.com/file.pdf)';
      const { images, cleaned } = extractImages(text);
      expect(images).toHaveLength(0);
      expect(cleaned).toContain('![doc]'); // preserved
    });

    it('handles empty alt text', () => {
      const { images } = extractImages('![](https://x.com/img.webp)');
      expect(images).toHaveLength(1);
      expect(images[0].alt).toBeUndefined();
    });

    it('handles various image extensions', () => {
      for (const ext of ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif']) {
        const { images } = extractImages(`![](https://x.com/img.${ext})`);
        expect(images).toHaveLength(1);
      }
    });

    it('handles URLs with query params', () => {
      const { images } = extractImages('![](https://x.com/img.png?w=200&h=100)');
      expect(images).toHaveLength(1);
    });
  });

  describe('MEDIA: markers', () => {
    it('extracts MEDIA: /path/to/image', () => {
      const { images, cleaned } = extractImages('MEDIA: /home/user/photo.jpg');
      expect(images).toHaveLength(1);
      expect(images[0].isLocal).toBe(true);
      expect(images[0].url).toContain('/api/files');
      expect(images[0].url).toContain(encodeURIComponent('/home/user/photo.jpg'));
      expect(cleaned).not.toContain('MEDIA:');
    });

    it('extracts MEDIA: with URL', () => {
      const { images } = extractImages('MEDIA: https://cdn.example.com/photo.png');
      expect(images).toHaveLength(1);
      expect(images[0].url).toBe('https://cdn.example.com/photo.png');
      expect(images[0].isLocal).toBe(false);
    });

    it('skips non-image MEDIA markers', () => {
      const { images } = extractImages('MEDIA: /path/to/file.txt');
      expect(images).toHaveLength(0);
    });
  });

  describe('bare URLs', () => {
    it('extracts bare image URLs on their own line', () => {
      const text = 'Check this:\nhttps://example.com/photo.jpg\nCool right?';
      const { images, cleaned } = extractImages(text);
      expect(images).toHaveLength(1);
      expect(images[0].url).toBe('https://example.com/photo.jpg');
      expect(cleaned).not.toContain('https://example.com/photo.jpg');
    });

    it('does not extract inline bare URLs', () => {
      // Bare URL regex matches full lines, inline URLs in text may or may not match
      const text = 'See https://example.com/photo.jpg for details';
      const { images } = extractImages(text);
      // Inline URL should NOT be extracted (regex matches ^...$)
      expect(images).toHaveLength(0);
    });
  });

  describe('local paths', () => {
    it('converts local paths to /api/files URLs', () => {
      const { images } = extractImages('![img](/home/user/pic.png)');
      expect(images[0].isLocal).toBe(true);
      expect(images[0].url).toContain('/api/files');
    });

    it('handles relative paths starting with ./', () => {
      const { images } = extractImages('MEDIA: ./output/image.png');
      expect(images[0].isLocal).toBe(true);
    });

    it('handles ~ paths', () => {
      const { images } = extractImages('MEDIA: ~/photos/pic.jpg');
      expect(images[0].isLocal).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('returns empty array for no images', () => {
      const { images, cleaned } = extractImages('Just plain text here');
      expect(images).toHaveLength(0);
      expect(cleaned).toBe('Just plain text here');
    });

    it('handles empty string', () => {
      const { images, cleaned } = extractImages('');
      expect(images).toHaveLength(0);
      expect(cleaned).toBe('');
    });

    it('collapses excessive blank lines after stripping', () => {
      const text = 'Before\n\n\n![](https://x.com/a.png)\n\n\n\nAfter';
      const { cleaned } = extractImages(text);
      expect(cleaned).not.toMatch(/\n{3,}/);
    });
  });
});
