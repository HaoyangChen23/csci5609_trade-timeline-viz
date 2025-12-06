<script lang="ts">
    import {onMount} from "svelte";
    import * as d3 from "d3";
    import type {
        TTariff,
        TPMI,
        TTEU,
        AutoIncome,
        TariffData,
        TradeBalance,
        TimelineEvent,
        TimelineData
    } from "../../types";
    import StoryOpen from "./StoryOpen.svelte";
    import Scrolly2D from "./Scrolly2D.svelte";
    import {GlobeTariffViz} from "$lib";

    let tariffs: TTariff[] = $state([]);
    let pmiData: TPMI[] = $state([]);
    let teuData: TTEU[] = $state([]);
    let incomeData: AutoIncome[] = $state([]);
    let globalTariffData: TariffData[] = $state([]);
    let tradeBalanceData: TradeBalance[] = $state([]);
    let timelineData: TimelineData[] = $state([]);
    let inflationData: { date: Date, rate: number }[] = $state([]);
    let soybeanData: any[] = $state([]);

    // Function to load the tariff CSV
    async function loadTariffCsv() {
        try {
            const base = import.meta.env.BASE_URL || '';
            const csvUrl = `${base}CSCI5609_Project_Dataset - Sheet1.csv`;
            tariffs = await d3.csv(csvUrl, (row) => {
                const dateStr = row.Date;
                let parsedDate: Date;

                if (dateStr && dateStr.includes('-')) {
                    parsedDate = d3.timeParse('%d-%b-%y')(dateStr) || new Date();
                } else if (dateStr) {
                    parsedDate = new Date(dateStr);
                } else {
                    parsedDate = new Date();
                }

                return {
                    tariff_action: row['Tariff action'],
                    date: parsedDate,
                    chinese_tariffs_row: Number(row['Chinese tariffs on ROW exports']),
                    chinese_tariffs_us: Number(row['Chinese tariffs on US exports']),
                    us_tariffs_chinese: Number(row['US tariffs on Chinese exports']),
                    us_tariffs_row: Number(row['US tariffs on ROW exports'])
                };
            });
            tariffs = [...tariffs];
        } catch (error) {
            console.error('Error loading tariff CSV:', error);
        }
    }

    // Function to load PMI data (format is unusual - space-separated after date)
    async function loadPMIData() {
        try {
            const base = import.meta.env.BASE_URL || '';
            const csvUrl = `${base}data/USA ISM PMI 2024-2025.csv`;
            const response = await fetch(csvUrl);
            const text = await response.text();
            const lines = text.trim().split('\n');

            // Skip header line
            const dataLines = lines.slice(1);
            pmiData = dataLines
                .map((line) => {
                    const parts = line.trim().split(/\s+/);
                    if (parts.length < 2) return null;

                    const dateStr = parts[0]; // Format: "2025-09"
                    const [year, month] = dateStr.split('-');
                    const date = new Date(parseInt(year), parseInt(month) - 1, 1);

                    return {
                        date,
                        pmi: Number(parts[1]) || 0,
                        employment: parts[2] ? Number(parts[2]) : undefined,
                        price: parts[3] ? Number(parts[3]) : undefined,
                        exportOrders: parts[4] ? Number(parts[4]) : undefined
                    };
                })
                .filter((d): d is TPMI => d !== null)
                .reverse(); // Reverse to show chronological order

            pmiData = [...pmiData];
        } catch (error) {
            console.error('Error loading PMI data:', error);
        }
    }

    // Function to load TEU data (tab-separated format)
    async function loadTEUData() {
        try {
            const base = import.meta.env.BASE_URL || '';
            const csvUrl = `${base}data/Monthly TEU Fixed.csv`;
            const response = await fetch(csvUrl);
            const text = await response.text();
            const lines = text.trim().split('\n');

            // Header: "date\tLong_Beach\tCALos_Angeles\tCANY&NJ"
            // Data format: "2025-08\t901845\t958355\tNone" (tab-separated)
            const dataLines = lines.slice(1); // Skip header
            teuData = dataLines
                .map((line) => {
                    const lineTrimmed = line.trim();
                    if (!lineTrimmed) return null;

                    // Split by tab character
                    const parts = lineTrimmed.split('\t');
                    if (parts.length < 4) return null;

                    const dateStr = parts[0];
                    const [year, month] = dateStr.split('-');
                    const date = new Date(parseInt(year), parseInt(month) - 1, 1);

                    // Parse values, treating "None" as null (no data point will be shown)
                    const parseValue = (val: string) => {
                        if (val === 'None' || val === 'null' || val === '') return null;
                        const num = Number(val);
                        return isNaN(num) ? null : num;
                    };

                    const longBeach = parseValue(parts[1]);
                    const losAngeles = parseValue(parts[2]);
                    const nyNj = parseValue(parts[3]);

                    return {
                        date,
                        longBeach,
                        losAngeles,
                        nyNj
                    };
                })
                .filter((d): d is TTEU => d !== null)
                .reverse(); // Reverse to show chronological order

            teuData = [...teuData];
        } catch (error) {
            console.error('Error loading TEU data:', error);
        }
    }

    async function loadIncomeData() {
        try {
            const base = import.meta.env.BASE_URL || '';
            const csvUrl = `${base}data/auto_operating_income_demo.csv`;
            incomeData = await d3.csv(csvUrl, (row) => ({
                company: row['company'],
                quarter: row['quarter'],
                operatingIncome: Number(row['operating_income_usd_millions']),
                tariffImpact: Number(row['tariff_fx_impact_usd_millions'])
            }));
            incomeData = [...incomeData];
        } catch (error) {
            console.error('Error loading income data:', error);
        }
    }

    async function loadGlobalTariffData() {
        try {
            const base = import.meta.env.BASE_URL || '';
            const csvUrl = `${base}2024_2025_US_tariff_global.csv`;
            globalTariffData = await d3.csv(csvUrl, (row) => ({
                Country_ISO3: row['Country_ISO3'] || '',
                Country: row['Country'] || '',
                Development_Status: row['Development_Status'] || '',
                Current_tariff_total: Number(row['Current_tariff_total']) || 0,
                Pre2025_tariff_total: Number(row['Pre2025_tariff_total']) || 0,
                Imports_total: Number(row['Imports_total']) || 0
            }));
            globalTariffData = [...globalTariffData];
        } catch (error) {
            console.error('Error loading global tariff data:', error);
        }
    }

    async function loadTradeBalanceData() {
        try {
            const base = import.meta.env.BASE_URL || '';
            const csvUrl = `${base}data/Trade_Balance_2024_2025.csv`;
            tradeBalanceData = await d3.csv(csvUrl, (row) => ({
                date: row['Date'] || '',
                year: Number(row['Year']) || 0,
                quarter: Number(row['Quarter']) || 0,
                balance: Number(row['Trade_Balance_Hundreds_Millions']) || 0
            }));
            tradeBalanceData = [...tradeBalanceData];
        } catch (error) {
            console.error('Error loading trade balance data:', error);
        }
    }

    async function loadFullTimelineDataset() {
        try {
            const base = import.meta.env.BASE_URL || '';
            const csvUrl = `${base}Final_timeline_dataset_for_Tariff_PMI_TEU - Sheet1.csv`;
            timelineData = await d3.csv(csvUrl, (row) => ({
                date: new Date(row['Date'] || ''),
                tariff_action: row['Tariff action'] || '',
                chinese_tariffs_row: Number(row['Chinese tariffs on ROW exports']) || 0,
                chinese_tariffs_us: Number(row['Chinese tariffs on US exports']) || 0,
                us_tariffs_chinese: Number(row['US tariffs on Chinese exports']) || 0,
                us_tariffs_row: Number(row['US tariffs on ROW exports']) || 0,
                country: row['Country'] || '',
                links: row['Links'] || '',
                long_beach_teu: Number(row['Long_Beach_TEU']) || 0,
                ca_los_angeles_teu: Number(row['CALos_Angeles_TEU']) || 0,
                ca_ny_nj_teu: Number(row['CANY&NJ_TEU']) || 0,
                ism_manufacturing_pmi: Number(row['ISM Manufacturing PMI']) || 0
            }));
            timelineData = [...timelineData];
        } catch (error) {
            console.error('Error loading full timeline dataset:', error);
        }
    }

    async function loadInflationData() {
        try {
            const base = import.meta.env.BASE_URL || '';
            const csvUrl = `${base}data/USA inflation.csv`;

            const rawData = await d3.csv(csvUrl);

            // Update the type definition for inflationData to include new fields
            // You might need to update this in your global variables/types as well
            inflationData = rawData
                .map(row => {
                    const dateStr = row['date'];

                    // Safety check
                    if (!dateStr) return null;

                    // 1. Parse Date
                    const [year, month] = dateStr.split('-');
                    const date = new Date(parseInt(year), parseInt(month) - 1, 1);

                    // 2. Parse Metrics (Strip '%' if present and convert to numbers)
                    const parsePercent = (val: string) => val ? parseFloat(val.replace('%', '')) : 0;
                    const parseIndex = (val: string) => val ? parseFloat(val) : 0;

                    return {
                        date,
                        rate: parsePercent(row['inflation_rate']),           // Inflation Rate
                        corePCE: parsePercent(row['core_pce_yoy(%)']),          // Core PCE
                        importPrice: parseIndex(row['import_price_index'])   // Import Price Index
                    };
                })
                .filter((d): d is { date: Date, rate: number, corePCE: number, importPrice: number } => d !== null)
                .sort((a, b) => a.date.getTime() - b.date.getTime()); // Ensure ascending order

        } catch (error) {
            console.error('Error loading inflation data:', error);
        }
    }

    async function loadSoybeanData() {
        try {
            // Assuming you saved your text above as "china_soybean.csv" in static/data/
            const base = import.meta.env.BASE_URL || '';
            const csvUrl = `${base}data/china_soybean.csv`;

            const rawData = await d3.csv(csvUrl);

            soybeanData = rawData.map(row => ({
                year: Number(row.year),
                US: Number(row.US),
                Argentina: Number(row.Argentina),
                Brazil: Number(row.Brazil),
                Uruguay: Number(row.Uruguay),
                Others: Number(row.Others)
            })).sort((a, b) => a.year - b.year);

        } catch (error) {
            console.error("Error loading soybean data", error);
        }
    }

    onMount(async () => {
        await Promise.all([
            loadTariffCsv(),
            loadPMIData(),
            loadTEUData(),
            loadIncomeData(),
            loadGlobalTariffData(),
            loadTradeBalanceData(),
            loadFullTimelineDataset(),
            loadInflationData(),
            loadSoybeanData(),
        ]);
    });
