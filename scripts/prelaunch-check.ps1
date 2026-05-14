param(
  [string]$BaseUrl = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"

function Check-Route {
  param(
    [string]$Path,
    [int[]]$Allow = @(200)
  )
  try {
    $res = Invoke-WebRequest -Uri ($BaseUrl + $Path) -UseBasicParsing -MaximumRedirection 0
    $code = [int]$res.StatusCode
  } catch {
    if ($_.Exception.Response) {
      $code = [int]$_.Exception.Response.StatusCode
    } else {
      $code = -1
    }
  }
  [pscustomobject]@{
    path   = $Path
    status = $code
    ok     = $Allow -contains $code
  }
}

$checks = @()
$checks += Check-Route "/" @(200)
$checks += Check-Route "/places" @(200)
$checks += Check-Route "/map" @(200)
$checks += Check-Route "/community" @(200)
$checks += Check-Route "/submit/place" @(200)
$checks += Check-Route "/support" @(200)
$checks += Check-Route "/legal/privacy" @(200)
$checks += Check-Route "/legal/terms" @(200)
$checks += Check-Route "/places/city/bangkok" @(200)
$checks += Check-Route "/places/city/bangkok/category/general" @(200)
$checks += Check-Route "/api/health" @(200)
$checks += Check-Route "/admin" @(307, 308)
$checks += Check-Route "/api/places/bounds?minLng=99.9&minLat=13.5&maxLng=100.9&maxLat=14.1&limit=120&cluster=true&zoom=8" @(200)

$failed = $checks | Where-Object { -not $_.ok }

"=== PRELAUNCH CHECK RESULT ==="
$checks | Format-Table -AutoSize

if ($failed.Count -gt 0) {
  "FAILED: $($failed.Count) checks"
  exit 1
}

"PASSED: $($checks.Count) checks"
