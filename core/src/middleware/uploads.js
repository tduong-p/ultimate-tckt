const multer = require('multer');

const taskUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024, files: 1 } });

module.exports = {
  taskUpload,
  attachmentKinds: ['clarification', 'evidence', 'issue', 'deliverable'],
  allowedExtensions: new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.zip'])
};
