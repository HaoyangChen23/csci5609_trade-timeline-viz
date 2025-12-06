<script lang="ts">
    import type {TTariff, TPMI, TTEU, AutoIncome, TariffData, TradeBalance, TimelineData} from "../../types";

    // define the props of this component
    type Props = {
        tariffs: TTariff[];
        pmiData: TPMI[];
        teuData: TTEU[];
        incomeData: AutoIncome[];
        globalTariffData: TariffData[];
        tradeBalanceData: TradeBalance[];
        timelineData: TimelineData[];
        // Updated to include all fields needed by InflationChart
        inflationData: { date: Date; rate: number; corePCE: number; importPrice: number }[];
        // Added missing prop
        soybeanData: { year: number; US: number; Argentina: number; Brazil: number; Uruguay: number; Others: number }[];
    };
    let {
        tariffs,
        pmiData,
        teuData,
        incomeData,
        globalTariffData,
        tradeBalanceData,
        timelineData,
        inflationData,
        soybeanData,
    }: Props = $props();

    import {
        Scroll,
        RulerTimeline,
        TariffRatesChart,
        PortTEUChart,
        ManufacturingPMIChart,
        AutoIncomeBarChart,
        GlobeTariffViz,
        TradeBalanceChart,
        PMILineChart,
        TEUMultiLineChart,
        USInvestmentMap,
        InflationChart,
        SoybeanChart,
        TimeSlider,
    } from "$lib";
    import * as d3 from "d3";

    // Progress variables for other scroll sections
    let tariffRatesScrollProgress = $state(0);
    let portTEUScrollProgress = $state(0);
    let pmiScrollProgress = $state(0);
    let tradeBalanceScrollProgress = $state(0);
    let autoIncomeScrollProgress = $state(0);
    let investmentMapScrollProgress = $state(0);
    let inflationScrollProgress = $state(0);
    let soybeanScrollProgress = $state(0);

    // Timeline scroll state (independent from page scroll)
    let timelineScrollContainer: HTMLElement = $state();
    let currentIndex = $state(0); // Start at 0 to show first date
    let timelineItemElements = new Map<number, HTMLElement>(); // Store refs to timeline items

    // Create filtered timeline dataset: only tariff action dates + first of each month
    const filteredTimelineData = $derived.by(() => {
        const seen = new Set<string>();
        const filtered: TimelineData[] = [];

        timelineData.forEach((d) => {
            const dateKey = d3.timeFormat('%Y-%m-%d')(d.date);

            // Skip if already added
            if (seen.has(dateKey)) return;

            // Include if has tariff action
            const hasTariffAction = d.tariff_action &&
                d.tariff_action.trim() !== '' &&
                d.tariff_action !== 'nan';

            // Include if first day of month
            const isFirstOfMonth = d.date.getDate() === 1;

            if (hasTariffAction || isFirstOfMonth) {
                filtered.push(d);
                seen.add(dateKey);
            }
        });

        // Sort by date to ensure chronological order
        return filtered.sort((a, b) => a.date.getTime() - b.date.getTime());
    });

    // Calculate current date from index
    const currentDate = $derived(currentIndex >= 0 ? filteredTimelineData[currentIndex]?.date : null);

    // Handle timeline container scroll - find item closest to center
    function handleTimelineScroll(event: Event) {
        const container = event.target as HTMLElement;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const containerCenter = containerRect.top + containerRect.height / 2;

        let closestIndex = 0;
        let closestDistance = Infinity;

        // Find which timeline item is closest to the center of the viewport
        timelineItemElements.forEach((element, index) => {
            const itemRect = element.getBoundingClientRect();
            const itemCenter = itemRect.top + itemRect.height / 2;
            const distance = Math.abs(itemCenter - containerCenter);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = index;
            }
        });

        currentIndex = closestIndex;
    }

    // Svelte action to register timeline item elements
    function registerTimelineItem(node: HTMLElement, index: number) {
        timelineItemElements.set(index, node);

        return {
            destroy() {
                timelineItemElements.delete(index);
            }
        };
    }

    // Handle date selection from charts - jump timeline to that date
    function handleDateSelect(date: Date) {
        // Find the index of the date in filteredTimelineData (or closest match)
        let closestIndex = 0;
        let closestDiff = Infinity;

        filteredTimelineData.forEach((d, index) => {
            const diff = Math.abs(d.date.getTime() - date.getTime());
            if (diff < closestDiff) {
                closestDiff = diff;
                closestIndex = index;
            }
        });

        // Update the current index
        currentIndex = closestIndex;

        // Scroll the timeline to the selected item
        const targetElement = timelineItemElements.get(closestIndex);
        if (targetElement && timelineScrollContainer) {
            targetElement.scrollIntoView({behavior: 'smooth', block: 'center'});
        }
    }

    const chartHeight = 500;
    const chartWidth = 900;
    // Width for charts in the timeline section (right column is larger now)
    const timelineChartWidth = 750;

    // Function to convert scroll progress (0-100) to a date based on timeline data
    function progressToDate(progress: number, data: TimelineData[]): Date | null {
        if (data.length === 0) return null;
        if (progress <= 0) return data[0].date;
        if (progress >= 100) return data[data.length - 1].date;

        // Calculate the index based on progress
        const index = Math.floor((progress / 100) * (data.length - 1));
        return data[index]?.date || null;
    }

    // Convert scroll progress to dates for each chart section
    const tariffRatesCurrentDate = $derived(
        progressToDate(tariffRatesScrollProgress, timelineData)
    );

    const portTEUCurrentDate = $derived(
        progressToDate(portTEUScrollProgress, timelineData)
    );

    const pmiCurrentDate = $derived(
        progressToDate(pmiScrollProgress, timelineData)
    );

    // Function to convert scroll progress to date for inflation data
    function progressToDateInflation(progress: number, data: { date: Date }[]): Date | null {
        if (data.length === 0) return null;
        if (progress <= 0) return data[0].date;
        if (progress >= 100) return data[data.length - 1].date;

        const index = Math.floor((progress / 100) * (data.length - 1));
        return data[index]?.date || null;
    }

    const inflationCurrentDate = $derived(
        progressToDateInflation(inflationScrollProgress, inflationData)
    );

    // Function to convert scroll progress to date for trade balance data
    function progressToDateTradeBalance(progress: number, data: TradeBalance[]): Date | null {
        if (!data || data.length === 0) return null;
        if (progress <= 0) return new Date(data[0].date);
        if (progress >= 100) return new Date(data[data.length - 1].date);

        const index = Math.floor((progress / 100) * (data.length - 1));
        return new Date(data[index]?.date || data[0].date);
    }

    const tradeBalanceCurrentDate = $derived.by(() => {
        if (!tradeBalanceData || tradeBalanceData.length === 0) return null;
        return progressToDateTradeBalance(tradeBalanceScrollProgress, tradeBalanceData);
    });

    // Independent date states for slider control (override scroll-based dates)
    let tariffRatesSliderDate: Date | null = $state(null);
    let portTEUSliderDate: Date | null = $state(null);
    let pmiSliderDate: Date | null = $state(null);
    let inflationSliderDate: Date | null = $state(null);

    // Track last scroll progress to detect significant changes
    let lastTariffRatesProgress = $state(0);
    let lastPortTEUProgress = $state(0);
    let lastPmiProgress = $state(0);
    let lastInflationProgress = $state(0);

    // Reset slider date when scroll progress changes significantly (user is scrolling, not dragging slider)
    $effect(() => {
        const progressDiff = Math.abs(tariffRatesScrollProgress - lastTariffRatesProgress);
        if (progressDiff > 5) { // If scroll changed by more than 5%, clear slider date
            tariffRatesSliderDate = null;
        }
        lastTariffRatesProgress = tariffRatesScrollProgress;
    });

    $effect(() => {
        const progressDiff = Math.abs(portTEUScrollProgress - lastPortTEUProgress);
        if (progressDiff > 5) {
            portTEUSliderDate = null;
        }
        lastPortTEUProgress = portTEUScrollProgress;
    });

    $effect(() => {
        const progressDiff = Math.abs(pmiScrollProgress - lastPmiProgress);
        if (progressDiff > 5) {
            pmiSliderDate = null;
        }
        lastPmiProgress = pmiScrollProgress;
    });

    $effect(() => {
        const progressDiff = Math.abs(inflationScrollProgress - lastInflationProgress);
        if (progressDiff > 5) {
            inflationSliderDate = null;
        }
        lastInflationProgress = inflationScrollProgress;
    });

    // Use slider date if set, otherwise use scroll-based date
    const tariffRatesFinalDate = $derived(tariffRatesSliderDate || tariffRatesCurrentDate);
    const portTEUFinalDate = $derived(portTEUSliderDate || portTEUCurrentDate);
    const pmiFinalDate = $derived(pmiSliderDate || pmiCurrentDate);
    const inflationFinalDate = $derived(inflationSliderDate || inflationCurrentDate);
