// Live Interactive Dashboard Simulator for Hero Section (Safely componentized)

const MOCK_DATA = {
  ng: {
    currency: '₦',
    symbol: '₦',
    orders: [
      { name: 'Tunde O.', item: 'Agbada Linen', amount: 45000, city: 'Lagos' },
      { name: 'Chioma A.', item: 'Glow Serum', amount: 15000, city: 'Abuja' },
      { name: 'Femi K.', item: 'Leather Slides', amount: 28000, city: 'Ibadan' },
      { name: 'Yinka J.', item: 'Coffee Beans (500g)', amount: 8500, city: 'Port Harcourt' },
      { name: 'Amina B.', item: 'Silk Scarf', amount: 12000, city: 'Kano' }
    ]
  },
  uk: {
    currency: '£',
    symbol: '£',
    orders: [
      { name: 'James W.', item: 'Summer Trench', amount: 120, city: 'London' },
      { name: 'Emma L.', item: 'Organic Facial Oil', amount: 45, city: 'Edinburgh' },
      { name: 'Oliver B.', item: 'Leather Boots', amount: 95, city: 'Manchester' },
      { name: 'Sophia H.', item: 'Roast Coffee Bundle', amount: 35, city: 'Bristol' },
      { name: 'George C.', item: 'Wool Beanie', amount: 25, city: 'Leeds' }
    ]
  },
  us: {
    currency: '$',
    symbol: '$',
    orders: [
      { name: 'Michael S.', item: 'Minimalist Tote', amount: 145, city: 'New York' },
      { name: 'Emily D.', item: 'Hydrating Face Cream', amount: 55, city: 'Los Angeles' },
      { name: 'David R.', item: 'Canvas Sneakers', amount: 85, city: 'Chicago' },
      { name: 'Jessica M.', item: 'Single Origin Espresso', amount: 40, city: 'Seattle' },
      { name: 'Brian T.', item: 'Premium Cotton Tee', amount: 35, city: 'Austin' }
    ]
  },
  gh: {
    currency: 'GH₵',
    symbol: 'GH₵',
    orders: [
      { name: 'Kwame A.', item: 'Kente Stole', amount: 350, city: 'Accra' },
      { name: 'Abena O.', item: 'Shea Body Butter', amount: 120, city: 'Kumasi' },
      { name: 'Kofi B.', item: 'Leather Sandals', amount: 240, city: 'Tamale' },
      { name: 'Efua M.', item: 'Gold Plated Ring', amount: 450, city: 'Takoradi' },
      { name: 'Yaw S.', item: 'Roasted Coffee Bag', amount: 95, city: 'Cape Coast' }
    ]
  },
  global: {
    currency: '$',
    symbol: '$',
    orders: [
      { name: 'Yuki T.', item: 'Linen Kimono Jacket', amount: 180, city: 'Tokyo' },
      { name: 'Lucas M.', item: 'Face Mist Spray', amount: 42, city: 'Paris' },
      { name: 'Sofia P.', item: 'Handcrafted Mug', amount: 38, city: 'Milan' },
      { name: 'Aiden G.', item: 'Cold Brew Pack', amount: 32, city: 'Sydney' },
      { name: 'Zahra E.', item: 'Handwoven Basket', amount: 75, city: 'Cairo' }
    ]
  }
};

