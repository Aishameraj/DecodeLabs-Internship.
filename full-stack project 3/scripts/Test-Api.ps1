#Requires -Version 7.0
param([int]$Port = 5087)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$project = Join-Path $root 'BookInventory.Api'
$baseUrl = "http://localhost:$Port"
$apiProcess = $null
$bookId = $null
$boundaryId = $null
$checks = 0
$oldEnvironment = $env:ASPNETCORE_ENVIRONMENT
$logDirectory = Join-Path $root 'TestResults'
New-Item -ItemType Directory -Force $logDirectory | Out-Null

function Assert-True($Condition, [string]$Message) {
    if (-not $Condition) { throw "FAIL: $Message" }
    $script:checks++
    Write-Host "PASS: $Message"
}

function Request([string]$Method, [string]$Path, [object]$Body = $null) {
    $parameters = @{
        Uri = "$baseUrl$Path"; Method = $Method
        SkipHttpErrorCheck = $true; TimeoutSec = 15
    }
    if ($null -ne $Body) {
        $parameters.ContentType = 'application/json'
        $parameters.Body = if ($Body -is [string]) { $Body } else { ConvertTo-Json $Body -Compress }
    }
    $response = Invoke-WebRequest @parameters
    # Some PowerShell versions return application/problem+json as bytes.
    $content = if ($response.Content -is [byte[]]) {
        [Text.Encoding]::UTF8.GetString($response.Content)
    } else { [string]$response.Content }
    [pscustomobject]@{ StatusCode=$response.StatusCode; Headers=$response.Headers; Content=$content }
}

