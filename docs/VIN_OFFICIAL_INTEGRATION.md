# Qitaa — Official VIN verification (phase 2)

- Uses public U.S. NHTSA vPIC `DecodeVinValuesExtended` as an optional online source. No paid subscription or secret API key.
- The user initiates the request by pressing the decode button; Qitaa does not store the VIN in its database. **The external U.S. agency receives the VIN in the request URL**, so users should be informed of that data sharing.
- NHTSA does not cover every vehicle sold in Yemen. Timeouts, CORS restrictions, incomplete responses, invalid check digits, and model mismatches fall back to manual vehicle selection. Live network connectivity has not yet been validated against production hosting.
- The UI only auto-selects an exact existing make/model and a year within the existing range. It never creates a vehicle, guesses a model, or asserts OEM/fitment compatibility.
- Test: mock successful/failed NHTSA replies and invalid VINs in `tests/nhtsa-vin.test.ts`; existing VIN regression suite remains in CI.
- Next gate: browser testing on iOS and Android, cross-origin connectivity, Arabic copy review, real vehicle samples with permission, no logging of VIN in analytics.
