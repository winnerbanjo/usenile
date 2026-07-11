// Global Commerce: SVG World Map and Path Connection Animations

const CITIES = [
  { name: 'Lagos', x: 500, y: 310, country: 'Nigeria' },
  { name: 'Accra', x: 475, y: 315, country: 'Ghana' },
  { name: 'London', x: 485, y: 155, country: 'United Kingdom' },
  { name: 'New York', x: 260, y: 195, country: 'United States' },
  { name: 'Tokyo', x: 840, y: 200, country: 'Japan' }
];

const CONNECTIONS = [
  { from: 'Lagos', to: 'London', color: '#10B981' },
  { from: 'Accra', to: 'New York', color: '#3B82F6' },
  { from: 'London', to: 'Tokyo', color: '#10B981' },
  { from: 'New York', to: 'Lagos', color: '#3B82F6' },
  { from: 'Tokyo', to: 'Accra', color: '#10B981' }
];

export function initMapAnimation() {
  const mapSvg = document.getElementById('world-map');
  if (!mapSvg) return;

  // Clear previous connections if re-initializing
  const existingGlows = mapSvg.querySelectorAll('.map-dynamic-group');
  existingGlows.forEach(el => el.remove());

  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('class', 'map-dynamic-group');
  mapSvg.appendChild(group);

  // Draw cities
  CITIES.forEach(city => {
    // Pulse circle
    const pulse = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    pulse.setAttribute('cx', city.x);
    pulse.setAttribute('cy', city.y);
    pulse.setAttribute('r', 5);
    pulse.setAttribute('class', 'map-city-pulse');
    group.appendChild(pulse);

    // City dot
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', city.x);
    dot.setAttribute('cy', city.y);
    dot.setAttribute('r', 4);
    dot.setAttribute('class', 'map-city-dot');
    group.appendChild(dot);

    // City label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', city.x);
    text.setAttribute('y', city.y - 10);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', 'var(--text-primary)');
    text.setAttribute('font-size', '10px');
    text.setAttribute('font-family', 'var(--font-sans)');
    text.setAttribute('font-weight', '600');
    text.textContent = city.name;
    group.appendChild(text);
  });

  // Draw bezier connection lines
  CONNECTIONS.forEach((conn, index) => {
    const fromCity = CITIES.find(c => c.name === conn.from);
    const toCity = CITIES.find(c => c.name === conn.to);

    if (!fromCity || !toCity) return;

    // Calculate bezier control point for curved path
    const dx = toCity.x - fromCity.x;
    const dy = toCity.y - fromCity.y;
    // Control point pulled upward to create curved arch
    const cx = fromCity.x + dx / 2;
    const cy = Math.min(fromCity.y, toCity.y) - Math.abs(dx) * 0.15 - 30;

    const pathData = `M ${fromCity.x} ${fromCity.y} Q ${cx} ${cy} ${toCity.x} ${toCity.y}`;

    // Base path
    const basePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    basePath.setAttribute('d', pathData);
    basePath.setAttribute('fill', 'none');
    basePath.setAttribute('stroke', 'rgba(0,0,0,0.04)');
    basePath.setAttribute('stroke-width', '1.5');
    basePath.setAttribute('stroke-dasharray', '4 4');
    group.appendChild(basePath);

    // Animated glow line
    const flowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    flowPath.setAttribute('d', pathData);
    flowPath.setAttribute('fill', 'none');
    flowPath.setAttribute('stroke', conn.color);
    flowPath.setAttribute('stroke-width', '2');
    flowPath.setAttribute('class', 'map-connection-line');
    // Stagger animation speed and delays
    flowPath.style.animationDelay = `${index * 1.2}s`;
    flowPath.style.animationDuration = '4s';
    group.appendChild(flowPath);
  });
}
