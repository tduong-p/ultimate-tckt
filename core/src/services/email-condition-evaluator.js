'use strict';

const OPERATORS = ['equals', 'not_equals', 'in', 'not_in', 'contains', 'gt', 'gte', 'lt', 'lte', 'is_empty', 'is_not_empty'];
const MAX_DEPTH = 3;
const MAX_GROUP_SIZE = 20;

function getByPath(obj, path) {
  return String(path || '').split('.').reduce((acc, key) => (acc === undefined || acc === null ? undefined : acc[key]), obj);
}

function evaluateLeaf(leaf, payload) {
  const actual = getByPath(payload, leaf.field);
  const { op, value } = leaf;
  switch (op) {
    case 'equals': return String(actual) === String(value);
    case 'not_equals': return String(actual) !== String(value);
    case 'in': return Array.isArray(value) && value.map(String).includes(String(actual));
    case 'not_in': return !(Array.isArray(value) && value.map(String).includes(String(actual)));
    case 'contains': return String(actual || '').toLowerCase().includes(String(value || '').toLowerCase());
    case 'gt': return Number(actual) > Number(value);
    case 'gte': return Number(actual) >= Number(value);
    case 'lt': return Number(actual) < Number(value);
    case 'lte': return Number(actual) <= Number(value);
    case 'is_empty': return actual === undefined || actual === null || actual === '';
    case 'is_not_empty': return !(actual === undefined || actual === null || actual === '');
    default: return false;
  }
}

function evaluateConditions(tree, payload) {
  if (tree === null || tree === undefined) return true;
  if (Array.isArray(tree.all)) return tree.all.every(node => evaluateConditions(node, payload));
  if (Array.isArray(tree.any)) return tree.any.length === 0 ? false : tree.any.some(node => evaluateConditions(node, payload));
  return evaluateLeaf(tree, payload);
}

function validateConditions(tree, allowedFields, depth = 0) {
  if (tree === null || tree === undefined) return;
  if (depth > MAX_DEPTH) throw new Error(`Điều kiện lồng quá sâu (tối đa ${MAX_DEPTH} tầng / condition nesting depth exceeded).`);
  if (typeof tree !== 'object') throw new Error('Cấu trúc điều kiện không hợp lệ.');
  if (Array.isArray(tree.all) || Array.isArray(tree.any)) {
    const group = tree.all || tree.any;
    if (group.length > MAX_GROUP_SIZE) throw new Error(`Một nhóm điều kiện chỉ được tối đa ${MAX_GROUP_SIZE} mục.`);
    group.forEach(node => validateConditions(node, allowedFields, depth + 1));
    return;
  }
  if (typeof tree.field !== 'string' || !tree.field) throw new Error('Mỗi điều kiện phải có field.');
  if (!OPERATORS.includes(tree.op)) throw new Error(`Toán tử (operator) không hợp lệ: ${tree.op}`);
  if (!['is_empty', 'is_not_empty'].includes(tree.op) && tree.value === undefined) throw new Error(`Điều kiện với operator ${tree.op} cần có value.`);
  if (allowedFields && !allowedFields.has(tree.field)) throw new Error(`Field không hợp lệ cho sự kiện này: ${tree.field}`);
}

module.exports = { OPERATORS, getByPath, evaluateConditions, validateConditions };
