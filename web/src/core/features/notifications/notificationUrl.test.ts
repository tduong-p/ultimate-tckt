import { describe, it, expect } from 'vitest';
import { notificationRoute } from './notificationUrl';

describe('notificationRoute', () => {
  it('đổi hash cũ của Core thành đường dẫn router', () => {
    expect(notificationRoute('/#activity/12')).toBe('/activity/12');
    expect(notificationRoute('#activity/12')).toBe('/activity/12');
    expect(notificationRoute('#/activity/12')).toBe('/activity/12');
    expect(notificationRoute('/#ops-log/3')).toBe('/ops-log/3');
    expect(notificationRoute('/#my-tasks-today')).toBe('/my-tasks-today');
  });

  it('chấp nhận URL tuyệt đối, chỉ lấy phần hash', () => {
    expect(notificationRoute('https://hub.example.edu.vn/#directive/5')).toBe('/directive/5');
  });

  it('không có hash hoặc rỗng thì về Tổng quan', () => {
    expect(notificationRoute('')).toBe('/dashboard');
    expect(notificationRoute(null)).toBe('/dashboard');
    expect(notificationRoute(undefined)).toBe('/dashboard');
    expect(notificationRoute('/')).toBe('/dashboard');
    expect(notificationRoute('/#')).toBe('/dashboard');
    expect(notificationRoute('/#/')).toBe('/dashboard');
  });
});
