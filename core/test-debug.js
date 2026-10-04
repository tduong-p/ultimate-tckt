const { dateInVietnam } = require('./src/date-vn');

// Test case 1: at 2030-06-16T02:00:00Z (which is 09:00 Vietnam time on 2030-06-16)
const now1 = new Date('2030-06-16T02:00:00Z');
console.log('Test 1: now =', now1.toISOString());
console.log('dateInVietnam(now) =', dateInVietnam(now1));
console.log('Task deadline "2030-06-16" < "2030-06-16"?', '2030-06-16' < '2030-06-16'); // Should be false (not overdue)
console.log('Task deadline "2030-06-15" < "2030-06-16"?', '2030-06-15' < '2030-06-16'); // Should be true (overdue)
console.log('');

// Test case 2: at 2030-06-15T20:00:00Z (which is 03:00 Vietnam time on 2030-06-16)
const now2 = new Date('2030-06-15T20:00:00Z');
console.log('Test 2: now =', now2.toISOString());
console.log('dateInVietnam(now) =', dateInVietnam(now2));

const tomorrowMs = now2.getTime() + 24 * 60 * 60 * 1000;
const tomorrow = new Date(tomorrowMs);
console.log('dateInVietnam(tomorrow) =', dateInVietnam(tomorrow));
console.log('Task deadline "2030-06-17" === dateInVietnam(tomorrow)?', '2030-06-17' === dateInVietnam(tomorrow));
