# Application Architecture

## Overview

Voice Command Biathlon Target is a web-based application designed for recording biathlon shooting results. It combines speech recognition with a visual target interface to streamline the scoring process.

## Project Structure

```
v2/
├── src/
│   ├── js/
│   │   ├── constants.js          # Global constants and configuration
│   │   ├── modules/
│   │   │   ├── storage.js        # localStorage management
│   │   │   ├── athletes.js       # Athletes list management
│   │   │   ├── sessions.js       # Training sessions management
│   │   │   ├── shooting.js       # Shooting interface logic
│   │   │   ├── speech.js         # Speech recognition setup
│   │   │   ├── email.js          # Email sending functionality
│   │   │   ├── ui.js             # User interface components
│   │   │   └── utils.js          # Utility functions
│   │   ├── services/
│   │   │   └── imageGenerator.js # SVG/Image generation
│   │   └── app.js                # Application entry point
│   ├── css/
│   │   └── styles.css            # Global styles (in HTML)
│   └── index.html                # Main HTML file
├── docs/
│   ├── ARCHITECTURE.md           # This file
│   └── API.md                    # API documentation
├── package.json                  # Project metadata
├── .gitignore                    # Git ignore rules
└── manifest.json                 # Web app manifest
```

## Module Descriptions

### Constants (js/constants.js)
Defines all global constants used throughout the application:
- Target ring configuration (MAX_RADIUS, RING_STEP)
- Number mapping for speech recognition
- Regex patterns for voice command parsing
- EmailJS configuration keys

### Storage Module (js/modules/storage.js)
Handles all persistent data storage via localStorage:
- Sessions (training events)
- Athletes
- Trainer emails
- EmailJS API keys
- Trainer name

**Key Variables:**
- `sessions`: Array of training sessions
- `globalAthletes`: List of all athletes
- `trainerEmails`: Email recipients
- `EMAILJS_PUBLIC_KEY`, `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`

### Athletes Module (js/modules/athletes.js)
Manages the global athletes list:
- Add/remove athletes
- Render athlete list
- Athlete selection in session creation
- "Select All" functionality

### Sessions Module (js/modules/sessions.js)
Handles training session management:
- Create new sessions
- Display sessions
- Delete sessions
- Switch between session view and athlete view
- Set session type (Training, Wettkampf, Anschießen)

### Shooting Module (js/modules/shooting.js)
Core shooting interface logic:
- Open/close shooting interface
- Track shot results
- Handle target clicks
- Add hits to shots array
- Undo last shot
- Validate shots based on position (Liegend/Stehend)

**Key Variables:**
- `currentShots`: Array of recorded shots
- `currentPosition`: 'Liegend' or 'Stehend'
- `MAX_SHOTS`: Maximum shots per series (5, or 8 for relay)
- `corrH`, `corrV`: Horizontal/vertical correction values

### Speech Module (js/modules/speech.js)
Implements voice command recognition:
- Setup Web Speech API
- Parse voice input for ring numbers and directions
- Handle special commands (neue serie, +, zurück, korrektur)
- Athlete name recognition and switching

### Email Module (js/modules/email.js)
Manages email sending functionality:
- Global and session-specific email recipients
- Automatic email sending after series completion
- Test email functionality
- Email template formatting
- JPEG target image generation and attachment

### UI Module (js/modules/ui.js)
Implements user interface components:
- Modal dialogs (settings, session creation, email selection)
- Athlete history display with statistics
- Toast notifications
- Settings panels
- API key management
- Series details visualization

### Utils Module (js/modules/utils.js)
Collection of utility functions:
- Number word conversion (German: "eins" → "1")
- Ring distance calculation
- Biased angle generation for random shot placement
- Swipe handling for mobile delete
- Correction mark calculations
- Average shot computation

### Image Generator Service (js/services/imageGenerator.js)
SVG and image generation:
- Base SVG target template with all rings
- Dynamic SVG generation with shot markers
- Canvas-based JPEG export (for emails)
- Color coding for hits/misses

### App Entry Point (js/app.js)
Application initialization and global bindings:
- DOMContentLoaded event handler
- Form submission handlers
- Global function exposure to window object
- Microphone permission request
- EmailJS initialization

## Data Flow

### Session Creation Flow
1. User clicks "Neue Einheit" → `openSessionModal()`
2. Form populated with location, date, note
3. Athletes selected from global list
4. Session type chosen (setSType)
5. Form submitted → `submitSessionForm()`
6. New session added to `sessions` array
7. Data persisted via `saveSessions()`

### Shooting Flow
1. User navigates to athlete in session
2. Click "Neue Serie" → `openShootingInterface()`
3. Choose position (Liegend/Stehend)
4. Record shots via:
   - Voice commands: "Ring 8, rechts"
   - Click on target SVG
   - Manual text input
5. Each shot: `addHit()` → updates SVG display
6. After 5 shots: `finishSeries()` → `saveHistory()`
7. Optional: Send email with target image

### Email Flow
1. Series completed → check auto-send settings
2. Generate JPEG target image
3. Compile shot data
4. Send via EmailJS to configured recipients
5. Support for global and session-specific recipients

## State Management

The application uses browser localStorage for persistence:
- All data survives page refreshes
- No backend server required
- ~50MB storage limit per origin
- User can clear data via browser settings

## Browser APIs Used

- **Web Speech API**: Voice recognition (`SpeechRecognition`)
- **localStorage**: Persistent data storage
- **Canvas API**: Image generation for emails
- **SVG DOM**: Dynamic shot visualization
- **Touch Events**: Swipe-to-delete functionality

## Dependencies

External:
- Tailwind CSS (via CDN)
- EmailJS (via CDN)
- Inter font (Google Fonts)

No npm/yarn dependencies for core functionality.

## Performance Considerations

- Large history lists rendered in batches (requestAnimationFrame)
- Lazy-loading of SVG containers
- Canvas image generation at 400x400px for email efficiency
- Local storage limits history to manageable size
- Voice recognition runs continuously with debouncing

## Browser Compatibility

Requires:
- Modern browser with Web Speech API support
- Chrome/Edge/Opera (best support)
- Firefox (limited - may need enable feature flag)
- Safari (partial support)

## Security Notes

- All data stored locally in browser
- EmailJS credentials stored in localStorage (visible in browser)
- No user authentication
- Suitable for single-trainer usage
- Not HIPAA/GDPR compliant without additional measures
