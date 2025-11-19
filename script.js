// ======= CONFIG - put your OpenWeather API key here =======
const OPENWEATHER_KEY = "16060a32799a802818a768e1ae477d39";
// ==========================================================

const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const locBtn = document.getElementById("locBtn");
const weatherInfo = document.getElementById("weatherInfo");
const aqiInfo = document.getElementById("aqiInfo");
const adviceDiv = document.getElementById("advice");
const heightInput = document.getElementById("height");
const weightInput = document.getElementById("weight");
const calcBmiBtn = document.getElementById("calcBmiBtn");
const bmiResult = document.getElementById("bmiResult");

// --- Load last city from localStorage ---
document.addEventListener("DOMContentLoaded", () => {
  const lastCity = localStorage.getItem("lastCity");
  const savedHeight = localStorage.getItem("height");
  const savedWeight = localStorage.getItem("weight");
  if (lastCity) {
    cityInput.value = lastCity;
    fetchByCity(lastCity);
  }
  if (savedHeight) heightInput.value = savedHeight;
  if (savedWeight) weightInput.value = savedWeight;
});

// --- Event listeners ---
searchBtn.addEventListener("click", () => {
  const city = cityInput.value.trim();
  if (!city) return alert("Enter a city name");
  localStorage.setItem("lastCity", city);
  fetchByCity(city);
});

locBtn.addEventListener("click", () => {
  if (!navigator.geolocation) return alert("Geolocation not supported");
  navigator.geolocation.getCurrentPosition(({ coords }) => {
    fetchByCoords(coords.latitude, coords.longitude);
  }, (err) => {
    alert("Could not get location: " + err.message);
  });
});

calcBmiBtn.addEventListener("click", () => {
  const h = parseFloat(heightInput.value);
  const w = parseFloat(weightInput.value);
  if (!h || !w) return alert("Enter height (cm) and weight (kg)");
  localStorage.setItem("height", h);
  localStorage.setItem("weight", w);
  const bmi = calculateBMI(h, w);
  bmiResult.textContent = `BMI: ${bmi.toFixed(1)} (${bmiCategory(bmi)})`;
});

// --- Helper: BMI calculation ---
function calculateBMI(heightCm, weightKg) {
  const h = heightCm / 100;
  return weightKg / (h * h);
}
function bmiCategory(bmi) {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

// --- Fetch by city name (get coords first) ---
async function fetchByCity(city) {
  weatherInfo.textContent = "Loading...";
  aqiInfo.textContent = "...";
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_KEY}&units=metric`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("City not found");
    const data = await res.json();
    const { coord, main, weather, name } = data;
    displayWeather({ name, main, weather });
    fetchAirQuality(coord.lat, coord.lon);
  } catch (err) {
    weatherInfo.textContent = "Error: " + err.message;
    aqiInfo.textContent = "—";
    adviceDiv.textContent = "—";
  }
}

// --- Fetch by coordinates (lat, lon) ---
async function fetchByCoords(lat, lon) {
  weatherInfo.textContent = "Loading...";
  aqiInfo.textContent = "...";
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}&units=metric`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Weather fetch failed");
    const data = await res.json();
    const { coord, main, weather, name } = data;
    cityInput.value = name;
    localStorage.setItem("lastCity", name);
    displayWeather({ name, main, weather });
    fetchAirQuality(coord.lat, coord.lon);
  } catch (err) {
    weatherInfo.textContent = "Error: " + err.message;
    aqiInfo.textContent = "—";
    adviceDiv.textContent = "—";
  }
}

// --- Display weather summary ---
function displayWeather({ name, main, weather }) {
  const desc = weather[0].description;
  const iconCode = weather[0].icon;

  const weatherIcon = document.getElementById("weatherIcon");

  // Remove leftover emoji just in case
  weatherIcon.textContent = "";

  // Insert OpenWeather icon with fallback
  weatherIcon.innerHTML = `
    <img 
      src="https://openweathermap.org/img/wn/${iconCode}@2x.png"
      alt="${desc}"
      onerror="this.onerror=null; this.src='https://openweathermap.org/img/wn/01d@2x.png'"
    >
  `;

  // Weather details text
  weatherInfo.innerHTML = `
    <strong>${name}</strong><br/>
    ${desc} · ${main.temp.toFixed(1)}°C · Humidity ${main.humidity}%`;

  makeAdvice();
}


