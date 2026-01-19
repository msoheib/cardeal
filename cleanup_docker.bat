@echo off
echo Listing running containers...
docker ps

echo.
echo Stopping all running containers...
FOR /f "tokens=*" %%i IN ('docker ps -q') DO (
    echo Stopping %%i...
    docker stop %%i
)

echo.
echo Cleanup complete.
docker ps
