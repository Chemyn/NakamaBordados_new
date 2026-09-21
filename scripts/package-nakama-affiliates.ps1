[CmdletBinding()]
param(
    [string]$OutputPath = "build/nakama-affiliates.zip"
)

Set-StrictMode -Version Latest

$packageScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$packageRepositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $packageScriptRoot '..'))
$packageSourceRoot = [System.IO.Path]::GetFullPath((Join-Path $packageRepositoryRoot 'nakama-affiliates'))
$packageOutputFull = if ([System.IO.Path]::IsPathRooted($OutputPath)) {
    [System.IO.Path]::GetFullPath($OutputPath)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $packageRepositoryRoot $OutputPath))
}
$packageOutputDirectory = Split-Path -Parent $packageOutputFull
$packageTemporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("nakama-affiliates-package-" + [guid]::NewGuid().ToString('N'))
$packageStagedRoot = Join-Path $packageTemporaryRoot 'nakama-affiliates'

if (-not (Test-Path -LiteralPath $packageSourceRoot -PathType Container)) {
    throw "No se encontró el directorio fuente nakama-affiliates."
}

try {
    New-Item -ItemType Directory -Path $packageStagedRoot -Force | Out-Null

    $packageFiles = Get-ChildItem -LiteralPath $packageSourceRoot -Recurse -File
    foreach ($packageFile in $packageFiles) {
        $packageRelative = $packageFile.FullName.Substring($packageSourceRoot.Length).TrimStart('\', '/')
        $packageNormalized = $packageRelative.Replace('\', '/')
        $packageLeaf = Split-Path -Leaf $packageRelative
        $packageForbiddenPath = $packageNormalized -match '(^|/)(tests?|docs?|node_modules|\.git)(/|$)'
        $packageForbiddenFile = $packageLeaf -match '(\.test\.|\.spec\.|\.log$|\.tmp$|\.bak$|\.map$|^Thumbs\.db$|^\.DS_Store$)'
        if ($packageForbiddenPath -or $packageForbiddenFile) {
            continue
        }

        $packageDestination = Join-Path $packageStagedRoot $packageRelative
        $packageDestinationDirectory = Split-Path -Parent $packageDestination
        New-Item -ItemType Directory -Path $packageDestinationDirectory -Force | Out-Null
        Copy-Item -LiteralPath $packageFile.FullName -Destination $packageDestination
    }

    New-Item -ItemType Directory -Path $packageOutputDirectory -Force | Out-Null
    if (Test-Path -LiteralPath $packageOutputFull) {
        Remove-Item -LiteralPath $packageOutputFull -Force
    }
    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $packageOutputStream = [System.IO.File]::Open($packageOutputFull, [System.IO.FileMode]::CreateNew)
    try {
        $packageWriter = [System.IO.Compression.ZipArchive]::new($packageOutputStream, [System.IO.Compression.ZipArchiveMode]::Create, $false)
        try {
            foreach ($packageFile in (Get-ChildItem -LiteralPath $packageStagedRoot -Recurse -File)) {
                $packageRelative = $packageFile.FullName.Substring($packageStagedRoot.Length).TrimStart('\', '/').Replace('\', '/')
                $packageEntryName = 'nakama-affiliates/' + $packageRelative
                [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                    $packageWriter,
                    $packageFile.FullName,
                    $packageEntryName,
                    [System.IO.Compression.CompressionLevel]::Optimal
                ) | Out-Null
            }
        } finally {
            $packageWriter.Dispose()
        }
    } finally {
        $packageOutputStream.Dispose()
    }

    $packageArchive = [System.IO.Compression.ZipFile]::OpenRead($packageOutputFull)
    try {
        if ($packageArchive.Entries.Count -eq 0) {
            throw "El paquete generado está vacío."
        }
        foreach ($packageEntry in $packageArchive.Entries) {
            $packageEntryName = $packageEntry.FullName.Replace('\', '/')
            if (-not $packageEntryName.StartsWith('nakama-affiliates/')) {
                throw "El ZIP contiene una entrada fuera del directorio raíz nakama-affiliates/: $packageEntryName"
            }
            if ($packageEntryName -match '(^|/)(tests?|docs?|node_modules|\.git)(/|$)' -or $packageEntryName -match '(\.test\.|\.spec\.|\.log$|\.tmp$|\.bak$|\.map$)') {
                throw "El ZIP contiene un archivo excluido: $packageEntryName"
            }
        }
    } finally {
        $packageArchive.Dispose()
    }

    Write-Output $packageOutputFull
} finally {
    if (Test-Path -LiteralPath $packageTemporaryRoot) {
        Remove-Item -LiteralPath $packageTemporaryRoot -Recurse -Force
    }
}
