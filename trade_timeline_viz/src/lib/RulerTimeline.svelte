<script lang="ts">
	import * as d3 from 'd3';
	import type { TimelineData } from '../types';

	type Props = {
		data: TimelineData[];
		progress: number;
	};
	let { data, progress }: Props = $props();

	// State for expanded events
	let expandedEvents = $state(new Set<string>());

	// Debug: Log data changes
	$effect(() => {
		console.log('RulerTimeline - data length:', data.length);
		console.log('RulerTimeline - progress:', progress);
	});

	// Filter data up to current progress (always show at least 1 item)
	const visibleData = $derived.by(() => {
		const maxIndex = Math.floor(progress * data.length);
		const result = data.slice(0, Math.max(1, maxIndex));
		console.log('RulerTimeline - visibleData length:', result.length);
		return result;
	});

	// Current date based on progress (for the indicator)
	const currentDateIndex = $derived(Math.floor(progress * data.length) - 1);
	const currentDate = $derived(currentDateIndex >= 0 && data[currentDateIndex] ? data[currentDateIndex].date : null);

	// Group data by month for month headers
	const dataByMonth = $derived.by(() => {
		const grouped = new Map<string, TimelineData[]>();

		visibleData.forEach((d) => {
			const monthKey = d3.timeFormat('%Y-%m')(d.date);
			if (!grouped.has(monthKey)) {
				grouped.set(monthKey, []);
			}
			grouped.get(monthKey)!.push(d);
		});

		return Array.from(grouped.entries()).map(([monthKey, items]) => {
			const [year, month] = monthKey.split('-');
			const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);

			// Check if month has any events
			const hasEvents = items.some(item =>
				item.tariff_action && item.tariff_action.trim() !== '' && item.tariff_action !== 'nan'
			);

			return {
				monthKey,
				monthName: d3.timeFormat('%B %Y')(monthDate),
				items: items.sort((a, b) => a.date.getTime() - b.date.getTime()),
				hasEvents
			};
		});
	});

	// Function to parse countries and deduplicate
	function parseCountries(countryStr: string): string[] {
		if (!countryStr || countryStr.trim() === '' || countryStr === 'nan') return [];

		const countries = countryStr
			.split('\n')
			.map((c) => c.trim())
			.filter((c) => c !== '' && c !== 'nan');

		// Deduplicate
		return [...new Set(countries)];
	}

	// Function to parse markdown links
	function parseLinks(linkStr: string): Array<{ text: string; url: string }> {
		if (!linkStr || linkStr.trim() === '' || linkStr === 'nan') return [];

		const links: Array<{ text: string; url: string }> = [];
		const linkParts = linkStr.split('\n').filter((l) => l.trim() !== '' && l.trim() !== 'nan');

		linkParts.forEach((part) => {
			part = part.trim();
			// Match markdown link format: [text](url)
			const markdownMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
			if (markdownMatch) {
				links.push({ text: markdownMatch[1], url: markdownMatch[2] });
			} else if (part.startsWith('http://') || part.startsWith('https://')) {
				links.push({ text: 'Link', url: part });
			}
		});

		return links;
	}

	// Function to toggle expanded state
	function toggleExpanded(dateKey: string) {
		if (expandedEvents.has(dateKey)) {
			expandedEvents.delete(dateKey);
		} else {
			expandedEvents.add(dateKey);
		}
		expandedEvents = new Set(expandedEvents);
	}

	// Check if text is long (more than 200 characters)
	function isLongText(text: string): boolean {
		return text && text.length > 200;
	}

	// Get truncated text
	function getTruncatedText(text: string): string {
		if (!text) return '';
		return text.length > 200 ? text.substring(0, 200) + '...' : text;
	}
</script>

