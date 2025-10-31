<script lang="ts">
  import type { TMovie } from "../types";
  import * as d3 from "d3";
  // define the props of the Bar component
  type Props = {
    movies: TMovie[];
    progress?: number;
    width?: number;
    height?: number;
  };
  // progress is 100 by default unless specified
  let { movies, progress = 100, width = 500, height = 400 }: Props = $props();
  
  let selectedGenre: string = $state();

  // processing the data; $derived is used to create a reactive variable that updates whenever the dependent variables change
  const yearRange = $derived(d3.extent(movies.map((d) => d.year)));

  function getUpYear(yearRange: [undefined, undefined] | [Date, Date]) {
    if (!yearRange[0]) return new Date();
    const timeScale = d3.scaleTime().domain(yearRange).range([0, 100]);
    return timeScale.invert(progress);
  }
  const upYear: Date = $derived(getUpYear(yearRange!));

  function getGenreNums(movies: TMovie[], upYear: Date) {
    let res: { [genre: string]: number } = {};
    movies
      .filter((movie) => movie.year <= upYear)
      .forEach((movie) => {
        movie.genres.forEach((genre: string) => {
          res[genre] = (res[genre] || 0) + 1;
        });
      });
    return res;
  }

  function getGenreNumsWithChange(movies: TMovie[], upYear: Date) {
    const startYear = movies.length > 0 ? d3.min(movies, d => d.year.getFullYear())! : 1946;
    const currentYear = upYear.getFullYear();

    const yearsSinceStart = currentYear - startYear;
    const windowSize = Math.min(yearsSinceStart, 10);
    const splitYear = currentYear - windowSize;

    let baseCounts: { [genre: string]: number } = {};
    let changeCounts: { [genre: string]: number } = {};

    movies.forEach((movie) => {
      const movieYear = movie.year.getFullYear();

      if (movieYear <= currentYear) {
        movie.genres.forEach((genre: string) => {
          if (yearsSinceStart === 0) {
            // First year: all data is change
            changeCounts[genre] = (changeCounts[genre] || 0) + 1;
          } else {
            if (movieYear <= splitYear) {
              baseCounts[genre] = (baseCounts[genre] || 0) + 1;
            } else {
              changeCounts[genre] = (changeCounts[genre] || 0) + 1;
            }
          }
        });
      }
    });

    // Ensure all genres are present in both objects
    const allGenres = new Set([...Object.keys(baseCounts), ...Object.keys(changeCounts)]);
    allGenres.forEach(genre => {
      baseCounts[genre] = baseCounts[genre] || 0;
      changeCounts[genre] = changeCounts[genre] || 0;
    });

    return { baseCounts, changeCounts };
  }

  const genreNums = $derived(getGenreNums(movies, upYear));
  const genreNumsWithChange = $derived(getGenreNumsWithChange(movies, upYear));
  const baseCounts = $derived(genreNumsWithChange.baseCounts);
  const changeCounts = $derived(genreNumsWithChange.changeCounts);

  // drawing the bar chart

  const margin = {
    top: 15,
    bottom: 50,
    left: 30,
    right: 10,
  };

  let usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
  };
  const xScale = $derived(
    // tip: use d3.scaleBand() to create a band scale for the x-axis
    // d3
    //   .scaleBand()
    //   .range(xx)
    //   .domain(xx)
    //   .padding(xx),
    d3.scaleBand()
    .range([usableArea.left, usableArea.right])
    .domain(Object.keys(baseCounts))
    .padding(0.1)

  );

  const yScale = $derived(
    // tip: use d3.scaleLinear() to create a linear scale for the y-axis
    // d3
    //   .scaleLinear()
    //   .range(xx)
    //   .domain(xxx),
    d3.scaleLinear()
    .range([usableArea.bottom, usableArea.top]) // svg y grows down
    .domain([0, Math.max(1, d3.max(Object.keys(baseCounts).map(genre =>
      baseCounts[genre] + changeCounts[genre]
    )) ?? 0)])
  );

  const xBarwidth: number = $derived(xScale.bandwidth());

  let xAxis: any = $state(),
    yAxis: any = $state();

  function updateAxis() {
    if (!xAxis || !yAxis) return;

    d3.select(xAxis)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .attr("transform", "rotate(45)")
      .style("text-anchor", "start");

    // tip:
    // similar to the x-axis, create a y-axis using d3.axisLeft() and bind it to the yAxis variable
    d3.select(yAxis).call(d3.axisLeft(yScale))
  }

  // the $effect function is used to run a function whenever the reactive variables change, also known as a side effect
  $effect(() => {
    updateAxis();
  });



  // ----- Dynamic Top-3 per Year (robust to number|Date years) -----
  const allGenres = $derived(
    movies.length ? Array.from(new Set(movies.flatMap((m) => m.genres))).sort() : []
  );

  
  const yearsSorted = $derived(
    movies.length ? Array.from(new Set(movies.flatMap((m) => m.year.getFullYear()))).sort() : []
  );
  
  const innerW2 = $derived(width - margin.left - margin.right);
  const innerH2 = $derived(height - margin.top - margin.bottom);

  const legendItemWidth = 110; 
  const itemsPerRow = $derived(Math.floor(innerW2 / legendItemWidth));

  const yearlyTop3 = $derived((() => {
    if (allGenres.length === 0 || yearsSorted.length === 0) return [];

    const byYear: Map<number, { year: number; date: Date; [g: string]: number }> = new Map();

    for (const y of yearsSorted) {
      const row: any = { year: y, date: new Date(y, 0, 1) };
      for (const g of allGenres) row[g] = 0;
      byYear.set(y, row);
    }

    const upY = upYear.getFullYear();
    for (const m of movies) {
      const yNum = m.year instanceof Date ? m.year.getFullYear() : +m.year;
      if (yNum > upY) continue;

      if (!byYear.has(yNum)) {
        const row: any = { year: yNum, date: new Date(yNum, 0, 1) };
        for (const g of allGenres) row[g] = 0;
        byYear.set(yNum, row);
      }
      for (const g of m.genres) {
        byYear.get(yNum)![g] += 1;
      }
    }

    // keep only that year's top-3
    for (const [y, row] of byYear) {
      const top3 = allGenres
        .map((g) => [g, row[g]] as [string, number])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([g]) => g);

      for (const g of allGenres) {
        if (!top3.includes(g)) row[g] = 0;
      }
    }

    return Array.from(byYear.values()).sort((a, b) => a.year - b.year);
  })());


  const filteredYearlyTop3 = $derived(
    yearlyTop3.filter(d => d && d.date && !isNaN(d.date.getTime()))
  );

  const xDomain2: [Date, Date] = $derived((() => {
    if (filteredYearlyTop3.length >= 2) {
      return [
        filteredYearlyTop3[0].date,
        filteredYearlyTop3[filteredYearlyTop3.length - 1].date
      ] as [Date, Date];
    }
    if (filteredYearlyTop3.length === 1) {
      return [filteredYearlyTop3[0].date, filteredYearlyTop3[0].date];
    }
    const now = new Date();
    return [now, now];
  })());

  const xDomainYears = $derived(filteredYearlyTop3.map(d => d.year));
  
  const xTickYears = $derived(
    filteredYearlyTop3.map(r => r.date)
  );

  // const xScale2 = $derived(
  //   d3.scaleTime()
  //     .domain(xDomain2)                         
  //     .range([margin.left, margin.left + innerW2])
  // );

  const xScale2 = $derived(
      d3.scaleBand()
        .domain(xDomainYears)
        .range([margin.left, width - margin.right])
        .padding(0.1) 
  );

  const yMax2 = $derived(
    filteredYearlyTop3.length ? (d3.max(filteredYearlyTop3, (r) => d3.sum(allGenres, (g) => r[g])) ?? 0) : 0
  );

  const yScale2 = $derived(
    d3.scaleLinear()
      .domain([0, Math.max(1, yMax2)])
      .nice()
      .range([margin.top + innerH2, margin.top])
  );

  const stackSeries2 = $derived(
    filteredYearlyTop3.length && allGenres.length
      ? d3.stack<{ date: Date }>().keys(allGenres as any)(filteredYearlyTop3 as any)
      : []
  );

  const area2 = $derived(
    d3.area<any>()
      .x(d => xScale2(d.data?.date))   
      .y0(d => yScale2(d[0]))
      .y1(d => yScale2(d[1]))
  );


  // function updateAxis2() {
  //   if (xAxis2) {
  //     const axis = d3.axisBottom(xScale2)
  //       .tickValues(xTickYears)
  //       .tickFormat(d3.timeFormat("%Y") as any);

  //     d3.select(xAxis2)
  //       .call(axis)
  //       .selectAll("text")
  //       .attr("transform", "translate(7,0) rotate(45)")
  //       .style("font-size", "5px")
  //       .style("text-anchor", "start");
  //   }

  //   if (yAxis2) {
  //     d3.select(yAxis2)
  //       .call(d3.axisLeft(yScale2).ticks(5).tickFormat(d3.format("d")));
  //   }
  // }

  function updateAxis2() {
      if (xAxis2) {
        const axis = d3.axisBottom(xScale2);
        
        d3.select(xAxis2)
          .call(axis)
          .selectAll("text")
          .attr("transform", "translate(7,0) rotate(45)")
          .style("text-anchor", "start");
          
        d3.select(xAxis2).call(axis.tickValues(xScale2.domain().filter((d, i) => !(i % 5))));
      }

      if (yAxis2) {
        d3.select(yAxis2)
          .call(d3.axisLeft(yScale2).ticks(5).tickFormat(d3.format("d")));
      }
  }

  const colorPalette = [
    '#a6cee3', '#1f78b4', '#7e1c00', '#33a02c', '#fb9a99', '#e31a1c',
    '#fdbf6f', '#ff7f00', '#827717', '#6a3d9a', '#ffff99', '#b15928',
    '#8dd3c7', '#bebada', '#fb8072', '#607D8B', '#fdb462', '#b3de69',
    '#fccde5', '#d9d9d9', '#bc80bd', '#ccebc5', '#ffed6f', '#bd18ea',
    '#008744'
  ];

  const customColorMap = $derived((() => {
      const map = {};
      allGenres.forEach((genre, i) => {
          map[genre] = colorPalette[i % colorPalette.length];
      });
      return map;
  })());


  const color2 = $derived(
      d3.scaleOrdinal()
        .domain(allGenres)
        .range(allGenres.map(g => customColorMap[g] || '#cccccc'))
  );

  let xAxis2: SVGGElement | null = $state(null);
  let yAxis2: SVGGElement | null = $state(null);

  // function updateAxis2() {
  //   if (xAxis2) d3.select(xAxis2).call(d3.axisBottom(xScale2).ticks(6).tickFormat(d3.timeFormat("%Y") as any));
  //   if (yAxis2) d3.select(yAxis2).call(d3.axisLeft(yScale2).ticks(5).tickFormat(d3.format("d")));
  // }
  $effect(() => updateAxis2());




  const cooccurrenceData = $derived((() => {
    const allGenres = Array.from(new Set(movies.flatMap(m => m.genres))).sort();
    
    const genreIndex = new Map(allGenres.map((g, i) => [g, i]));
    
    const matrix: { [key: string]: { [key: string]: number } } = {};
    allGenres.forEach(g1 => {
      matrix[g1] = {};
      allGenres.forEach(g2 => {
        matrix[g1][g2] = 0;
      });
    });

    for (const movie of movies) {
      for (let i = 0; i < movie.genres.length; i++) {
        for (let j = i + 1; j < movie.genres.length; j++) {
          const g1 = movie.genres[i];
          const g2 = movie.genres[j];
          if (matrix[g1] && matrix[g2]) {
            matrix[g1][g2]++;
            matrix[g2][g1]++;
          }
        }
      }
    }
    
    const longFormatData = [];
    for (const g1 of allGenres) {
      for (const g2 of allGenres) {
        if (genreIndex.get(g1)! > genreIndex.get(g2)!) {
          longFormatData.push({ genre1: g1, genre2: g2, count: matrix[g1][g2] });
        }
      }
    }

    const maxCount = d3.max(longFormatData, d => d.count) ?? 0;
    return { data: longFormatData, genres: allGenres, maxCount };
  })());

  const heatmapMargin = { top: 20, right: 70, bottom: 80, left: 60 };
  const innerWHeatmap = $derived(width - heatmapMargin.left - heatmapMargin.right);
  const innerHHeatmap = $derived(height - heatmapMargin.top - heatmapMargin.bottom);

  const allGenresHeatmap = $derived(cooccurrenceData.genres);
  const maxCountHeatmap = $derived(cooccurrenceData.maxCount);

  const xScaleHeatmap = $derived(
    d3.scaleBand()
      .domain(allGenresHeatmap)
      .range([0, innerWHeatmap])
      .padding(0.05)
  );

  const yScaleHeatmap = $derived(
    d3.scaleBand()
      .domain(allGenresHeatmap)
      .range([0, innerHHeatmap])
      .padding(0.05)
  );

  const colorScaleHeatmap = $derived(
    d3.scaleSequential(d3.interpolateYlGnBu)
      .domain([0, maxCountHeatmap])
  );

  let xAxisHeatmapEl: SVGGElement | null = $state(null);
  let yAxisHeatmapEl: SVGGElement | null = $state(null);
  let legendHeatmapAxisEl: SVGGElement | null = $state(null);

  const legendHeatmapWidth = 20;
  const legendHeatmapHeight = $derived(innerHHeatmap);

  const legendScale = $derived(d3.scaleLinear()
      .domain([0, maxCountHeatmap])
      .range([legendHeatmapHeight, 0])
  );



  $effect(() => {
    if (xAxisHeatmapEl) {
      const axis = d3.axisBottom(xScaleHeatmap);
      d3.select(xAxisHeatmapEl)
        .call(axis)
        .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end");
    }
    if (yAxisHeatmapEl) {
      d3.select(yAxisHeatmapEl).call(d3.axisLeft(yScaleHeatmap));
    }
    if (legendHeatmapAxisEl) {
        const axis = d3.axisRight(legendScale).ticks(5);
        d3.select(legendHeatmapAxisEl).call(axis);
    }
  });


