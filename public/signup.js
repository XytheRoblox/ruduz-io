let selectedPlan = null;

function selectPlan(plan) {
  selectedPlan = plan;
  // Highlight the chosen plan
  document.getElementById('free-plan').classList.remove('selected');
  document.getElementById('premium-plan').classList.remove('selected');
  if (plan === 'free') {
    document.getElementById('free-plan').classList.add('selected');
  } else {
    document.getElementById('premium-plan').classList.add('selected');
  }
}

async function submitSignup() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!username || !password) {
    alert("Please enter a username and password.");
    return;
  }
  if (!selectedPlan) {
    alert("Please select a plan (Free or Premium).");
    return;
  }

  const data = {
    username,
    password,
    plan: selectedPlan
  };

  try {
    // POST to your signup endpoint
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    console.log(result);

    if (result.message === "Successfully Created Account!") {
      if (selectedPlan === 'premium') {
        // Possibly redirect to Stripe or handle plan upgrade
        // This depends on how your back end processes the plan
        // For example:
        const planResponse = await fetch('/api/auth/choose-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: 'premium' })
        });
        const planResult = await planResponse.json();
        if (planResult.url) {
          // If your server returns a Stripe checkout URL:
          window.location.href = planResult.url;
        } else {
          alert(planResult.message || "Error upgrading to premium");
        }
      } else {
        // If plan is free, finalize account or redirect
        const planResponse = await fetch('/api/auth/choose-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: 'free' })
        });
        const planResult = await planResponse.json();
        if (planResult.success) {
          alert("Account created with Free plan!");
          window.location.href = "/new.html";
        } else {
          alert(planResult.message || "Error choosing free plan");
        }
      }
    } else {
      // If account creation wasn't successful
      alert(result.message);
    }

  } catch (error) {
    console.error("Error during signup:", error);
    alert("An error occurred during signup.");
  }
}

async function checkLogin() {
    try {
        const response = await fetch('/api/dashboard/');
        const data = await response.json();
        console.log(data.message);
        if (data.message == "log") {
            window.location.href = "https://3.14.101.196/new.html";
        }
    } catch (e) {
        console.error("Error fetching account info", e);
    }
}

checkLogin();