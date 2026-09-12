FROM node:22-alpine

# Install essential utilities: bash, git, coreutils, libc6-compat
RUN apk add --no-cache git bash coreutils libc6-compat

# Enable Corepack and prepare pnpm
RUN corepack enable && corepack prepare pnpm@12.4.1 --activate

# Set up workspace directory owned by built-in unprivileged node user (UID 1000)
WORKDIR /workspace
RUN chown -R node:node /workspace

USER node

CMD ["bash"]
