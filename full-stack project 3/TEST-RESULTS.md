# Verification results

Verified locally on **30 September 2026** on Windows, using real SQL Server LocalDB. No in-memory database or SQLite was used.

## Environment

- .NET SDK: 10.0.400; target framework: net10.0.
- Entity Framework Core SQL Server provider and `dotnet-ef`: 10.0.11.
- Swashbuckle.AspNetCore: 10.2.3.
- SQL Server LocalDB: 17.0.4025.3, instance `(localdb)\MSSQLLocalDB`.
- Database: `DecodeLabsP3Books`, Windows authentication.
- Test API address: `http://localhost:5087`.

## Build and migration

`dotnet build BookInventory.slnx --no-restore` passed with **0 warnings and 0 errors**.

Generated `20260930142847_InitialCreate` using `dotnet ef migrations add InitialCreate --project BookInventory.Api --no-build`. Applied it using `dotnet ef database update --project BookInventory.Api --no-build` (through the smoke test).

EF's SQL output confirmed creation of the database and `Books` table, including the identity primary key, required columns, string lengths, and four CHECK constraints. The migration was recorded in `__EFMigrationsHistory`. Subsequent runs correctly reported that the database was already up to date.

## HTTP and persistence tests

Executed `scripts/Test-Api.ps1`. Final result: **53 checks passed**, process exit code **0**.

| Area | Actual result |
| --- | --- |
| Swagger | UI HTML returned 200; OpenAPI JSON listed all five endpoint operations |
| GET list | 200; newly created book appeared exactly once |
| POST | 201; positive generated ID and correct Location header; text trimmed |
| GET by ID | 200; saved quantity matched |
| PUT | 204 with an empty response body; all four fields updated |
| Invalid POST and PUT | 400 with validation error details for all 14 input cases below |
| Rejected writes | Invalid PUT left the book unchanged; invalid POST added no rows |
| Missing IDs | GET, PUT, DELETE each returned 404 for nonexistent integer ID |
| Noninteger ID | GET returned 404 |
| Valid boundaries | Title 200 characters, author 120, year 1, quantity 0 accepted; year 9999 and quantity 1,000,000 accepted |
| Persistence | Stopped the API process, waited for exit, launched a new process, verified different process ID; GET returned the same book ID, updated title, author, year 2025, and quantity 8 |
| DELETE | 204 with an empty response body |
| After deletion | GET, repeat DELETE, and PUT each returned 404 |
| Cleanup | Original row count restored; API test process stopped |

The 14 invalid cases, each tested with both POST and PUT, were: missing all fields; blank title; null author; overlong title; overlong author; year 0; year 10000; quantity -1; quantity 1000001; missing quantity; missing year; a nonnumeric year; malformed JSON; and a JSON null body.

The persistence check used the same SQL Server database across two separate API processes. It did not reconstruct the book in code or seed it again on restart. The local database and migration remain available for your own demonstration; test-created books were deleted.

## Limits of verification

- Tested on this Windows computer with LocalDB; not executed on a second computer, a remote SQL Server service, Linux, or a hosted environment.
- Swagger HTML and its operation definitions were tested over HTTP. Its browser buttons were not manually exercised; all CRUD behavior was tested through HTTP requests.
- Restarted the API, not Windows or the SQL Server engine.
- GitHub creation, push, and Decode Labs submission were intentionally not performed, pending your review.

To repeat the verification after restoring packages/tools, use `pwsh -File scripts/Test-Api.ps1` from the project root. The script prints each assertion and writes API process logs to the git-ignored `TestResults` folder. The final run's captured console output is also saved locally as `TestResults/smoke.log`.