</script>

<div class="page-wrapper">
    <StoryOpen/>

    <!-- 3D Globe Section - Eye-catching visualization right after the story intro -->
    <div class="globe-hero-section">
        <h2>Global Tariff Impact: 3D World View</h2>
        <p>
            Explore US tariff rates across the world in an interactive 3D globe. Taller bars represent higher tariff
            rates.
            Drag to rotate the globe and zoom with your scroll wheel.
        </p>
        <div class="globe-hero-wrapper">
            {#if globalTariffData.length > 0}
                <GlobeTariffViz data={globalTariffData} height={600} width={900}/>
            {:else}
                <div class="loading">Loading global tariff data...</div>
            {/if}
        </div>
    </div>

    <div class="container">
        <Scrolly2D {tariffs} {pmiData} {teuData} {incomeData} {globalTariffData} {tradeBalanceData} {timelineData} {inflationData} {soybeanData}/>
    </div>
</div>

<style>
    :global(body) {
        margin: 0;
        padding: 0;
    }

    .page-wrapper {
        width: 100%;
        margin: 0;
        padding: 0;
        overflow-x: clip; /* Use clip instead of hidden to allow sticky */
    }

    .globe-hero-section {
        width: 100%;
        max-width: 100%;
        margin: 0 auto;
        padding: var(--spacing-3xl) var(--spacing-lg);
        box-sizing: border-box;
        text-align: center;
        background: linear-gradient(180deg, var(--color-gray-900) 0%, var(--color-gray-800) 100%);
    }

    .globe-hero-section h2 {
        color: #fff;
        font-size: clamp(1.5rem, 4vw, 2rem);
        font-weight: var(--font-weight-bold);
        margin-bottom: var(--spacing-md);
        letter-spacing: -0.02em;
    }

    .globe-hero-section p {
        color: var(--color-gray-300);
        font-size: var(--font-size-base);
        line-height: 1.7;
        max-width: 700px;
        margin: 0 auto var(--spacing-xl) auto;
    }

    .globe-hero-wrapper {
        display: flex;
        justify-content: center;
        width: 100%;
    }

    .loading {
        text-align: center;
        padding: 60px;
        font-size: 18px;
        color: #888;
    }

    .container {
        width: 100%;
        max-width: var(--container-max-width);
        margin: 0 auto;
        padding: var(--spacing-lg);
        box-sizing: border-box;
    }

    /* Responsive Design */
    @media (max-width: 1024px) {
        .timeline-charts-container {
            grid-template-columns: 1fr;
            gap: var(--spacing-xl);
        }

        .chart-container {
            margin-left: 0;
            padding: var(--spacing-md);
        }

        .narrative-section {
            padding: var(--spacing-xl) var(--spacing-md);
        }
    }

    @media (max-width: 768px) {
        h2 {
            font-size: var(--font-size-2xl);
        }

        .narrative-intro h1 {
            font-size: var(--font-size-3xl);
        }

        .info-section {
            padding: var(--spacing-md);
        }

        .chart-container {
            padding: var(--spacing-sm);
        }
    }
</style>