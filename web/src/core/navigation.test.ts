import { describe, it, expect, beforeEach } from 'vitest';
import { activityHref, activityPath, goToActivity } from './navigation';

describe('navigation', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('tạo đường dẫn và href tới chi tiết hoạt động', () => {
    expect(activityPath(5)).toBe('/activity/5');
    expect(activityHref('12')).toBe('#/activity/12');
  });

  it('goToActivity đặt hash để HashRouter chuyển trang', () => {
    goToActivity(7);
    expect(window.location.hash).toBe('#/activity/7');
  });
});
