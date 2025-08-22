import React from "react";
import ContactCard from "./ContactCard";
// DEV COMMENT: Import the new CSS Module.
import styles from "./AgendaView.module.css";

function AgendaView({
  agendaData,
  handlers,
  uiState,
  selectionMode,
  selectedContactIds,
  onToggleSelection,
}) {
  if (!agendaData) {
    return <div>Loading...</div>;
  }

  // DEV COMMENT: Create a date for 'today' at midnight. This is used to determine
  // if an agenda item is in the past or present, fixing the bug where future
  // items for an overdue contact were incorrectly marked as overdue.
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className={styles.agendaViewContainer}>
      {agendaData.map((day) => (
        <div key={day.date.toString()} className={styles.agendaDayGroup}>
          <h2
            className={`${styles.agendaDayHeading} ${
              day.title === "Today" ? styles.today : ""
            }`}
          >
            {day.title}
          </h2>
          {day.contacts.length > 0 ? (
            <div className={styles.contactsContainer}>
              {day.contacts.map((contact) => {
                // DEV COMMENT: A specific agenda item is considered 'overdue' for styling
                // purposes only if its calendar date is on or before today.
                const isItemOverdue = day.date <= today;

                // DEV COMMENT: Create a unique key for this specific agenda item to distinguish
                // it from other recurring instances of the same contact.
                const uniqueAgendaKey = `${day.date.toString()}-${contact.id}`;

                // DEV COMMENT: Calculate the date of the next check-in after this one.
                const futureDate = new Date(day.date);
                futureDate.setDate(
                  futureDate.getDate() + contact.checkin_frequency
                );

                return (
                  <ContactCard
                    // FIX: The key must be unique among siblings. A contact can appear on multiple
                    // days, so contact.id is not unique. A combination of the day and contact ID is unique.
                    key={uniqueAgendaKey}
                    contact={contact}
                    // DEV COMMENT: Override the generic handleToggleDetails handler to pass our
                    // unique key instead of just the contact ID. This is critical for the fix.
                    handlers={{
                      ...handlers,
                      handleToggleDetails: () =>
                        handlers.handleToggleDetails(uniqueAgendaKey),
                    }}
                    uiState={uiState}
                    displayMode="list" // Agenda view should always be a list
                    selectionMode={selectionMode}
                    isSelected={selectedContactIds.includes(contact.id)}
                    onToggleSelection={onToggleSelection}
                    // DEV COMMENT: Pass down the calculated overdue status for this specific
                    // agenda date. This overrides the contact's general overdue status for UI purposes.
                    isAgendaItemOverdue={isItemOverdue}
                    // DEV COMMENT: Pass the unique key down as a prop so the ContactCard
                    // knows its specific identity to check against the global "detailedItemId" state.
                    uniqueAgendaKey={uniqueAgendaKey}
                    // DEV COMMENT: Pass the specific dates for this agenda instance to the card
                    // so it can display them in the new status bar.
                    agendaDueDate={day.date}
                    agendaNextDate={futureDate}
                  />
                );
              })}
            </div>
          ) : (
            <p className={styles.noCheckinsMessage}>
              No check-ins scheduled for this day.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export default AgendaView;