function Start-Api([string]$Label) {
    $dll = Join-Path $project 'bin/Debug/net10.0/BookInventory.Api.dll'
    $script:apiProcess = Start-Process -FilePath (Get-Command dotnet).Source `
        -ArgumentList "`"$dll`" --urls $baseUrl" -WorkingDirectory $project `
        -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $logDirectory "$Label.stdout.log") `
        -RedirectStandardError (Join-Path $logDirectory "$Label.stderr.log")
    $timer = [Diagnostics.Stopwatch]::StartNew()
    while ($timer.Elapsed.TotalSeconds -lt 45) {
        if ($script:apiProcess.HasExited) { throw "API exited; inspect TestResults/$Label.stderr.log" }
        try {
            $response = Request GET '/swagger/v1/swagger.json'
            if ($response.StatusCode -eq 200) { return }
        } catch { }
        Start-Sleep -Milliseconds 300
    }
    throw 'API did not become ready within 45 seconds.'
}

function Stop-Api {
    if ($null -ne $script:apiProcess -and -not $script:apiProcess.HasExited) {
        Stop-Process -Id $script:apiProcess.Id
        $script:apiProcess.WaitForExit()
    }
    $script:apiProcess = $null
}

Push-Location $root
try {
    # Do not accidentally send tests to a different API already using this port.
    $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $Port)
    try { $listener.Start() } finally { $listener.Stop() }

    $env:ASPNETCORE_ENVIRONMENT = 'Development'
    dotnet build BookInventory.slnx --no-restore
    if ($LASTEXITCODE -ne 0) { throw 'Build failed.' }
    dotnet ef database update --project $project --no-build
    if ($LASTEXITCODE -ne 0) { throw 'Migration failed.' }

    Start-Api 'before-restart'
    $swagger = Request GET '/swagger/v1/swagger.json'
    $spec = $swagger.Content | ConvertFrom-Json
    Assert-True ($spec.paths.'/api/books'.get -and $spec.paths.'/api/books'.post -and
        $spec.paths.'/api/books/{id}'.get -and $spec.paths.'/api/books/{id}'.put -and
        $spec.paths.'/api/books/{id}'.delete) 'Swagger describes all five endpoints'
    Assert-True ((Request GET '/swagger/index.html').StatusCode -eq 200) 'Swagger UI loads'

    $initial = Request GET '/api/books'
    Assert-True ($initial.StatusCode -eq 200) 'GET list returns 200'
    $originalCount = @($initial.Content | ConvertFrom-Json).Count
    $valid = @{ title='  Persistence Test Book  '; author='  Decode Labs  '; publicationYear=2026; quantity=3 }
    $created = Request POST '/api/books' $valid
    Assert-True ($created.StatusCode -eq 201) 'POST returns 201'
    $book = $created.Content | ConvertFrom-Json
    $bookId = $book.id
    Assert-True ($bookId -gt 0 -and $created.Headers.Location[0].EndsWith("/api/books/$bookId")) 'POST generates ID and Location header'
    Assert-True ($book.title -eq 'Persistence Test Book' -and $book.author -eq 'Decode Labs') 'Text is trimmed before storage'
    $fetched = Request GET "/api/books/$bookId"
    Assert-True ($fetched.StatusCode -eq 200 -and ($fetched.Content | ConvertFrom-Json).quantity -eq 3) 'GET one returns stored book'
    $list = (Request GET '/api/books').Content | ConvertFrom-Json
    Assert-True (@($list | Where-Object id -eq $bookId).Count -eq 1) 'GET list includes created book'

    $invalidCases = @(
        @{ name='missing fields'; body=@{} },
        @{ name='blank title'; body=@{title=' ';author='Author';publicationYear=2020;quantity=1} },
        @{ name='null author'; body=@{title='Book';author=$null;publicationYear=2020;quantity=1} },
        @{ name='long title'; body=@{title=('x'*201);author='Author';publicationYear=2020;quantity=1} },
        @{ name='long author'; body=@{title='Book';author=('x'*121);publicationYear=2020;quantity=1} },
        @{ name='year too low'; body=@{title='Book';author='Author';publicationYear=0;quantity=1} },
        @{ name='year too high'; body=@{title='Book';author='Author';publicationYear=10000;quantity=1} },
        @{ name='negative quantity'; body=@{title='Book';author='Author';publicationYear=2020;quantity=-1} },
        @{ name='quantity too high'; body=@{title='Book';author='Author';publicationYear=2020;quantity=1000001} },
        @{ name='missing quantity'; body=@{title='Book';author='Author';publicationYear=2020} },
        @{ name='missing year'; body=@{title='Book';author='Author';quantity=1} },
        @{ name='wrong JSON type'; body='{"title":"Book","author":"Author","publicationYear":"abc","quantity":1}' },
        @{ name='malformed JSON'; body='{"title":' },
        @{ name='null body'; body='null' }
    )
    foreach ($case in $invalidCases) {
        foreach ($method in @('POST', 'PUT')) {
            $path = if ($method -eq 'POST') { '/api/books' } else { "/api/books/$bookId" }
            $response = Request $method $path $case.body
            $problem = $response.Content | ConvertFrom-Json -AsHashtable
            if ($response.StatusCode -ne 400 -or $null -eq $problem.errors) {
                Write-Host "Unexpected response: HTTP $($response.StatusCode) $($response.Content)"
            }
            Assert-True ($response.StatusCode -eq 400 -and $null -ne $problem.errors) "$method rejects $($case.name) with validation details"
        }
    }
    $unchanged = (Request GET "/api/books/$bookId").Content | ConvertFrom-Json
    Assert-True ($unchanged.quantity -eq 3 -and $unchanged.title -eq 'Persistence Test Book') 'Invalid PUT leaves stored data unchanged'
    Assert-True (@((Request GET '/api/books').Content | ConvertFrom-Json).Count -eq ($originalCount+1)) 'Invalid POST creates no rows'

    foreach ($method in @('GET','PUT','DELETE')) {
        $response = if ($method -eq 'PUT') { Request $method '/api/books/-1' $valid } else { Request $method '/api/books/-1' }
        Assert-True ($response.StatusCode -eq 404) "$method missing ID returns 404"
    }
    Assert-True ((Request GET '/api/books/not-an-integer').StatusCode -eq 404) 'Noninteger ID returns 404'

    $boundary = Request POST '/api/books' @{title=('T'*200);author=('A'*120);publicationYear=1;quantity=0}
    Assert-True ($boundary.StatusCode -eq 201) 'Maximum text lengths, year 1 and quantity 0 are accepted'
    $boundaryId = ($boundary.Content | ConvertFrom-Json).id
    $upper = Request PUT "/api/books/$boundaryId" @{title='Boundary';author='Author';publicationYear=9999;quantity=1000000}
    Assert-True ($upper.StatusCode -eq 204) 'Upper numeric boundaries are accepted'
    Assert-True ((Request DELETE "/api/books/$boundaryId").StatusCode -eq 204) 'Boundary test book deleted'
    $boundaryId = $null

    $updatedBody = @{title='Updated Persistence Book';author='Updated Author';publicationYear=2025;quantity=8}
    $updated = Request PUT "/api/books/$bookId" $updatedBody
    Assert-True ($updated.StatusCode -eq 204 -and [string]::IsNullOrEmpty($updated.Content)) 'PUT returns 204 with no body'
    $oldPid = $apiProcess.Id
    Stop-Api
    Start-Api 'after-restart'
    Assert-True ($apiProcess.Id -ne $oldPid) 'API restarted as a new process'
    $persisted = Request GET "/api/books/$bookId"
    $saved = $persisted.Content | ConvertFrom-Json
    Assert-True ($persisted.StatusCode -eq 200 -and $saved.id -eq $bookId -and
        $saved.title -eq $updatedBody.title -and $saved.author -eq $updatedBody.author -and
        $saved.publicationYear -eq 2025 -and $saved.quantity -eq 8) 'Same ID and all updated fields persist in SQL Server after restart'
    $deleted = Request DELETE "/api/books/$bookId"
    Assert-True ($deleted.StatusCode -eq 204 -and [string]::IsNullOrEmpty($deleted.Content)) 'DELETE returns 204 with no body'
    Assert-True ((Request GET "/api/books/$bookId").StatusCode -eq 404) 'GET deleted book returns 404'
    Assert-True ((Request DELETE "/api/books/$bookId").StatusCode -eq 404) 'Repeated DELETE returns 404'
    Assert-True ((Request PUT "/api/books/$bookId" $valid).StatusCode -eq 404) 'PUT deleted book returns 404'
    $bookId = $null
    Assert-True (@((Request GET '/api/books').Content | ConvertFrom-Json).Count -eq $originalCount) 'Test rows removed; original row count restored'
    Write-Host "SUCCESS: $checks checks passed against SQL Server."
} finally {
    if ($null -ne $apiProcess -and -not $apiProcess.HasExited) {
        foreach ($id in @($bookId, $boundaryId)) {
            if ($null -ne $id) {
                try { Request DELETE "/api/books/$id" | Out-Null } catch { Write-Warning "Could not clean up test book $id" }
            }
        }
    }
    Stop-Api
    $env:ASPNETCORE_ENVIRONMENT = $oldEnvironment
    Pop-Location
}
