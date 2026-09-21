$srcDir = 'C:\Users\ADMIN\.gemini\antigravity-ide\brain\ae360aee-947b-49e3-ac62-02bbe7c2d93e\.user_uploaded'
$destDir = 'd:\FurniMatch\FurniMatch\FurniMatch.Api\wwwroot\uploads\products'

if (!(Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
}

Copy-Item (Join-Path $srcDir 'media_1790005311504.jpg') (Join-Path $destDir 'tranh-cuu-ngu-sen-ngoc.jpg') -Force
Copy-Item (Join-Path $srcDir 'media_1790005316297.jpg') (Join-Path $destDir 'tranh-hoa-ban-tay-bac.jpg') -Force
Copy-Item (Join-Path $srcDir 'media_1790005320213.jpg') (Join-Path $destDir 'tranh-son-thuy-huu-tinh.jpg') -Force
Copy-Item (Join-Path $srcDir 'media_1790005323599.jpg') (Join-Path $destDir 'tranh-duong-xi-hoa-hong.jpg') -Force
Copy-Item (Join-Path $srcDir 'media_1790005326667.jpg') (Join-Path $destDir 'tranh-chu-an-mau-don.jpg') -Force

Write-Host 'Copied files successfully:'
Get-ChildItem -Path $destDir -Filter 'tranh-*.jpg' | Select-Object Name, Length
