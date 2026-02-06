---
id: REQ-038
title: Review and enforce testing infrastructure
status: pending
created_at: 2026-02-05T19:30:00Z
related: [REQ-014]
---

# Review and Enforce Testing Infrastructure

## What
REQ-014 was supposed to add test infrastructure and comprehensive tests. Review whether that actually happened — are tests present, runnable, and passing? If not, make it happen now. A standard test suite must exist and all changes going forward need to be tested.

## Context
Despite REQ-014 requesting test infrastructure, subsequent work requests have not shown evidence of tests being run. Either the tests weren't properly created, aren't being maintained, or aren't being run as part of the work loop. This request is to:

1. Verify the current state of testing (does `npm test` work? how many tests exist? what coverage?)
2. If tests are missing or broken, fix/create them
3. Ensure the test suite covers API endpoints, services, WebSocket, and frontend behavior
4. Make sure tests are actually passing before considering this done

---
*Source: "review the status of a testing infrastructure. This was in a prior request, but I never saw any testing happening afterward. Changes need to be tested and a standard test suite is required. Make this happen."*