<div class="timeline-ruler">
	{#each dataByMonth as month}
		{#if month.hasEvents}
			<!-- Month with events - show full timeline -->
			<div class="month-marker">
				<div class="month-line"></div>
				<div class="month-label">{month.monthName}</div>
			</div>

			<!-- Days in this month -->
			{#each month.items as item}
				{@const dateKey = d3.timeFormat('%Y-%m-%d')(item.date)}
				{@const hasTariffAction = item.tariff_action && item.tariff_action.trim() !== '' && item.tariff_action !== 'nan'}
				{@const isFirstOfMonth = item.date.getDate() === 1}
				{@const isExpanded = expandedEvents.has(dateKey)}
				{@const isCurrent = currentDate && item.date.getTime() === currentDate.getTime()}

				{#if hasTariffAction}
					{@const countries = parseCountries(item.country)}
					{@const links = parseLinks(item.links)}

					<div class="day-marker has-event {isFirstOfMonth ? 'first-of-month' : ''} {isCurrent ? 'current-date' : ''}">
					<!-- Progress indicator arrow (only for current date) -->
					{#if isCurrent}
						<div class="progress-indicator">
							<div class="indicator-arrow"></div>
							<div class="indicator-label">{d3.timeFormat('%b %d, %Y')(item.date)}</div>
						</div>
					{/if}

					<!-- Day tick mark -->
					<div class="day-tick"></div>

					<!-- Day label (smaller) -->
					<div class="day-label">{d3.timeFormat('%d')(item.date)}</div>

					<!-- Event content -->
					<div class="event-content">
							<!-- Country badges -->
							{#if countries.length > 0}
								<div class="country-badges">
									{#each countries as country}
										<span class="country-badge">{country}</span>
									{/each}
								</div>
							{/if}

							<!-- Tariff action text -->
							<div class="tariff-text">
								<p class="tariff-description">
									{isExpanded || !isLongText(item.tariff_action)
										? item.tariff_action
										: getTruncatedText(item.tariff_action)}
								</p>

								{#if isLongText(item.tariff_action)}
									<button class="expand-button" onclick={() => toggleExpanded(dateKey)}>
										{isExpanded ? 'Show less' : 'Expand to read more'}
									</button>
								{/if}
							</div>

							<!-- Links -->
							{#if links.length > 0}
								<div class="event-links">
									{#each links as link}
										<a href={link.url} target="_blank" rel="noopener noreferrer" class="link-button">
											{link.text}
										</a>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				{/if}
			{/each}
		{:else}
			<!-- Empty month - show normal month marker -->
			<div class="month-marker">
				<div class="month-line"></div>
				<div class="month-label">{month.monthName}</div>
			</div>
		{/if}
	{/each}
</div>

<style>
	.timeline-ruler {
		position: relative;
		padding: 20px 0;
		min-height: 100vh;
	}

	/* Progress Indicator */
	.progress-indicator {
		position: absolute;
		left: -10px;
		top: 0;
		z-index: 100;
		display: flex;
		align-items: center;
	}

	.indicator-arrow {
		width: 0;
		height: 0;
		border-top: 8px solid transparent;
		border-bottom: 8px solid transparent;
		border-left: 12px solid #ff6b6b;
	}

	.indicator-label {
		position: absolute;
		left: -95px;
		background: #ff6b6b;
		color: white;
		padding: 5px 10px;
		border-radius: 4px;
		font-size: 11px;
		font-weight: 600;
		white-space: nowrap;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}

	.day-marker.current-date {
		background-color: rgba(255, 107, 107, 0.05);
	}

	/* Month Markers */
	.month-marker {
		position: relative;
		margin: 40px 0 20px 0;
	}

	.month-line {
		width: 100%;
		height: 3px;
		background: linear-gradient(to right, #4a90e2, #2c3e50);
		border-radius: 2px;
		margin-bottom: 10px;
	}

	.month-label {
		font-size: 22px;
		font-weight: 700;
		color: #2c3e50;
		padding: 5px 0;
		background: white;
		display: inline-block;
	}

	/* Day Markers */
	.day-marker {
		position: relative;
		margin-left: 20px;
		padding-left: 20px;
		border-left: 2px solid #e0e0e0;
		min-height: 30px;
		margin-bottom: 5px;
	}

	.day-marker.has-event {
		border-left-color: #4a90e2;
		border-left-width: 3px;
		margin-bottom: 20px;
		padding-bottom: 15px;
	}

	.day-marker.first-of-month {
		margin-top: 0;
	}

	.day-tick {
		position: absolute;
		left: -2px;
		top: 0;
		width: 10px;
		height: 2px;
		background: #666;
	}

	.day-marker.has-event .day-tick {
		width: 15px;
		height: 3px;
		background: #4a90e2;
		left: -3px;
	}

	.day-label {
		font-size: 12px;
		color: #666;
		position: absolute;
		left: -45px;
		top: -5px;
		width: 30px;
		text-align: right;
	}

	.event-content {
		margin-top: 5px;
		padding: 12px;
		background: #f8f9fa;
		border-radius: 6px;
		border: 1px solid #e0e0e0;
	}

	.country-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-bottom: 10px;
	}

	.country-badge {
		background: #4a90e2;
		color: white;
		padding: 4px 10px;
		border-radius: 4px;
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
	}

	.tariff-text {
		margin-bottom: 10px;
	}

	.tariff-description {
		margin: 0 0 8px 0;
		color: #333;
		line-height: 1.6;
		font-size: 14px;
	}

	.expand-button {
		background: transparent;
		border: 1px solid #4a90e2;
		color: #4a90e2;
		padding: 6px 12px;
		border-radius: 4px;
		font-size: 12px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.expand-button:hover {
		background: #4a90e2;
		color: white;
	}

	.event-links {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 8px;
	}

	.link-button {
		display: inline-block;
		padding: 5px 10px;
		background: #357ab8;
		color: white;
		text-decoration: none;
		border-radius: 4px;
		font-size: 11px;
		transition: background 0.2s ease;
	}

	.link-button:hover {
		background: #2c6599;
	}
</style>
