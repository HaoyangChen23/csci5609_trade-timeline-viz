# csci5609_trade-timeline-viz
## Intro: The Tariff Effect-Visualizing the Economic Impact of Tariffs

This project is an interactive, data-driven visualization that narratively explores the economic impacts of trade tariffs. It is built as a proof-of-concept for the CSCI 5609 Visualization course.

The main visualization is a scrollytelling experience that guides the user through different datasets related to the 2018-2025 US-China trade war and a fictional "Tariff 2.0" scenario in 2025.

## ✨ Features

The current implementation includes the following interactive visualizations integrated into a single scrollytelling page, available at `/project`:

1.  **US-China Tariff Timeline**: A multi-line chart showing the escalation of tariff rates between the US, China, and the Rest of the World (ROW) from 2018 to 2025.
2.  **Manufacturing Contraction (ISM PMI)**: A line chart visualizing the drop in the ISM Manufacturing PMI below the 50-point contraction threshold following the tariff announcement.
3.  **Port Front-Loading Effect (TEU)**: A multi-line chart demonstrating the surge in container throughput at major U.S. ports just before the tariffs took effect.

## 💻 Tech Stack

-   **Framework**: SvelteKit (with Svelte 5 runes)
-   **Visualization**: D3.js (v7)
-   **Language**: TypeScript
-   **Styling**: Scoped CSS within Svelte components

## 🚀 How to Run

There are two ways to run this project locally.

### Method 1: Easy Start with Python Script (Recommended)

A helper script is included to simplify the startup process. It automatically handles port conflicts, starts the development server, and opens the project in your browser.

1.  **Navigate to the project's sub-directory:**
    ```sh
    cd trade_timeline_viz
    ```

2.  **Run the server script:**
    ```sh
    python server.py
    ```
    This will launch the application and open `http://localhost:5173/project` automatically.

### Method 2: Manual NPM Commands

1.  **Navigate to the project's sub-directory and install dependencies:**
    ```sh
    cd trade_timeline_viz
    npm install
    ```

2.  **Start the development server:**
    ```sh
    npm run dev
    ```

3.  **Open the project in your browser:**
    Navigate to `http://localhost:5173/project` to see the visualization.

## 📊 Data Sources

-   **Tariff Actions**: PIIE Trade War Timeline (simulated dataset)
-   **ISM Manufacturing PMI**: Institute for Supply Management (simulated for 2024-2025)
-   **Port TEU Volumes**: U.S. Department of Transportation (simulated for 2024-2025)

