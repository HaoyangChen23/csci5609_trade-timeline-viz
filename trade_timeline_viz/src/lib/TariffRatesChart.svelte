<script lang="ts">
	import * as d3 from 'd3';
	import type { TimelineData } from '../types';

	type Props = {
		data: TimelineData[];
		progress: number;
		height: number;
		width: number;
	};
	let { data, progress, height, width }: Props = $props();

	// SVG elements
	let xAxis: SVGGElement;
	let yAxis: SVGGElement;

	// Margins
	const margin = { top: 40, right: 120, bottom: 60, left: 80 };
	const usableArea = $derived({
		top: margin.top,
		right: width - margin.right,
		bottom: height - margin.bottom,
		left: margin.left
	});

	// Normalize progress to 0-1 range (it might come as 0-100 or other scale)
	// Round to 3 decimal places (0.1% precision) to prevent oscillation from tiny changes
	const normalizedProgress = $derived(
		Math.round(Math.max(0, Math.min(1, progress > 1 ? progress / 100 : progress)) * 1000) / 1000
	);

	// Filter data based on progress
	const visibleData = $derived.by(() => {
		if (!data || data.length === 0) {
			console.log('TariffRatesChart - NO DATA!');
			return [];
		}
		const maxIndex = Math.floor(normalizedProgress * data.length);
		const result = data.slice(0, Math.max(1, maxIndex));
		console.log('TariffRatesChart - data length:', data.length, 'raw progress:', progress, 'normalized:', normalizedProgress, 'maxIndex:', maxIndex, 'visibleData length:', result.length, 'first item:', result[0]?.date);
		return result;
	});

	// Get the current date based on progress for the indicator line
	const currentDate = $derived.by(() => {
		const currentIndex = Math.floor(normalizedProgress * data.length) - 1;
		return currentIndex >= 0 && data[currentIndex] ? data[currentIndex].date : null;
	});

	// Scales
	const xScale = $derived(
		d3
			.scaleTime()
			.domain(d3.extent(data, (d) => d.date) as [Date, Date])
			.range([usableArea.left, usableArea.right])
	);

	const yScale = $derived.by(() => {
		const allValues = data.flatMap((d) => [
			d.chinese_tariffs_row,
			d.chinese_tariffs_us,
			d.us_tariffs_chinese,
			d.us_tariffs_row
		]);
		const [min, max] = d3.extent(allValues) as [number, number];
		return d3
			.scaleLinear()
			.domain([Math.min(0, min), max])
			.range([usableArea.bottom, usableArea.top])
			.nice();
	});

	// Line generators
	const lineChineseTariffsRow = $derived(
		d3
			.line<TimelineData>()
			.x((d) => xScale(d.date))
			.y((d) => yScale(d.chinese_tariffs_row))
	);

	const lineChineseTariffsUS = $derived(
		d3
			.line<TimelineData>()
			.x((d) => xScale(d.date))
			.y((d) => yScale(d.chinese_tariffs_us))
	);

	const lineUSTariffsChinese = $derived(
		d3
			.line<TimelineData>()
			.x((d) => xScale(d.date))
			.y((d) => yScale(d.us_tariffs_chinese))
	);

	const lineUSTariffsRow = $derived(
		d3
			.line<TimelineData>()
			.x((d) => xScale(d.date))
			.y((d) => yScale(d.us_tariffs_row))
	);

	// Update axes when scales change
	$effect(() => {
		if (xAxis) {
			d3.select(xAxis).call(
				d3.axisBottom(xScale).tickFormat((d) => d3.timeFormat('%b %Y')(d as Date))
			);
		}
		if (yAxis) {
			d3.select(yAxis).call(d3.axisLeft(yScale).tickFormat((d) => `${d}%`));
		}
	});

	// Line colors
	const colors = {
		chinese_row: '#ff6b6b',
		chinese_us: '#ff9f43',
		us_chinese: '#4a90e2',
		us_row: '#2ed573'
	};
</script>

