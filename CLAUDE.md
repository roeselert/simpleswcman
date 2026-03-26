# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

### secman** is a web application using HTML5, CSS, JavaScript
- PWA 
- now npm, import libs from CDN
- Use only minimal libs
    - pglite: import { PGlite } from 'https://cdn.jsdelivr.net/npm/@electric-sql/pglite/dist/index.js'
    - mocka: import Mocha from "https://cdn.jsdelivr.net/npm/mocha@10.2.0/+esm";
    - chai import chai from "https://cdn.jsdelivr.net/npm/chai@5.1.0/+esm";
    - run test via node

## Architecture

- Implement the fronend with HTML5,CSS and vanilla JavaScript.
- Implement the backend in vanilla JavaScript.
- Group modules around business domains. Use a folder per module.
- Use three files per module: services, repositories and adapter
-     repositories: database access
    - services: business logic, transaction control: 
      Eeach service must start and commit/rollback the database connection. 
      Every services needs a test to verify the rollback. Read only services must start a read-only transaction and don't need a rollback test.
    - adapter, export services for the frontend
    - local adapter: invoke services directly
    - rest adapter: expose serives via rest (implement later)
- Test JS files with chai/mocka

## Dev process
- The folder features contains a spec for features
- The folder features/ignore should not be considerted 
- The folder features/implemented are for reference
- Every feature must have acceptence tests in a GIVEN-WHEN-THEN syntax
- Use the acceptence tests implement service tests
- Plan each feature first and add the plan to the feature file
- Create a branch for each feature
- Ensure the pipeline ran for each branch (build & test)
- Publish only non test code a branch "public" after manual approval
