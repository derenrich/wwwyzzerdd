FROM ubuntu:focal-20220404

RUN apt-get update && apt-get install -y -q --no-install-recommends \
        apt-transport-https \
        build-essential \
        ca-certificates \
        curl \
        git \
        libssl-dev \
        wget \
        unzip \
        zip \
    && rm -rf /var/lib/apt/lists/*

ENV NVM_DIR /usr/local/nvm
RUN mkdir $NVM_DIR
RUN wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash

CMD echo "Building...." ; cd /wwwyzzerdd ; . $NVM_DIR/nvm.sh ; nvm install && npm install --global yarn && rm -rf node_modules && yarn install && bash bundle.sh && echo "Done"



