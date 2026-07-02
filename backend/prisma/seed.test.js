import { describe, expect, it } from 'vitest';
import { excelDateToJS } from './seed.js';

describe('excelDateToJS', () => {
  it('converts an Excel serial date to the equivalent UTC date', () => {
    expect(excelDateToJS(45797).toISOString()).toBe('2025-05-20T00:00:00.000Z');
  });

  it('treats serial 25569 as the Unix epoch (1970-01-01)', () => {
    expect(excelDateToJS(25569).toISOString()).toBe('1970-01-01T00:00:00.000Z');
  });

  it('returns null for falsy input', () => {
    expect(excelDateToJS(null)).toBeNull();
    expect(excelDateToJS(0)).toBeNull();
    expect(excelDateToJS(undefined)).toBeNull();
  });

  it('returns null for non-numeric input', () => {
    expect(excelDateToJS('45797')).toBeNull();
  });
});
