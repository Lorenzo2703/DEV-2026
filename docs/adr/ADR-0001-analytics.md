# ADR-0001: Use self-hosted Umami for analytics

- **Status:** Accepted
- **Date:** 2026-11-12

## Context

The handbook calls for cookieless analytics, choosing between Plausible and Umami. Umami's documentation says its web tracker does not use cookies, can be self-hosted, and collects pageviews and other browsing metadata. Its repository is MIT-licensed. Plausible also offers a self-hosted, cookieless Community Edition under the AGPL.

## Decision

Use self-hosted Umami when analytics is configured. Keep it disabled until the operator provides an HTTPS collector, a website ID, and a locally served tracker script. Restrict tracking to the production hostname, exclude URL query strings and fragments, and respect supported Do Not Track signals. Do not enable automatic performance or error collection.

The tracker asset is supplied and maintained by the operator, not downloaded during a build. Serving it from the site origin lets the existing JavaScript budget check include it. Verify the tracker version, integrity, and licence before adding or updating the asset.

## Consequences

- There is no analytics traffic until configuration and an Umami deployment exist.
- The operator is responsible for securing the collector, access controls, retention, upgrades, and any privacy obligations. Self-hosted data is retained indefinitely by default unless deleted.
- Cookieless tracking does not by itself establish legal compliance or eliminate every possible consent requirement.
- The tracker is an additional client-side dependency and must fit the JavaScript budget.

## Sources

- [Umami FAQ](https://docs.umami.is/docs/faq) — accessed 2026-11-12.
- [Umami tracker configuration](https://docs.umami.is/docs/tracker-configuration) — accessed 2026-11-12.
- [Umami licence](https://raw.githubusercontent.com/umami-software/umami/master/LICENSE) — accessed 2026-11-12.
- [Plausible self-hosted analytics](https://plausible.io/self-hosted-web-analytics) — accessed 2026-11-12.
