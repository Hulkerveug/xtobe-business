
# XTOBE AI ONE PASTE PC AGENT - ALL INCLUDES - Signature XTOBE-AI-PC-ADMIN-v2
$ProjectRoot="C:\Users\Nishan\Xtobe\xtobe-2"
if(!(Test-Path $ProjectRoot)){$ProjectRoot=$PSScriptRoot}
Write-Host "[XTOBE] ONE PASTE ALL - Signature XTOBE-AI-PC-ADMIN-v2" -ForegroundColor Cyan
$Folders=@("server","public","legal","secure",".well-known","tests",".github/workflows")
foreach($F in $Folders){$P=Join-Path $ProjectRoot $F;if(!(Test-Path $P)){New-Item -ItemType Directory -Path $P -Force|Out-Null}}
Copy-Item -Path "$PSScriptRoot\*" -Destination $ProjectRoot -Recurse -Force -Exclude @("node_modules",".git","*.zip")
Set-Location $ProjectRoot
npm install
npm test
$Zip="$env:USERPROFILE\Desktop\xtobe_one_paste_ALL_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip"
Compress-Archive -Path "$ProjectRoot\*" -DestinationPath $Zip -Force -ErrorAction SilentlyContinue
Write-Host "[XTOBE] BUILD COMPLETE: $Zip" -ForegroundColor Cyan
