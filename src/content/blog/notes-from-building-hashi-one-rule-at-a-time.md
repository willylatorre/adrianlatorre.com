---
title: Notes From Building Hashi One Rule At A Time
date: 2026-09-08
description: What a bridge puzzle taught me about geometry, graph connectivity, and generating constraints backwards.
---

Hashi looks like a drawing game. The useful implementation model is a graph whose edges happen to be visible.

## Start with visible neighbors

An island can only connect to the nearest island in each cardinal direction. Computing those corridors first removes impossible interactions before rendering begins.

## Put the board on one coordinate system

The grid, rounded-square island centers, bridge centerlines, edge termination, and generous invisible hit strokes all derive from the same SVG coordinates.

## Local arithmetic is not the whole solution

A pair of `1` islands can satisfy each other and still strand themselves. Completion therefore combines clue totals with a graph traversal that must reach every island.

## Generate the solution first

The generator builds a connected non-crossing bridge graph, derives the clues, and keeps only puzzles for which the bounded solver finds exactly one solution.

## Keep competition casual

Each run is random, so the leaderboard is a small prompt to replay rather than a claim of tournament fairness. Only qualifying solves ask for a nickname.