// --- Fetch Air Quality from OpenWeather ---
async function fetchAirQuality(lat, lon) {
  try {
    const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("AQI fetch failed");
    const data = await res.json();
    // OpenWeather returns a list; we take first item
    const aqi = data.list[0].main.aqi; // 1 (Good) to 5 (Very poor)
    displayAQI(aqi);
    makeAdvice();
  } catch (err) {
    aqiInfo.textContent = "Error getting AQI";
  }
}

function displayAQI(aqi) {
  const map = {
    1: "Good",
    2: "Fair",
    3: "Moderate",
    4: "Poor",
    5: "Very Poor"
  };
  aqiInfo.innerHTML = `<strong>${aqi}</strong> — ${map[aqi] || "Unknown"}`;
}

// --- Compose health advice using simple rules ---
function makeAdvice() {
  // Grab displayed data
  const weatherText = weatherInfo.textContent || "";
  const aqiText = aqiInfo.textContent || "";
  const humidityMatch = weatherText.match(/Humidity\s*(\d+)%/);
  const tempMatch = weatherText.match(/([-+]?\d+(\.\d+)?)°C/);

  const humidity = humidityMatch ? Number(humidityMatch[1]) : null;
  const temp = tempMatch ? Number(tempMatch[1]) : null;
  const aqiNumberMatch = aqiInfo.textContent.match(/\b[1-5]\b/);
  const aqi = aqiNumberMatch ? Number(aqiNumberMatch[0]) : null;

  const tips = [];

  if (temp !== null) {
    if (temp >= 32) tips.push("It's hot — keep hydrated and avoid strenuous outdoor activity during peak sun.");
    else if (temp >= 26) tips.push("Warm day — drink extra water and wear light clothing.");
    else if (temp <= 5) tips.push("Cold day — bundle up and avoid long exposure outside.");
  }

  if (humidity !== null) {
    if (humidity > 80) tips.push("High humidity — sweat may not evaporate well; stay cool indoors if possible.");
    else if (humidity < 30) tips.push("Low humidity — skin may dry out; moisturize and drink more water.");
  }

  if (aqi !== null) {
    if (aqi <= 2) tips.push("Air quality is good — safe for outdoor exercise.");
    else if (aqi === 3) tips.push("Moderate air quality — sensitive people should take care during heavy exercise.");
    else tips.push("Air quality is poor — avoid outdoor workouts and limit time outside.");
  }

  // Add BMI-based advice if available
  const h = Number(localStorage.getItem("height"));
  const w = Number(localStorage.getItem("weight"));
  if (h && w) {
    const bmi = calculateBMI(h, w);
    const cat = bmiCategory(bmi);
    tips.push(`Your BMI is ${bmi.toFixed(1)} (${cat}).`);
    if (cat === "Underweight") tips.push("Consider a nutrition plan to gain weight safely.");
    if (cat === "Overweight" || cat === "Obese") tips.push("Aim for moderate exercise and a balanced diet.");
  }

  // Water intake suggestion (very rough)
  if (temp !== null) {
    let base = 2000; // ml
    if (temp >= 30) base += 800;
    if (temp >= 36) base += 800;
    tips.push(`Suggested water intake: ${Math.round(base/100)/10} L/day (approx).`);
  } else {
    tips.push("Suggested water intake: ~2.0 L/day (adjust for activity & weather).");
  }

  adviceDiv.innerHTML = tips.length ? `<ul>${tips.map(t => `<li>${t}</li>`).join("")}</ul>` : "No data yet.";
}

/* ============================
   DARK MODE TOGGLE
============================ */
const themeButton = document.createElement("button");
themeButton.className = "theme-toggle";
themeButton.id = "themeToggle";
themeButton.textContent = "🌙 Dark Mode";

document.querySelector("header").appendChild(themeButton);

// Load saved theme
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
  themeButton.textContent = "☀️ Light Mode";
}

// Toggle theme on click
themeButton.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  if (document.body.classList.contains("dark")) {
    themeButton.textContent = "☀️ Light Mode";
    localStorage.setItem("theme", "dark");
  } else {
    themeButton.textContent = "🌙 Dark Mode";
    localStorage.setItem("theme", "light");
  }
});
