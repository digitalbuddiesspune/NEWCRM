import Attendance from '../models/attendance.js';

const getStatus = (durationHours) => {
  if (durationHours >= 8) return 'Full Day';
  if (durationHours >= 4) return 'Half Day';
  return 'Half Day';
};

/**
 * Auto check-out any open attendance records from previous days.
 * - Finds records with checkIn set and checkOut missing where `date` < today (00:00).
 * - Sets checkOut to end-of-day for that attendance date.
 * - Calculates durationHours and status.
 */
export async function autoCheckoutPreviousDays() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const open = await Attendance.find({
    checkIn: { $exists: true, $ne: null },
    checkOut: { $in: [null, undefined] },
    date: { $lt: todayStart },
  }).exec();

  if (!open.length) return { updated: 0 };

  let updated = 0;
  for (const a of open) {
    const endOfDay = new Date(a.date);
    endOfDay.setHours(23, 59, 59, 999);
    a.checkOut = endOfDay;
    const durationMs = a.checkOut - a.checkIn;
    a.durationHours = durationMs / (1000 * 60 * 60);
    a.status = getStatus(a.durationHours);
    await a.save();
    updated++;
  }

  return { updated };
}

