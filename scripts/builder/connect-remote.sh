#!/bin/bash
set -e

# Load environment configuration
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"


# Load environment variables from run.env
if [ -f "${ROOT_DIR}/scripts/builder/build-job.env" ]; then
    source "${ROOT_DIR}/scripts/builder/build-job.env"
else
    echo "Error: build-job.env file not found in scripts/builder directory"
    exit 1
fi


# install sshpass if not exists
if ! command -v sshpass &> /dev/null; then
    sudo apt-get install sshpass
fi


# Add SSH options for better connection handling
SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=10"

# Test SSH connection first
if ! sshpass -p "${VM_PASSWORD}" ssh ${SSH_OPTS} ubuntu@${VM_IP} "echo 'Connection test successful'"; then
    echo "Error: Failed to establish SSH connection to ${VM_IP}"
    exit 1
fi

# Create deploy directory on remote server if not exists
sshpass -p "${VM_PASSWORD}" ssh ${SSH_OPTS} ubuntu@${VM_IP} "mkdir -p ~/idea-forge-deploy" || {
    echo "Error: Failed to create remote directory"
    exit 1
}

# Remove old files if they exist
sshpass -p "${VM_PASSWORD}" ssh ${SSH_OPTS} ubuntu@${VM_IP} "rm -rf ~/idea-forge-deploy/*" || {
    echo "Error: Failed to clean remote directory"
    exit 1
}

# Use scp to copy deployment files from local to remote
sshpass -p "${VM_PASSWORD}" scp ${SSH_OPTS} -r "${ROOT_DIR}/scripts/deploy/." ubuntu@${VM_IP}:~/idea-forge-deploy || {
    echo "Error: Failed to copy files to remote server"
    exit 1
}

# Change directory and run the main script
sshpass -p "${VM_PASSWORD}" ssh ${SSH_OPTS} ubuntu@${VM_IP} "cd ~/idea-forge-deploy && chmod +x main.sh && ./main.sh" || {
    echo "Error: Failed to execute remote script"
    exit 1
}