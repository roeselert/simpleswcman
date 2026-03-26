1. UI is not clickable
2. No transaction control on service level
5. publish to branch public (only html, css, js files, every thing in root)
6. Missing Input Validation: Services accept IDs and text fields but no validation layer visible. Example in services.js: Functions like addInformationsverbund() should validate inputs. Recommendation: Implement validation middleware/layer before database operations
7. No Authentication/Authorization Layer: PWA has no visible auth mechanism. All database operations accessible without permission checks. Recommendation: Implement user context and authorization checks in adapter layer
8. Error Handling	No try-catch blocks visible in adapter/services	Add explicit error handling, throw typed errors
9. Logging	No logging strategy visible	Implement debug logging for troubleshooting
