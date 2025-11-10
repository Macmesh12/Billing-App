#!/bin/bash
# Build a .deb package for Billing-App
set -e

PKG_NAME="billing-app"
PKG_VER="1.0.0"
PKG_ARCH="all"
PKG_DIR="${PKG_NAME}_${PKG_VER}_${PKG_ARCH}"
OUTPUT_DEB="${PKG_NAME}_${PKG_VER}_${PKG_ARCH}.deb"

echo "=== Building Billing-App .deb package ==="

# Clean previous build
rm -rf "$PKG_DIR" "$OUTPUT_DEB"

# Create package directory structure
mkdir -p "$PKG_DIR/opt/billing-app"
mkdir -p "$PKG_DIR/DEBIAN"

echo "Copying project files..."
# Copy all essential project directories
for dir in backend frontend assets documents BUILD_INSTRUCTIONS.md README.md; do
    if [ -e "$dir" ]; then
        cp -r "$dir" "$PKG_DIR/opt/billing-app/"
    fi
done

# Copy optional directories if they exist
for dir in my-desktop-app releases deliverables; do
    if [ -d "$dir" ]; then
        cp -r "$dir" "$PKG_DIR/opt/billing-app/" 2>/dev/null || true
    fi
done

# Remove build artifacts and caches from package
find "$PKG_DIR" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find "$PKG_DIR" -type d -name ".venv" -exec rm -rf {} + 2>/dev/null || true
find "$PKG_DIR" -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
find "$PKG_DIR" -type f -name "*.pyc" -delete 2>/dev/null || true
find "$PKG_DIR" -type f -name "db.sqlite3" -delete 2>/dev/null || true

# Create DEBIAN control file
cat > "$PKG_DIR/DEBIAN/control" <<EOF
Package: billing-app
Version: 1.0.0
Section: web
Priority: optional
Architecture: all
Depends: python3 (>= 3.8), python3-pip, python3-venv
Maintainer: Billing App Team <contact@billingapp.local>
Description: Billing App - Complete Django-based billing application
 Full installation of the Billing-App project including backend Django
 application, frontend templates/static files, and documentation.
 .
 Installs to /opt/billing-app
 .
 After installation, run setup:
   cd /opt/billing-app/backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py runserver 127.0.0.1:8765
EOF

# Set proper permissions
chmod 0755 "$PKG_DIR/DEBIAN"
chmod 0644 "$PKG_DIR/DEBIAN/control"

# Build the package
echo "Building .deb package..."
dpkg-deb --build "$PKG_DIR" "$OUTPUT_DEB"

# Show result
echo ""
echo "=== Package created successfully ==="
ls -lh "$OUTPUT_DEB"
echo ""
echo "Install with: sudo dpkg -i $OUTPUT_DEB"
echo "Remove with:  sudo dpkg -r billing-app"
echo ""
echo "Package size: $(du -h "$OUTPUT_DEB" | cut -f1)"
