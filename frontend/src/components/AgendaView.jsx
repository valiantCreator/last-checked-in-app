// frontend/src/components/AgendaView.jsx

import React from "react";
import ContactCard from "./ContactCard";

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
    <div className="agenda-view-container">
      {agendaData.map((day) => (
        <div key={day.date.toString()} className="agenda-day-group">
          <h2
            className={`agenda-day-heading ${
              day.title === "Today" ? "today" : ""
            }`}
          >
            {day.title}
          </h2>
          {day.contacts.length > 0 ? (
            <div className="contacts-container list">
              {day.contacts.map((contact) => {
                // DEV COMMENT: A specific agenda item is considered 'overdue' for styling
                // purposes only if its calendar date is on or before today.
                const isItemOverdue = day.date <= today;

                return (
                  <ContactCard
                    // FIX: The key must be unique among siblings. A contact can appear on multiple
                    // days, so contact.id is not unique. A combination of the day and contact ID is unique.
                    key={`${day.date.toString()}-${contact.id}`}
                    contact={contact}
                    handlers={handlers}
                    uiState={uiState}
                    displayMode="list" // Agenda view should always be a list
                    selectionMode={selectionMode}
                    isSelected={selectedContactIds.includes(contact.id)}
                    onToggleSelection={onToggleSelection}
                    // DEV COMMENT: Pass down the calculated overdue status for this specific
                    // agenda date. This overrides the contact's general overdue status for UI purposes.
                    isAgendaItemOverdue={isItemOverdue}
                  />
                );
              })}
            </div>
          ) : (
            <p className="no-checkins-message">
              No check-ins scheduled for this day.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export default AgendaView;
