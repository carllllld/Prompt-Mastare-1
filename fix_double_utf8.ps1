# Fix double-encoded UTF-8 at the byte level
# Double-encoded: C3 83 C2 xx -> C3 xx (where C3 xx is the correct UTF-8)
# Also: C3 82 C2 xx patterns, and E2 80 93 em-dash patterns

$path = "c:\Users\car21\Prompt-Mastare-1-1\server\routes.ts"
$bytes = [System.IO.File]::ReadAllBytes($path)
$result = New-Object System.Collections.Generic.List[byte]
$fixes = 0
$i = 0

while ($i -lt $bytes.Length) {
    # Check for double-encoded 2-byte UTF-8: C3 83 C2 xx -> C3 xx
    if ($i + 3 -lt $bytes.Length -and $bytes[$i] -eq 0xC3 -and $bytes[$i+1] -eq 0x83 -and $bytes[$i+2] -eq 0xC2) {
        $result.Add(0xC3)
        $result.Add($bytes[$i+3])
        $fixes++
        $i += 4
    }
    # Check for double-encoded em-dash: C3 A2 C2 80 C2 93 -> E2 80 93
    elseif ($i + 5 -lt $bytes.Length -and $bytes[$i] -eq 0xC3 -and $bytes[$i+1] -eq 0xA2 -and $bytes[$i+2] -eq 0xC2 -and $bytes[$i+3] -eq 0x80 -and $bytes[$i+4] -eq 0xC2 -and $bytes[$i+5] -eq 0x93) {
        $result.Add(0xE2)
        $result.Add(0x80)
        $result.Add(0x93)
        $fixes++
        $i += 6
    }
    # Check for double-encoded right arrow: C3 A2 C2 86 C2 92 -> E2 86 92
    elseif ($i + 5 -lt $bytes.Length -and $bytes[$i] -eq 0xC3 -and $bytes[$i+1] -eq 0xA2 -and $bytes[$i+2] -eq 0xC2 -and $bytes[$i+3] -eq 0x86 -and $bytes[$i+4] -eq 0xC2 -and $bytes[$i+5] -eq 0x92) {
        $result.Add(0xE2)
        $result.Add(0x86)
        $result.Add(0x92)
        $fixes++
        $i += 6
    }
    # Check for double-encoded right single quote: C3 A2 C2 80 C2 99 -> E2 80 99
    elseif ($i + 5 -lt $bytes.Length -and $bytes[$i] -eq 0xC3 -and $bytes[$i+1] -eq 0xA2 -and $bytes[$i+2] -eq 0xC2 -and $bytes[$i+3] -eq 0x80 -and $bytes[$i+4] -eq 0xC2 -and $bytes[$i+5] -eq 0x99) {
        $result.Add(0xE2)
        $result.Add(0x80)
        $result.Add(0x99)
        $fixes++
        $i += 6
    }
    # Check for C3 82 C2 xx pattern (another double-encoding variant)
    elseif ($i + 3 -lt $bytes.Length -and $bytes[$i] -eq 0xC3 -and $bytes[$i+1] -eq 0x82 -and $bytes[$i+2] -eq 0xC2) {
        $result.Add(0xC2)
        $result.Add($bytes[$i+3])
        $fixes++
        $i += 4
    }
    else {
        $result.Add($bytes[$i])
        $i++
    }
}

Write-Host "Fixed $fixes double-encoded sequences"
Write-Host "Original size: $($bytes.Length) bytes, New size: $($result.Count) bytes"

[System.IO.File]::WriteAllBytes($path, $result.ToArray())

# Verify
$check = [System.IO.File]::ReadAllBytes($path)
$text = [System.Text.Encoding]::UTF8.GetString($check)
$sample = $text.Substring(3300, 120)
Write-Host "Sample after fix: $sample"
Write-Host "Done"