{#if data.length > 0}
	<svg {width} {height} class="chart-svg">
		<!-- Grid lines -->
		<g class="grid-lines">
			{#each yScale.ticks(8) as tick}
				<line
					x1={usableArea.left}
					x2={usableArea.right}
					y1={yScale(tick)}
					y2={yScale(tick)}
					stroke="#e0e0e0"
					stroke-width="1"
					stroke-dasharray="3,3"
				/>
			{/each}
		</g>

		<!-- Lines -->
		<g class="lines">
			{#if visibleData.length > 0}
				<!-- Chinese tariffs on ROW -->
				<path
					d={lineChineseTariffsRow(visibleData) || ''}
					fill="none"
					stroke={colors.chinese_row}
					stroke-width="2.5"
					class="tariff-line"
				/>

				<!-- Chinese tariffs on US -->
				<path
					d={lineChineseTariffsUS(visibleData) || ''}
					fill="none"
					stroke={colors.chinese_us}
					stroke-width="2.5"
					class="tariff-line"
				/>

				<!-- US tariffs on Chinese -->
				<path
					d={lineUSTariffsChinese(visibleData) || ''}
					fill="none"
					stroke={colors.us_chinese}
					stroke-width="2.5"
					class="tariff-line"
				/>

				<!-- US tariffs on ROW -->
				<path
					d={lineUSTariffsRow(visibleData) || ''}
					fill="none"
					stroke={colors.us_row}
					stroke-width="2.5"
					class="tariff-line"
				/>
			{/if}
		</g>

		<!-- Progress indicator line -->
		{#if currentDate}
			<line
				x1={xScale(currentDate)}
				x2={xScale(currentDate)}
				y1={usableArea.top}
				y2={usableArea.bottom}
				stroke="#ff6b6b"
				stroke-width="2"
				stroke-dasharray="5,5"
				opacity="0.7"
				class="progress-line"
			/>
			<circle
				cx={xScale(currentDate)}
				cy={usableArea.top - 10}
				r="5"
				fill="#ff6b6b"
				class="progress-indicator"
			/>
		{/if}

		<!-- Axes -->
		<g class="axes">
			<g transform="translate(0, {usableArea.bottom})" bind:this={xAxis} />
			<g transform="translate({usableArea.left}, 0)" bind:this={yAxis} />
		</g>

		<!-- Axis labels -->
		<text
			class="axis-label"
			transform="rotate(-90)"
			y={15}
			x={-(usableArea.top + usableArea.bottom) / 2}
			text-anchor="middle"
			font-size="14"
			font-weight="600"
		>
			Tariff Rate (%)
		</text>
		<text
			class="axis-label"
			y={height - 10}
			x={(usableArea.left + usableArea.right) / 2}
			text-anchor="middle"
			font-size="14"
			font-weight="600"
		>
			Date
		</text>

		<!-- Legend -->
		<g class="legend" transform="translate({usableArea.right + 10}, {usableArea.top})">
			<g transform="translate(0, 0)">
				<line x1="0" x2="20" y1="0" y2="0" stroke={colors.chinese_row} stroke-width="2.5" />
				<text x="25" y="5" font-size="11" fill="#333">Chinese → ROW</text>
			</g>
			<g transform="translate(0, 20)">
				<line x1="0" x2="20" y1="0" y2="0" stroke={colors.chinese_us} stroke-width="2.5" />
				<text x="25" y="5" font-size="11" fill="#333">Chinese → US</text>
			</g>
			<g transform="translate(0, 40)">
				<line x1="0" x2="20" y1="0" y2="0" stroke={colors.us_chinese} stroke-width="2.5" />
				<text x="25" y="5" font-size="11" fill="#333">US → Chinese</text>
			</g>
			<g transform="translate(0, 60)">
				<line x1="0" x2="20" y1="0" y2="0" stroke={colors.us_row} stroke-width="2.5" />
				<text x="25" y="5" font-size="11" fill="#333">US → ROW</text>
			</g>
		</g>

		<!-- Title -->
		<text class="chart-title" x={width / 2} y={margin.top / 2} text-anchor="middle">
			US-China Tariff Rates Toward Each Other and Rest of World (ROW)
		</text>
	</svg>
{/if}

<style>
	.chart-svg {
		font-family: Arial, sans-serif;
		font-size: 12px;
	}
	.tariff-line {
		transition: d 0.3s ease;
	}
	.axes,
	.axis-label {
		color: #333;
	}
	.chart-title {
		font-size: 16px;
		font-weight: bold;
		fill: #333;
	}
</style>
