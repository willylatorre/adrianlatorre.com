#!/bin/sh
chown -R appuser:appgroup /app/data
exec su -s /bin/sh -c 'python -m server.main' appuser
