/**
 * Converts a time string (HH:MM or HH:MM:SS) to total minutes
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Checks if a time is within a range (inclusive start, exclusive end)
 */
export function isTimeInRange(
  time: string,
  startTime: string,
  endTime: string
): boolean {
  const timeMinutes = timeToMinutes(time);
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  return timeMinutes >= startMinutes && timeMinutes < endMinutes;
}

/**
 * Gets the local weekday from an ISO date string (YYYY-MM-DD)
 * Avoids timezone issues by parsing the date in local timezone
 */
export function getLocalWeekdayFromISO(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Creates date in local timezone (month is 0-indexed)
  return new Date(year, month - 1, day).getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
}
