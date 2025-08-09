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

// --- DEPRECATED: This function is no longer used but kept for reference if needed. ---
export function calculateNextCheckinDate(lastCheckin, frequency) {
    const lastDate = new Date(lastCheckin);
    lastDate.setDate(lastDate.getDate() + frequency);
    return lastDate;
}

// --- REVISED: A more robust function to find the next check-in date. ---
export function calculateNextUpcomingCheckinDate(lastCheckin, frequency) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastDate = new Date(lastCheckin);
    lastDate.setHours(0, 0, 0, 0);

    const daysSinceLast = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
    
    if (daysSinceLast <= frequency) {
        // Not overdue, so just add frequency to the last check-in date.
        const nextDate = new Date(lastDate);
        nextDate.setDate(nextDate.getDate() + frequency);
        return nextDate;
    } else {
        // Is overdue. Find how many cycles have been missed.
        const cyclesMissed = Math.floor((daysSinceLast - frequency) / frequency) + 1;
        const daysToAdd = cyclesMissed * frequency;
        const nextDate = new Date(lastDate);
        nextDate.setDate(nextDate.getDate() + frequency + daysToAdd);
        return nextDate;
    }
}


// --- Helper function to format a date for the iCalendar (.ics) standard ---
export function formatToICSDate(date) {
    if (!date) return '';
    const d = new Date(date);
    // Adjust for timezone offset to prevent the date from shifting
    const userTimezoneOffset = d.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(d.getTime() + userTimezoneOffset);

    const year = adjustedDate.getUTCFullYear();
    const month = String(adjustedDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(adjustedDate.getUTCDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

// --- Helper function to calculate the next occurrence of a birthday ---
export function getNextBirthday(birthdayString) {
    if (!birthdayString) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to the start of today

    const birthDate = new Date(birthdayString);
    const userTimezoneOffset = birthDate.getTimezoneOffset() * 60000;
    const adjustedBirthDate = new Date(birthDate.getTime() + userTimezoneOffset);
    
    const birthMonth = adjustedBirthDate.getUTCMonth();
    const birthDay = adjustedBirthDate.getUTCDate();
    
    let nextBirthday = new Date(today.getFullYear(), birthMonth, birthDay);

    if (nextBirthday < today) {
        nextBirthday.setFullYear(today.getFullYear() + 1);
    }
    
    return nextBirthday;
}
