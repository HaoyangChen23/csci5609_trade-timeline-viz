<script lang="ts">
	import * as d3 from 'd3';
	import type { TimelineData } from '../types';

	type Props = {
		data: TimelineData[];
		currentDate: Date | null;
		registerTimelineItem: (node: HTMLElement, index: number) => { destroy: () => void };
	};
	let { data, currentDate, registerTimelineItem }: Props = $props();

	// State for expanded events
	let expandedEvents = $state(new Set<string>());

	// Show all data (not filtered by currentDate)
	// We'll highlight the current one instead
	const visibleData = $derived(data);

	// Helper function to check if item has tariff action
	function hasTariffAction(item: TimelineData): boolean {
		return Boolean(
			item.tariff_action &&
			item.tariff_action.trim() !== '' &&
			item.tariff_action !== 'nan'
		);
	}

	// Helper function to check if item is first of month
	function isFirstOfMonth(item: TimelineData): boolean {
		return item.date.getDate() === 1;
	}

	// Function to parse countries and deduplicate
	function parseCountries(countryStr: string): string[] {
		if (!countryStr || countryStr.trim() === '' || countryStr === 'nan') return [];

		const countries = countryStr
			.split('\n')
			.map((c) => c.trim())
			.filter((c) => c !== '' && c !== 'nan');

		return [...new Set(countries)];
	}

	// Function to parse markdown links
	function parseLinks(linkStr: string): Array<{ text: string; url: string }> {
		if (!linkStr || linkStr.trim() === '' || linkStr === 'nan') return [];

		const links: Array<{ text: string; url: string }> = [];
		const linkParts = linkStr.split('\n').filter((l) => l.trim() !== '' && l.trim() !== 'nan');

		linkParts.forEach((part) => {
			part = part.trim();
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

	// Check if text is long
	function isLongText(text: string): boolean {
		return text && text.length > 200;
	}

	// Get truncated text
	function getTruncatedText(text: string): string {
		if (!text) return '';
		return text.length > 200 ? text.substring(0, 200) + '...' : text;
	}
</script>

<div class="timeline-container">
	<div class="timeline-ruler">
		<!-- Top spacer to allow first item to reach center -->
		<div class="timeline-spacer"></div>

		{#each visibleData as item, index}
			{@const dateKey = d3.timeFormat('%Y-%m-%d')(item.date)}
			{@const hasAction = hasTariffAction(item)}
			{@const isFirstDay = isFirstOfMonth(item)}
			{@const isCurrent = currentDate && item.date.getTime() === currentDate.getTime()}
			{@const isExpanded = expandedEvents.has(dateKey)}
			{@const countries = parseCountries(item.country)}
			{@const links = parseLinks(item.links)}

			<div
				class="timeline-item {isCurrent ? 'current-item highlighted' : ''}"
				use:registerTimelineItem={index}
			>
				<!-- Timeline tick mark -->
				<div class="tick-mark {hasAction ? 'with-action' : 'month-marker'}"></div>

				<!-- Content box -->
				<div class="item-content">
					{#if hasAction}
						<!-- Tariff Action Event -->
						<div class="event-box">
							<div class="event-header">
								<span class="event-date">{d3.timeFormat('%b %d, %Y')(item.date)}</span>
								{#if isFirstDay}
									<span class="month-badge">Start of Month</span>
								{/if}
							</div>

							{#if countries.length > 0}
								<div class="country-badges">
									{#each countries as country}
										<span class="country-badge">{country}</span>
									{/each}
								</div>
							{/if}

							<div class="tariff-text">
								<p class="tariff-description">
									{isExpanded || !isLongText(item.tariff_action)
										? item.tariff_action
										: getTruncatedText(item.tariff_action)}
								</p>

								{#if isLongText(item.tariff_action)}
									<button class="expand-button" onclick={() => toggleExpanded(dateKey)}>
										{isExpanded ? 'Show less' : 'Read more'}
									</button>
								{/if}
							</div>

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
					{:else if isFirstDay}
						<!-- First of Month Marker (no tariff action) -->
						<div class="month-marker-box">
							<span class="month-marker-text">Start of {d3.timeFormat('%B %Y')(item.date)}</span>
						</div>
					{/if}
				</div>
			</div>
		{/each}

		<!-- Bottom spacer to allow last item to reach center -->
		<div class="timeline-spacer"></div>
	</div>
</div>

<style>
	.timeline-container {
		position: relative;
		padding: 20px 0;
	}

	.current-date-indicator {
		position: sticky;
		top: 10px;
		z-index: 1000;
		margin-bottom: 20px;
		display: flex;
		justify-content: flex-start;
	}

	.indicator-badge {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		padding: 12px 24px;
		border-radius: 8px;
		font-size: 16px;
		font-weight: 700;
		box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% {
			box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
		}
		50% {
			box-shadow: 0 4px 20px rgba(102, 126, 234, 0.6);
		}
	}

	.timeline-ruler {
		position: relative;
		padding-left: 40px;
	}

	.timeline-spacer {
		height: 40vh; /* Half of the container height (80vh) to allow items to reach center */
		min-height: 200px;
	}

	.timeline-item {
		position: relative;
		margin-bottom: 20px;
		transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
	}

	.timeline-item.highlighted {
		background: linear-gradient(to right, rgba(102, 126, 234, 0.15), rgba(102, 126, 234, 0.05));
		margin-left: -20px;
		padding-left: 20px;
		padding-top: 10px;
		padding-bottom: 10px;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
	}

	.timeline-item.current-item {
		animation: highlightFade 1.5s ease-in-out;
	}

	@keyframes highlightFade {
		0% {
			background: rgba(102, 126, 234, 0.15);
		}
		100% {
			background: rgba(102, 126, 234, 0.08);
		}
	}

	.tick-mark {
		position: absolute;
		left: 0;
		top: 8px;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: #ccc;
		border: 3px solid white;
		box-shadow: 0 0 0 2px #ccc;
		transition: all 0.3s ease;
	}

	.tick-mark.with-action {
		background: #4a90e2;
		box-shadow: 0 0 0 2px #4a90e2;
		width: 16px;
		height: 16px;
		top: 6px;
	}

	.tick-mark.month-marker {
		background: #ff9f43;
		box-shadow: 0 0 0 2px #ff9f43;
	}

	.timeline-item.highlighted .tick-mark {
		transform: scale(1.3);
		box-shadow: 0 0 0 3px #667eea, 0 0 12px rgba(102, 126, 234, 0.5);
	}

	.item-content {
		margin-left: 30px;
	}

	.event-box {
		background: #f8f9fa;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		padding: 16px;
		transition: all 0.3s ease;
	}

	.timeline-item.highlighted .event-box {
		background: white;
		border-color: #667eea;
		box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
	}

	.event-header {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 10px;
	}

	.event-date {
		font-size: 14px;
		font-weight: 700;
		color: #2c3e50;
	}

	.month-badge {
		background: #ff9f43;
		color: white;
		padding: 3px 8px;
		border-radius: 4px;
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
	}

	.month-marker-box {
		background: #fff3e0;
		border: 2px solid #ff9f43;
		border-radius: 6px;
		padding: 10px 16px;
		transition: all 0.3s ease;
	}

	.timeline-item.highlighted .month-marker-box {
		background: #ffe0b2;
		border-color: #ff9f43;
		box-shadow: 0 4px 12px rgba(255, 159, 67, 0.2);
	}

	.month-marker-text {
		font-size: 14px;
		font-weight: 600;
		color: #e67e22;
	}

	.country-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-bottom: 12px;
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
		margin-top: 10px;
	}

	.link-button {
		display: inline-block;
		padding: 6px 12px;
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
