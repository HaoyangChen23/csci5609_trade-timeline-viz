<script lang="ts">
	import * as d3 from 'd3';
	import type { TimelineData } from '../types';

	type Props = {
		data: TimelineData[];
		currentDate: Date | null;
		height: number;
		width: number;
	};
	let { data, currentDate, height, width }: Props = $props();

	// SVG elements
	let svgElement: SVGSVGElement;
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

	// Filter visible data up to current date
	const visibleData = $derived.by(() => {
		if (!currentDate) return [];
		return data.filter(d => d.date <= currentDate);
	});

	// Scales - use full data range for consistent domain
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

	// Smooth transitions for line paths
	$effect(() => {
		if (!svgElement || visibleData.length === 0) return;

		const svg = d3.select(svgElement);

		// Transition all lines smoothly
		svg.select('.line-chinese-row')
			.transition()
			.duration(300)
			.ease(d3.easeCubicInOut)
			.attr('d', lineChineseTariffsRow(visibleData) || '');

		svg.select('.line-chinese-us')
			.transition()
			.duration(300)
			.ease(d3.easeCubicInOut)
			.attr('d', lineChineseTariffsUS(visibleData) || '');

		svg.select('.line-us-chinese')
			.transition()
			.duration(300)
			.ease(d3.easeCubicInOut)
			.attr('d', lineUSTariffsChinese(visibleData) || '');

		svg.select('.line-us-row')
			.transition()
			.duration(300)
			.ease(d3.easeCubicInOut)
			.attr('d', lineUSTariffsRow(visibleData) || '');
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
	<svg bind:this={svgElement} {width} {height} class="chart-svg">
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
			<!-- Chinese tariffs on ROW -->
			<path
				class="tariff-line line-chinese-row"
				fill="none"
				stroke={colors.chinese_row}
				stroke-width="2.5"
			/>

			<!-- Chinese tariffs on US -->
			<path
				class="tariff-line line-chinese-us"
				fill="none"
				stroke={colors.chinese_us}
				stroke-width="2.5"
			/>

			<!-- US tariffs on Chinese -->
			<path
				class="tariff-line line-us-chinese"
				fill="none"
				stroke={colors.us_chinese}
				stroke-width="2.5"
			/>

			<!-- US tariffs on ROW -->
			<path
				class="tariff-line line-us-row"
				fill="none"
				stroke={colors.us_row}
				stroke-width="2.5"
			/>
		</g>

		<!-- Progress indicator line -->
		{#if currentDate}
			<g class="progress-indicator">
				<line
					x1={xScale(currentDate)}
					x2={xScale(currentDate)}
					y1={usableArea.top}
					y2={usableArea.bottom}
					stroke="#667eea"
					stroke-width="3"
					stroke-dasharray="5,5"
					opacity="0.8"
					class="progress-line"
				/>
				<circle
					cx={xScale(currentDate)}
					cy={usableArea.top - 15}
					r="6"
					fill="#667eea"
					class="progress-dot"
				/>
				<text
					x={xScale(currentDate)}
					y={usableArea.top - 25}
					text-anchor="middle"
					font-size="11"
					font-weight="600"
					fill="#667eea"
				>
					{d3.timeFormat('%b %d')(currentDate)}
				</text>
			</g>
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
		transition: opacity 0.3s ease;
	}

	.progress-line {
		transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
	}

	.progress-dot {
		transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
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
