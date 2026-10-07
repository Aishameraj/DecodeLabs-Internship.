# Decode Labs Project 3: Database Integration

A beginner-friendly Book Inventory API built with **C#, ASP.NET Core 10, Entity Framework Core 10, and SQL Server**. It follows the supplied Full Stack P3 brief: design a simple schema, perform CRUD, and handle stored data properly. There is no frontend or authentication in this project; Swagger provides the demonstration screen.

## How it works

A request reaches `BooksController`. ASP.NET validates its data. The controller uses `BookInventoryContext` to ask EF Core to read or change SQL Server rows. `SaveChangesAsync` commits changes to the database. Stopping the API does not remove these rows. A migration is a versioned description of the table that another computer can apply.

EF Core sends parameterized SQL, so user text is passed as data instead of being joined into executable SQL. This follows the PDF's guidance on SQL injection protection. The single `Books` table has a primary key; relationships and additional tables are unnecessary for this inventory's scope.

```text
BookInventory.Api/
  Controllers/BooksController.cs  # Five HTTP endpoints
  Data/BookInventoryContext.cs    # EF Core and database rules
  Models/Book.cs                 # Stored row
  Models/BookRequest.cs          # POST/PUT validation
  Migrations/                   # Generated schema and snapshot
  Properties/launchSettings.json
  Program.cs                    # Registers EF, controllers and Swagger
  appsettings.json              # Password-free local connection
  BookInventory.http            # Example HTTP requests
scripts/                        # Real SQL Server smoke test
TEST-RESULTS.md                  # Actual verification results
```

## Prerequisites

- .NET 10 SDK (not just the runtime): https://dotnet.microsoft.com/download/dotnet/10.0
- SQL Server. On Windows, SQL Server Express **LocalDB** is sufficient and stores real database files on disk. Install it through Visual Studio Installer's SQL Server Express LocalDB component or Microsoft's SQL Server Express installer. SQL Server Express/Developer as a service also works.
- Optional: Visual Studio, VS Code, or SQL Server Management Studio (SSMS).
- PowerShell 7 to run the included automated smoke test.

## SQL Server setup and connection string

The default `BookInventory.Api/appsettings.json` contains:

```json
"ConnectionStrings": {
  "BooksDatabase": "Server=(localdb)\\MSSQLLocalDB;Database=DecodeLabsP3Books;Trusted_Connection=True;Encrypt=True;TrustServerCertificate=True"
}
```

`Trusted_Connection=True` uses your Windows account, so there is no password. `TrustServerCertificate=True` is for this local learning setup; a deployed server should use a trusted certificate and certificate validation. The API binds to localhost for development.

For LocalDB, open PowerShell and run:

```powershell
sqllocaldb info
sqllocaldb start MSSQLLocalDB
```

If `sqllocaldb` is not on PATH, find it under `C:\Program Files\Microsoft SQL Server\<version>\Tools\Binn\SqlLocalDB.exe`. For example, this computer has version folder `170`:

```powershell
& 'C:\Program Files\Microsoft SQL Server\170\Tools\Binn\SqlLocalDB.exe' start MSSQLLocalDB
```

For a SQL Server service, replace only `Server=(localdb)\\MSSQLLocalDB` in JSON with your server name, such as `Server=.\\SQLEXPRESS` or `Server=YOUR-PC\\SQLEXPRESS`. JSON requires doubled backslashes. Use the same server name you use to connect in SSMS. Your account needs permission to create the database and tables. Keep the database name `DecodeLabsP3Books` to avoid changing another project's database.

If your server requires SQL authentication, store the complete connection string in user secrets, never in a committed JSON file:

```powershell
dotnet user-secrets set "ConnectionStrings:BooksDatabase" "Server=YOUR_SERVER;Database=DecodeLabsP3Books;User Id=YOUR_USER;Password=YOUR_PASSWORD;Encrypt=True;TrustServerCertificate=False" --project BookInventory.Api
```

Replace placeholders locally. User secrets are outside this repository and are loaded in Development. Alternatively, set `ConnectionStrings__BooksDatabase` in your local environment. Do not share credentials, database files, or local environment files.

## Restore, migrate and run

Run commands from this repository's root folder:

```powershell
dotnet restore
dotnet tool restore
dotnet build --no-restore
$env:ASPNETCORE_ENVIRONMENT = 'Development'
dotnet ef database update --project BookInventory.Api
dotnet run --project BookInventory.Api --launch-profile http
```

The migration command creates the database and `Books` table if they do not exist. It also creates EF's `__EFMigrationsHistory` bookkeeping table. The API does not silently create or reset the database at startup. Open **http://localhost:5080/swagger**. Expand an endpoint, click **Try it out**, fill the fields, then click **Execute**. Swagger is enabled in Development only.

The initial migration is already included. Do **not** generate it again on another computer; just apply it with `database update`. After intentionally changing the model in the future:

```powershell
dotnet ef migrations add DescribeYourChange --project BookInventory.Api
dotnet ef database update --project BookInventory.Api
```

To inspect the database in SSMS, connect to `(localdb)\MSSQLLocalDB` with Windows Authentication and run:

```sql
USE DecodeLabsP3Books;
SELECT * FROM dbo.Books;
SELECT * FROM dbo.__EFMigrationsHistory;
```

