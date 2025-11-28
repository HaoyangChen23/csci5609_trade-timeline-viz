<script lang="ts">
	import * as d3 from 'd3';
	import type { TimelineData } from '../types';

	type Props = {
		data: TimelineData[];
		currentDate: Date | null;
		height: number;
		width: number;
		onDateSelect?: (date: Date) => void;
	};
	let { data, currentDate, height, width, onDateSelect }: Props = $props();

	// SVG elements
	let svgElement: SVGSVGElement = $state()!;
	let xAxis: SVGGElement = $state()!;
	let yAxis: SVGGElement = $state()!;

	// Tooltip state
	type TooltipData = {
		x: number;
		y: number;
		date: Date;
		chinese_us: number;
		us_chinese: number;
		chinese_row: number;
		us_row: number;
	};
	let tooltipData: TooltipData | null = $state(null);

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

	// Update line paths and endpoints with shared transition for perfect sync
	$effect(() => {
		if (!svgElement || visibleData.length === 0) return;

		const svg = d3.select(svgElement);

		// Create a single shared transition for all elements
		const t = svg.transition().duration(100).ease(d3.easeLinear);

		// Update all lines with shared transition
		svg.select('.line-chinese-row').transition(t).attr('d', lineChineseTariffsRow(visibleData) || '');
		svg.select('.line-chinese-us').transition(t).attr('d', lineChineseTariffsUS(visibleData) || '');
		svg.select('.line-us-chinese').transition(t).attr('d', lineUSTariffsChinese(visibleData) || '');
		svg.select('.line-us-row').transition(t).attr('d', lineUSTariffsRow(visibleData) || '');

		// Update endpoint circles and labels with same shared transition
		if (lastDataPoint) {
			// Chinese → US endpoint
			svg.select('.endpoint-chinese-us').transition(t)
				.attr('cx', xScale(lastDataPoint.date))
				.attr('cy', yScale(lastDataPoint.chinese_tariffs_us));
			svg.select('.label-chinese-us').transition(t)
				.attr('x', xScale(lastDataPoint.date) + 10)
				.attr('y', yScale(lastDataPoint.chinese_tariffs_us) + 4)
				.text(`${lastDataPoint.chinese_tariffs_us.toFixed(1)}%`);

			// US → Chinese endpoint
			svg.select('.endpoint-us-chinese').transition(t)
				.attr('cx', xScale(lastDataPoint.date))
				.attr('cy', yScale(lastDataPoint.us_tariffs_chinese));
			svg.select('.label-us-chinese').transition(t)
				.attr('x', xScale(lastDataPoint.date) + 10)
				.attr('y', yScale(lastDataPoint.us_tariffs_chinese) + 4)
				.text(`${lastDataPoint.us_tariffs_chinese.toFixed(1)}%`);

			// Chinese → ROW endpoint
			svg.select('.endpoint-chinese-row').transition(t)
				.attr('cx', xScale(lastDataPoint.date))
				.attr('cy', yScale(lastDataPoint.chinese_tariffs_row));
			svg.select('.label-chinese-row').transition(t)
				.attr('x', xScale(lastDataPoint.date) + 10)
				.attr('y', yScale(lastDataPoint.chinese_tariffs_row) + 4)
				.text(`${lastDataPoint.chinese_tariffs_row.toFixed(1)}%`);

			// US → ROW endpoint
			svg.select('.endpoint-us-row').transition(t)
				.attr('cx', xScale(lastDataPoint.date))
				.attr('cy', yScale(lastDataPoint.us_tariffs_row));
			svg.select('.label-us-row').transition(t)
				.attr('x', xScale(lastDataPoint.date) + 10)
				.attr('y', yScale(lastDataPoint.us_tariffs_row) + 4)
				.text(`${lastDataPoint.us_tariffs_row.toFixed(1)}%`);
		}
	});

	// Line colors (brighter for better visibility)
	const colors = {
		chinese_us: '#e63946',    // Bright red - Chinese tariffs on US
		us_chinese: '#2563eb',    // Bright blue - US tariffs on Chinese
		chinese_row: '#e63946',   // Bright red dotted - Chinese tariffs on ROW
		us_row: '#2563eb'         // Bright blue dotted - US tariffs on ROW
	};

	// Get the last visible data point for endpoint labels
	const lastDataPoint = $derived(visibleData.length > 0 ? visibleData[visibleData.length - 1] : null);

	// Filter data to only first-of-month entries for data points
	const monthlyData = $derived.by(() => {
		const seen = new Set<string>();
		const filtered: TimelineData[] = [];

		data.forEach((d) => {
			if (d.date.getDate() === 1) {
				const monthKey = d3.timeFormat('%Y-%m')(d.date);
				if (!seen.has(monthKey)) {
					filtered.push(d);
					seen.add(monthKey);
				}
			}
		});

		return filtered.sort((a, b) => a.date.getTime() - b.date.getTime());
	});

	// Filter visible monthly data based on current date
	const visibleMonthlyData = $derived.by(() => {
		if (!currentDate) return [];
		return monthlyData.filter(d => d.date <= currentDate);
	});

	// Event handlers for data points
	function handlePointHover(event: MouseEvent, d: TimelineData) {
		const rect = svgElement.getBoundingClientRect();
		tooltipData = {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top,
			date: d.date,
			chinese_us: d.chinese_tariffs_us,
			us_chinese: d.us_tariffs_chinese,
			chinese_row: d.chinese_tariffs_row,
			us_row: d.us_tariffs_row
		};
	}

	function handlePointLeave() {
		tooltipData = null;
	}

	function handlePointClick(d: TimelineData) {
		if (onDateSelect) {
			onDateSelect(d.date);
		}
	}
