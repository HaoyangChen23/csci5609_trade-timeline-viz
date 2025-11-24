<script lang="ts">
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

  type TariffData = {
    Country_ISO3: string;
    Country: string;
    Current_tariff_total: number;
    Pre2025_tariff_total: number;
  };

  type Props = {
    data: TariffData[];
    height?: number;
    width?: number;
  };

  let { data, height = 600, width = 900 }: Props = $props();

  let container: HTMLDivElement;
  let tooltip: HTMLDivElement;
  let showCurrent = $state(true);

  onMount(() => {
    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e27);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      width / height,
      0.1,
      1000
    );
    camera.position.z = 3;

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // OrbitControls for mouse interaction
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;

    // Create Earth sphere with texture
    const earthGeometry = new THREE.SphereGeometry(1, 64, 64);

    // Load earth texture (gray land + blue ocean)
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load(
      'https://raw.githubusercontent.com/turban/webgl-earth/master/images/2_no_clouds_4k.jpg',
      () => {
        console.log('Earth texture loaded successfully');
      },
      undefined,
      (error) => {
        console.warn('Could not load earth texture, using fallback colors', error);
      }
    );

    const earthMaterial = new THREE.MeshPhongMaterial({
      map: earthTexture,
      shininess: 15,
      transparent: false,
      opacity: 1.0
    });
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earth);

    // Add grid lines
    const gridMaterial = new THREE.LineBasicMaterial({ color: 0x88aaff, transparent: true, opacity: 0.15 });
    const latLines = 18;
    const lonLines = 36;

    // Latitude lines
    for (let i = 0; i <= latLines; i++) {
      const lat = (i / latLines - 0.5) * Math.PI;
      const points = [];
      for (let j = 0; j <= lonLines; j++) {
        const lon = (j / lonLines) * Math.PI * 2;
        const x = Math.cos(lat) * Math.sin(lon);
        const y = Math.sin(lat);
        const z = Math.cos(lat) * Math.cos(lon);
        points.push(new THREE.Vector3(x * 1.01, y * 1.01, z * 1.01));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, gridMaterial);
      scene.add(line);
    }

    // Longitude lines
    for (let i = 0; i < lonLines; i++) {
      const lon = (i / lonLines) * Math.PI * 2;
      const points = [];
      for (let j = 0; j <= latLines; j++) {
        const lat = (j / latLines - 0.5) * Math.PI;
        const x = Math.cos(lat) * Math.sin(lon);
        const y = Math.sin(lat);
        const z = Math.cos(lat) * Math.cos(lon);
        points.push(new THREE.Vector3(x * 1.01, y * 1.01, z * 1.01));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, gridMaterial);
      scene.add(line);
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight1.position.set(5, 3, 5);
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight2.position.set(-5, -3, -5);
    scene.add(directionalLight2);

    // Store country coordinates from GeoJSON
    const countryCoords: Record<string, [number, number]> = {};

    // Load and draw country boundaries from GeoJSON
    async function loadCountryBoundaries() {
      try {
        const geoResponse = await fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json');
        const geoData = await geoResponse.json();

        // Draw boundaries and extract centroids
        const boundaryMaterial = new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.4,
          linewidth: 1
        });

        geoData.features.forEach((feature: any) => {
          const iso3 = feature.id; // ISO3 code

          // Calculate centroid
          let totalLat = 0;
          let totalLon = 0;
          let pointCount = 0;

          const processCoordinates = (coords: any[]) => {
            coords.forEach(([lon, lat]: [number, number]) => {
              totalLat += lat;
              totalLon += lon;
              pointCount++;
            });
          };

          if (feature.geometry.type === 'Polygon') {
            feature.geometry.coordinates[0].forEach(([lon, lat]: [number, number]) => {
              totalLat += lat;
              totalLon += lon;
              pointCount++;
            });
            drawPolygon(feature.geometry.coordinates, boundaryMaterial);
          } else if (feature.geometry.type === 'MultiPolygon') {
            feature.geometry.coordinates.forEach((polygon: any) => {
              polygon[0].forEach(([lon, lat]: [number, number]) => {
                totalLat += lat;
                totalLon += lon;
                pointCount++;
              });
              drawPolygon(polygon, boundaryMaterial);
            });
          }

          // Store centroid
          if (pointCount > 0 && iso3) {
            countryCoords[iso3] = [totalLat / pointCount, totalLon / pointCount];
          }
        });

        // After loading coordinates, create bars
        updateBars();
      } catch (error) {
        console.warn('Could not load country boundaries:', error);
      }
    }

    function drawPolygon(coordinates: any, material: THREE.LineBasicMaterial) {
      coordinates.forEach((ring: any) => {
        const points: THREE.Vector3[] = [];
        ring.forEach(([lon, lat]: [number, number]) => {
          const pos = latLonToVector3(lat, lon, 1.002);
          points.push(pos);
        });

        if (points.length > 1) {
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const line = new THREE.Line(geometry, material);
          scene.add(line);
        }
      });
    }

    // Load boundaries
    loadCountryBoundaries();

    // Store bars with their country data for raycasting
    const barGroup = new THREE.Group();
    scene.add(barGroup);
    const barToCountry = new Map<THREE.Mesh, TariffData>();

    // Function to convert lat/lon to 3D position on sphere
    function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      const x = -(radius * Math.sin(phi) * Math.cos(theta));
      const z = radius * Math.sin(phi) * Math.sin(theta);
      const y = radius * Math.cos(phi);
      return new THREE.Vector3(x, y, z);
    }

    // Function to create/update tariff bars
    function updateBars() {
      // Clear existing bars
      barGroup.clear();
      barToCountry.clear();

      // Find max tariff for scaling across BOTH datasets for accurate comparison
      const allTariffValues = data
        .flatMap(d => [d.Current_tariff_total, d.Pre2025_tariff_total])
        .filter(v => !isNaN(v) && v > 0);
      const maxTariff = Math.max(...allTariffValues, 1);

      // Create bars for each country
      data.forEach(country => {
        const coords = countryCoords[country.Country_ISO3];
        if (!coords) return;

        const tariffValue = showCurrent
          ? country.Current_tariff_total
          : country.Pre2025_tariff_total;

        if (isNaN(tariffValue) || tariffValue <= 0) return;

        const [lat, lon] = coords;

        // Calculate bar height (scaled)
        const barHeight = (tariffValue / maxTariff) * 0.5;

        // Create bar (cylinder)
        const barGeometry = new THREE.CylinderGeometry(0.012, 0.012, barHeight, 8);
        const barColor = new THREE.Color().setHSL(
          (1 - tariffValue / maxTariff) * 0.3,
          0.9,
          0.55
        );
        const barMaterial = new THREE.MeshPhongMaterial({
          color: barColor,
          emissive: barColor,
          emissiveIntensity: 0.5,
          shininess: 60
        });
        const bar = new THREE.Mesh(barGeometry, barMaterial);

        // Position bar on globe surface
        const barPos = latLonToVector3(lat, lon, 1.0 + barHeight / 2);
        bar.position.copy(barPos);

        // Orient bar to point outward from globe center
        bar.lookAt(new THREE.Vector3(0, 0, 0));
        bar.rotateX(Math.PI / 2);

        barGroup.add(bar);
        barToCountry.set(bar, country);
      });
    }

    // Re-create bars when toggle changes
    $effect(() => {
      if (showCurrent !== undefined) {
        updateBars();
      }
    });

    // Raycaster for hover detection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredBar: THREE.Mesh | null = null;

    // Mouse move handler
    function onMouseMove(event: MouseEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(barGroup.children);

      if (intersects.length > 0) {
        const intersectedBar = intersects[0].object as THREE.Mesh;
        const countryData = barToCountry.get(intersectedBar);

        if (countryData) {
          hoveredBar = intersectedBar;

          // Update tooltip
          const tariffValue = showCurrent
            ? countryData.Current_tariff_total
            : countryData.Pre2025_tariff_total;

          tooltip.textContent = `${countryData.Country}: ${tariffValue.toFixed(2)}%`;
          tooltip.style.display = 'block';
          tooltip.style.left = `${event.clientX - rect.left + 15}px`;
          tooltip.style.top = `${event.clientY - rect.top + 15}px`;

          // Highlight bar
          (intersectedBar.material as THREE.MeshPhongMaterial).emissiveIntensity = 1.0;
        }
      } else {
        // Reset highlight
        if (hoveredBar) {
          (hoveredBar.material as THREE.MeshPhongMaterial).emissiveIntensity = 0.5;
          hoveredBar = null;
        }
        tooltip.style.display = 'none';
      }
    }

    renderer.domElement.addEventListener('mousemove', onMouseMove);

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // Handle window resize
    function handleResize() {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  });
