'use strict';

async function createAttachment(context, { taskId, userId, kind, label, linkUrl, file }) {
  const { db, path, fs, crypto, attachmentRoot, allowedExtensions } = context;
  if (linkUrl && !/^https?:\/\//i.test(linkUrl)) {
    throw Object.assign(new Error('Đường link phải bắt đầu bằng http:// hoặc https://.'), { status: 400 });
  }
  if (!file && !linkUrl) {
    throw Object.assign(new Error('Vui lòng chọn tệp hoặc cung cấp đường link liên quan.'), { status: 400 });
  }
  let storedName = null;
  try {
    if (file) {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!allowedExtensions.has(ext)) throw Object.assign(new Error('Định dạng tệp này không được hỗ trợ.'), { status: 415 });
      const [usageRows] = await db.execute('SELECT COALESCE(SUM(size_bytes),0) used FROM task_attachments WHERE task_id=?', [taskId]);
      if (Number(usageRows[0].used) + file.size > 50 * 1024 * 1024) throw Object.assign(new Error('Công việc này đã đạt giới hạn dung lượng tải lên chung 50 MB.'), { status: 413 });
      storedName = `${taskId}-${crypto.randomUUID()}${ext}`;
      await fs.promises.writeFile(path.join(attachmentRoot, storedName), file.buffer, { flag: 'wx' });
    }
    const safeLabel = String(label || file?.originalname || linkUrl).trim().slice(0, 180);
    const [result] = await db.execute(
      'INSERT INTO task_attachments(task_id,user_id,kind,label,link_url,stored_name,original_name,mime_type,size_bytes) VALUES(?,?,?,?,?,?,?,?,?)',
      [taskId, userId, kind, safeLabel, linkUrl || null, storedName, file?.originalname || null, file?.mimetype || null, file?.size || 0]
    );
    return { id: result.insertId };
  } catch (error) {
    if (storedName) await fs.promises.unlink(path.join(attachmentRoot, storedName)).catch(() => {});
    throw error;
  }
}

module.exports = { createAttachment };
