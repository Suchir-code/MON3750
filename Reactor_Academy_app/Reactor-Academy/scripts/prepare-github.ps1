Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = git rev-parse --show-toplevel
Set-Location $repoRoot

Write-Host "Removing old tracked files from Git index. Local files stay on your computer..."
git rm -r --cached .

Write-Host "Adding only the Reactor Academy app based on .gitignore..."
git add .gitignore
git add Reactor_Academy_app/reactor-academy

Write-Host ""
Write-Host "Done. Review the staged changes below:"
git status --short
