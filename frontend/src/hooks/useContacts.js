// src/hooks/useContacts.js

import { useState, useCallback, useEffect } from "react";
import { toast } from "react-hot-toast";
import api from "../apiConfig.js";
import { formatToICSDate, calculateNextUpcomingCheckinDate } from "../utils.js";

// DEV COMMENT: This custom hook manages all state and logic related to contact data.
export const useContacts = ({ token, setConfirmationState }) => {
  const [contacts, setContacts] = useState([]);
  const [archivedContacts, setArchivedContacts] = useState([]);
  const [archivedCount, setArchivedCount] = useState(0);
  const [allTags, setAllTags] = useState([]);
  const [fetchingNotesFor, setFetchingNotesFor] = useState(new Set());

  const fetchContacts = useCallback(async () => {
    try {
      const res = await api.get("/contacts");
      setContacts(
        res.data.contacts.map((c) => ({ ...c, notes: [], tags: c.tags || [] }))
      );
    } catch (error) {
      console.error("Failed to fetch contacts", error);
      toast.error("Could not load contacts.");
    }
  }, []);

  const fetchArchivedContacts = useCallback(async () => {
    try {
      const res = await api.get("/contacts/archived");
      setArchivedContacts(res.data.contacts || []);
    } catch (error) {
      console.error("Failed to fetch archived contacts", error);
      toast.error("Could not load archived contacts.");
    }
  }, []);

  const fetchInitialData = useCallback(async () => {
    if (token) {
      await fetchContacts();
      api.get("/tags").then((res) => setAllTags(res.data.tags || []));
      api
        .get("/contacts/archived/count")
        .then((res) => setArchivedCount(res.data.count));
    }
  }, [token, fetchContacts]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleAddContact = useCallback(() => {
    toast.success("Contact added!");
    fetchContacts();
  }, [fetchContacts]);

  const handleCheckIn = useCallback(
    (id) => {
      const originalContacts = [...contacts];
      const checkinTime = new Date().toISOString();
      setContacts((current) =>
        current.map((c) =>
          c.id === id
            ? { ...c, last_checkin: checkinTime, snooze_until: null }
            : c
        )
      );
      toast.success("Checked in!");
      api.post(`/contacts/${id}/checkin`).catch((error) => {
        console.error("Failed to check in", error);
        toast.error("Could not save check-in. Reverting.");
        setContacts(originalContacts);
      });
    },
    [contacts]
  );

  const handleUpdateContact = useCallback(
    (editingContact) => {
      if (!editingContact) return;
      let formattedLastCheckin = null;
      const lastCheckinValue = editingContact.last_checkin;
      if (lastCheckinValue) {
        if (lastCheckinValue.includes("T")) {
          formattedLastCheckin = new Date(lastCheckinValue).toISOString();
        } else {
          formattedLastCheckin = new Date(
            `${lastCheckinValue}T00:00:00`
          ).toISOString();
        }
      }
      const contactToUpdate = {
        ...editingContact,
        firstName: editingContact.name,
        checkinFrequency: parseInt(editingContact.checkin_frequency, 10),
        howWeMet: editingContact.how_we_met,
        keyFacts: editingContact.key_facts,
        lastCheckin: formattedLastCheckin,
      };
      return api
        .put(`/contacts/${editingContact.id}`, contactToUpdate)
        .then(() => {
          fetchContacts();
          toast.success("Contact updated!");
        });
    },
    [fetchContacts]
  );

  const fetchNotesForContact = useCallback(
    (contactId) => {
      const contact = contacts.find((c) => c.id === contactId);
      if (
        contact &&
        contact.notes.length === 0 &&
        !fetchingNotesFor.has(contactId)
      ) {
        setFetchingNotesFor((prev) => new Set(prev).add(contactId));
        api
          .get(`/contacts/${contactId}/notes`)
          .then((res) =>
            setContacts((cs) =>
              cs.map((c) =>
                c.id === contactId ? { ...c, notes: res.data.notes } : c
              )
            )
          )
          .finally(() => {
            setFetchingNotesFor((prev) => {
              const newSet = new Set(prev);
              newSet.delete(contactId);
              return newSet;
            });
          });
      }
    },
    [contacts, fetchingNotesFor]
  );

  const handleSaveNote = useCallback((contactId, newNoteContent) => {
    if (!newNoteContent.trim()) return;
    return api
      .post(`/contacts/${contactId}/notes`, { content: newNoteContent })
      .then((res) => {
        const newNote = res.data;
        setContacts((cs) =>
          cs.map((c) =>
            c.id === contactId ? { ...c, notes: [newNote, ...c.notes] } : c
          )
        );
        toast.success("Note saved!");
      });
  }, []);

  const handleUpdateNote = useCallback((contactId, noteId, newContent) => {
    api.put(`/notes/${noteId}`, { content: newContent }).then((res) => {
      setContacts((cs) =>
        cs.map((c) => {
          if (c.id === contactId) {
            const updatedNotes = c.notes.map((n) =>
              n.id === noteId
                ? { ...n, content: newContent, modifiedAt: res.data.modifiedAt }
                : n
            );
            return { ...c, notes: updatedNotes };
          }
          return c;
        })
      );
      toast.success("Note updated!");
    });
  }, []);

  const handleTagAdded = useCallback((contactId, newTag) => {
    setContacts((cs) =>
      cs.map((c) =>
        c.id === contactId ? { ...c, tags: [...c.tags, newTag] } : c
      )
    );
  }, []);

  const handleRemoveTag = useCallback((contactId, tagId) => {
    api.delete(`/contacts/${contactId}/tags/${tagId}`).then(() => {
      setContacts((cs) =>
        cs.map((c) => {
          if (c.id === contactId)
            return { ...c, tags: c.tags.filter((t) => t.id !== tagId) };
          return c;
        })
      );
      api.get(`/tags`).then((res) => setAllTags(res.data.tags || []));
    });
  }, []);

  const handleArchiveContact = useCallback((contactId) => {
    api.put(`/contacts/${contactId}/archive`).then(() => {
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
      setArchivedCount((prev) => prev + 1);
      toast.success("Contact archived.");
    });
  }, []);

  const handleRestoreContact = useCallback(
    (contactId) => {
      const contactToRestore = archivedContacts.find((c) => c.id === contactId);
      api.put(`/contacts/${contactId}/restore`).then(() => {
        setArchivedContacts((prev) => prev.filter((c) => c.id !== contactId));
        setArchivedCount((prev) => prev - 1);
        if (contactToRestore) {
          setContacts((prev) => [
            ...prev,
            {
              ...contactToRestore,
              notes: [],
              tags: contactToRestore.tags || [],
            },
          ]);
        }
        toast.success("Contact restored!");
      });
    },
    [archivedContacts]
  );

  const handleDeletePermanently = useCallback(
    (contactId) => {
      const contact = archivedContacts.find((c) => c.id === contactId);
      if (!contact) return;
      setConfirmationState({
        isOpen: true,
        title: "Delete Contact?",
        message: `Are you sure you want to permanently delete ${contact.name}? This action cannot be undone.`,
        onConfirm: () => {
          api
            .delete(`/contacts/${contactId}`)
            .then(() => {
              setArchivedContacts((prev) =>
                prev.filter((c) => c.id !== contactId)
              );
              toast.success("Contact permanently deleted.");
              setConfirmationState({ isOpen: false });
            })
            .catch((err) => {
              toast.error("Failed to delete contact.");
              console.error(err);
              setConfirmationState({ isOpen: false });
            });
        },
      });
    },
    [archivedContacts, setConfirmationState]
  );

  const handleSnooze = useCallback(
    (contactId, days) => {
      api
        .put(`/contacts/${contactId}/snooze`, { snooze_days: days })
        .then(() => {
          fetchContacts();
          toast.success("Snoozed!");
        })
        .catch((err) => {
          console.error("Snooze failed", err);
          toast.error("Could not snooze contact.");
        });
    },
    [fetchContacts]
  );

  const handleTogglePin = useCallback(
    (contactId) => {
      const originalContacts = [...contacts];
      setContacts((current) =>
        current.map((c) =>
          c.id === contactId ? { ...c, is_pinned: !c.is_pinned } : c
        )
      );
      api.put(`/contacts/${contactId}/pin`).catch((error) => {
        console.error("Failed to pin contact", error);
        toast.error("Could not update pin status.");
        setContacts(originalContacts);
      });
    },
    [contacts]
  );

  const generateCalendarFiles = useCallback(
    ({ exportBirthdays, exportCheckins, timeWindow }) => {
      let birthdayICS = "";
      let checkinICS = "";
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const timeWindowLimit = new Date(today);
      if (timeWindow !== "all") {
        timeWindowLimit.setDate(
          timeWindowLimit.getDate() + parseInt(timeWindow)
        );
      }
      contacts.forEach((contact) => {
        const fullName = contact.name;
        if (exportCheckins) {
          let nextCheckinDate =
            contact.snooze_until && new Date(contact.snooze_until) > today
              ? new Date(contact.snooze_until)
              : calculateNextUpcomingCheckinDate(
                  contact.last_checkin,
                  contact.checkin_frequency
                );
          if (nextCheckinDate) {
            while (timeWindow === "all" || nextCheckinDate <= timeWindowLimit) {
              const formattedCheckinDate = formatToICSDate(nextCheckinDate);
              const checkinUID = `checkin-${contact.id}-${formattedCheckinDate}@lastchecked.in`;
              checkinICS += `BEGIN:VEVENT\nUID:${checkinUID}\nDTSTAMP:${formatToICSDate(
                new Date()
              )}\nDTSTART;VALUE=DATE:${formattedCheckinDate}\nSUMMARY:Check in with ${fullName}\nDESCRIPTION:Time to reconnect with ${fullName}!\nEND:VEVENT\n`;
              if (timeWindow === "all" && contact.checkin_frequency <= 0) break;
              if (contact.checkin_frequency <= 0) break;
              nextCheckinDate.setDate(
                nextCheckinDate.getDate() + contact.checkin_frequency
              );
            }
          }
        }
        if (exportBirthdays && contact.birthday) {
          const originalBirthdayDate = new Date(contact.birthday);
          if (!isNaN(originalBirthdayDate.getTime())) {
            const formattedBirthday = formatToICSDate(originalBirthdayDate);
            const birthdayUID = `birthday-${contact.id}@lastchecked.in`;
            birthdayICS += `BEGIN:VEVENT\nUID:${birthdayUID}\nDTSTAMP:${formatToICSDate(
              new Date()
            )}\nDTSTART;VALUE=DATE:${formattedBirthday}\nSUMMARY:🎂 ${fullName}'s Birthday\nDESCRIPTION:Wish ${fullName} a happy birthday!\nRRULE:FREQ=YEARLY\nEND:VEVENT\n`;
          }
        }
      });
      const createFullICS = (content) => {
        if (!content) return null;
        return `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//LastCheckedIn//NONSGML v1.0//EN\nCALSCALE:GREGORIAN\n${content}END:VCALENDAR`;
      };
      const timeWindowMap = {
        7: "next_7_days",
        30: "next_30_days",
        365: "next_year",
        all: "all_upcoming",
      };
      const checkinFilename = `checkins_${timeWindowMap[timeWindow]}.ics`;
      return {
        birthdays: exportBirthdays
          ? { content: createFullICS(birthdayICS), filename: "birthdays.ics" }
          : null,
        checkins: exportCheckins
          ? { content: createFullICS(checkinICS), filename: checkinFilename }
          : null,
      };
    },
    [contacts]
  );

  // DEV COMMENT: Return the state and all handler functions.
  return {
    contacts,
    archivedContacts,
    archivedCount,
    allTags,
    fetchContacts,
    fetchArchivedContacts,
    handleAddContact,
    handleCheckIn,
    handleUpdateContact,
    fetchNotesForContact,
    handleSaveNote,
    handleUpdateNote,
    handleTagAdded,
    handleRemoveTag,
    handleArchiveContact,
    handleRestoreContact,
    handleDeletePermanently,
    handleSnooze,
    handleTogglePin,
    generateCalendarFiles,
  };
};
