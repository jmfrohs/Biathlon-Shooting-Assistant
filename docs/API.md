# API Documentation

## Storage Module API

### Variables
- `sessions`: Array<Session> - All training sessions
- `globalAthletes`: Array<string> - All athlete names
- `trainerEmails`: Array<string> - Email recipients
- `EMAILJS_PUBLIC_KEY`: string - EmailJS public key
- `EMAILJS_SERVICE_ID`: string - EmailJS service ID
- `EMAILJS_TEMPLATE_ID`: string - EmailJS template ID

### Functions
```javascript
saveSessions()                    // Save sessions to localStorage
saveAthletes()                    // Save athletes to localStorage
saveTrainerEmails()               // Save trainer emails to localStorage
getTrainerName(): string          // Get saved trainer name
saveTrainerName(name: string)     // Save trainer name
```

## Athletes Module API

### Variables
- `allSelected`: boolean - Track if all athletes are selected

### Functions
```javascript
renderGlobalAthletes()                   // Render athletes list in UI
addGlobalAthlete()                       // Add new athlete from input
removeGlobalAthlete(index: number)       // Remove athlete by index
renderAthleteCheckboxes()                // Render athlete checkboxes
toggleAllAthletes()                      // Toggle select all athletes
```

## Sessions Module API

### Variables
- `currentSessionIndex`: number - Current session being viewed
- `currentSType`: string - Current session type ('Training', 'Wettkampf', 'Anschießen')

### Functions
```javascript
renderSessions()                         // Render all sessions in list
deleteSession(index: number)             // Delete session by index
showAthletesView(sessionIndex: number)   // Switch to athletes view
submitSessionForm()                      // Submit new session form
setSType(type: string)                   // Set session type
showSessionsView()                       // Switch back to sessions list
```

### Session Object
```typescript
interface Session {
  ort: string                 // Location
  datum: string              // Date (YYYY-MM-DD)
  zusatz: string             // Additional info
  typ: string                // Session type
  athletes: string[]         // Athlete names
  history: {                 // Series history per athlete
    [athleteName]: Series[]
  }
  emails?: string[]          // Session-specific emails
  autoSend?: boolean         // Auto-send emails for this session
}
```

## Shooting Module API

### Variables
- `currentShots`: Array<Shot> - Shots in current series
- `currentPosition`: string - Position ('Liegend' or 'Stehend')
- `MAX_SHOTS`: number - Maximum shots (5 or 8)
- `correctionVisible`: boolean - Correction marks visible
- `avgX`, `avgY`: number - Average shot position
- `corrH`, `corrV`: number - Horizontal/vertical correction

### Functions
```javascript
openShootingInterface()        // Open shooting modal
closeShootingInterface()       // Close shooting modal
resetTargetVisuals()           // Clear all shot marks from SVG
setPosition(position: string)  // Set position (Liegend/Stehend)
handleTargetClick(event)       // Handle click on target SVG
addHit(ring, direction, cx, cy) // Add shot to current series
updateShotCounter()            // Update UI shot counter
isValidShot(ringNumber): bool  // Validate shot based on position
updateStatusMessage()          // Update status text
finishSeries()                 // Complete current series
resetTarget()                  // Clear series for next one
undoLastShot()                 // Remove last shot
```

### Shot Object
```typescript
interface Shot {
  shot: number        // Shot number (1-5)
  ring: number        // Ring hit (0-10)
  direction: string   // Direction (e.g., "rechts", "oben")
  x: number          // X coordinate on SVG
  y: number          // Y coordinate on SVG
  hit: boolean       // Valid hit (based on position)
  timestamp: number  // When shot was recorded
}
```

## Speech Module API

### Variables
- `recognition`: SpeechRecognition - Web Speech API instance
- `isRecording`: boolean - Currently recording

### Functions
```javascript
setupSpeechRecognition()       // Initialize speech recognition
toggleSpeech()                 // Start/stop recording
```

### Voice Commands
```
// Basic shots
"Ring 8, rechts"
"9 links oben"
"10"

// Position changes
"liegend"
"stehend"

// Series control
"neue serie"            // Finish series and start new one
"zurück"               // Undo last shot
"+"                    // Add 3 more shots for relay
"fehler"               // Register miss (ring 0)

// Corrections
"korrektur"            // Toggle correction marks

// Athlete switching
[athlete name]         // Switch to athlete and open shooting
```

## Email Module API

