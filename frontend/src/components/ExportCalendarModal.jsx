import React, { useState, useEffect } from 'react';

// --- Helper function to trigger a file download in the browser ---
// This is moved here to keep the component self-contained.
const triggerDownload = ({ content, filename }) => {
  if (!content) return;
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};


function ExportCalendarModal({ isOpen, onClose, onGenerateFiles }) {
  // --- STATE ---
  const [exportBirthdays, setExportBirthdays] = useState(true);
  const [exportCheckins, setExportCheckins] = useState(true);
  const [timeWindow, setTimeWindow] = useState('7');
  // NEW: State to manage the modal's view ('options' or 'filesReady')
  const [modalView, setModalView] = useState('options');
  // NEW: State to hold the generated file data
  const [generatedFiles, setGeneratedFiles] = useState(null);


  // --- HANDLERS ---
  // This function is called when the user clicks the main "Export" button.
  const handleExportClick = () => {
    if (!exportBirthdays && !exportCheckins) {
      alert("Please select at least one item to export.");
      return;
    }
    
    // Call the generator function passed from App.jsx
    const files = onGenerateFiles({
      exportBirthdays,
      exportCheckins,
      timeWindow
    });

    const filesToDownload = Object.values(files).filter(file => file !== null);

    // If only one file was generated, download it immediately and close.
    if (filesToDownload.length === 1) {
      triggerDownload(filesToDownload[0]);
      handleClose(); // Close and reset the modal
    } 
    // If two files were generated, switch to the "files ready" view.
    else if (filesToDownload.length > 1) {
      setGeneratedFiles(files);
      setModalView('filesReady');
    }
  };

  // This function resets the modal to its initial state before closing.
  const handleClose = () => {
    onClose();
    // Use a timeout to avoid a jarring visual flash as the state resets during the closing animation.
    setTimeout(() => {
      setModalView('options');
      setGeneratedFiles(null);
      setExportBirthdays(true);
      setExportCheckins(true);
      setTimeWindow('7');
    }, 300); // Should match CSS animation duration
  };

  // Effect to handle the 'Escape' key press
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, handleClose]);


  // --- RENDER LOGIC ---
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* --- View 1: Options Selection --- */}
        {modalView === 'options' && (
          <>
            <h2>Export to Calendar</h2>
            <p>Select what you'd like to export. This will download an .ics file compatible with most calendar apps.</p>
            <div className="modal-option">
              <label>
                <input type="checkbox" checked={exportBirthdays} onChange={(e) => setExportBirthdays(e.target.checked)} />
                Export Birthdays
              </label>
            </div>
            <div className="modal-option">
              <label>
                <input type="checkbox" checked={exportCheckins} onChange={(e) => setExportCheckins(e.target.checked)} />
                Export Check-in Reminders
              </label>
            </div>
            <fieldset className="time-window-fieldset" disabled={!exportCheckins}>
              <legend>Select a time window for check-ins:</legend>
              <div className="radio-group">
                <label><input type="radio" value="7" checked={timeWindow === '7'} onChange={(e) => setTimeWindow(e.target.value)} /> Next 7 Days</label>
                <label><input type="radio" value="30" checked={timeWindow === '30'} onChange={(e) => setTimeWindow(e.target.value)} /> Next 30 Days</label>
                <label><input type="radio" value="365" checked={timeWindow === '365'} onChange={(e) => setTimeWindow(e.target.value)} /> Next Year</label>
                <label><input type="radio" value="all" checked={timeWindow === 'all'} onChange={(e) => setTimeWindow(e.target.value)} /> All Upcoming</label>
              </div>
            </fieldset>
            <div className="modal-actions">
              <button className="button-secondary" onClick={handleClose}>Cancel</button>
              <button className="button-primary" onClick={handleExportClick}>Export</button>
            </div>
          </>
        )}

        {/* --- View 2: Files Ready for Download --- */}
        {modalView === 'filesReady' && (
          <>
            <h2>Your files are ready.</h2>
            <p>Click the links below to download your calendar files.</p>
            <div className="download-links">
              {generatedFiles.birthdays && (
                <button className="button-primary download-link" onClick={() => triggerDownload(generatedFiles.birthdays)}>
                  Download Birthdays.ics
                </button>
              )}
              {generatedFiles.checkins && (
                <button className="button-primary download-link" onClick={() => triggerDownload(generatedFiles.checkins)}>
                  Download {generatedFiles.checkins.filename}
                </button>
              )}
            </div>
            <div className="modal-actions">
              <button className="button-secondary" onClick={handleClose}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ExportCalendarModal;
