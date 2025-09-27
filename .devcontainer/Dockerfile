FROM mcr.microsoft.com/devcontainers/dotnet:9.0-bookworm AS base

# Install Node.js and npm
# Option 1: Using NodeSource repository (recommended for latest versions)
RUN curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - && \
    apt-get install -y nodejs
  
  
## set current user to `root`
USER root

## define build arguments
ARG USERNAME=vscode
ARG CLAUDE_HOME_PATH="/home/${USERNAME}/.claude"

## ################################################################ ##
## Directive 1: define a Docker VOLUME for `~/.vscode-server`
VOLUME [ "${CLAUDE_HOME_PATH}" ]

## Directive 2: create directory and set ownership to non-root user
RUN set -eux; \
  mkdir -p "${CLAUDE_HOME_PATH}" && \
  chown ${USERNAME}:${USERNAME} "${CLAUDE_HOME_PATH}"
## ################################################################ ##


# Install Claude
RUN npm install -g @anthropic-ai/claude-code


## set current user to non-root user
USER "${USERNAME}"

