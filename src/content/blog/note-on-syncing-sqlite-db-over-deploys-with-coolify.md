---
title: Notes On Syncing Sqlite Over Coolify Deploys
date: 2026-01-28
description: A diary note on making SQLite survive deploys with Coolify.
---

I usually default to Supabase when I need a database, mostly because it removes all the messy hosting decisions and I can move on with the rest of the build. At some point I wondered if I could get away with SQLite for tiny workloads, just to keep things local and simple. That sent me down a small rabbit hole and I was surprised by how capable SQLite has become. It is fast, boring in a good way, and for very easy tasks it is more than enough. I also bumped into `better-sqlite3` while looking around, which is a synchronous driver that keeps the API simple, has great performance, and gets out of the way when you want to do quick reads and writes in Node. The repo is here if you want to peek: https://github.com/WiseLibs/better-sqlite3.

The moment you leave your laptop and start deploying, the SQLite story changes. If you are on serverless infra like Vercel or Netlify, you cannot expect a local database file to survive deploys or scale in any meaningful way. You can jump to a serverless SQLite provider like https://turso.tech/ and that works, but it is a different tradeoff. If you do have a small VPS, then yes, you can keep SQLite on disk. The tricky part is making sure the database file lives outside the container lifecycle.

I learned this the hard way after a bunch of trial and error. The fix that finally felt right was a Dockerfile that writes the database into a dedicated folder and a Coolify storage volume that mounts into that same path. This is how I am doing it for this website. The key is that the database path is set to a folder that Coolify keeps persistent, and the image creates that directory with the right permissions so it does not fail at runtime.

```Dockerfile
# Create a directory for the database and give ownership to the app user
# This is the recommended target for your persistent volume mount.
RUN mkdir -p /app/data && chown -R appuser:appgroup /app && chmod -R 755 /app

# Database configuration
# Persistent database path (bind this directory in Coolify for survival across deploys)
ENV DB_PATH=/app/data/adrian.db
```

In Coolify the matching piece is the storage volume that targets `/app/data`. That makes the database file survive image rebuilds and deploys, and it also makes the container ephemeral in the right way, because only the data is the durable part.

![Coolify storage volume configuration](/img/coolify-storage.png)

The coffee counter on the site is using this setup, so I can redeploy without losing the counter state.

<CoffeeCounter />

Summary: SQLite is plenty for tiny workloads, it becomes tricky under serverless deploys, and the simple VPS plus Coolify volume route works when you pair it with a Dockerfile that writes the database into a mounted directory.
