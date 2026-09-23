'use strict';

const STAFF_DOMAIN = 'hust.edu.vn';
const STUDENT_DOMAIN = 'sis.hust.edu.vn';

function classifyHustEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (email.endsWith(`@${STUDENT_DOMAIN}`)) return 'student';
  if (email.endsWith(`@${STAFF_DOMAIN}`)) return 'faculty';
  return null;
}

function studentCohortFromEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (classifyHustEmail(email) !== 'student') return null;
  const localPart = email.slice(0, -(`@${STUDENT_DOMAIN}`.length));
  const match = localPart.match(/^[^\d]+(\d{2})/);
  if (!match) return null;
  const entranceYear = 2000 + Number(match[1]);
  return { entranceYear, cohort: `K${Number(match[1]) + 45}` };
}

function withHustIdentity(user) {
  if (!user) return user;
  const accountType = classifyHustEmail(user.email);
  const cohort = studentCohortFromEmail(user.email);
  return {
    ...user,
    hust_account_type: accountType,
    entrance_year: cohort?.entranceYear || null,
    cohort: cohort?.cohort || null,
    onboarding: accountType === 'faculty'
      ? { type: 'faculty_notice', required: !user.faculty_notice_acknowledged_at }
      : accountType === 'student'
        ? { type: 'student_class', required: !user.class_number }
        : null
  };
}

module.exports = { classifyHustEmail, studentCohortFromEmail, withHustIdentity };