</script>

{#if data.length > 0}
	<div class="chart-container" style="position: relative; width: {width}px; height: {height}px;">
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
			<!-- Chinese tariffs on ROW (dotted) -->
			<path
				class="tariff-line line-chinese-row"
				fill="none"
				stroke={colors.chinese_row}
				stroke-width="2"
				stroke-dasharray="4,4"
			/>

			<!-- Chinese tariffs on US (solid) -->
			<path
				class="tariff-line line-chinese-us"
				fill="none"
				stroke={colors.chinese_us}
				stroke-width="2.5"
			/>

			<!-- US tariffs on Chinese (solid) -->
			<path
				class="tariff-line line-us-chinese"
				fill="none"
				stroke={colors.us_chinese}
				stroke-width="2.5"
			/>

			<!-- US tariffs on ROW (dotted) -->
			<path
				class="tariff-line line-us-row"
				fill="none"
				stroke={colors.us_row}
				stroke-width="2"
				stroke-dasharray="4,4"
			/>
		</g>

		<!-- Data points for each month (interactive) -->
		<g class="data-points">
			{#each visibleMonthlyData as d}
				<!-- Chinese → US data point -->
				<circle
					cx={xScale(d.date)}
					cy={yScale(d.chinese_tariffs_us)}
					r="4"
					fill={colors.chinese_us}
					stroke="white"
					stroke-width="1"
					class="data-point"
					role="button"
					tabindex="0"
					onmouseenter={(e) => handlePointHover(e, d)}
					onmouseleave={handlePointLeave}
					onclick={() => handlePointClick(d)}
					onkeydown={(e) => e.key === 'Enter' && handlePointClick(d)}
				/>
				<!-- US → Chinese data point -->
				<circle
					cx={xScale(d.date)}
					cy={yScale(d.us_tariffs_chinese)}
					r="4"
					fill={colors.us_chinese}
					stroke="white"
					stroke-width="1"
					class="data-point"
					role="button"
					tabindex="0"
					onmouseenter={(e) => handlePointHover(e, d)}
					onmouseleave={handlePointLeave}
					onclick={() => handlePointClick(d)}
					onkeydown={(e) => e.key === 'Enter' && handlePointClick(d)}
				/>
			{/each}
		</g>

		<!-- Endpoint circles and value labels (positions managed by D3 transitions) -->
		<g class="endpoints">
			<!-- Chinese tariffs on US endpoint -->
			<circle
				r="5"
				fill={colors.chinese_us}
				class="endpoint-dot endpoint-chinese-us"
			/>
			<text
				font-size="12"
				font-weight="600"
				fill={colors.chinese_us}
				class="label-chinese-us"
			></text>

			<!-- US tariffs on Chinese endpoint -->
			<circle
				r="5"
				fill={colors.us_chinese}
				class="endpoint-dot endpoint-us-chinese"
			/>
			<text
				font-size="12"
				font-weight="600"
				fill={colors.us_chinese}
				class="label-us-chinese"
			></text>

			<!-- Chinese tariffs on ROW endpoint -->
			<circle
				r="4"
				fill="white"
				stroke={colors.chinese_row}
				stroke-width="2"
				class="endpoint-dot endpoint-chinese-row"
			/>
			<text
				font-size="12"
				font-weight="600"
				fill={colors.chinese_row}
				class="label-chinese-row"
			></text>

			<!-- US tariffs on ROW endpoint -->
			<circle
				r="4"
				fill="white"
				stroke={colors.us_row}
				stroke-width="2"
				class="endpoint-dot endpoint-us-row"
			/>
			<text
				font-size="12"
				font-weight="600"
				fill={colors.us_row}
				class="label-us-row"
			></text>
		</g>

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
				<line x1="0" x2="20" y1="0" y2="0" stroke={colors.chinese_us} stroke-width="2.5" />
				<text x="25" y="5" font-size="11" fill="#333">Chinese → US</text>
			</g>
			<g transform="translate(0, 20)">
				<line x1="0" x2="20" y1="0" y2="0" stroke={colors.us_chinese} stroke-width="2.5" />
				<text x="25" y="5" font-size="11" fill="#333">US → Chinese</text>
			</g>
			<g transform="translate(0, 40)">
				<line x1="0" x2="20" y1="0" y2="0" stroke={colors.chinese_row} stroke-width="2" stroke-dasharray="4,4" />
				<text x="25" y="5" font-size="11" fill="#333">Chinese → ROW</text>
			</g>
			<g transform="translate(0, 60)">
				<line x1="0" x2="20" y1="0" y2="0" stroke={colors.us_row} stroke-width="2" stroke-dasharray="4,4" />
				<text x="25" y="5" font-size="11" fill="#333">US → ROW</text>
			</g>
		</g>

		<!-- Title -->
		<text class="chart-title" x={width / 2} y={margin.top / 2} text-anchor="middle">
			US-China Tariff Rates Toward Each Other and Rest of World (ROW)
		</text>
		</svg>

		<!-- Tooltip -->
		{#if tooltipData}
			<div
				class="tooltip"
				style="left: {tooltipData.x + 15}px; top: {tooltipData.y - 10}px;"
			>
				<div class="tooltip-date">{d3.timeFormat('%B %Y')(tooltipData.date)}</div>
				<div class="tooltip-row">
					<span class="tooltip-label" style="color: {colors.chinese_us}">Chinese → US:</span>
					<span class="tooltip-value" style="color: {colors.chinese_us}">{tooltipData.chinese_us.toFixed(1)}%</span>
				</div>
				<div class="tooltip-row">
					<span class="tooltip-label" style="color: {colors.us_chinese}">US → Chinese:</span>
					<span class="tooltip-value" style="color: {colors.us_chinese}">{tooltipData.us_chinese.toFixed(1)}%</span>
				</div>
				<div class="tooltip-row">
					<span class="tooltip-label" style="color: {colors.chinese_row}">Chinese → ROW:</span>
					<span class="tooltip-value" style="color: {colors.chinese_row}">{tooltipData.chinese_row.toFixed(1)}%</span>
				</div>
				<div class="tooltip-row">
					<span class="tooltip-label" style="color: {colors.us_row}">US → ROW:</span>
					<span class="tooltip-value" style="color: {colors.us_row}">{tooltipData.us_row.toFixed(1)}%</span>
				</div>
				<div class="tooltip-hint">Click to jump to this date</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.chart-container {
		position: relative;
	}

	.chart-svg {
		font-family: Arial, sans-serif;
		font-size: 12px;
	}

	.data-point {
		cursor: pointer;
		transition: r 0.15s ease;
	}

	.data-point:hover {
		r: 6;
	}

	.tooltip {
		position: absolute;
		background: white;
		border: 1px solid #ccc;
		border-radius: 6px;
		padding: 8px 12px;
		font-size: 12px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		pointer-events: none;
		z-index: 100;
		white-space: nowrap;
	}

	.tooltip-date {
		font-weight: 600;
		color: #333;
		margin-bottom: 6px;
		padding-bottom: 4px;
		border-bottom: 1px solid #eee;
	}

	.tooltip-row {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		margin: 2px 0;
	}

	.tooltip-label {
		font-size: 11px;
	}

	.tooltip-value {
		font-weight: 600;
	}

	.tooltip-hint {
		font-size: 10px;
		color: #888;
		margin-top: 6px;
		font-style: italic;
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
