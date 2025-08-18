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
              {day.contacts.map((contact) => (
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
                />
              ))}
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
