import { addDays, startOfDay, format, isToday, isTomorrow, isWithinInterval, differenceInCalendarDays } from 'date-fns';

export function generateAgendaViewData(contacts) {
  const today = startOfDay(new Date());
  const agendaLimit = addDays(today, 7); 

  const agendaSkeleton = Array.from({ length: 8 }).map((_, i) => {
    const date = addDays(today, i);
    let title;
    if (isToday(date)) {
      title = 'Today';
    } else if (isTomorrow(date)) {
      title = 'Tomorrow';
    } else {
      title = format(date, 'EEEE, MMMM d');
    }
    return { date, title, contacts: [] };
  });

  contacts.forEach(contact => {
    const effectiveDate = getEffectiveCheckinDate(contact);
    if (effectiveDate && isWithinInterval(effectiveDate, { start: today, end: agendaLimit })) {
      const dayIndex = differenceInCalendarDays(effectiveDate, today);
      if (dayIndex >= 0 && dayIndex < 8) {
        agendaSkeleton[dayIndex].contacts.push(contact);
      }
    }
  });

  agendaSkeleton.forEach(day => {
    day.contacts.sort((a, b) => a.name.localeCompare(b.name));
  });

  return agendaSkeleton;
}

export function getEffectiveCheckinDate(contact) {
    const today = startOfDay(new Date());
    if (contact.snooze_until) {
        const snoozeDate = startOfDay(new Date(contact.snooze_until));
        if (snoozeDate >= today) {
            return snoozeDate;
        }
    }
    // FIX: Using snake_case properties
    return calculateNextUpcomingCheckinDate(contact.last_checkin, contact.checkin_frequency);
}

export function isOverdue(contact) {
    const today = startOfDay(new Date());
    if (contact.snooze_until && startOfDay(new Date(contact.snooze_until)) > today) {
        return false;
    }
    // FIX: Using snake_case properties
    const dueDate = addDays(startOfDay(new Date(contact.last_checkin)), contact.checkin_frequency);
    return dueDate <= today;
}

export function daysSince(dateString) {
  const today = startOfDay(new Date());
  const lastDate = startOfDay(new Date(dateString));
  return differenceInCalendarDays(today, lastDate);
}

export function formatBirthday(dateString) {
  if (!dateString) return dateString;
  const date = new Date(dateString); 
  return format(date, 'MMMM d');
}

export function calculateNextUpcomingCheckinDate(lastCheckin, frequency) {
  if (!lastCheckin || frequency <= 0) return null; // Added a guard for missing lastCheckin
  const today = startOfDay(new Date());
  const lastDate = startOfDay(new Date(lastCheckin));
  const daysSinceLast = differenceInCalendarDays(today, lastDate);

  if (daysSinceLast <= frequency) {
    return addDays(lastDate, frequency);
  } else {
    const cyclesMissed = Math.floor((daysSinceLast - 1) / frequency);
    const daysToAdd = (cyclesMissed + 1) * frequency;
    return addDays(lastDate, daysToAdd);
  }
}

export function formatToICSDate(date) {
  if (!date) return '';
  return format(date, 'yyyyMMdd');
}

export function getNextBirthday(birthdayString) {
  if (!birthdayString) return null;
  const today = startOfDay(new Date());
  const parts = birthdayString.split('-');
  const birthMonth = parseInt(parts[1], 10) - 1; 
  const birthDay = parseInt(parts[2], 10);

  let nextBirthday = new Date(today.getFullYear(), birthMonth, birthDay);
  if (nextBirthday < today) {
    nextBirthday.setFullYear(today.getFullYear() + 1);
  }
  return startOfDay(nextBirthday);
}