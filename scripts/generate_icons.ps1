Add-Type -AssemblyName System.Drawing

$bgColor = [System.Drawing.ColorTranslator]::FromHtml('#faf5ee')
$primaryColor = [System.Drawing.ColorTranslator]::FromHtml('#c2652a')
$borderColor = [System.Drawing.ColorTranslator]::FromHtml('#e8dccb')

function Draw-StatXamEmblem($g, $size, $isForegroundOnly) {
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $scale = $size / 100.0

    # Pen for Peak
    $peakPen = New-Object System.Drawing.Pen($primaryColor, (7.0 * $scale))
    $peakPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $peakPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $peakPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    # Pen for Book
    $bookPen = New-Object System.Drawing.Pen($primaryColor, (6.5 * $scale))
    $bookPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $bookPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $bookPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    # 1. Upward Summit Peak (34,48) -> (50,22) -> (66,48)
    $peakPoints = @(
        (New-Object System.Drawing.PointF (34.0 * $scale), (48.0 * $scale)),
        (New-Object System.Drawing.PointF (50.0 * $scale), (22.0 * $scale)),
        (New-Object System.Drawing.PointF (66.0 * $scale), (48.0 * $scale))
    )
    $g.DrawLines($peakPen, $peakPoints)

    # 2. Left Open Book Page (50,56) -> (22,44) -> (22,72) -> (50,82)
    $leftPagePoints = @(
        (New-Object System.Drawing.PointF (50.0 * $scale), (56.0 * $scale)),
        (New-Object System.Drawing.PointF (22.0 * $scale), (44.0 * $scale)),
        (New-Object System.Drawing.PointF (22.0 * $scale), (72.0 * $scale)),
        (New-Object System.Drawing.PointF (50.0 * $scale), (82.0 * $scale))
    )
    $g.DrawLines($bookPen, $leftPagePoints)

    # 3. Right Open Book Page (50,56) -> (78,44) -> (78,72) -> (50,82) -> (50,56)
    $rightPagePoints = @(
        (New-Object System.Drawing.PointF (50.0 * $scale), (56.0 * $scale)),
        (New-Object System.Drawing.PointF (78.0 * $scale), (44.0 * $scale)),
        (New-Object System.Drawing.PointF (78.0 * $scale), (72.0 * $scale)),
        (New-Object System.Drawing.PointF (50.0 * $scale), (82.0 * $scale)),
        (New-Object System.Drawing.PointF (50.0 * $scale), (56.0 * $scale))
    )
    $g.DrawLines($bookPen, $rightPagePoints)

    $peakPen.Dispose()
    $bookPen.Dispose()
}

function Generate-SquareLauncherIcon($size, $outputPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::Transparent)

    # Draw rounded background
    $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $bgBrush = New-Object System.Drawing.SolidBrush($bgColor)
    $g.FillRectangle($bgBrush, $rect)

    # Subtle border
    $borderPen = New-Object System.Drawing.Pen($borderColor, 2)
    $g.DrawRectangle($borderPen, 0, 0, ($size - 1), ($size - 1))

    # Center emblem
    Draw-StatXamEmblem $g $size $false

    $bgBrush.Dispose()
    $borderPen.Dispose()
    $g.Dispose()

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Created $outputPath ($size x $size)"
}

function Generate-RoundLauncherIcon($size, $outputPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    # Draw circular background
    $bgBrush = New-Object System.Drawing.SolidBrush($bgColor)
    $g.FillEllipse($bgBrush, 0, 0, ($size - 1), ($size - 1))

    # Subtle circle border
    $borderPen = New-Object System.Drawing.Pen($borderColor, 2)
    $g.DrawEllipse($borderPen, 0, 0, ($size - 1), ($size - 1))

    # Center emblem scaled slightly to fit circular safe area (0.9)
    $margin = $size * 0.05
    $targetSize = $size * 0.9
    $g.TranslateTransform($margin, $margin)
    Draw-StatXamEmblem $g $targetSize $false
    $g.ResetTransform()

    $bgBrush.Dispose()
    $borderPen.Dispose()
    $g.Dispose()

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Created Round $outputPath ($size x $size)"
}

function Generate-AdaptiveForeground($size, $outputPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    # In 108x108 adaptive icon, the safe zone is centered 72x72 (inner 66%)
    # Margin is 17% on all sides
    $emblemSize = $size * 0.66
    $offset = ($size - $emblemSize) / 2.0
    $g.TranslateTransform($offset, $offset)
    Draw-StatXamEmblem $g $emblemSize $true
    $g.ResetTransform()

    $g.Dispose()
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Created Foreground $outputPath ($size x $size)"
}

# 1. Generate for each mipmap directory
$mipmapConfig = @(
    @{ dir = "mipmap-mdpi"; icon = 48; fg = 108 },
    @{ dir = "mipmap-hdpi"; icon = 72; fg = 162 },
    @{ dir = "mipmap-xhdpi"; icon = 96; fg = 216 },
    @{ dir = "mipmap-xxhdpi"; icon = 144; fg = 324 },
    @{ dir = "mipmap-xxxhdpi"; icon = 192; fg = 432 }
)

$baseRes = "android/app/src/main/res"

foreach ($cfg in $mipmapConfig) {
    $folder = Join-Path $baseRes $cfg.dir
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
    }

    $iconPath = Join-Path $folder "ic_launcher.png"
    $roundPath = Join-Path $folder "ic_launcher_round.png"
    $fgPath = Join-Path $folder "ic_launcher_foreground.png"

    Generate-SquareLauncherIcon $cfg.icon $iconPath
    Generate-RoundLauncherIcon $cfg.icon $roundPath
    Generate-AdaptiveForeground $cfg.fg $fgPath
}

# 2. Generate native splash screens for all drawable folders
$drawableFolders = @(
    "drawable",
    "drawable-port-mdpi",
    "drawable-port-hdpi",
    "drawable-port-xhdpi",
    "drawable-port-xxhdpi",
    "drawable-port-xxxhdpi"
)

foreach ($df in $drawableFolders) {
    $targetDir = Join-Path $baseRes $df
    if (Test-Path $targetDir) {
        $splashPath = Join-Path $targetDir "splash.png"
        $w = 480
        $h = 800
        if ($df -match "xxxhdpi") { $w = 1440; $h = 2560 }
        elseif ($df -match "xxhdpi") { $w = 960; $h = 1600 }
        elseif ($df -match "xhdpi") { $w = 720; $h = 1280 }
        elseif ($df -match "hdpi") { $w = 480; $h = 800 }
        elseif ($df -match "mdpi") { $w = 320; $h = 480 }

        $splashBmp = New-Object System.Drawing.Bitmap($w, $h)
        $sg = [System.Drawing.Graphics]::FromImage($splashBmp)
        $sg.Clear($bgColor)

        $logoSize = [Math]::Min($w, $h) * 0.28
        $offsetX = ($w - $logoSize) / 2.0
        $offsetY = ($h - $logoSize) / 2.0 - ($h * 0.04)

        $sg.TranslateTransform($offsetX, $offsetY)
        Draw-StatXamEmblem $sg $logoSize $false
        $sg.ResetTransform()

        $sg.Dispose()
        $splashBmp.Save($splashPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $splashBmp.Dispose()
        Write-Host "Created Splash $splashPath ($w x $h)"
    }
}

Write-Host "All icons and native splash screens successfully synchronized with StatXam opening brand emblem!"