export function initDashboardSim() {
  const tickerEl = document.getElementById('order-ticker');
  if (!tickerEl) return; // Exit early if dashboard is not on the page

  const revValEl = document.getElementById('dash-rev-val');
  const ordersValEl = document.getElementById('dash-orders-val');
  const custValEl = document.getElementById('dash-cust-val');
  const shippingLabelEl = document.getElementById('shipping-label-anim');
  const chartPathEl = document.getElementById('dash-chart-path');

  let activeRegion = getActiveRegion();
  let baseRevenue = activeRegion === 'ng' ? 1245000 : activeRegion === 'gh' ? 18400 : activeRegion === 'uk' ? 8450 : 12450;
  let baseOrders = 342;
  let baseCustomers = 288;
  let currentOrderIdx = 0;

  // Set initial numbers
  updateStatsUI();

  // Load initial orders
  tickerEl.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    addNewOrder(false);
  }

  // Set Interval for periodic order updates
  const orderInterval = setInterval(() => {
    addNewOrder(true);
  }, 4000);

  // Set Interval for shipping label printing simulation
  const shippingInterval = setInterval(() => {
    triggerShippingPrint();
  }, 9000);

  // Set Interval for chart path animation shift
  let chartToggle = true;
  const chartInterval = setInterval(() => {
    if (chartPathEl) {
      const path1 = "M 10 70 Q 50 30 90 60 T 170 20 T 250 40 T 330 10 T 410 30";
      const path2 = "M 10 60 Q 50 45 90 30 T 170 50 T 250 20 T 330 35 T 410 15";
      chartPathEl.setAttribute('d', chartToggle ? path2 : path1);
      chartToggle = !chartToggle;
    }
  }, 6000);

  // Watch for region change event
  document.addEventListener('regionChanged', () => {
    activeRegion = getActiveRegion();
    baseRevenue = activeRegion === 'ng' ? 1245000 : activeRegion === 'gh' ? 18400 : activeRegion === 'uk' ? 8450 : 12450;
    updateStatsUI();
    tickerEl.innerHTML = '';
    currentOrderIdx = 0;
    for (let i = 0; i < 3; i++) {
      addNewOrder(false);
    }
  });

  function getActiveRegion() {
    if (document.body.classList.contains('region-ng')) return 'ng';
    if (document.body.classList.contains('region-uk')) return 'uk';
    if (document.body.classList.contains('region-us')) return 'us';
    if (document.body.classList.contains('region-gh')) return 'gh';
    return 'global';
  }

  function formatCurrency(val) {
    const data = MOCK_DATA[activeRegion];
    if (activeRegion === 'ng') {
      return data.symbol + val.toLocaleString('en-NG');
    }
    if (activeRegion === 'gh') {
      return data.symbol + val.toLocaleString('en-GH');
    }
    return data.symbol + val.toLocaleString('en-US');
  }

  function updateStatsUI() {
    if (revValEl) revValEl.textContent = formatCurrency(baseRevenue);
    if (ordersValEl) ordersValEl.textContent = baseOrders.toLocaleString();
    if (custValEl) custValEl.textContent = baseCustomers.toLocaleString();
  }

  function addNewOrder(shouldAnimate) {
    const data = MOCK_DATA[activeRegion];
    const order = data.orders[currentOrderIdx];
    currentOrderIdx = (currentOrderIdx + 1) % data.orders.length;

    // Create item
    const item = document.createElement('div');
    item.className = 'ticker-item';
    
    // Initials for avatar
    const initials = order.name.split(' ').map(n => n[0]).join('');

    item.innerHTML = `
      <div class="ticker-avatar">${initials}</div>
      <div class="ticker-info">
        <div class="ticker-name">${order.name} (${order.city})</div>
        <div class="ticker-details">${order.item}</div>
      </div>
      <div class="ticker-amount">${formatCurrency(order.amount)}</div>
    `;

    if (shouldAnimate) {
      // Prepend and trim to keep max 4 items
      tickerEl.insertBefore(item, tickerEl.firstChild);
      if (tickerEl.children.length > 4) {
        tickerEl.removeChild(tickerEl.lastChild);
      }

      // Add to numbers
      baseRevenue += order.amount;
      baseOrders += 1;
      if (Math.random() > 0.4) baseCustomers += 1;
      updateStatsUI();
    } else {
      tickerEl.appendChild(item);
    }
  }

  function triggerShippingPrint() {
    if (!shippingLabelEl) return;
    
    const data = MOCK_DATA[activeRegion];
    const latestOrder = data.orders[(currentOrderIdx - 1 + data.orders.length) % data.orders.length];
    
    // Update label text
    const labelTitle = shippingLabelEl.querySelector('.label-title');
    const labelAddr = shippingLabelEl.querySelector('.label-address');
    
    if (labelTitle) labelTitle.textContent = `ORDER #${baseOrders}`;
    if (labelAddr) labelAddr.textContent = `${latestOrder.name}\n${latestOrder.city}, ${activeRegion.toUpperCase()}`;

    // Trigger slide-in
    shippingLabelEl.classList.add('active');

    // Slide-out after 3.5s
    setTimeout(() => {
      shippingLabelEl.classList.remove('active');
    }, 3500);
  }
}
