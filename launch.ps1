$progDir = "D:/Games/PoD/Path of Diablo"
$progPath = "$progDir/Game.exe"
$progArgs = "-w -lq"
#$prog = Start-Process $progPath $progArgs -WorkingDirectory $progDir -passthru
$prog = Get-Process -Name "Game"

python __init__.py --pid $prog.Id

