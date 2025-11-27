<script lang="ts">
  import { onMount } from "svelte";
  import * as d3 from "d3";
  import type { TTariff, TPMI, TTEU, AutoIncome, TariffData, TradeBalance, TimelineEvent, TimelineData } from "../../types";
  import StoryOpen from "./StoryOpen.svelte";
  import Scrolly2D from "./Scrolly2D.svelte";

  let tariffs: TTariff[] = $state([]);
  let pmiData: TPMI[] = $state([]);
  let teuData: TTEU[] = $state([]);
  let incomeData: AutoIncome[] = $state([]);
  let globalTariffData: TariffData[] = $state([]);
  let tradeBalanceData: TradeBalance[] = $state([]);
  let timelineData: TimelineData[] = $state([]);

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

  onMount(async () => {
    await Promise.all([
      loadTariffCsv(),
      loadPMIData(),
      loadTEUData(),
      loadIncomeData(),
      loadGlobalTariffData(),
      loadTradeBalanceData(),
      loadFullTimelineDataset()
    ]);
  });
</script>

<div class="page-wrapper">
  <StoryOpen />
  <div class="container">
    <Scrolly2D {tariffs} {pmiData} {teuData} {incomeData} {globalTariffData} {tradeBalanceData} {timelineData}/>
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

  .container {
    width: 80vw;
    max-width: 100%;
    margin: 0 auto;
    padding: 10px;
    box-sizing: border-box;
  }
</style>