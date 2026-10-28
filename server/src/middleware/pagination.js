export function parsePagination(req) {
  const page = Math.max(1, Math.min(Number.parseInt(req.query.page, 10) || 1, 100000));
  const limit = Math.max(1, Math.min(Number.parseInt(req.query.limit, 10) || 10, 100));
  const sortOrder = req.query.order === 'asc' ? 1 : -1;
  const allowedSort = new Set(['createdAt', 'fullName', 'employeeId', 'department', 'startDate', 'startsAt', 'attendanceDate', 'title']);
  const sortBy = allowedSort.has(req.query.sort) ? req.query.sort : 'createdAt';
  return { page, limit, skip: (page - 1) * limit, sort: { [sortBy]: sortOrder } };
}
export const pageMeta = (page, limit, total) => ({ page, limit, total, pages: Math.ceil(total / limit) });
