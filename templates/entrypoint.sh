#!/bin/sh
# Entrypoint for services that read assets/data RELATIVE to their working dir.
# Runs in the data volume (/data), links in read-only image assets, seeds any
# files the service refuses to start without, then exec's the binary as PID 1.
set -e

cd /data

# Expose read-only image assets inside the working dir (idempotent each boot).
# ln -sfn /opt/app/templates templates

# Seed files the service fatals without (only if absent — never clobber user data).
# [ -f config.json ]   || cp /opt/app/defaults/config.json config.json
# [ -f allowlist.json ] || printf '[]\n' > allowlist.json

exec app