## Table and validation

| Field | SQL type | Rules |
| --- | --- | --- |
| Id | int identity, primary key | Generated by SQL Server; clients do not set it |
| Title | nvarchar(200), not null | Required, nonblank, at most 200 characters |
| Author | nvarchar(120), not null | Required, nonblank, at most 120 characters |
| PublicationYear | int, not null | Required, 1–9999 (allows planned future books) |
| Quantity | int, not null | Required, 0–1,000,000; zero is valid |

Title and author are trimmed before storage. Numeric request fields are nullable so missing fields are rejected instead of silently becoming zero. SQL constraints also enforce the numeric ranges and nonempty ordinary text. Duplicate titles are allowed because separate editions can share a title.

## Endpoints

| Method and route | Success | Other expected responses |
| --- | --- | --- |
| GET /api/books | 200, array (possibly empty) | |
| GET /api/books/{id} | 200, book | 404 if not found |
| POST /api/books | 201, book and Location header | 400 for invalid input |
| PUT /api/books/{id} | 204, no body | 400 for invalid input; 404 if not found |
| DELETE /api/books/{id} | 204, no body | 404 if not found |

PUT replaces all four editable fields. Use the generated ID returned by POST. A valid integer that has no row, including zero or a negative number, returns 404. Noninteger route IDs do not match the route and return 404. Malformed JSON or a missing required body returns 400. `[ApiController]` produces validation error details automatically. Validation is checked before looking up a PUT ID, so an invalid body returns 400 even when that ID does not exist.

## Example requests (PowerShell)

Keep the API running in one terminal and use another:

```powershell
$base = 'http://localhost:5080/api/books'
$body = @{ title='The Hobbit'; author='J. R. R. Tolkien'; publicationYear=1937; quantity=5 } | ConvertTo-Json
$book = Invoke-RestMethod $base -Method Post -ContentType 'application/json' -Body $body
Invoke-RestMethod $base
Invoke-RestMethod "$base/$($book.id)"

$update = @{ title='The Hobbit'; author='J. R. R. Tolkien'; publicationYear=1937; quantity=8 } | ConvertTo-Json
Invoke-RestMethod "$base/$($book.id)" -Method Put -ContentType 'application/json' -Body $update
Invoke-RestMethod "$base/$($book.id)"

# Before deleting: stop the API with Ctrl+C, restart it with the same run command,
# then GET this ID again. It should still have quantity 8.
Invoke-RestMethod "$base/$($book.id)" -Method Delete
# This now returns 404:
Invoke-RestMethod "$base/$($book.id)"

# Invalid input returns 400 with validation errors:
Invoke-RestMethod $base -Method Post -ContentType 'application/json' -Body '{"title":" ","author":"","publicationYear":0,"quantity":-1}'
```

The `.http` file contains the same operations for an IDE HTTP client. PowerShell reports non-success responses as errors; that is expected for the 400/404 examples.

## Automated verification

See `TEST-RESULTS.md` for what was actually run. The smoke test builds the API, applies its migration, starts it on a separate local port, checks CRUD/validation/missing IDs, stops the actual API process, restarts it, and verifies the same book again. It uses SQL Server throughout and removes only the rows it creates. It leaves the database/schema available for inspection.

```powershell
pwsh -File scripts/Test-Api.ps1
```

The test uses the configured database; choose a local learning database, not an existing production database. It does not drop any database. A database connection error usually means your server is stopped, the server name is wrong, or your Windows account lacks permission. A missing-table error usually means the migration has not been applied. A busy port can be changed in `launchSettings.json` or with the smoke test's `-Port` parameter.

## Create a new public GitHub repository after reviewing

These are instructions for you to carry out **after** reviewing the project. Nothing has been uploaded or submitted by this task.

1. Sign in to https://github.com and open https://github.com/new.
2. Choose your account as owner. Name the repository **decodelabs-project-3-database-integration**.
3. Description: `Decode Labs Project 3: Book Inventory API using ASP.NET Core, EF Core and SQL Server.`
4. Select **Public**. Leave README, .gitignore, and license initialization unchecked because this folder already has project files. Click **Create repository**.
5. In a terminal in this project folder, run the following only when ready to publish:

```powershell
git init -b main
git add .
git status
git diff --cached --stat
# Review staged files for credentials before committing.
git commit -m "Build Decode Labs Project 3 Book Inventory API"
git remote add origin https://github.com/YOUR_USERNAME/decodelabs-project-3-database-integration.git
git push -u origin main
```

Replace `YOUR_USERNAME`. Authenticate through Git's browser sign-in if prompted. The `.gitignore` excludes build output, database files, logs, local secrets, and the supplied training PDF. Do not upload the PDF as your own work. Refresh the repository page and check that the README, C# files, and migrations appear. Creating a repository is separate from submitting its link to Decode Labs; submit only when you are satisfied.

References: [EF Core SQL Server provider](https://learn.microsoft.com/en-us/ef/core/providers/sql-server/), [EF migrations](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/), [Swagger setup](https://learn.microsoft.com/en-us/aspnet/core/tutorials/getting-started-with-swashbuckle), [GitHub publishing instructions](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github).
