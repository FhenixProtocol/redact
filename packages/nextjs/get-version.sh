#!/bin/bash

# Extract the latest Git tag
GIT_TAG=$(git describe --tags --abbrev=0)

# Export it as an environment variable
export NEXT_PUBLIC_APP_VERSION=$GIT_TAG

echo "$NEXT_PUBLIC_APP_VERSION"
