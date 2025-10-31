<script lang="ts">
	import { onMount } from 'svelte';
	import * as d3 from 'd3';
	import type { TTariff } from '../../types';
	import StoryOpen from './StoryOpen.svelte';
	import Scrolly2D from './Scrolly2D.svelte';

	let tariffs: TTariff[] = $state([]);

	// Function to load the tariff CSV
	async function loadTariffCsv() {
		try {
			const csvUrl = '/CSCI5609_Project_Dataset - Sheet1.csv';
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

	// Call the loaders when the component mounts
	onMount(() => {
		loadTariffCsv();
	});
</script>

<div class="container">
	<StoryOpen />
	<Scrolly2D {tariffs} />
</div>

<style>
  .container {
    width: 80vw;
    margin: 10px auto;
    padding: 10px;
    align-content: center;
  }
</style>