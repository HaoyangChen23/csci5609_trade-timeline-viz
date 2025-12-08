# csci5609_trade-timeline-viz
## Intro: The Tariff Effect-Visualizing the Economic Impact of Tariffs

This project is an interactive, data-driven visualization that narratively explores the economic impacts of trade tariffs. It is built as a proof-of-concept for the CSCI 5609 Visualization course.

The main visualization is a scrollytelling experience that guides the user through different datasets related to the 2018-2025 US-China trade war and a fictional "Tariff 2.0" scenario in 2025.

## 🔗 Project Links

- **Live Demo**: https://haoyangchen23.github.io/csci5609_trade-timeline-viz/project
- **Repository**: https://github.com/HaoyangChen23/csci5609_trade-timeline-viz

## ✨ Features

The current implementation includes the following interactive visualizations integrated into a single scrollytelling page, available at `/project`:

1.  **US-China Tariff Timeline**: A multi-line chart showing the escalation of tariff rates between the US, China, and the Rest of the World (ROW) from 2018 to 2025.
2.  **Manufacturing Contraction (ISM PMI)**: A line chart visualizing the drop in the ISM Manufacturing PMI below the 50-point contraction threshold following the tariff announcement.
3.  **Port Front-Loading Effect (TEU)**: A multi-line chart demonstrating the surge in container throughput at major U.S. ports just before the tariffs took effect.
4.  **Tariff Imapct on Automaker Operating Income**: A bar chart demonstrating the trade war/ tariff impact on automaker profits.

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

- Bureau of Labor Statistics. (2025). Consumer price index and import price data. U.S. Department of Labor. https://www.bls.gov/
- Bureau of Economic Analysis. (2025). Personal consumption expenditures (PCE) and macroeconomic indicators. U.S. Department of Commerce. https://www.bea.gov/
- United States International Trade Commission. (2025). U.S. trade balance reports and datasets. https://www.usitc.gov/
- Department of Transportation. (2025). Port throughput statistics (TEU). U.S. Department of Transportation. https://www.transportation.gov/
- Institute for Supply Management. (2025). Manufacturing PMI data. https://www.ismworld.org/
- Peterson Institute for International Economics. (2025). U.S.–China tariff timelines and trade analysis. https://www.piie.com/
- American Soybean Association. (2025). U.S. soybean production and export statistics. https://soygrowers.com/
- Trade Data Monitor. (2025). Global soybean trade data. https://tradedatamonitor.com/
- Reuters. (2025). Industry and foreign investment reporting. https://www.reuters.com/
- Company filings (Toyota, Honda, Hyundai, Kia, Ford). (2024–2025). Quarterly and annual earnings reports. Retrieved from official corporate investor-relations websites.

## 🙏 Acknowledgments

**Team Members:**

- **Dunzhi Chou (Research Lead, Data Lead)**: Deep-dive data collection (USITC, BEA, Company Filings, ISM, BLS), data cleaning and processing, ensuring data accuracy for all visualizations, narrative structure design.

- **Jinzhe Wang (Visualization Lead)**: US-China Tariff Rate Trends chart, Front-loading Effect at U.S. Ports chart, scroll-based animation implementation, time slider component design, chart styling system.

- **Haoyang Chen (Visualization Developer)**: USA inflation rate and import price index chart, Manufacturing PMI Trends chart, U.S. Trade Balance Trends chart, scroll interaction design, chart optimization.

- **Mingxi Su (Interactive Timeline Lead)**: Interactive Trade Timeline & Visualizations implementation, timeline component development, synchronized chart interactions, scroll-based narrative design.

- **Pengju Liu (Quality Assurance, Data Support)**: Data validation, quality assurance, testing support, documentation assistance.

**Feedback:**

- Feedback from CSCI 5609, Fall 2025
- Feedback from Professor Chen
- Feedback from TA Pan Hao


