#!/bin/bash

pwd;
git diff --quiet HEAD^ HEAD ../{packages,base,app}/src;