</script>


<div class="narrative-section narrative-intro">
    <h1>The Disintegration of the Global Order</h1>
    <p class="lead">
        Trump’s new tariff regime has fundamentally altered the global economic architecture.
        While most of the world doubles down on globalization, the U.S. is withdrawing from the very
        trading order it once forged.
    </p>
    <p>
        The administration's primary motivation—reviving American manufacturing—is a long-term goal that
        cannot be achieved overnight. Now, almost six months since "Liberation Day," we can see that while
        the idea of tariffs is not new to the United States, the scale is unprecedented. Historically, tariffs
        acted as protective armor for infant industries or an economic sword against rivals. However, the current
        strategy threatens to disintegrate the established global supply chain.
    </p>
</div>

<h2 class="timeline-title">Interactive Trade Timeline & Visualizations (2024-2025)</h2>
<p class="timeline-description">
    Explore the comprehensive timeline of trade events and their impacts on tariff rates, port activity,
    and manufacturing. Scroll through to see how events unfold chronologically with synchronized visualizations.
</p>

<!-- Main Timeline & Charts Section (Independent from page scroll) -->
{#if filteredTimelineData.length > 0}
    <div class="timeline-charts-container">
        <!-- Timeline Story (Left side) - Scrollable Container -->
        <div class="timeline-column">
            <div class="scroll-indicator">
                <span class="scroll-icon">↕</span>
                <span class="scroll-text">Scroll timeline to navigate</span>
            </div>
            <div
                    class="timeline-scroll-container"
                    bind:this={timelineScrollContainer}
                    onscroll={handleTimelineScroll}
            >
                <RulerTimeline data={filteredTimelineData} {currentDate} {registerTimelineItem}/>
            </div>
        </div>

        <!-- Visualizations (Right side) - Scrollable Container -->
        <div class="charts-column">
            <div class="scroll-indicator">
                <span class="scroll-icon">↕</span>
                <span class="scroll-text">Scroll to view all charts</span>
            </div>
            <div class="interaction-hint">
                <span class="hint-icon">👆</span>
                <span class="hint-text">Click data points to jump to that date in timeline</span>
            </div>
            <div class="charts-scroll-container">
                <div class="visualizations-stack">
                    <div class="chart-wrapper">
                        <TariffRatesChart data={filteredTimelineData} {currentDate} height={chartHeight}
                                          width={timelineChartWidth} onDateSelect={handleDateSelect}/>
                    </div>

                    <div class="chart-wrapper">
                        <PortTEUChart data={filteredTimelineData} {currentDate} height={chartHeight} width={timelineChartWidth}
                                      onDateSelect={handleDateSelect}/>
                    </div>

                    <div class="chart-wrapper">
                        <ManufacturingPMIChart data={filteredTimelineData} {currentDate} height={chartHeight}
                                               width={timelineChartWidth} onDateSelect={handleDateSelect}/>
                    </div>
                </div>
            </div>
        </div>
    </div>
{:else}
    <div class="loading">Loading timeline data...</div>
{/if}

<!-- Detailed Tariff Rates Section -->
<div class="section-divider"></div>
<div class="scroll-prompt">
    <div class="scroll-prompt-content">
        <span class="scroll-arrow">↓</span>
        <span class="scroll-prompt-text">Scroll to explore detailed visualizations</span>
    </div>
</div>
<h2>US-China Tariff Rate Trends (2024-2025)</h2>
<p>
    Track the escalation of tariff rates between the United States and China, as well as their respective rates
    toward the rest of the world. This visualization shows how trade tensions evolved over time.
</p>

<Scroll bind:progress={tariffRatesScrollProgress} id="tariffRates">
    <div class="info-section">
        <h3>Key Insight</h3>
        <p>
            US tariffs on Chinese goods surged dramatically from around 20% to over 140% following the April 2025
            tariff announcements. China retaliated with proportional increases on US goods. Both countries maintained
            relatively stable tariff rates toward the rest of the world, indicating the targeted nature of the trade
            conflict.
        </p>
    </div>

    <div slot="viz" class="chart-container">
        <TariffRatesChart data={timelineData} currentDate={tariffRatesFinalDate} height={chartHeight}
                          width={chartWidth}/>
        <TimeSlider 
            data={timelineData} 
            currentDate={tariffRatesFinalDate} 
            onDateChange={(date) => tariffRatesSliderDate = date}
            width={chartWidth - 60}
        />
        <p class="data-source">Source: Peterson Institute for International Economics</p>
    </div>
</Scroll>

<!-- Detailed Port TEU Section -->
<div class="section-divider"></div>
<div class="scroll-prompt">
    <div class="scroll-prompt-content">
        <span class="scroll-arrow">↓</span>
        <span class="scroll-prompt-text">Continue scrolling to see more insights</span>
    </div>
</div>
<h2>Front-loading Effect at U.S. Ports (2024-2025)</h2>
<p>
    Examine container throughput (measured in Twenty-foot Equivalent Units) at major US ports.
    This metric reveals how businesses adjusted their shipping patterns in response to tariff announcements.
</p>

<Scroll bind:progress={portTEUScrollProgress} id="portTEU">
    <div class="info-section">
        <h3>Key Insight</h3>
        <p>
            Prior to tariff implementation, US ports experienced a significant surge in container traffic as businesses
            rushed to import goods before higher tariffs took effect - a phenomenon known as "front-loading."
            The ports of Long Beach and Los Angeles showed the most dramatic increases, followed by a sharp decline
            after tariffs were fully implemented.
        </p>
    </div>

    <div slot="viz" class="chart-container">
        <PortTEUChart data={timelineData} currentDate={portTEUFinalDate} height={chartHeight} width={chartWidth}/>
        <TimeSlider 
            data={timelineData} 
            currentDate={portTEUFinalDate} 
            onDateChange={(date) => portTEUSliderDate = date}
            width={chartWidth - 60}
        />
        <p class="data-source">Source: Department of Transportation; Data available through August 2025</p>
    </div>
</Scroll>


<div class="section-divider"></div>
<div class="scroll-prompt">
    <div class="scroll-prompt-content">
        <span class="scroll-arrow">↓</span>
        <span class="scroll-prompt-text">Keep scrolling to discover more trends</span>
    </div>
</div>
<h2>USA inflation rate and import price index (2024-2025)</h2>
<p>
    Before the inauguration day of the 47th president, the inflation spike was expected to happen around late summer.
    And the big market sell-off started with about a final
    <strong>-21% correction</strong>.
    The inflation data shows a rebound from around 1.4% April to 3.0% September. However, the cost shock from the tariff
    is not explicitly shown, with energy and transportation prices rising at the same time. The core PCE (Personal
    Consumption Expenditures Price Index excluding food and energy) follows a similar pattern, steadily rising from 2.6%
    to the latest(September) 2.9%, below the 3% threshold, which also reflects a rebound in underlying inflation.
    Nomura predicts the PCE yoy inflation rate will accelerate substantially this year from the moderate 3.0% to the
    aggressive 4.5% at the end of this year.
</p>

<Scroll bind:progress={inflationScrollProgress} id="inflation">

    <div class="info-section">
        <h3>Key Insight</h3>
        <p>
            Despite mitigation efforts, inflation has rebounded from a low of <strong>1.4% in April</strong> to
            <strong>3.0% by September</strong>. Core PCE mirrors this trend, rising to <strong>2.9%</strong>.
            While currently below the critical 3% threshold, risks remain: Nomura predicts inflation could
            accelerate aggressively to <strong>4.5%</strong> by year-end as the full weight of energy and
            transportation costs takes effect.
        </p>
    </div>

    <div slot="viz" class="chart-container">
        {#if inflationData && inflationData.length > 0}
            <InflationChart data={inflationData} currentDate={inflationFinalDate} width={chartWidth} height={chartHeight}/>
            <TimeSlider 
                data={inflationData} 
                currentDate={inflationFinalDate} 
                onDateChange={(date) => inflationSliderDate = date}
                width={chartWidth - 60}
            />
            <p class="data-source">Source: Bureau of Labor Statistics (BLS), Bureau of Economic Analysis (BEA)</p>
        {:else}
            <div class="loading">Loading inflation data...</div>
        {/if}
    </div>
</Scroll>

<!-- Detailed Manufacturing PMI Section -->
<div class="section-divider"></div>
<div class="scroll-prompt">
    <div class="scroll-prompt-content">
        <span class="scroll-arrow">↓</span>
        <span class="scroll-prompt-text">Continue scrolling for manufacturing insights</span>
    </div>
</div>
<h2>Manufacturing PMI Trends (2024-2025)</h2>
<p>
    The ISM Manufacturing Purchasing Managers' Index (PMI) indicates the health of the manufacturing sector.
    A reading above 50 signals expansion, while below 50 indicates contraction.
</p>

<Scroll bind:progress={pmiScrollProgress} id="pmi">
    <div class="info-section">
        <h3>Key Insight</h3>
        <p>
            Tariff policy is negatively impacting U.S. manufacturing, which contracted for a fifth straight month in
            July as the <strong>ISM PMI fell to 48.0</strong>. The tariffs are raising input costs, with the Prices Paid
            index remaining
            high at 64.8. This is dampening demand, as the New Orders sub-index is also in contraction (47.1). Most
            notably, the policy is hurting employment; the manufacturing employment index dropped to 43.4, its lowest
            point since July 2020, with the ISM citing "acceleration of headcount reductions" due to tariff-related
            uncertainty.
        </p>
    </div>

    <div slot="viz" class="chart-container">
        <ManufacturingPMIChart data={timelineData} currentDate={pmiFinalDate} height={chartHeight}
                               width={chartWidth}/>
        <TimeSlider 
            data={timelineData} 
            currentDate={pmiFinalDate} 
            onDateChange={(date) => pmiSliderDate = date}
            width={chartWidth - 60}
        />
        <p class="data-source">Source: ISM</p>

    </div>
</Scroll>

<!-- Trade Balance Section -->
<div class="section-divider"></div>
<div class="scroll-prompt">
    <div class="scroll-prompt-content">
        <span class="scroll-arrow">↓</span>
        <span class="scroll-prompt-text">Scroll down for more analysis</span>
    </div>
</div>
<h2>U.S. Trade Balance Trends (2024-2025)</h2>
<p>
    The trade balance shows the difference between exports and imports, measured in hundreds of millions of dollars.
    Negative values indicate a trade deficit, where the U.S. imports more than it exports.
</p>

<Scroll bind:progress={tradeBalanceScrollProgress} id="tradeBalance">
    <div class="info-section">
        <h3>Key Insight</h3>
        <p>
            The U.S. trade deficit spiked dramatically in Q1 2025 to -4,255 (hundreds of millions USD),
            coinciding with the tariff announcement. However, the deficit improved significantly in Q2 and Q3 2025,
            suggesting a shift in trade patterns and potential effectiveness of trade policy adjustments.
        </p>
    </div>

    <div slot="viz" class="chart-container">
        <TradeBalanceChart data={tradeBalanceData} height={chartHeight} width={chartWidth}/>
        <p class="data-source">Source: United States International Trade Commission</p>
    </div>
</Scroll>

<!--Auto Income Section -->
<div class="section-divider"></div>
<div class="scroll-prompt">
    <div class="scroll-prompt-content">
        <span class="scroll-arrow">↓</span>
        <span class="scroll-prompt-text">Explore sector-specific impacts</span>
    </div>
</div>
<h2>Auto sector hit hard</h2>
<p>
    The variance analysis below illustrates the protective role of financial hedging. For Hyundai and Kia,
    <strong>foreign exchange gains (Green)</strong> effectively counterbalanced <strong>tariff costs (Red)</strong>.
    In contrast, Toyota experienced dual contractions from both factors. Honda exhibited the most severe deterioration,
    swinging from profitability to a <strong>¥20.6B operating loss</strong> driven by unmitigated exposure to both
    trade and currency risks.
</p>

<Scroll bind:progress={autoIncomeScrollProgress} id="autoIncome">
    <div class="info-section">
        <h3>Key Insight</h3>
        <p>
            Quarterly disclosures highlight a sharp strategic divergence in how global automakers are navigating the new tariff regime.
            While trade barriers have universally suppressed operating margins, <strong>Korean OEMs</strong> (Hyundai, Kia) effectively
            neutralized over <strong>₩1.6 trillion</strong> in combined tariff liabilities through aggressive currency hedging.
            Conversely, <strong>Japanese manufacturers</strong> (Toyota, Honda) faced compounded headwinds, suffering simultaneous
            losses from tariff imposition and unfavorable foreign exchange exposure.
        </p>
        <p>
            In the domestic market, <strong>Ford</strong> offered a resilient counterpoint in Q3 2025. Despite a <strong>$700 million</strong>
            tariff-induced contraction, the firm maintained a stable Adjusted EBIT of <strong>$2.59B</strong>. This stability
            underscores the capacity of robust pricing power and volume management to offset direct trade policy headwinds.
        </p>
    </div>

    <div slot="viz" class="auto-income-chart-container">
        <AutoIncomeBarChart height={chartHeight} width={chartWidth}/>
    </div>
</Scroll>

<div class="section-divider"></div>
<div class="scroll-prompt">
    <div class="scroll-prompt-content">
        <span class="scroll-arrow">↓</span>
        <span class="scroll-prompt-text">Discover global supply chain shifts</span>
    </div>
</div>
<h2>Reshaping Global Supply Chains: The Soybean Shift</h2>
<p>
    Originated in China, soybeans are a critical resource for livestock feed and cooking oil, with China now
    commanding <strong>60% of the global trade</strong>. To diversify supply, China has heavily invested in
    Brazilian infrastructure since 2010. Aided by longer growing seasons and lower production costs
    (<strong>$475/acre</strong> vs. US $530), Brazil has surpassed the US as the world's largest producer.
</p>
<p>
    The trade war accelerated this structural shift. Retaliatory tariffs triggered a <strong>23% drop</strong>
    in US exports, straining American farmers. While the bans were eventually lifted, the market has
    permanently adjusted—purchasing US soy is now often seen as a <strong>political choice</strong> rather
    than an economic necessity.
</p>

<Scroll bind:progress={soybeanScrollProgress} id="soybean">

    <div class="info-section">
        <h3>Key Insight</h3>
        <p>
            The chart illustrates this takeover. Note the sharp divergence in <strong>2018</strong>:
            US exports (Blue) plunged to <strong>16.8M tons</strong> while Brazil's (Green) surged to
            <strong>65.5M tons</strong>. By 2024, Brazil supplies nearly <strong>3.5x more</strong>
            soybeans to China than the US, cementing its status as the dominant supplier.
        </p>
    </div>

    <div slot="viz" class="chart-container">
        {#if soybeanData && soybeanData.length > 0}
            <SoybeanChart data={soybeanData} width={chartWidth} height={chartHeight} />
        {:else}
            <div class="loading">Loading soybean data...</div>
        {/if}
    </div>
</Scroll>


<!-- US Investment Map Section -->
<div class="section-divider"></div>

<h2>Foreign Direct Investment & Supply Chain Reshoring</h2>
<p>
    To offset tariff risks, companies are aggressively onshoring. Under the Trump 2.0 administration,
    new projects rose <strong>17.4%</strong> and pledged capital investment surged <strong>225.8% to $253 billion</strong>,
    led by Semiconductors, Renewable Energy, and Communications. Secretary Scott Bessent has framed these tariffs as a
    "carrot and stick" to force this relocation.
</p>
<p>
    However, barriers persist. "Deep-Tier Diversification" often hits the wall of <strong>"Chokepoint Dependence"</strong>
    where China retains upstream monopolies on critical minerals. Furthermore, regulatory disconnects—exemplified
    by the 2025 <strong>immigration raid on the Hyundai-LG plant</strong>—have shaken investor confidence,
    contributing to a <strong>70% profit plunge</strong> for Korean Air as business travel stalled.
</p>

<Scroll bind:progress={investmentMapScrollProgress} id="investmentMap">
    <div class="info-section">
        <h3>Key Insight</h3>
        <p>
            Despite these frictions, major Asian tech giants have committed over <strong>$100 billion</strong>
            to US manufacturing. The map highlights this historic shift: TSMC's <strong>$40B</strong> Arizona fabs
            and Samsung's <strong>$17B</strong> Texas facility represent the largest technology investments in US history,
            building the physical foundation for America's supply chain independence.
        </p>
    </div>

    <div slot="viz" class="chart-container">
        <USInvestmentMap width={900} height={600}/>
    </div>
</Scroll>

<div class="narrative-section narrative-summary">
    <h2>Summary: The Pivot to Agility</h2>
    <p>
        In an era defined by structural volatility and ever-changing policies, businesses must abandon
        the search for stability and instead plan for agility. To thrive in this environment, companies
        need to pivot from a rigid focus on efficiency to a posture of <strong>optionality</strong>.
    </p>
    <p>
        This requires deploying specific hedges, pursuing "deep-tier" supply chain diversification to
        escape upstream chokepoints, and balancing domestic onshoring with global backups. Rather than
        waiting for the return of certainty, the winning strategy is to accept unpredictability as the
        status quo and design dynamic operations capable of pivoting instantly in response to the next
        geopolitical shift.
    </p>
</div>

<div class="narrative-section references-section">
    <h2>References</h2>
    
    <div class="references-list">
        <p>The US-China Tariff Rate Trends data was compiled from the Peterson Institute for International Economics.</p>
        <p>The Front-loading Effect at U.S. Ports data was from the Department of Transportation; Data available through August 2025.</p>
        <p>The USA inflation rate and import price index data was from the Bureau of Labor Statistics (BLS) and Bureau of Economic Analysis (BEA).</p>
        <p>The Manufacturing PMI Trends data was from ISM.</p>
        <p>The U.S. Trade Balance Trends data was from the United States International Trade Commission.</p>
        <p>The Auto sector income data was from Company Filings.</p>
        <p>The Foreign Direct Investment & Supply Chain Reshoring data was from Reuters reports and company statements.</p>
        <p>The Soybean Shift data was from the American Soybean Association and Trade Data Monitor.</p>
    </div>
</div>

<div class="narrative-section acknowledgments-section">
    <h2>Acknowledgments</h2>
    
    <div class="contribution-list">
        <p>
            <strong>Dunzhi Chou (Research Lead, Data Lead):</strong> Deep-dive data collection (USITC, BEA, Company Filings, ISM, BLS), data cleaning and processing, ensuring data accuracy for all visualizations, narrative structure design.
        </p>
        
        <p>
            <strong>Jinzhe Wang (Visualization Lead):</strong> US-China Tariff Rate Trends chart, Front-loading Effect at U.S. Ports chart, scroll-based animation implementation, time slider component design, chart styling system.
        </p>
        
        <p>
            <strong>Haoyang Chen (Visualization Developer):</strong> USA inflation rate and import price index chart, Manufacturing PMI Trends chart, U.S. Trade Balance Trends chart, scroll interaction design, chart optimization.
        </p>
        
        <p>
            <strong>Mingxi Su (Interactive Timeline Lead):</strong> Interactive Trade Timeline & Visualizations implementation, timeline component development, synchronized chart interactions, scroll-based narrative design.
        </p>
        
        <p>
            <strong>Pengju Liu (Quality Assurance, Data Support):</strong> Data validation, quality assurance, testing support, documentation assistance.
        </p>
    </div>
    
    <div class="feedback-acknowledgments">
        <p>Feedback from CSCI 5609, Fall 2025</p>
        <p>Feedback from Professor Chen</p>
        <p>Feedback from TA Pan Hao</p>
    </div>
    
    <p class="thank-you">Thank you.</p>
</div>

<!-- Global Tariff Map Section - MOVED TO TOP OF PAGE (see +page.svelte) -->
<!--
<div class="section-divider"></div>
<h2>Global Tariff Impact: 3D World View</h2>
<p>
  Explore US tariff rates across the world in an interactive 3D globe. Taller bars represent higher tariff rates.
</p>

<div class="globe-section">
  <div class="info-section">
    <h3>Key Insight</h3>
    <p>
      Toggle between Pre-2025 and Current (2025) tariff rates to see how US trade policy has evolved.
      The height and color of each bar represents the total tariff rate applied to imports from that country.
      Drag to rotate the globe and zoom with your scroll wheel.
    </p>
  </div>
  <div class="globe-wrapper">
    {#if globalTariffData.length > 0}
      <GlobeTariffViz data={globalTariffData} height={600} width={900} />
    {:else}
      <div class="loading">Loading global tariff data...</div>
    {/if}
  </div>
</div>
-->

<style>
    h2 {
        margin-top: 3rem;
        margin-bottom: 1rem;
        color: var(--color-gray-900);
        font-size: var(--font-size-3xl);
        font-weight: var(--font-weight-bold);
        letter-spacing: -0.02em;
    }

    /* --- NARRATIVE TEXT STYLES --- */
    .narrative-section {
        max-width: var(--content-max-width);
        margin: 0 auto;
        padding: var(--spacing-3xl) var(--spacing-xl);
        line-height: 1.8;
        font-size: var(--font-size-lg);
        color: var(--color-gray-800);
    }

    /* Introduction Specifics */
    .narrative-intro h1 {
        font-size: clamp(2rem, 5vw, 3rem);
        font-weight: var(--font-weight-extrabold);
        margin-bottom: var(--spacing-xl);
        color: var(--color-gray-900);
        line-height: 1.2;
        letter-spacing: -0.03em;
    }

    .narrative-intro .lead {
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-semibold);
        color: var(--color-gray-700);
        margin-bottom: var(--spacing-lg);
        border-left: 4px solid var(--color-accent);
        padding-left: var(--spacing-lg);
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, transparent 100%);
        padding: var(--spacing-md) var(--spacing-lg);
        border-radius: var(--radius-md);
    }

    /* Summary Specifics */
    .narrative-summary {
        background: linear-gradient(180deg, var(--color-gray-50) 0%, #ffffff 100%);
        max-width: 100%;
        padding: var(--spacing-3xl) var(--spacing-xl);
        margin-top: var(--spacing-3xl);
        border-top: 2px solid var(--color-gray-200);
    }

    /* Constrain the text inside the full-width summary */
    .narrative-summary h2,
    .narrative-summary p {
        max-width: var(--content-max-width);
        margin-left: auto;
        margin-right: auto;
    }

    .narrative-summary h2 {
        font-size: var(--font-size-3xl);
        color: var(--color-gray-900);
        margin-bottom: var(--spacing-lg);
    }

    .references-section {
        background: linear-gradient(180deg, #ffffff 0%, var(--color-gray-50) 100%);
        max-width: 100%;
        padding: var(--spacing-3xl) var(--spacing-xl);
        margin-top: var(--spacing-2xl);
        border-top: 2px solid var(--color-gray-200);
    }

    .references-section h2 {
        max-width: var(--content-max-width);
        margin-left: auto;
        margin-right: auto;
        text-align: center;
        color: var(--color-gray-900);
        margin-bottom: var(--spacing-xl);
        font-size: var(--font-size-3xl);
    }

    .references-list {
        max-width: var(--content-max-width);
        margin-left: auto;
        margin-right: auto;
        text-align: left;
    }

    .references-list p {
        margin-bottom: var(--spacing-lg);
        line-height: 1.8;
        color: var(--color-gray-700);
    }

    .acknowledgments-section {
        background: linear-gradient(180deg, #ffffff 0%, var(--color-gray-50) 100%);
        max-width: 100%;
        padding: var(--spacing-3xl) var(--spacing-xl);
        margin-top: var(--spacing-2xl);
        border-top: 2px solid var(--color-gray-200);
    }

    .acknowledgments-section h2 {
        max-width: var(--content-max-width);
        margin-left: auto;
        margin-right: auto;
        text-align: center;
        color: var(--color-gray-900);
        margin-bottom: var(--spacing-xl);
        font-size: var(--font-size-3xl);
    }

    .contribution-list {
        max-width: var(--content-max-width);
        margin-left: auto;
        margin-right: auto;
    }

    .contribution-list p {
        margin-bottom: var(--spacing-lg);
        line-height: 1.8;
    }

    .contribution-list strong {
        color: var(--color-gray-900);
        font-weight: var(--font-weight-bold);
    }

    .feedback-acknowledgments {
        max-width: var(--content-max-width);
        margin-left: auto;
        margin-right: auto;
        margin-top: var(--spacing-2xl);
        padding-top: var(--spacing-xl);
        border-top: 1px solid var(--color-gray-200);
        text-align: center;
    }

    .feedback-acknowledgments p {
        margin-bottom: var(--spacing-sm);
        color: var(--color-gray-600);
        font-size: var(--font-size-sm);
    }

    .thank-you {
        max-width: var(--content-max-width);
        margin-left: auto;
        margin-right: auto;
        text-align: center;
        margin-top: var(--spacing-xl);
        font-size: var(--font-size-lg);
        color: var(--color-gray-700);
        font-weight: var(--font-weight-medium);
    }

    .timeline-title {
        margin-top: 80px; /* Extra space to prevent overlapping with progress indicators */
    }

    .timeline-description {
        margin-bottom: 30px;
    }

    p {
        color: var(--color-gray-700);
        line-height: 1.7;
        margin-bottom: var(--spacing-xl);
        font-size: var(--font-size-base);
    }

    /* Timeline & Charts Container */
    .timeline-charts-container {
        display: grid;
        grid-template-columns: 0.8fr 1.2fr;
        gap: var(--spacing-2xl);
        margin: var(--spacing-2xl) 0;
        min-height: 80vh;
        padding: var(--spacing-lg);
        max-width: 1400px;
        margin-left: auto;
        margin-right: auto;
        background: linear-gradient(135deg, var(--color-gray-50) 0%, #ffffff 100%);
        border-radius: var(--radius-xl);
        box-shadow: var(--shadow-md);
    }

    .timeline-column,
    .charts-column {
        display: flex;
        flex-direction: column;
    }

    .scroll-indicator {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-sm) var(--spacing-md);
        background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
        color: white;
        border-radius: var(--radius-md);
        margin-bottom: var(--spacing-md);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        box-shadow: var(--shadow-md);
        animation: pulse-glow 2s ease-in-out infinite;
    }

    @keyframes pulse-glow {
        0%, 100% {
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }
        50% {
            box-shadow: 0 2px 12px rgba(102, 126, 234, 0.5);
        }
    }

    .scroll-icon {
        font-size: 18px;
        font-weight: bold;
        animation: bounce-vertical 1.5s ease-in-out infinite;
    }

    @keyframes bounce-vertical {
        0%, 100% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-3px);
        }
    }

    .scroll-text {
        user-select: none;
    }

    .interaction-hint {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 15px;
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
        border-radius: 8px;
        margin-bottom: 15px;
        font-size: 13px;
        font-weight: 500;
        box-shadow: 0 2px 8px rgba(245, 87, 108, 0.3);
        animation: pulse-glow-pink 2s ease-in-out infinite;
    }

    @keyframes pulse-glow-pink {
        0%, 100% {
            box-shadow: 0 2px 8px rgba(245, 87, 108, 0.3);
        }
        50% {
            box-shadow: 0 2px 12px rgba(245, 87, 108, 0.5);
        }
    }

    .hint-icon {
        font-size: 16px;
        animation: wiggle 1s ease-in-out infinite;
    }

    @keyframes wiggle {
        0%, 100% {
            transform: rotate(0deg);
        }
        25% {
            transform: rotate(-10deg);
        }
        75% {
            transform: rotate(10deg);
        }
    }

    .hint-text {
        user-select: none;
    }

    /* Scrollable containers for timeline and charts */
    .timeline-scroll-container {
        height: 80vh;
        overflow-y: auto;
        overflow-x: hidden;
        padding-right: var(--spacing-lg);
        scrollbar-width: thin;
        scrollbar-color: var(--color-primary) var(--color-gray-100);
    }

    .timeline-scroll-container::-webkit-scrollbar {
        width: 8px;
    }

    .timeline-scroll-container::-webkit-scrollbar-track {
        background: var(--color-gray-100);
        border-radius: var(--radius-sm);
    }

    .timeline-scroll-container::-webkit-scrollbar-thumb {
        background: var(--color-primary);
        border-radius: var(--radius-sm);
        transition: background var(--transition-fast);
    }

    .timeline-scroll-container::-webkit-scrollbar-thumb:hover {
        background: var(--color-primary-dark);
    }

    .charts-scroll-container {
        height: 80vh;
        overflow-y: auto;
        overflow-x: hidden;
        padding-left: var(--spacing-lg);
        scrollbar-width: thin;
        scrollbar-color: var(--color-secondary) var(--color-gray-100);
    }

    .charts-scroll-container::-webkit-scrollbar {
        width: 8px;
    }

    .charts-scroll-container::-webkit-scrollbar-track {
        background: var(--color-gray-100);
        border-radius: var(--radius-sm);
    }

    .charts-scroll-container::-webkit-scrollbar-thumb {
        background: var(--color-secondary);
        border-radius: var(--radius-sm);
        transition: background var(--transition-fast);
    }

    .charts-scroll-container::-webkit-scrollbar-thumb:hover {
        background: var(--color-primary-dark);
    }

    .visualizations-stack {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-3xl);
        width: 100%;
    }

    .chart-wrapper {
        width: 100%;
        max-width: var(--content-max-width);
        background: white;
        padding: var(--spacing-lg);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-sm);
        transition: box-shadow var(--transition-base);
        overflow: hidden;
        box-sizing: border-box;
    }

    .chart-wrapper :global(svg) {
        max-width: 100%;
        height: auto;
    }

    .chart-wrapper:hover {
        box-shadow: var(--shadow-md);
    }

    .section-divider {
        height: 1px;
        background: linear-gradient(90deg, transparent 0%, var(--color-gray-300) 50%, transparent 100%);
        margin: var(--spacing-3xl) 0;
        border: none;
    }

    .info-section {
        background: linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(99, 102, 241, 0.05) 100%);
        padding: var(--spacing-xl);
        border-radius: var(--radius-lg);
        margin-bottom: var(--spacing-lg);
        border-left: 4px solid var(--color-primary);
        box-shadow: var(--shadow-sm);
        transition: all var(--transition-base);
    }

    .info-section:hover {
        box-shadow: var(--shadow-md);
        transform: translateY(-2px);
    }

    .info-section h3 {
        margin-top: 0;
        margin-bottom: var(--spacing-md);
        color: var(--color-gray-900);
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-semibold);
    }

    .info-section p {
        color: var(--color-gray-700);
        line-height: 1.7;
        margin-bottom: 0;
    }

    .chart-container {
        width: 100%;
        max-width: var(--content-max-width);
        margin: 0 auto;
        padding: var(--spacing-lg);
        background: var(--color-gray-50);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-sm);
        overflow-x: visible;
    }

    .chart-container :global(.time-slider-container) {
        margin-left: 0;
        margin-right: 0;
    }

    .auto-income-chart-container {
        width: 100%;
        max-width: 1200px;
        margin: 0 auto;
        padding: var(--spacing-lg);
        background: var(--color-gray-50);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-sm);
    }

    .scroll-prompt {
        display: flex;
        justify-content: center;
        align-items: center;
        margin: var(--spacing-xl) 0;
        padding: var(--spacing-lg) 0;
        opacity: 0.8;
        animation: fade-in-out 3s ease-in-out infinite;
    }

    .scroll-prompt-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-md) var(--spacing-xl);
        background: linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%);
        border-radius: var(--radius-lg);
        border: 1px solid rgba(37, 99, 235, 0.2);
    }

    .scroll-arrow {
        font-size: 32px;
        color: var(--color-primary);
        font-weight: bold;
        animation: bounce-down 1.5s ease-in-out infinite;
        line-height: 1;
    }

    .scroll-prompt-text {
        font-size: var(--font-size-sm);
        color: var(--color-gray-600);
        font-weight: var(--font-weight-medium);
        text-align: center;
    }

    @keyframes bounce-down {
        0%, 100% {
            transform: translateY(0);
            opacity: 1;
        }
        50% {
            transform: translateY(8px);
            opacity: 0.7;
        }
    }

    @keyframes fade-in-out {
        0%, 100% {
            opacity: 0.6;
        }
        50% {
            opacity: 1;
        }
    }

    .chart-container .data-source {
        margin-top: var(--spacing-md);
        padding-top: var(--spacing-sm);
        border-top: 1px solid var(--color-gray-200);
    }

    .globe-section {
        margin: 40px 0;
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    .globe-wrapper {
        display: flex;
        justify-content: center;
        width: 100%;
    }

    .loading {
        text-align: center;
        padding: var(--spacing-3xl);
        font-size: var(--font-size-lg);
        color: var(--color-gray-600);
        font-weight: var(--font-weight-medium);
    }

    .data-source {
        font-size: var(--font-size-xs);
        text-align: right;
        color: var(--color-gray-500);
        margin-top: var(--spacing-md);
        width: 100%;
        font-style: italic;
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

        h2 {
            font-size: var(--font-size-2xl);
        }
    }

    @media (max-width: 768px) {
        .narrative-intro h1 {
            font-size: var(--font-size-2xl);
        }

        .narrative-intro .lead {
            font-size: var(--font-size-lg);
        }

        .info-section {
            padding: var(--spacing-md);
        }

        .chart-container {
            padding: var(--spacing-sm);
        }

        .timeline-charts-container {
            padding: var(--spacing-md);
        }
    }

</style>