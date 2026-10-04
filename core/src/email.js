// Kiểm tra email có khả năng nhận thư thật (cú pháp + chặn đuôi dành riêng).
const SYNTAX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESERVED_TLDS = new Set(['local', 'localhost', 'test', 'invalid', 'example']);

function normalize(email) {
  return String(email == null ? '' : email).trim().toLowerCase();
}

function isDeliverableEmail(email) {
  const value = normalize(email);
  if (!SYNTAX.test(value)) return false;
  const tld = value.slice(value.lastIndexOf('.') + 1);
  return !RESERVED_TLDS.has(tld);
}

function emailDomain(email) {
  const value = normalize(email);
  return value.slice(value.lastIndexOf('@') + 1);
}

module.exports = { isDeliverableEmail, emailDomain };
