<script lang="ts">
	import { onMount } from 'svelte';
	import * as d3 from 'd3';
	import type { TTariff, TPMI, TTEU } from '../../types';
	import StoryOpen from './StoryOpen.svelte';
	import Scrolly2D from './Scrolly2D.svelte';

	let tariffs: TTariff[] = $state([]);
	let pmiData: TPMI[] = $state([]);
	let teuData: TTEU[] = $state([]);

	// Function to load the tariff CSV
	async function loadTariffCsv() {
		try {
			// Use relative path that works in both dev and production
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

	// Function to load TEU data (format is unusual - no separators in header or data)
	async function loadTEUData() {
		try {
			const base = import.meta.env.BASE_URL || '';
			const csvUrl = `${base}data/Monthly TEU.csv`;
			const response = await fetch(csvUrl);
			const text = await response.text();
			const lines = text.trim().split('\n');
			
			// The header is: "dateLong_Beach_CALos_Angeles_CANY&NJ"
			// Data format: "2025-07901845958355794268" (date + 3 numbers concatenated)
			const dataLines = lines.slice(1);
			teuData = dataLines
				.map((line) => {
					const lineTrimmed = line.trim();
					if (!lineTrimmed) return null;
					
					// Find where the date ends (format: "YYYY-MM")
					const dateMatch = lineTrimmed.match(/^(\d{4}-\d{2})/);
					if (!dateMatch) return null;
					
					const dateStr = dateMatch[1];
					const [year, month] = dateStr.split('-');
					const date = new Date(parseInt(year), parseInt(month) - 1, 1);
					
					// Extract numbers after date (they're concatenated)
					const numbersPart = lineTrimmed.substring(dateStr.length);
					
					// Try to split the numbers - they appear to be roughly equal length
					// Based on the data, each number seems to be around 7-8 digits
					const numLength = Math.floor(numbersPart.length / 3);
					const longBeach = Number(numbersPart.substring(0, numLength));
					const losAngeles = Number(numbersPart.substring(numLength, numLength * 2));
					const nyNj = Number(numbersPart.substring(numLength * 2));
					
					return {
						date,
						longBeach: longBeach || 0,
						losAngeles: losAngeles || 0,
						nyNj: nyNj || 0
					};
				})
				.filter((d): d is TTEU => d !== null)
				.reverse(); // Reverse to show chronological order
			
			teuData = [...teuData];
		} catch (error) {
			console.error('Error loading TEU data:', error);
		}
	}

	// Call the loaders when the component mounts
	onMount(async () => {
		await Promise.all([loadTariffCsv(), loadPMIData(), loadTEUData()]);
	});
</script>

<div class="container">
	<StoryOpen />
	<Scrolly2D {tariffs} {pmiData} {teuData} />
</div>

<style>
	.container {
		width: 80vw;
		margin: 10px auto;
		padding: 10px;
		align-content: center;
	}
</style>