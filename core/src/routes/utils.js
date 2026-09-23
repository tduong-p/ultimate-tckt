const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const validHttpUrl = value => { if (!value) return true; try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; } };
const one = rows => rows[0] || null;
const ids = value => [...new Set((Array.isArray(value) ? value : [value]).map(Number).filter(Number.isInteger))];

module.exports = { asyncRoute, validHttpUrl, one, ids };
