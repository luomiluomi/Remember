param([string]$Sdk = $env:ANDROID_HOME, [string]$Keystore = "$env:USERPROFILE/.android/debug.keystore")
$ErrorActionPreference = 'Stop'
function Run($Program, [string[]]$Arguments) {
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Program failed ($LASTEXITCODE)" }
}
$root = Split-Path $PSScriptRoot
$tools = Join-Path $Sdk 'build-tools/36.0.0'
$jar = Join-Path $Sdk 'platforms/android-36/android.jar'
$dist = Join-Path $root 'remember-web/dist'
$out = Join-Path $root 'build/android-preview'
if (!(Test-Path "$dist/index.html")) { throw 'Run pnpm build in remember-web first.' }
if (!(Test-Path $Keystore)) { throw 'An Android debug keystore is required.' }
New-Item -ItemType Directory -Force $out | Out-Null
$stage = Join-Path $out ([Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory "$stage/classes","$stage/dex" | Out-Null
Run javac @('--release','8','-encoding','UTF-8','-classpath',$jar,'-d',"$stage/classes","$PSScriptRoot/PreviewActivity.java","$PSScriptRoot/NativeVoice.java","$PSScriptRoot/NativeLauncher.java","$PSScriptRoot/ScreenCompanionService.java","$PSScriptRoot/CompanionOverlay.java")
$classes = @(Get-ChildItem "$stage/classes" -Recurse -Filter '*.class' | ForEach-Object FullName)
Run "$tools/d8.bat" (@('--min-api','26','--lib',$jar,'--output',"$stage/dex") + $classes)
Run "$tools/aapt2.exe" @('compile','--dir',"$PSScriptRoot/res",'-o',"$stage/resources.zip")
$unsigned = "$stage/unsigned.apk"
Run "$tools/aapt2.exe" @('link','-o',$unsigned,'-I',$jar,'--manifest',"$PSScriptRoot/AndroidManifest.xml","$stage/resources.zip")
# Windows aapt2 writes backslashes for nested assets. AssetManager uses ZIP paths with '/'.
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$archive = [IO.Compression.ZipFile]::Open($unsigned, [IO.Compression.ZipArchiveMode]::Update)
try {
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, "$stage/dex/classes.dex", 'classes.dex') | Out-Null
    foreach ($file in Get-ChildItem -LiteralPath $dist -Recurse -File) {
        $relative = $file.FullName.Substring($dist.Length + 1).Replace('\', '/')
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $file.FullName, "assets/$relative") | Out-Null
    }
} finally {
    $archive.Dispose()
}
Run "$tools/zipalign.exe" @('-f','4',$unsigned,"$stage/aligned.apk")
$apk = "$out/Remember-Android-preview.apk"
Run "$tools/apksigner.bat" @('sign','--ks',$Keystore,'--ks-key-alias','androiddebugkey','--ks-pass','pass:android','--key-pass','pass:android','--out',$apk,"$stage/aligned.apk")
Run "$tools/apksigner.bat" @('verify','--verbose',$apk)
$archive = [IO.Compression.ZipFile]::OpenRead($apk)
try {
    foreach ($file in Get-ChildItem -LiteralPath $dist -Recurse -File) {
        $relative = $file.FullName.Substring($dist.Length + 1).Replace('\', '/')
        $entry = $archive.GetEntry("assets/$relative")
        if ($null -eq $entry -or $entry.Length -ne $file.Length) {
            throw "Missing or incomplete APK asset: $relative"
        }
    }
} finally {
    $archive.Dispose()
}
Run "$tools/aapt.exe" @('dump','badging',$apk)
Get-Item $apk | Select-Object FullName,Length

