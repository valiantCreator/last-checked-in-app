export function daysSince(dateString) {
  const today = new Date();
  const lastDate = new Date(dateString);
  today.setHours(0, 0, 0, 0);
  lastDate.setHours(0, 0, 0, 0);
  const diffTime = today - lastDate;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function formatBirthday(dateString) {
  if (!dateString || !dateString.includes('-')) return dateString;
  const date = new Date(dateString);
  const userTimezoneOffset = date.getTimezoneOffset() * 60000;
  const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
  return adjustedDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });
}

export function isOverdue(contact) {
    const now = new Date();
    if (contact.snooze_until && new Date(contact.snooze_until) > now) {
        return false;
    }
    const daysSinceCheckin = daysSince(contact.lastCheckin);
    return daysSinceCheckin > contact.checkinFrequency;
}

export function calculateNextCheckinDate(lastCheckin, frequency) {
    const lastDate = new Date(lastCheckin);
    lastDate.setDate(lastDate.getDate() + frequency);
    return lastDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
}