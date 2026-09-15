# Project Heaven

A private Halloween invitation built with Astro. The guest page includes an animated installation of suspended white spheres, the supplied Project Heaven sigil, pointer parallax, reduced-motion support, responsive layouts, personal RSVPs, and notes. The host dashboard creates invitations, downloads QR codes, copies links, filters responses, and displays guest notes.

## Run locally

Requires Node.js 22 and npm.

```sh
npm install
cp .env.example .env
# Set ADMIN_PASSWORD to your chosen non-empty password.
npm run dev:full
```

Open http://localhost:8888. Netlify Dev runs Astro and Functions with a local Blobs store. `npm run dev` serves the design at port 4321 but does not run the invitation API. Netlify CLI may request login/site linking depending on your environment; local storage is separate from deployed storage.

## Configure your party

Edit `src/config.ts` for date, time, venue, and dress code. The initial date is October 31, 2026; the venue is intentionally a placeholder. Also update the decorative `OCTOBER 31` and `31 / 10 / 26` in `src/pages/index.astro` if changing the year/date. The venue and address are returned only after a valid invitation token is supplied.

## Deploy on Netlify

1. Push this repository to your Git provider and import it in Netlify.
2. Netlify reads `netlify.toml`: build `npm run build`, publish `dist`, Functions `netlify/functions`.
3. Add `ADMIN_PASSWORD` as a secret environment variable available to Functions. Choose a non-empty password; there is no minimum length. Do not use a `PUBLIC_` prefix. Redeploy after setting or changing it.
4. Visit `/admin/`, sign in, and create an invitation for each person. Copy the personal URL or download its QR code and send it yourself.
5. Verify an RSVP on the deployed site before sharing the rest of your invitations.

No separate database account is needed: Netlify Blobs stores each invitation independently with strong consistency. Deploy previews/local development should use test invitations; configure a separate Netlify site if you need a fully isolated staging guest list. Both hosts use the shared password. Sessions are signed, HttpOnly cookies valid for eight hours; rotating the password invalidates sessions. Sign-out clears the current browser cookie.

Treat invitation URLs/QR codes as private bearer links: anyone with one can read or update that guest's RSVP and see the location. They cannot list other invitations. There is no public guest registration, email delivery, plus-one management, or per-host account system. If a link is accidentally shared, a host can remove its `invite/<token>` entry in Netlify Blobs and create a new invitation.

## Link previews

Shared invitation links include Open Graph and large-image Twitter Card metadata in the static HTML, so preview crawlers do not need JavaScript or access to the RSVP API. The 1200 × 630 JPEG is `public/project-heaven-social.jpg`. The card contains only the party branding, public date, and tagline, never guest names, tokens, RSVP notes, or the private location. Admin pages do not include a social card.

Netlify automatically supplies the public image origin at build time through `URL` (production) or `DEPLOY_PRIME_URL` (previews). To override it, set the build environment variable `PUBLIC_SITE_URL` to your public HTTPS origin and rebuild. Local builds use `http://localhost:8888`; external messaging services cannot fetch a localhost preview. The published page and JPEG must be accessible without a site-wide password or login.

After deployment, send a test invitation link in Messages or Discord. The app decides its final layout and may cache previews. Invitation URLs intentionally do not have a canonical/`og:url` override that could replace their unique query token with the public homepage.

To regenerate the card from the existing design, run `npm run social:generate`, then rebuild. Its editable layout and text are in `scripts/generate-social-card.mjs`; update these when changing the date or tagline. The generated JPEG is included with the site and requires no image generation service at build time.

References: [Open Graph metadata](https://ogp.me/), [Apple's guidance for rich previews in Messages](https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages).

## Validation

```sh
npm test
npm run build
```

Tests exercise authentication, session expiry/tampering, guest creation, RSVP persistence and updates, validation, cross-origin rejection, and guest-list access. The full create-invite → QR → RSVP-with-note → host-dashboard flow was also verified in a browser against Netlify Dev's local Blobs store. Real Netlify storage and deployment still need a deployed smoke test.

The production dependency audit passes (`npm audit --omit=dev`). The current Netlify CLI still has upstream development-only audit advisories; it is not shipped as part of the guest-facing site.

If running Netlify Dev through an AI coding agent, Astro 7 may automatically detach its dev server, causing Netlify Dev to exit. Set `ASTRO_DEV_BACKGROUND=1` in that process environment to keep Astro in the foreground under Netlify. Ordinary terminal usage does not need this workaround.

Implementation references: [Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/), [Netlify Functions](https://docs.netlify.com/build/functions/overview/).