</script>

<div class="globe-container">
  <div class="controls">
    <button
      class="toggle-btn"
      class:active={!showCurrent}
      onclick={() => showCurrent = false}
    >
      Pre-2025 Tariffs
    </button>
    <button
      class="toggle-btn"
      class:active={showCurrent}
      onclick={() => showCurrent = true}
    >
      Current 2025 Tariffs
    </button>
  </div>
  <div class="canvas-wrapper">
    <div bind:this={container} class="canvas-container"></div>
    <div bind:this={tooltip} class="tooltip"></div>
  </div>
  <div class="legend">
    <h4>Tariff Rates by Country</h4>
    <div class="legend-item">
      <div class="legend-bar" style="background: linear-gradient(to right, rgb(0,255,0), rgb(255,255,0), rgb(255,0,0));"></div>
      <span>Low → High</span>
    </div>
    <p class="hint">🖱️ Drag to rotate • Scroll to zoom • Hover for country details</p>
  </div>
</div>

<style>
  .globe-container {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: #0a0e27;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }

  .controls {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    z-index: 10;
  }

  .toggle-btn {
    padding: 12px 24px;
    font-size: 14px;
    font-weight: 600;
    border: 2px solid #4466ff;
    background: rgba(68, 102, 255, 0.1);
    color: #fff;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .toggle-btn:hover {
    background: rgba(68, 102, 255, 0.2);
    transform: translateY(-2px);
  }

  .toggle-btn.active {
    background: #4466ff;
    box-shadow: 0 4px 12px rgba(68, 102, 255, 0.4);
  }

  .canvas-wrapper {
    position: relative;
  }

  .canvas-container {
    position: relative;
    border-radius: 8px;
    overflow: hidden;
  }

  .tooltip {
    position: absolute;
    display: none;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    pointer-events: none;
    z-index: 1000;
    white-space: nowrap;
    border: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  }

  .legend {
    margin-top: 20px;
    color: #fff;
    text-align: center;
    width: 100%;
    max-width: 400px;
  }

  .legend h4 {
    margin: 0 0 10px 0;
    font-size: 16px;
    font-weight: 600;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 10px;
    justify-content: center;
    margin-bottom: 10px;
  }

  .legend-bar {
    width: 200px;
    height: 12px;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  .legend-item span {
    font-size: 14px;
    color: #aaa;
  }

  .hint {
    font-size: 12px;
    color: #888;
    margin: 10px 0 0 0;
  }
</style>
