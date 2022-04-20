set -exu

sudo docker build -t wwwyzzerdd .
sudo docker run -it --mount type=bind,source="$(pwd)",target=/wwwyzzerdd  wwwyzzerdd
