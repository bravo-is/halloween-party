# Project Heaven

A private Halloween invitation built with Astro. The guest page includes an
animated installation of suspended white spheres, the supplied Project Heaven
sigil, pointer parallax, reduced-motion support, responsive layouts, personal
RSVPs, and notes. The host dashboard creates invitations, downloads QR codes,
copies links, filters responses, and displays guest notes.

## Run locally

Requires Node.js 22 and npm.

```sh
npm install
cp .env.example .env
# Set ADMIN_PASSWORD to your chosen non-empty password.
npm run dev:full
```

Open http://localhost:8888. Netlify Dev runs Astro and Functions with a local
Blobs store. `npm run dev` serves the design at port 4321 but does not run the
invitation API. Netlify CLI may request login/site linking depending on your
environment; local storage is separate from deployed storage.

## Configure your party

Edit `src/config.ts` for date, time, venue, and dress code. The initial date is
October 31, 2026; the venue is intentionally a placeholder. Also update the
decorative `OCTOBER 31` and `31 / 10 / 26` in `src/pages/index.astro` if
changing the year/date. The venue and address are returned only after a valid
invitation token is supplied.

## Deploy on Netlify

Production share-preview images use `https://h7event.com`. Netlify deploy
previews and branch deploys use their own deployment URL. `PUBLIC_SITE_URL`
can override either at build time; remove or update any old override when
changing domains, then rebuild and deploy.

1. Push this repository to your Git provider and import it in Netlify.
2. Netlify reads `netlify.toml`: build `npm run build`, publish `dist`,
   Functions `netlify/functions`.
3. Add `ADMIN_PASSWORD` as a secret environment variable available to Functions.
   Choose a non-empty password; there is no minimum length. Do not use a
   `PUBLIC_` prefix. Redeploy after setting or changing it.
4. Visit `/admin/`, sign in, and create an invitation for each person. Copy the
   personal URL or download its QR code and send it yourself.
5. Verify an RSVP on the deployed site before sharing the rest of your
   invitations.

No separate database account is needed: Netlify Blobs stores each invitation
independently with strong consistency. Deploy previews/local development should
use test invitations; configure a separate Netlify site if you need a fully
isolated staging guest list. Both hosts use the shared password. Sessions are
signed, HttpOnly cookies valid for eight hours; rotating the password
invalidates sessions. Sign-out clears the current browser cookie.

Treat invitation URLs/QR codes as private bearer links: anyone with one can read
or update that guest's RSVP and see the location. They cannot list other
invitations. There is no public guest registration, email delivery, or per-host account system. If a link is accidentally shared, a host
can remove its `invite/<token>` entry in Netlify Blobs and create a new
invitation.

## Validation

```sh
npm test
npm run build
```

Tests exercise authentication, session expiry/tampering, guest creation, RSVP
persistence and updates, validation, cross-origin rejection, and guest-list
access. The full create-invite → QR → RSVP-with-note → host-dashboard flow was
also verified in a browser against Netlify Dev's local Blobs store. Real Netlify
storage and deployment still need a deployed smoke test.

The production dependency audit passes (`npm audit --omit=dev`). The current
Netlify CLI still has upstream development-only audit advisories; it is not
shipped as part of the guest-facing site.

If running Netlify Dev through an AI coding agent, Astro 7 may automatically
detach its dev server, causing Netlify Dev to exit. Set `ASTRO_DEV_BACKGROUND=1`
in that process environment to keep Astro in the foreground under Netlify.
Ordinary terminal usage does not need this workaround.

Implementation references:
[Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/),
[Netlify Functions](https://docs.netlify.com/build/functions/overview/).

## Party updates and extra guests

The host dashboard has an announcements editor. Save to replace the public board;
clear the text and save to remove an update. Plain text and line breaks are supported.
The beverage menu is in `src/pages/index.astro`.

Enable +1 when creating an invite, or use Allow +1 / Remove +1 on an existing
invite. The personal link and QR code stay the same. Invited guests can check
that they are bringing a +1 with their RSVP. Declining or revoking permission
clears that extra guest. Existing invitations default to no +1.

The public invited total counts invitations plus permitted +1 places, including
pending and declined invitations. It does not reveal names, notes, or the venue.
The host Coming count includes confirmed +1s; pending and declined counts are
invitation responses. Announcements and the total load when the page is opened
or reloaded, without requiring a deployment.
