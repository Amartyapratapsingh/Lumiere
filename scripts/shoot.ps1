# Captures headless screenshots of the running dev site for visual review.
#   & scripts/shoot.ps1 -Pages home,shop -Height 1200
param(
  [string[]]$Pages = @('home'),
  [int]$Width = 1440,
  [int]$Height = 1100,
  [string]$Base = 'http://127.0.0.1:5173'
)

$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$out = Join-Path $PSScriptRoot '..\.shots'
New-Item -ItemType Directory -Force $out | Out-Null

$routes = @{
  home      = '/'
  shop      = '/shop'
  fragrance = '/shop/fragrance'
  skincare  = '/shop/skincare'
  product   = '/product/oud-mood-elixir'
  serum     = '/product/hyaluronic-glow-serum'
  login     = '/login'
  signup    = '/signup?role=seller'
  about     = '/about'
  brands    = '/brands'
  sell      = '/sell'
}

Push-Location $out
foreach ($p in $Pages) {
  $route = if ($routes.ContainsKey($p)) { $routes[$p] } else { $p }
  $file = "$p.png"
  if (Test-Path $file) { Remove-Item $file -Force }

  # Start-Process -Wait is required: the call operator returns before Edge has
  # finished writing the PNG, so the file check below would race and fail.
  $abs = Join-Path $out $file
  Start-Process -FilePath $edge -Wait -NoNewWindow -ArgumentList @(
    '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    "--window-size=$Width,$Height", '--virtual-time-budget=10000',
    "--screenshot=$abs", "$Base$route"
  ) 2>$null

  if (Test-Path $file) {
    "{0,-12} {1,9:N0} bytes  {2}" -f $p, (Get-Item $file).Length, $route
  } else {
    "{0,-12} FAILED  {1}" -f $p, $route
  }
}
Pop-Location