### Functions
```javascript
renderTrainerEmails()                    // Render global email list
addTrainerEmail()                        // Add email from input
removeTrainerEmail(index: number)        // Remove trainer email
saveTrainerEmails()                      // Save to localStorage
saveEmailSettings()                      // Save auto-send setting
sendEmailWithSeries(series, emails)      // Send email(s) with series
sendTestEmail()                          // Send test email
formatShotInfo(shot): string             // Format shot for email
sendEmailWithSeriesAndRecipient(series, email)  // Send to specific email
renderSessionEmails()                    // Render session email list
addSessionEmail()                        // Add session email
removeSessionEmail(index: number)        // Remove session email
renderSessionEmailSettings()              // Render session email settings
saveSessionEmailSettings()                // Save session email settings
```

## UI Module API

### Functions
```javascript
renderTrainerName()                      // Display trainer name
openSessionModal()                       // Open session creation modal
openSettings()                           // Open settings modal
closeModal(id: string)                   // Close modal by ID
showToast(message, type)                 // Show notification
showAthleteDetail(athleteName: string)   // Show athlete series
backToAthletes()                         // Return to athletes list
getAthleteHistory(): Array<Series>       // Get current athlete's series
renderAthleteHistory()                   // Render athlete's series
toggleSeriesDetails(index: number)       // Toggle series details
showSeriesCorrectionMarks(index)         // Show correction marks
hideSeriesCorrectionMarks(svg)           // Hide correction marks
openTargetFullscreen(index)              // Open target in fullscreen
deleteSeries(index)                      // Delete series by index
openSessionSettings()                    // Open session settings modal
renderSessionAthleteSelect()             // Render athlete selector
renderSessionAthletes()                  // Render session athletes
addSessionAthlete()                      // Add athlete to session
removeSessionAthlete(index)              // Remove athlete from session
openEmailSelectionModal(index)           // Open email selector
sendSeriesEmail(email, index)            // Send series to email
saveApiKeys()                            // Save EmailJS API keys
resetApiKeysToDefault()                  // Reset to default keys
```

### Series Object
```typescript
interface Series {
  timestamp: string      // Date and time
  position: string       // Liegend or Stehend
  hits: number          // Number of valid hits (0-5)
  totalScore: number    // Sum of ring numbers
  corrH: number         // Horizontal correction (clicks)
  corrV: number         // Vertical correction (clicks)
  shootingTime: number  // Time from first to last shot
  shots: Shot[]         // All shots in series
}
```

## Utils Module API

### Variables
- `currentAthleteName`: string - Currently selected athlete

### Functions
```javascript
convertNumberWords(text: string): string    // Convert German numbers to digits
getRandomArbitrary(min, max): number        // Random number in range
getRingFromDistance(distance): number       // Determine ring from distance
getBiasedAngle(direction): number           // Get angle for direction
handleTextfieldInput(event)                 // Process text input
initSwipeHandlers()                         // Initialize touch swipe
handleSwipeDelete(element)                  // Handle swipe delete
getAverageShot(): object                    // Calculate average hit position
showCorrectionMarks()                       // Display correction marks
hideCorrectionMarks()                       // Hide correction marks
toggleCorrection()                          // Toggle correction visibility
```

## Image Generator Service API

### Constants
- `baseSvg`: string - SVG template for target

### Functions
```javascript
generateTargetSvg(shots, seriesIndex): string    // Generate SVG with shots
generateTargetImage(shots): Promise<string>      // Generate JPEG data URL
renderShots()                                    // Render shots on SVG
```

## Direction Values

Valid directions for voice commands:
- `oben`, `hoch`
- `unten`, `tief`
- `links`
- `rechts`
- `oben links`, `hoch links`, `links oben`, `links hoch`
- `oben rechts`, `hoch rechts`, `rechts oben`, `rechts hoch`
- `unten links`, `tief links`, `links unten`, `links tief`
- `unten rechts`, `tief rechts`, `rechts unten`, `rechts tief`
- `zentrum`, `mitte`

## Ring Numbers

Valid ring numbers (0-10):
- 0: Miss (outside target)
- 1-10: Valid hits
- X or "zehn": 10 ring
- "null" or "fehler": 0 (miss)

## Position Requirements

- **Liegend** (Prone): Minimum ring 8 counts as valid hit
- **Stehend** (Standing): Minimum ring 4 counts as valid hit
- Shots below minimum ring are marked as "invalid" but still recorded
