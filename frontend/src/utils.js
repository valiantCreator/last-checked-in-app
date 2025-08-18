// frontend/src/utils.js

import { addDays, startOfDay, format, isToday, isTomorrow, isWithinInterval, differenceInCalendarDays } from 'date-fns';

// FIX: The entire function has been rewritten to support recurring events in the agenda.
export function generateAgendaViewData(contacts) {
  // Define how many days into the future the agenda should display.
  const AGENDA_DAYS = 30;
  const today = startOfDay(new Date());
  const agendaLimit = addDays(today, AGENDA_DAYS - 1); // The last day to calculate for.

  // 1. Create the skeleton structure for the defined number of days.
  const agendaSkeleton = Array.from({ length: AGENDA_DAYS }).map((_, i) => {
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

  // 2. Loop through each contact to project ALL of their future check-ins.
  contacts.forEach(contact => {
    // Ignore contacts that don't have a valid recurring frequency.
    if (!contact.checkin_frequency || contact.checkin_frequency <= 0) {
      return;
    }

    // Get the first upcoming due date for this contact.
    let nextOccurrence = getEffectiveCheckinDate(contact);

    // 3. Start a new `while` loop to find all occurrences within our agenda's timeframe.
    while (nextOccurrence && nextOccurrence <= agendaLimit) {
      // Calculate which day in our agenda this occurrence falls on.
      const dayIndex = differenceInCalendarDays(nextOccurrence, today);

      // Add the contact to that day's list if it's a valid day in our skeleton.
      if (dayIndex >= 0 && dayIndex < AGENDA_DAYS) {
        agendaSkeleton[dayIndex].contacts.push(contact);
      }

      // CRITICAL: Move to the next occurrence for this contact for the next loop iteration.
      nextOccurrence = addDays(nextOccurrence, contact.checkin_frequency);
    }
  });

  // 4. Sort the contacts within each day alphabetically.
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