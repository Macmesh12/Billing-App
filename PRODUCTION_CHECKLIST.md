# Production Readiness Checklist

## Recent Fixes Completed ✅

### 1. Logo Display Issue - FIXED
- **Problem**: Logo showing as text "logo placeholder" instead of image
- **Solution**: 
  - Added `assets/` directory to `STATICFILES_DIRS` in `settings.py`
  - Added `/assets/` URL route in `urls.py`
  - Logo accessible at `/assets/logo.png`
- **Status**: ✅ Configuration complete, requires server restart to test

### 2. Preview Mode Size - FIXED
- **Problem**: Invoice preview mode was A3 instead of A4 like other documents
- **Solution**: Updated `general.css` with `.is-preview .document` rule for A4 sizing (210mm × 297mm)
- **Status**: ✅ CSS updated, requires browser testing

### 3. Validation Errors - FIXED
- **Problem**: Download button showing validation errors even after filling required fields
- **Solution**: 
  - Rewrote `handleSave()` in `invoice.js`, `receipt.js`, and `waybill.js`
  - Added client-side validation before PDF download
  - Shows user-friendly error messages with `showToast()`
  - Focuses invalid fields automatically
- **Status**: ✅ All three document types updated, requires functional testing

## Pre-Deployment Testing Required

### Backend Testing
- [ ] Restart Django server: `cd backend && source .venv/bin/activate && python manage.py runserver 127.0.0.1:8765`
- [ ] Verify server starts without errors
- [ ] Check logo loads at `http://127.0.0.1:8765/assets/logo.png`
- [ ] Test all static assets loading correctly

### Frontend Testing - Invoice
- [ ] Open `http://127.0.0.1:8765/invoice.html`
- [ ] Verify logo displays in header (not "logo placeholder" text)
- [ ] Test edit mode is A3 size (297mm × 420mm)
- [ ] Click Preview button, verify preview is A4 size (210mm × 297mm)
- [ ] Try downloading without filling fields - should show error toast
- [ ] Fill customer name and date, download should work
- [ ] Open generated PDF, verify all content fits on one A4 page
- [ ] Check PDF logo displays correctly

### Frontend Testing - Receipt
- [ ] Open `http://127.0.0.1:8765/receipt.html`
- [ ] Verify logo displays correctly
- [ ] Test edit mode is A3, preview is A4
- [ ] Test validation (customer name + date required)
- [ ] Test PDF generation and content fit

### Frontend Testing - Waybill
- [ ] Open `http://127.0.0.1:8765/waybill.html`
- [ ] Verify logo displays correctly
- [ ] Test edit mode is A3, preview is A4
- [ ] Test validation (date required)
- [ ] Test PDF generation and content fit

## Code Quality Checks

### Python Backend
- [ ] Run tests: `cd backend && python manage.py test`
- [ ] Check for lint errors: `flake8 backend/`
- [ ] Verify all migrations applied: `python manage.py showmigrations`

### JavaScript Frontend
- [ ] Check browser console for errors
- [ ] Verify no undefined variables or functions
- [ ] Test all CRUD operations for each document type

## Security Checklist

### Django Settings
- [ ] Set `DEBUG = False` for production
- [ ] Configure secure `SECRET_KEY` (use environment variable)
- [ ] Set `ALLOWED_HOSTS = ["127.0.0.1", "localhost"]`
- [ ] Review `STATICFILES_DIRS` paths
- [ ] Configure `STATIC_ROOT` for collectstatic

### File Permissions
- [ ] Ensure database file has correct permissions
- [ ] Verify static files are readable
- [ ] Check assets directory permissions

## Deployment Preparation

### PyInstaller Backend Bundle
- [ ] Create `backend/build_backend.spec` (see DEPLOYMENT.md)
- [ ] Test PyInstaller build: `pyinstaller build_backend.spec`
- [ ] Verify all dependencies included (Django, WeasyPrint, etc.)
- [ ] Test bundled backend starts correctly
- [ ] Check static files and templates included

### Electron App Configuration
- [ ] Update `electron/main.js` for production paths
- [ ] Configure `electron/package.json` with build settings
- [ ] Set app icon to `assets/logo.png`
- [ ] Define extraResources for backend and assets
- [ ] Test electron app in dev mode: `npm start`

### Windows Build (.exe)
- [ ] Install electron-builder: `npm install --save-dev electron-builder`
- [ ] Build: `npm run build:win`
- [ ] Test installer on clean Windows system
- [ ] Verify app installs correctly
- [ ] Test all features in installed app
- [ ] Check database persistence

### Linux Build (.deb)
- [ ] Build: `npm run build:linux`
- [ ] Install: `sudo dpkg -i dist/billing-app_*.deb`
- [ ] Test on Ubuntu/Debian system
- [ ] Verify app appears in applications menu
- [ ] Test all features
- [ ] Check database location (~/.config/billing-app/)

## Final Checks Before Release

### Functionality
- [ ] Create new invoice, receipt, waybill
- [ ] Generate PDFs for all document types
- [ ] Verify PDF quality and content
- [ ] Test number sequencing (Firestore counters)
- [ ] Test offline mode (local counter fallback)

### User Experience
- [ ] Logo displays in all locations
- [ ] Forms are intuitive and responsive
- [ ] Validation messages are clear
- [ ] PDF downloads work smoothly
- [ ] Print functionality works

### Performance
- [ ] App starts within reasonable time
- [ ] PDF generation is fast
- [ ] No memory leaks
- [ ] Database queries optimized

## Known Issues / Limitations

None at this time - all reported issues have been fixed.

## Post-Deployment

### Monitoring
- [ ] Set up error logging
- [ ] Monitor user feedback
- [ ] Track crash reports

### Documentation
- [ ] User manual for end users
- [ ] Installation guide
- [ ] Troubleshooting guide
- [ ] API documentation (if needed)

### Maintenance
- [ ] Plan for updates and patches
- [ ] Version control strategy
- [ ] Backup strategy for user databases

## Next Steps

1. **Immediate**: Restart Django server and complete all testing sections above
2. **Short-term**: Build PyInstaller backend bundle and test
3. **Medium-term**: Build Electron packages for Windows and Linux
4. **Long-term**: Prepare distribution channels and user documentation

---

**Current Status**: Code fixes complete, ready for testing phase.
**Blocker**: Server must be restarted to apply settings/URL changes for logo serving.
**Timeline**: Approximately 2-4 hours for complete testing and packaging.
