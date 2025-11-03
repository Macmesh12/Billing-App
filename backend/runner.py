#!/usr/bin/env python3
"""
Tiny runner used when packaging the backend into a single native binary.

Features:
- Accepts --migrate to run Django migrations (non-interactive).
- Accepts --runserver <host:port> to start the development server on the given
  address. If no args provided, defaults to runserver 127.0.0.1:8765.

This is intentionally minimal so PyInstaller can freeze it and the
Electron host can call it directly when packaged.
"""
import os
import sys


def _ensure_settings_module():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'billing_app.settings')


def run_migrations():
    _ensure_settings_module()
    # Defer Django import until after settings env var is set
    from django.core.management import execute_from_command_line
    execute_from_command_line(['manage.py', 'migrate', '--noinput'])


def run_server(address='127.0.0.1:8765'):
    _ensure_settings_module()
    from django.core.management import execute_from_command_line
    execute_from_command_line(['manage.py', 'runserver', address])


def main():
    # Simple flag parsing. Keep it forgiving since this runner will be invoked
    # by Electron and by CI during local tests.
    args = sys.argv[1:]
    if not args:
        run_server()
        return

    if args[0] in ('--migrate', 'migrate'):
        run_migrations()
        return

    if args[0] in ('--runserver', 'runserver'):
        # allow either `--runserver 127.0.0.1:8765` or `--runserver=127.0.0.1:8765`
        if len(args) >= 2:
            address = args[1]
        else:
            # support --runserver=addr form
            if args[0].startswith('--runserver='):
                address = args[0].split('=', 1)[1]
            else:
                address = '127.0.0.1:8765'
        run_server(address)
        return

    # Unknown/other args: try to interpret as a runserver address
    if ':' in args[0]:
        run_server(args[0])
        return

    # Fallback: run server default
    run_server()


if __name__ == '__main__':
    main()