</script>

<h3 style = "font-family: Arial;">
  The Distribution of Genres {yearRange[0]?.getFullYear()} - {yearRange[1]?.getFullYear()}
</h3>

{#if movies.length > 0}
  <svg {width} {height}>
    <g class="bars">
      {#each Object.keys(baseCounts) as genre}
        {@const baseCnt = baseCounts[genre]}
        {@const changeCnt = changeCounts[genre]}
        {@const totalCnt = baseCnt + changeCnt}

        <g class={genre}>
          <!-- Base bar (green) -->
          {#if baseCnt > 0}
            <rect
              width={xBarwidth}
              height={yScale(0) - yScale(baseCnt)}
              x={xScale(genre)!}
              y={yScale(baseCnt)}
              fill="#449900"
              class="bar"
              opacity={selectedGenre === genre ? 1 : 0.55}
              on:mouseover={() => (selectedGenre = genre)}
              on:mouseout={() => (selectedGenre = null)}
            />
          {/if}

          <!-- Change bar (orange, stacked on top) -->
          {#if changeCnt > 0}
            <rect
              width={xBarwidth}
              height={yScale(baseCnt) - yScale(totalCnt)}
              x={xScale(genre)!}
              y={yScale(totalCnt)}
              fill="#ff7f00"
              class="bar"
              opacity={selectedGenre === genre ? 1 : 0.55}
              on:mouseover={() => (selectedGenre = genre)}
              on:mouseout={() => (selectedGenre = null)}
            />
          {/if}

          <text
            x={xScale(genre)! + xBarwidth / 2}
            y={yScale(totalCnt) - 5}
            font-size="12"
            text-anchor="middle"
          >
            <!-- tip: the text below should change with the hover on interaction -->
            {selectedGenre === genre ? `${genre}: ${totalCnt} (${baseCnt}+${changeCnt})` : totalCnt}
          </text>
        </g>
      {/each}
    </g>

    <g transform="translate(0, {usableArea.bottom})" bind:this={xAxis} />
    <g transform="translate({usableArea.left}, 0)" bind:this={yAxis} />
  </svg>
{/if}

<style>
  .bar {
    transition:
      y 0.1s ease,
      height 0.1s ease,
      width 0.1s ease; 
  }
</style>








