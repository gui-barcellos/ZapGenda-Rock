$source = "C:\ZapGenda\zapgenda-local"
$target = "H:\Meu Drive\WP Plugin\zapgenda-local"
if (-not (Test-Path $target)) { New-Item -ItemType Directory -Path $target | Out-Null }
robocopy $source $target /E /COPY:DAT /R:1 /W:1 /XD node_modules .git dist .supabase /XF .env .env.* *.log
