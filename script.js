// api key
const OPENWEATHER_KEY = "16060a32799a802818a768e1ae477d39";

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

// load saved data
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

// button events
searchBtn.addEventListener("click", () => {
  const city = cityInput.value.trim();
  if (!city) return alert("Enter a city name");
  localStorage.setItem("lastCity", city);
  fetchByCity(city);
});

locBtn.addEventListener("click", () => {
  if (!navigator.geolocation) return alert("Geolocation not supported");

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => fetchByCoords(coords.latitude, coords.longitude),
    err => alert("Could not get location: " + err.message)
  );
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

// bmi calculation
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

// to fetch weather
async function fetchByCity(city) {
  weatherInfo.textContent = "Loading...";
  aqiInfo.textContent = "...";

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_KEY}&units=metric`
    );
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

async function fetchByCoords(lat, lon) {
  weatherInfo.textContent = "Loading...";
  aqiInfo.textContent = "...";

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}&units=metric`
    );
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

// to display weather
function displayWeather({ name, main, weather }) {
  const desc = weather[0].description;
  const iconCode = weather[0].icon;
  const weatherIcon = document.getElementById("weatherIcon");

  const svgPath = `icons/${iconCode}.svg`;
  const fallbackDay = `icons/${iconCode.slice(0, 2)}d.svg`;

  weatherIcon.textContent = "";

  fetch(svgPath).then(res => {
    weatherIcon.innerHTML = res.ok
      ? `<img src="${svgPath}" alt="${desc}" class="weather-icon-animate">`
      : `<img src="${fallbackDay}" alt="${desc}" class="weather-icon-animate">`;
  });

  weatherInfo.innerHTML = `
    <strong>${name}</strong><br/>
    ${desc} · ${main.temp.toFixed(1)}°C · Humidity ${main.humidity}%
  `;

  makeAdvice();
}

// aqi fetch
async function fetchAirQuality(lat, lon) {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}`
    );
    if (!res.ok) throw new Error("AQI fetch failed");

    const data = await res.json();
    const aqi = data.list[0].main.aqi;

    displayAQI(aqi);
    makeAdvice();
  } catch {
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

  aqiInfo.innerHTML = `
    <span class="${aqi >= 4 ? 'aqi-pulse' : ''}">
      <strong>${aqi}</strong> — ${map[aqi]}
    </span>
  `;
}

// health advice
function makeAdvice() {
  const weatherText = weatherInfo.textContent || "";
  const humidityMatch = weatherText.match(/Humidity\s*(\d+)%/);
  const tempMatch = weatherText.match(/([-+]?\d+(\.\d+)?)°C/);

  const humidity = humidityMatch ? Number(humidityMatch[1]) : null;
  const temp = tempMatch ? Number(tempMatch[1]) : null;

  const aqiMatch = aqiInfo.textContent.match(/\b[1-5]\b/);
  const aqi = aqiMatch ? Number(aqiMatch[0]) : null;

  const tips = [];

  if (temp !== null) {
    if (temp >= 32) tips.push("It's hot — stay hydrated and avoid peak sun.");
    else if (temp >= 26) tips.push("Warm day — drink extra water.");
    else if (temp <= 5) tips.push("Very cold — limit time outside.");
  }

  if (humidity !== null) {
    if (humidity > 80) tips.push("High humidity — stay indoors if possible.");
    else if (humidity < 30) tips.push("Dry air — moisturize and drink water.");
  }

  if (aqi !== null) {
    if (aqi <= 2) tips.push("Air quality is good.");
    else if (aqi === 3) tips.push("Moderate air quality — sensitive people be careful.");
    else tips.push("Poor air quality — avoid outdoor exercise.");
  }

  const h = Number(localStorage.getItem("height"));
  const w = Number(localStorage.getItem("weight"));

  if (h && w) {
    const bmi = calculateBMI(h, w);
    const cat = bmiCategory(bmi);

    tips.push(`Your BMI is ${bmi.toFixed(1)} (${cat}).`);

    if (cat === "Underweight") tips.push("Consider a nutrition plan to gain weight.");
    if (cat === "Overweight" || cat === "Obese")
      tips.push("Aim for moderate exercise and balanced meals.");
  }

  if (temp !== null) {
    let base = 2000;
    if (temp >= 30) base += 800;
    if (temp >= 36) base += 800;
    tips.push(`Suggested water intake: ${(base / 1000).toFixed(1)} L/day.`);
  }

  adviceDiv.innerHTML = tips.length
    ? `<ul>${tips.map(t => `<li>${t}</li>`).join("")}</ul>`
    : "No data yet.";
}

// ====== DARK MODE BUTTON ======
const themeButton = document.createElement("button");
themeButton.className = "theme-toggle";
themeButton.textContent = "🌙 Dark Mode";

document.querySelector("header").appendChild(themeButton);

if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
  themeButton.textContent = "☀️ Light Mode";
}

themeButton.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark");
  themeButton.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
  localStorage.setItem("theme", isDark ? "dark" : "light");
});
