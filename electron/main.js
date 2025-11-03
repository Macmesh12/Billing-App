// Delegate to the more fully-featured Electron entry in `app/main.js`.
// This file exists for historical reasons; the real application startup
// logic lives in `app/main.js` which handles bundled python, migrations,
// and internal backend selection.
require('./app/main.js');
