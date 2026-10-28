export const ok = (res, data = {}, message = 'Operation completed successfully', status = 200) =>
  res.status(status).json({ success: true, message, data });
export const fail = (res, status, message, details) => res.status(status).json({ success: false, message, ...(details ? { details } : {}) });
