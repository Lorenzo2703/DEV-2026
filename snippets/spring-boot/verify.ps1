$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    & .\mvnw.cmd --batch-mode --no-transfer-progress verify
    if ($LASTEXITCODE -ne 0) {
        throw "Spring Boot verification failed with exit code $LASTEXITCODE."
    }
} finally {
    Pop-Location
}
