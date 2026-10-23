# Project: Simple Habit Tracker

## Overview
This document serves as the project specification for Antigravity. Please read these requirements and generate the corresponding application. The goal is to build a lightweight, browser-based habit tracker.

## Tech Stack
*   **Frontend:** HTML5, CSS3 (feel free to use Tailwind CSS via CDN for rapid styling), Vanilla JavaScript.
*   **Storage:** Browser `localStorage` (no backend required).
*   **Icons:** FontAwesome or Heroicons (via CDN).

## Core Features
1.  **Habit Management:**
    *   A text input and button to add a new daily habit.
    *   The ability to delete a habit.
2.  **Daily Tracking:**
    *   Each habit in the list should have a checkbox or toggle to mark it as "Completed" for today.
    *   Reset the completion status automatically when a new day starts (based on local time).
3.  **Progress & Streaks:**
    *   Display a "Current Streak" counter (number of consecutive days completed) next to each habit.
4.  **Data Persistence:**
    *   Save all habits, completion states, and streak data to `localStorage` so data isn't lost on page refresh.

## Design & UI/UX Guidelines
*   **Aesthetics:** Modern, clean, and minimalistic. Use a soft, modern color palette (e.g., slate grays, soft greens for completions).
*   **Layout:** A centered card layout that works well on both desktop and mobile devices.
*   **Responsiveness:** Must be fully responsive and mobile-friendly.

## Instructions for Antigravity Agent
1.  **Project Initialization:** Please create the necessary project files (`index.html`, `style.css`, `script.js`).
2.  **UI Construction:** Build the HTML structure and apply the styling according to the design guidelines.
3.  **State Management Logic:** Implement the JavaScript logic to handle adding/removing habits, toggling today's completion, and calculating streaks based on date differences.
4.  **Storage Integration:** Wire up the state management to sync seamlessly with `localStorage`.
5.  **Review:** Ensure that refreshing the page maintains the exact state of the checkboxes and streak counters.

Please begin by generating the project structure and writing the code for these files.