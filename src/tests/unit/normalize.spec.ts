import { test, expect } from '@playwright/test';
import { normalize } from '../../utils/normalize';

test.describe('normalize', () => {
  test('collapses internal whitespace and trims edges', () => {
    expect(normalize('  Hello   Virtru \n Team  ')).toBe('Hello Virtru Team');
  });

  test('handles tabs and multiple new lines', () => {
    expect(normalize('\tLine1\n\nLine2\t\tLine3  ')).toBe('Line1 Line2 Line3');
  });
});

