// frontend/src/hooks/useSettings.js

import { useState, useEffect, useCallback } from "react";
import api from "../apiConfig";
import { toast } from "react-hot-toast";

export const useSettings = () => {
  const [settings, setSettings] = useState({ notificationHourUtc: 9 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Gemini COMMENT: Fetch settings on mount.
  const fetchSettings = useCallback(async () => {
    try {
      const response = await api.get("/settings");
      setSettings(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch settings:", err);
      toast.error("Could not load settings.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Gemini COMMENT: Handle updating the notification hour.
  const updateNotificationHour = async (newHour) => {
    setSaving(true);
    try {
      const response = await api.put("/settings", {
        notificationHourUtc: parseInt(newHour, 10),
      });
      setSettings((prev) => ({
        ...prev,
        notificationHourUtc: response.data.notificationHourUtc,
      }));
      toast.success("Notification time updated.");
    } catch (err) {
      console.error("Failed to update settings:", err);
      toast.error("Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  return {
    settings,
    loading,
    saving,
    updateNotificationHour,
  };
};
