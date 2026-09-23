const multer = require('multer');

function createErrorHandler(logger) {
  return (err, req, res, _next) => {
    logger.error(`${req.method} ${req.originalUrl} failed.`, err);
    console.error(err);
    if (res.headersSent) return;
    if (err instanceof multer.MulterError) return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'A single file cannot exceed 50 MB.' : err.message });
    res.status(err.code === 'ER_DUP_ENTRY' ? 409 : 500).json({ error: err.code === 'ER_DUP_ENTRY' ? 'That item already exists.' : 'Something went wrong. Please try again.' });
  };
}

module.exports = { createErrorHandler };
