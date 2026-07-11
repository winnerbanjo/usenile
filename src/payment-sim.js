// Get Paid Section: Interactive Payment Flow Simulator

const GATEWAYS = {
  ng: {
    methods: ['Paystack (Cards & Bank)', 'Cash on Rails', 'Direct Bank Transfer'],
    amount: '₦25,000',
    successMsg: 'Receipt sent via SMS & Email. Settled via Paystack.'
  },
  uk: {
    methods: ['Stripe (Visa/Mastercard)', 'Apple Pay', 'Google Pay'],
    amount: '£29.00',
    successMsg: 'Receipt sent. Settled via Stripe UK.'
  },
  us: {
    methods: ['Stripe (Cards)', 'Apple Pay', 'Google Pay', 'PayPal (Coming Soon)'],
    amount: '$39.00',
    successMsg: 'Receipt sent. Settled via Stripe US.'
  },
  gh: {
    methods: ['Mobile Money (Mtn/Telecel)', 'Paystack Ghana', 'Cards'],
    amount: 'GH₵390.00',
    successMsg: 'Receipt sent. Settled via MoMo Hub.'
  },
  global: {
    methods: ['Stripe International', 'Apple Pay', 'Google Pay'],
    amount: '$39.00',
    successMsg: 'Receipt sent. Settled via Nile Global Vault.'
  }
};

export function initPaymentSim() {
  const container = document.getElementById('payment-sim-methods');
  const amountEl = document.getElementById('payment-sim-amount');
  const gatewayTag = document.getElementById('payment-sim-gateway');
  const payBtn = document.getElementById('payment-sim-btn');
  const successEl = document.getElementById('payment-sim-success');
  const formEl = document.getElementById('payment-sim-form');
  const successMsgEl = document.getElementById('payment-sim-success-msg');

  if (!container || !payBtn || !successEl || !formEl) return;

  let activeRegion = getActiveRegion();
  updateGatewayUI();

  // Watch for region changes
  document.addEventListener('regionChanged', () => {
    activeRegion = getActiveRegion();
    updateGatewayUI();
  });

  payBtn.addEventListener('click', () => {
    // Animate payment flow
    payBtn.disabled = true;
    payBtn.textContent = 'Processing Securely...';
    
    setTimeout(() => {
      // Transition to success screen
      formEl.style.display = 'none';
      successEl.style.display = 'flex';
      
      // Update success message details
      if (successMsgEl) {
        successMsgEl.textContent = GATEWAYS[activeRegion].successMsg;
      }

      // Reset back to initial state after 4.5 seconds
      setTimeout(() => {
        successEl.style.display = 'none';
        formEl.style.display = 'flex';
        payBtn.disabled = false;
        payBtn.textContent = 'Pay Now';
      }, 4500);

    }, 1800);
  });

  function getActiveRegion() {
    if (document.body.classList.contains('region-ng')) return 'ng';
    if (document.body.classList.contains('region-uk')) return 'uk';
    if (document.body.classList.contains('region-us')) return 'us';
    if (document.body.classList.contains('region-gh')) return 'gh';
    return 'global';
  }

  function updateGatewayUI() {
    const data = GATEWAYS[activeRegion];
    
    // Update amount and title
    if (amountEl) amountEl.textContent = data.amount;
    if (gatewayTag) gatewayTag.textContent = activeRegion === 'ng' ? 'Paystack Active' : activeRegion === 'gh' ? 'MoMo Active' : 'Stripe Active';

    // Populate methods list
    container.innerHTML = '';
    data.methods.forEach((method, index) => {
      const label = document.createElement('label');
      label.className = 'payment-sim-method';
      
      const isChecked = index === 0 ? 'checked' : '';
      const isDisabled = method.includes('Coming Soon') ? 'disabled' : '';

      label.innerHTML = `
        <span style="display: flex; align-items: center; gap: 0.5rem;">
          <input type="radio" name="pay-method" value="${method}" ${isChecked} ${isDisabled}>
          <span style="${isDisabled ? 'opacity: 0.5;' : ''}">${method}</span>
        </span>
        <span style="font-size: 0.7rem; color: var(--text-secondary);">${isDisabled ? 'Soon' : 'Instant'}</span>
      `;
      container.appendChild(label);
    });
  }
}
