<script lang="ts">
  import * as d3 from 'd3';
  import { chartColors, chartTypography } from './chartStyles';

  type Props = {
    data: { date: Date }[];
    currentDate: Date | null;
    onDateChange: (date: Date) => void;
    width?: number;
    height?: number;
  };

  let { data, currentDate, onDateChange, width = 900, height = 80 }: Props = $props();

  let sliderContainer: HTMLDivElement;
  let sliderTrack: SVGRectElement;
  let sliderHandle: SVGCircleElement;
  let isDragging = $state(false);

  // Calculate date range
  const dateRange = $derived.by(() => {
    if (data.length === 0) return { min: new Date(), max: new Date() };
    const dates = data.map(d => d.date.getTime());
    return {
      min: new Date(Math.min(...dates)),
      max: new Date(Math.max(...dates))
    };
  });

  // Calculate current position (0-1)
  const currentPosition = $derived.by(() => {
    if (!currentDate || data.length === 0) return 0;
    const { min, max } = dateRange;
    const totalRange = max.getTime() - min.getTime();
    if (totalRange === 0) return 0;
    const currentRange = currentDate.getTime() - min.getTime();
    return Math.min(1, Math.max(0, currentRange / totalRange));
  });

  // Slider dimensions - add padding for labels on both sides
  const sliderPadding = 40; // Padding for labels on left and right
  const sliderWidth = width - sliderPadding * 2;
  const sliderHeight = 40;
  const handleRadius = 8;
  const trackY = height / 2;

  // Convert position to date
  function positionToDate(position: number): Date {
    const { min, max } = dateRange;
    const totalRange = max.getTime() - min.getTime();
    const time = min.getTime() + totalRange * position;
    return new Date(time);
  }

  // Convert date to position
  function dateToPosition(date: Date): number {
    const { min, max } = dateRange;
    const totalRange = max.getTime() - min.getTime();
    if (totalRange === 0) return 0;
    const currentRange = date.getTime() - min.getTime();
    return Math.min(1, Math.max(0, currentRange / totalRange));
  }

  // Handle mouse/touch events
  function handlePointerDown(event: MouseEvent | TouchEvent) {
    isDragging = true;
    handlePointerMove(event);
    event.preventDefault();
    event.stopPropagation();
  }

  function handlePointerMove(event: MouseEvent | TouchEvent) {
    if (!isDragging && event.type !== 'mousemove') return;
    
    if (!sliderContainer) return;
    const rect = sliderContainer.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const x = clientX - rect.left - sliderPadding;
    const position = Math.min(1, Math.max(0, x / sliderWidth));
    const newDate = positionToDate(position);
    onDateChange(newDate);
  }

  function handlePointerUp() {
    isDragging = false;
  }

  // Add global event listeners for dragging
  $effect(() => {
    if (!isDragging) return;

    const handleGlobalMove = (e: MouseEvent | TouchEvent) => handlePointerMove(e);
    const handleGlobalUp = () => handlePointerUp();

    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('touchmove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalUp);
    window.addEventListener('touchend', handleGlobalUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('touchend', handleGlobalUp);
    };
  });

  // Format date for display - use shorter format to avoid overlap
  function formatDate(date: Date): string {
    return d3.timeFormat('%b \'%y')(date);
  }

  // Generate tick marks - show monthly ticks, but label only significant dates
  const ticks = $derived.by(() => {
    const { min, max } = dateRange;
    const totalMonths = d3.timeMonths(min, max).length;
    
    // Show ticks every 3-4 months depending on data range to avoid label overlap
    const tickInterval = totalMonths > 12 ? 4 : 3;
    const allMonths = d3.timeMonths(min, max);
    const filtered = allMonths.filter((d, i) => i % tickInterval === 0 || i === allMonths.length - 1);
    
    // Ensure we don't have too many ticks that would cause overlap
    // If we have more than 8 ticks, increase the interval
    if (filtered.length > 8) {
      const adjustedInterval = Math.ceil(totalMonths / 7);
      return allMonths.filter((d, i) => i % adjustedInterval === 0 || i === allMonths.length - 1);
    }
    
    return filtered;
  });
</script>

{#if data.length > 0}
  <div 
    bind:this={sliderContainer}
    class="time-slider-container"
    style="width: 100%; height: {height}px; max-width: {width}px; box-sizing: border-box;"
    onmousedown={handlePointerDown}
    ontouchstart={handlePointerDown}
  >
    <svg width={width} height={height} class="slider-svg">
      <!-- Track background -->
      <rect
        x={sliderPadding}
        y={trackY - 4}
        width={sliderWidth}
        height={8}
        rx={4}
        fill={chartColors.neutral.gray200}
        class="track-background"
      />

      <!-- Filled track (progress) -->
      <rect
        x={sliderPadding}
        y={trackY - 4}
        width={sliderWidth * currentPosition}
        height={8}
        rx={4}
        fill={chartColors.primary.blue}
        class="track-filled"
      />

      <!-- Tick marks -->
      {#each ticks as tick}
        {@const tickX = sliderPadding + dateToPosition(tick) * sliderWidth}
        <line
          x1={tickX}
          x2={tickX}
          y1={trackY - 8}
          y2={trackY + 8}
          stroke={chartColors.neutral.gray400}
          stroke-width={1}
          class="tick-mark"
        />
        <text
          x={tickX}
          y={trackY + 25}
          text-anchor="middle"
          font-size={chartTypography.fontSize.xs}
          fill={chartColors.neutral.gray600}
          font-family={chartTypography.fontFamily}
          class="tick-label"
        >
          {formatDate(tick)}
        </text>
      {/each}

      <!-- Handle -->
      <circle
        bind:this={sliderHandle}
        cx={sliderPadding + currentPosition * sliderWidth}
        cy={trackY}
        r={handleRadius}
        fill={chartColors.primary.blue}
        stroke="#ffffff"
        stroke-width={2}
        class="slider-handle"
        style="cursor: {isDragging ? 'grabbing' : 'grab'};"
      />

      <!-- Current date label -->
      {#if currentDate}
        <text
          x={sliderPadding + currentPosition * sliderWidth}
          y={trackY - 20}
          text-anchor="middle"
          font-size={chartTypography.fontSize.sm}
          font-weight={chartTypography.fontWeight.semibold}
          fill={chartColors.primary.blue}
          font-family={chartTypography.fontFamily}
          class="current-date-label"
        >
          {formatDate(currentDate)}
        </text>
      {/if}
    </svg>
  </div>
{/if}

<style>
  .time-slider-container {
    position: relative;
    user-select: none;
    touch-action: none;
    margin: var(--spacing-md) auto;
    padding: var(--spacing-sm) 0;
    display: flex;
    justify-content: center;
  }

  .slider-svg {
    display: block;
    overflow: visible;
  }

  .track-background {
    transition: fill 0.2s ease;
  }

  .track-filled {
    transition: width 0.15s ease;
  }

  .slider-handle {
    transition: r 0.2s ease, fill 0.2s ease, stroke-width 0.2s ease;
    cursor: grab;
  }

  .slider-handle:hover {
    r: 10;
    fill: var(--color-primary-dark);
    stroke-width: 3;
  }

  .time-slider-container:active .slider-handle {
    cursor: grabbing;
    r: 11;
  }

  .tick-mark {
    opacity: 0.5;
    transition: opacity 0.2s ease;
  }

  .time-slider-container:hover .tick-mark {
    opacity: 0.8;
  }

  .tick-label {
    user-select: none;
    pointer-events: none;
    transition: fill 0.2s ease;
  }

  .time-slider-container:hover .tick-label {
    fill: var(--color-gray-700);
  }

  .current-date-label {
    user-select: none;
    pointer-events: none;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
  }
</style>

