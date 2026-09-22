
$ProjectRoot="C:\Users\Nishan\Xtobe\xtobe-2"
if(!(Test-Path $ProjectRoot)){$ProjectRoot=$PSScriptRoot}
if(!(Test-Path $ProjectRoot)){$ProjectRoot=Get-Location}
Write-Host "[XTOBE] Signature: XTOBE-AI-PC-ADMIN-v2" -ForegroundColor Cyan
$Folders=@("server","public","legal","secure",".well-known","tests")
foreach($Folder in $Folders){$Path=Join-Path $ProjectRoot $Folder;if(!(Test-Path $Path)){New-Item -ItemType Directory -Path $Path -Force|Out-Null}}
if(Test-Path "$ProjectRoot\package.json"){Set-Location $ProjectRoot;npm install;npm test}
$ZipFile="$env:USERPROFILE\Desktop\xtobe_release_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip"
Compress-Archive -Path "$ProjectRoot\*" -DestinationPath $ZipFile -Force
Write-Host "[XTOBE] Build complete: $ZipFile" -ForegroundColor Cyan
