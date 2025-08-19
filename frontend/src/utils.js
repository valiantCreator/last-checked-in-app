// frontend/src/utils.js

import {
  addDays,
  startOfDay,
  format,
  isToday,
  isTomorrow,
  differenceInCalendarDays,
} from "date-fns";

// NEW: A robust helper function to parse a UTC date string (from the DB)
// as if it were a local date. This is the core of the timezone bug fix.
// It creates a date and then manually adds the browser's timezone offset
// to counteract the automatic conversion, ensuring "2025-08-19T00:00:00Z" is
// treated as the calendar day of August 19, not August 18 at 8 PM.
export function parseAsLocalDate(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
}

export function generateAgendaViewData(contacts) {
  const AGENDA_DAYS = 30;
  const today = startOfDay(new Date());
  const agendaLimit = addDays(today, AGENDA_DAYS - 1);

  const agendaSkeleton = Array.from({ length: AGENDA_DAYS }).map((_, i) => {
    const date = addDays(today, i);
    let title;
    if (isToday(date)) {
      title = "Today";
    } else if (isTomorrow(date)) {
      title = "Tomorrow";
    } else {
      title = format(date, "EEEE, MMMM d");
    }
    return { date, title, contacts: [] };
  });

  contacts.forEach((contact) => {
    if (!contact.checkin_frequency || contact.checkin_frequency <= 0) {
      return;
    }
    let nextOccurrence = getEffectiveCheckinDate(contact);
    while (nextOccurrence && nextOccurrence <= agendaLimit) {
      const dayIndex = differenceInCalendarDays(nextOccurrence, today);
      if (dayIndex >= 0 && dayIndex < AGENDA_DAYS) {
        agendaSkeleton[dayIndex].contacts.push(contact);
      }
      nextOccurrence = addDays(nextOccurrence, contact.checkin_frequency);
    }
  });

  agendaSkeleton.forEach((day) => {
    day.contacts.sort((a, b) => a.name.localeCompare(b.name));
  });

  return agendaSkeleton;
}

export function getEffectiveCheckinDate(contact) {
  const today = startOfDay(new Date());
  if (contact.snooze_until) {
    // FIX: Use the new timezone-safe parser
    const snoozeDate = startOfDay(parseAsLocalDate(contact.snooze_until));
    if (snoozeDate >= today) {
      return snoozeDate;
    }
  }
  return calculateNextUpcomingCheckinDate(
    contact.last_checkin,
    contact.checkin_frequency
  );
}

export function isOverdue(contact) {
  const today = startOfDay(new Date());
  if (
    contact.snooze_until &&
    startOfDay(parseAsLocalDate(contact.snooze_until)) > today
  ) {
    return false;
  }
  // FIX: Use the new timezone-safe parser
  const lastDate = parseAsLocalDate(contact.last_checkin);
  if (!lastDate) return false;
  const dueDate = addDays(startOfDay(lastDate), contact.checkin_frequency);
  return dueDate <= today;
}

export function daysSince(dateString) {
  const today = startOfDay(new Date());
  // FIX: Use the new timezone-safe parser
  const lastDate = startOfDay(parseAsLocalDate(dateString));
  return differenceInCalendarDays(today, lastDate);
}

export function formatBirthday(dateString) {
  if (!dateString) return dateString;
  // FIX: Use the new timezone-safe parser
  const date = parseAsLocalDate(dateString);
  return format(date, "MMMM d");
}

export function calculateNextUpcomingCheckinDate(lastCheckin, frequency) {
  if (!lastCheckin || frequency <= 0) return null;
  const today = startOfDay(new Date());
  // FIX: Use the new timezone-safe parser
  const lastDate = startOfDay(parseAsLocalDate(lastCheckin));
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
  if (!date) return "";
  return format(date, "yyyyMMdd");
}

export function getNextBirthday(birthdayString) {
  if (!birthdayString) return null;
  const today = startOfDay(new Date());
  // FIX: Use the new timezone-safe parser for the base date
  const birthDate = parseAsLocalDate(birthdayString);
  if (!birthDate) return null;

  const birthMonth = birthDate.getMonth();
  const birthDay = birthDate.getDate();

  let nextBirthday = new Date(today.getFullYear(), birthMonth, birthDay);
  if (nextBirthday < today) {
    nextBirthday.setFullYear(today.getFullYear() + 1);
  }
  return startOfDay(nextBirthday);
}
