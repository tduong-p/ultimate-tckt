'use strict';
const { syncTcktMembershipFromRole } = require('../units/memberships');

async function findOrCreateHustAccount({ db, bcrypt, crypto }, email, profile) {
  const select = 'SELECT id,name,email,role,phone,class_number,faculty_notice_acknowledged_at,avatar_color,auth_provider,is_active FROM users WHERE email=?';
  let [rows] = await db.execute(select, [email]);
  if (!rows.length) {
    const name = String(profile.name || '').trim().slice(0, 120) || email.split('@')[0].slice(0, 120);
    // SSO accounts have no shared or predictable local password.
    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    try {
      await db.execute(
        "INSERT INTO users(name,email,password_hash,role,auth_provider,is_active) VALUES(?,?,?,'member','microsoft',1)",
        [name, email, passwordHash]
      );
    } catch (error) {
      // Simultaneous first sign-ins can race on the unique email constraint.
      if (error.code !== 'ER_DUP_ENTRY') throw error;
    }
    const [[created]] = await db.execute('SELECT id FROM users WHERE email=?', [email]);
    // Giữ hành vi cũ: tài khoản HUST mới là member của TCKT, không bị khoá ngoài.
    if (created) await syncTcktMembershipFromRole(db, created.id, { create: true });
    [rows] = await db.execute(select, [email]);
  }
  const user = rows[0];
  if (!user || !user.is_active) return null;
  const { is_active, ...sessionUser } = user;
  return sessionUser;
}

module.exports = { findOrCreateHustAccount };
