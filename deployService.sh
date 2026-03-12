#!/usr/bin/env bash

set -euo pipefail

while getopts k:h:s: flag
do
    case "${flag}" in
        k) key=${OPTARG};;
        h) hostname=${OPTARG};;
        s) service=${OPTARG};;
    esac
done

if [[ -z "$key" || -z "$hostname" || -z "$service" ]]; then
    printf "\nMissing required parameter.\n"
    printf "  syntax: deployService.sh -k <pem key file> -h <hostname> -s <service>\n\n"
    exit 1
fi

printf "\n----> Deploying React bundle $service to $hostname with $key\n"

# Step 1
printf "\n----> Build the distribution package\n"
rm -rf build
mkdir build
npm install # make sure vite is installed so that we can bundle
npm run build # build the React front end
cp -rf dist build/public # move the React front end to the target distribution
cp service/*.js build # move the back end service to the target distribution
cp service/*.json build

if [[ -f "service/.env" ]]; then
    cp service/.env build/.env
elif [[ -f ".env" ]]; then
    cp .env build/.env
else
    printf "\nWARNING: No .env file found in service/.env or ./.env. Backend env vars (like YOUTUBE_API_KEY) will be missing.\n"
fi

# Step 2
printf "\n----> Clearing out previous distribution on the target\n"
ssh -T -i "$key" ubuntu@$hostname "service='${service}' bash -s" << 'ENDSSH'
set -e
rm -rf "services/${service}"
mkdir -p "services/${service}"
ENDSSH

# Step 3
printf "\n----> Copy the distribution package to the target\n"
scp -r -i "$key" build/* ubuntu@$hostname:services/$service

if [[ -f "build/.env" ]]; then
    scp -i "$key" build/.env ubuntu@$hostname:services/$service/.env
fi

# Step 4
printf "\n----> Deploy the service on the target\n"
ssh -T -i "$key" ubuntu@$hostname "service='${service}' bash -s" << 'ENDSSH'
set -e

if [ -f "$HOME/.profile" ]; then
    . "$HOME/.profile"
fi

if [ -f "$HOME/.bashrc" ]; then
    . "$HOME/.bashrc"
fi

if [ -s "$HOME/.nvm/nvm.sh" ]; then
    . "$HOME/.nvm/nvm.sh"
    nvm use --silent default >/dev/null 2>&1 || true
    nvm use --silent --lts >/dev/null 2>&1 || true
fi

if ! command -v npm >/dev/null 2>&1; then
    latest_node_bin=$(ls -d "$HOME"/.nvm/versions/node/*/bin 2>/dev/null | sort -V | tail -n 1 || true)
    if [ -n "$latest_node_bin" ]; then
        export PATH="$latest_node_bin:$PATH"
    fi
fi

if ! command -v npm >/dev/null 2>&1; then
    echo "npm not found on remote host. Install Node for ubuntu user (e.g. via nvm) and retry."
    exit 1
fi

cd "services/${service}"
npm install

if command -v pm2 >/dev/null 2>&1; then
    if pm2 describe "${service}" >/dev/null 2>&1; then
        pm2 restart "${service}" --update-env
    else
        pm2 start index.js --name "${service}"
    fi
else
    if npx --yes pm2@latest describe "${service}" >/dev/null 2>&1; then
        npx --yes pm2@latest restart "${service}" --update-env
    else
        npx --yes pm2@latest start index.js --name "${service}"
    fi
fi
ENDSSH

# Step 5
printf "\n----> Removing local copy of the distribution package\n"
rm -rf build
rm -rf dist