// Core lưu một số tiêu đề/nội dung thông báo bằng tiếng Anh (core/src/routes/activities.js). Câu không có trong bảng hiện nguyên văn.
const TITLES: Record<string, string> = {
  'You were tagged in a comment': 'Bạn được gắn thẻ trong một bình luận',
  'New task response': 'Phản hồi mới về công việc',
  'Task due today': 'Công việc đến hạn hôm nay',
};

const BODY_PATTERNS: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/^([\s\S]+) tagged you in (“[\s\S]+”)\.$/, (m) => `${m[1]} đã gắn thẻ bạn trong ${m[2]}.`],
  [/^([\s\S]+) responded to (“[\s\S]+”)\.$/, (m) => `${m[1]} đã phản hồi về ${m[2]}.`],
];

const DELIVERY_STATUS: Record<string, string> = {
  success: 'đã gửi',
  sent: 'đã gửi',
  pending: 'đang chờ',
  failed: 'lỗi',
  skipped: 'bỏ qua',
};

export function notificationTitle(title: string): string {
  return TITLES[title] ?? title;
}

export function notificationBody(body: string): string {
  for (const [pattern, build] of BODY_PATTERNS) {
    const match = body.match(pattern);
    if (match) return build(match);
  }
  return body;
}

export function deliveryLabel(channel: 'email' | 'push', status: string): string {
  return `${channel === 'email' ? 'Email' : 'Push'}: ${DELIVERY_STATUS[status] ?? status}`;
}
