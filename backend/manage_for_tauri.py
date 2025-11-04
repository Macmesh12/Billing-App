#!/usr/bin/env python
import os
import sys
import socket

from django.core.management import execute_from_command_line


def _allocate_port(host='127.0.0.1'):
    """Bind to port 0 to obtain an available port and return it."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.bind((host, 0))
        return sock.getsockname()[1]
    finally:
        sock.close()


if __name__ == '__main__':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'billing_app.settings')

    port = _allocate_port()

    # Emit port immediately so Tauri sidecar can read it.
    print(f"DJANGO_PORT:{port}", flush=True)

    args = [sys.argv[0], 'runserver', f'127.0.0.1:{port}']
    if len(sys.argv) > 1:
        args.extend(sys.argv[1:])

    execute_from_command_line(args)
