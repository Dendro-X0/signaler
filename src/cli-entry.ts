#!/usr/bin/env node

import { handleRunBinError, runBin } from "./bin.js";

void runBin(process.argv).catch(handleRunBinError);
