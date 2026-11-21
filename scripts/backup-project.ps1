param([Parameter(Mandatory=$true)][string]$Destination)
$ErrorActionPreference='Stop'
Get-Command supabase -ErrorAction Stop | Out-Null
$backupTarget=[System.IO.Path]::GetFullPath($Destination)
if(Test-Path -LiteralPath $backupTarget){throw 'Elegí una carpeta nueva para no reemplazar un respaldo.'}
New-Item -ItemType Directory -Path $backupTarget | Out-Null
try {
  & supabase db dump --linked --role-only --file (Join-Path $backupTarget 'roles.sql')
  if($LASTEXITCODE -ne 0){throw 'Falló el respaldo de roles'}
  & supabase db dump --linked --file (Join-Path $backupTarget 'schema.sql')
  if($LASTEXITCODE -ne 0){throw 'Falló el respaldo de esquema'}
  & supabase db dump --linked --data-only --use-copy --file (Join-Path $backupTarget 'data.sql')
  if($LASTEXITCODE -ne 0){throw 'Falló el respaldo de datos'}
  $hashes=@('roles.sql','schema.sql','data.sql') | ForEach-Object {Get-FileHash -LiteralPath (Join-Path $backupTarget $_) -Algorithm SHA256 | Select-Object @{n='File';e={[IO.Path]::GetFileName($_.Path)}},Hash}
  $hashes | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $backupTarget 'sha256.json') -Encoding utf8
  'Respaldo completo. Protegé esta carpeta: incluye identidades y hashes de contraseñas. Ensayá restauración en otro proyecto.' | Write-Output
} catch {
  'Este respaldo está INCOMPLETO.' | Set-Content -LiteralPath (Join-Path $backupTarget 'INCOMPLETE.txt') -Encoding utf8
  throw
}
