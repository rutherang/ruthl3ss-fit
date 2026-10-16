import { fmtPace, fmtTime } from '../format';

describe('format helpers', () => {
  it('formats elapsed time as minutes and zero-padded seconds', () => {
    expect(fmtTime(65)).toBe('1:05');
  });

  it('formats pace and represents an unavailable pace', () => {
    expect(fmtPace(5.5)).toBe('5:30/km');
    expect(fmtPace(null)).toBe('--');
  });
});
