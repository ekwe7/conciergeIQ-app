# Contracts Guide

The canonical contract reference is [`packages/contracts/README.md`](../packages/contracts/README.md). Keep the detailed guidance there to avoid two documents drifting apart.

Frontend contributor rules:

1. Import API and event types from the public contracts package.
2. Do not duplicate shared request, response, or event interfaces inside either app.
3. Treat examples in docs as illustrative until verified against actual exports and backend routes.
4. Validate untrusted network and real-time payloads at runtime where required.
5. Coordinate contract changes with backend contributors and update tests in the same change.
