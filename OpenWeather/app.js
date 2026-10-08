/**
 * Weather & Packing Planner - Core Application Script
 * Implements State Management, API Integration, Custom Theming, and Packing Logic
 */

// Application Constants
const MAX_HISTORY_ITEMS = 5;

// State Management Object
const state = {
  apiKey: localStorage.getItem('weather_planner_api_key') || '',
  envApiKey: '',
  units: localStorage.getItem('weather_planner_units') || 'metric', // 'metric' or 'imperial'
  history: JSON.parse(localStorage.getItem('weather_planner_history')) || [],
  currentCity: localStorage.getItem('weather_planner_last_city') || 'London',
  activeWeatherTheme: 'clear',
  isFetching: false,
  suggestions: [],
  activeSuggestionIndex: -1,
  useVercelApi: false
};

// DOM Cache
const dom = {
  // Search
  searchForm: document.getElementById('search-form'),
  searchInput: document.getElementById('search-input'),
  btnSearch: document.getElementById('btn-search'),
  searchHistory: document.getElementById('search-history'),
  autocompleteList: document.getElementById('autocomplete-list'),
  
  // Weather Info
  weatherCard: document.getElementById('weather-card'),
  weatherContent: document.getElementById('weather-content'),
  weatherSkeleton: document.getElementById('weather-skeleton'),
  cityName: document.getElementById('city-name'),
  countryName: document.getElementById('country-name'),
  weatherDescription: document.getElementById('weather-description'),
  weatherIcon: document.getElementById('weather-icon'),
  tempDisplay: document.getElementById('temp-display'),
  feelsLikeDisplay: document.getElementById('feels-like-display'),
  
  // Weather Details
  humidityDisplay: document.getElementById('humidity-display'),
  windDisplay: document.getElementById('wind-display'),
  pressureDisplay: document.getElementById('pressure-display'),
  visibilityDisplay: document.getElementById('visibility-display'),
  sunriseDisplay: document.getElementById('sunrise-display'),
  sunsetDisplay: document.getElementById('sunset-display'),
  
  // Forecast
  forecastGrid: document.getElementById('forecast-grid'),
  forecastSkeletons: document.getElementById('forecast-skeletons'),
  
  // Packing List
  packingCard: document.getElementById('packing-card'),
  packingContent: document.getElementById('packing-content'),
  packingSkeleton: document.getElementById('packing-skeleton'),
  packingList: document.getElementById('packing-list'),
  
  // Error Card
  errorCard: document.getElementById('error-card'),
  errorMessage: document.getElementById('error-message'),
  
  // Controls
  currentDate: document.getElementById('current-date'),
  btnSettings: document.getElementById('btn-settings'),
  
  // Settings Dialog
  settingsDialog: document.getElementById('settings-dialog'),
  btnCloseSettings: document.getElementById('btn-close-settings'),
  settingsForm: document.getElementById('settings-form'),
  inputApiKey: document.getElementById('input-api-key'),
  btnResetSettings: document.getElementById('btn-reset-settings')
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function loadEnv() {
  try {
    const response = await fetch('.env');
    if (!response.ok) return;
    const text = await response.text();
    text.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        const cleanValue = value.replace(/^['"]|['"]$/g, '');
        if (key === 'OPENWEATHER_API_KEY') {
          state.envApiKey = cleanValue;
        }
      }
    });
  } catch (e) {
    console.warn('Could not load .env file:', e);
  }
}

async function checkVercelApiSupport() {
  try {
    const response = await fetch('/api/weather?q=test');
    // Any status other than 404 means the Vercel API routing is active.
    state.useVercelApi = (response.status !== 404);
  } catch (e) {
    state.useVercelApi = false;
  }
}

async function initApp() {
  updateCurrentDate();
  renderHistoryChips();
  
  // Check if deployed on Vercel with Serverless API backend support
  await checkVercelApiSupport();
  
  // Load variables from environment (.env) if running locally
  if (!state.useVercelApi) {
    await loadEnv();
  }
  
  // Resolve active API key (only for local mode, or if user enters override in settings)
  state.apiKey = localStorage.getItem('weather_planner_api_key') || state.envApiKey || '';
  
  // Pre-fill settings form
  dom.inputApiKey.value = localStorage.getItem('weather_planner_api_key') || '';
  const unitRadio = document.querySelector(`input[name="unit-selection"][value="${state.units}"]`);
  if (unitRadio) unitRadio.checked = true;

  // Bind Event Listeners
  dom.searchForm.addEventListener('submit', handleSearchSubmit);
  dom.btnSettings.addEventListener('click', () => dom.settingsDialog.showModal());
  dom.btnCloseSettings.addEventListener('click', () => dom.settingsDialog.close());
  dom.settingsForm.addEventListener('submit', handleSettingsSave);
  dom.btnResetSettings.addEventListener('click', handleSettingsReset);
  
  // Autocomplete bindings
  dom.searchInput.addEventListener('input', handleSearchInput);
  dom.searchInput.addEventListener('keydown', handleSearchKeydown);
  document.addEventListener('click', handleOutsideClick);
  
  // Fetch initial city weather
  fetchWeatherData(state.currentCity);
}

// --- Date Helper ---
function updateCurrentDate() {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formatted = new Date().toLocaleDateString('en-US', options);
  dom.currentDate.textContent = formatted;
}

// --- API Interactions ---
async function fetchWeatherData(queryOrCoords) {
  if (state.isFetching) return;
  
  showLoadingState();
  
  const unitsParam = state.units;
  let currentUrl, forecastUrl, searchIdentifier;
  
  if (state.useVercelApi) {
    if (typeof queryOrCoords === 'object' && queryOrCoords !== null) {
      const { lat, lon, name } = queryOrCoords;
      currentUrl = `/api/weather?lat=${lat}&lon=${lon}&units=${unitsParam}`;
      forecastUrl = `/api/forecast?lat=${lat}&lon=${lon}&units=${unitsParam}`;
      searchIdentifier = name;
    } else {
      currentUrl = `/api/weather?q=${encodeURIComponent(queryOrCoords)}&units=${unitsParam}`;
      forecastUrl = `/api/forecast?q=${encodeURIComponent(queryOrCoords)}&units=${unitsParam}`;
      searchIdentifier = queryOrCoords;
    }
  } else {
    if (typeof queryOrCoords === 'object' && queryOrCoords !== null) {
      const { lat, lon, name } = queryOrCoords;
      currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${state.apiKey}&units=${unitsParam}`;
      forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${state.apiKey}&units=${unitsParam}`;
      searchIdentifier = name;
    } else {
      currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(queryOrCoords)}&appid=${state.apiKey}&units=${unitsParam}`;
      forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(queryOrCoords)}&appid=${state.apiKey}&units=${unitsParam}`;
      searchIdentifier = queryOrCoords;
    }
  }
  
  try {
    const currentResponse = await fetch(currentUrl);
    if (!currentResponse.ok) {
      if (currentResponse.status === 401) {
        throw new Error('API_KEY_UNAUTHORIZED');
      } else if (currentResponse.status === 404) {
        throw new Error('CITY_NOT_FOUND');
      } else {
        throw new Error('SERVER_ERROR');
      }
    }
    const currentData = await currentResponse.json();
    
    const forecastResponse = await fetch(forecastUrl);
    if (!forecastResponse.ok) {
      throw new Error('FORECAST_ERROR');
    }
    const forecastData = await forecastResponse.json();
    
    // Update State
    state.currentCity = currentData.name;
    localStorage.setItem('weather_planner_last_city', currentData.name);
    
    // Add to history
    addToHistory(currentData.name);
    
    // Render
    renderCurrentWeather(currentData);
    renderForecast(forecastData);
    renderPackingList(currentData, forecastData);
    
    hideLoadingState();
  } catch (error) {
    console.error('Error fetching weather data:', error);
    handleFetchError(error, searchIdentifier);
  }
}

// --- Loading / Error States ---
function showLoadingState() {
  state.isFetching = true;
  dom.btnSearch.disabled = true;
  dom.searchInput.disabled = true;
  
  // Hide current content & errors
  dom.weatherContent.classList.add('hidden');
  dom.packingContent.classList.add('hidden');
  dom.errorCard.classList.add('hidden');
  
  // Clear dynamic forecast items
  // Keep only children that are skeletons if any, or empty it out
  dom.forecastGrid.innerHTML = `
    <div class="card forecast-card skeleton-container">
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-circle"></div>
      <div class="skeleton skeleton-text"></div>
    </div>
    <div class="card forecast-card skeleton-container">
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-circle"></div>
      <div class="skeleton skeleton-text"></div>
    </div>
    <div class="card forecast-card skeleton-container">
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-circle"></div>
      <div class="skeleton skeleton-text"></div>
    </div>
  `;

  // Show skeletons
  dom.weatherSkeleton.classList.remove('hidden');
  dom.packingSkeleton.classList.remove('hidden');
}

function hideLoadingState() {
  state.isFetching = false;
  dom.btnSearch.disabled = false;
  dom.searchInput.disabled = false;
  
  // Hide skeletons
  dom.weatherSkeleton.classList.add('hidden');
  dom.packingSkeleton.classList.add('hidden');
  
  // Show contents
  dom.weatherContent.classList.remove('hidden');
  dom.packingContent.classList.remove('hidden');
}

function handleFetchError(error, searchCity) {
  state.isFetching = false;
  dom.btnSearch.disabled = false;
  dom.searchInput.disabled = false;
  
  // Hide skeletons & contents
  dom.weatherSkeleton.classList.add('hidden');
  dom.packingSkeleton.classList.add('hidden');
  dom.weatherContent.classList.add('hidden');
  dom.packingContent.classList.add('hidden');
  dom.forecastGrid.innerHTML = '';
  
  dom.errorCard.classList.remove('hidden');
  
  if (error.message === 'API_KEY_UNAUTHORIZED') {
    dom.errorMessage.innerHTML = 'The API Key provided is unauthorized or inactive. <br>Please verify your key in the <strong>Settings</strong> button at the top-right.';
    dom.errorCard.querySelector('.error-title').textContent = 'Unauthorized API Key';
  } else if (error.message === 'CITY_NOT_FOUND') {
    dom.errorMessage.textContent = `City "${searchCity}" not found. Please check spelling and try again.`;
    dom.errorCard.querySelector('.error-title').textContent = 'City Not Found';
  } else {
    dom.errorMessage.textContent = 'Unable to fetch weather data. Please check your connection and try again.';
    dom.errorCard.querySelector('.error-title').textContent = 'Network or Server Error';
  }
}

// --- Search Handlers ---
function handleSearchSubmit(e) {
  e.preventDefault();
  
  // If keyboard active suggestion index is highlighted, fetch using coordinates
  if (state.activeSuggestionIndex >= 0 && state.suggestions[state.activeSuggestionIndex]) {
    const item = state.suggestions[state.activeSuggestionIndex];
    fetchWeatherData({ lat: item.lat, lon: item.lon, name: item.name });
    closeAutocomplete();
    dom.searchInput.value = '';
    dom.searchInput.blur();
    return;
  }
  
  const query = dom.searchInput.value.trim();
  if (query) {
    fetchWeatherData(query);
    closeAutocomplete();
    dom.searchInput.value = '';
    dom.searchInput.blur();
  }
}

// --- Autocomplete Search Actions ---
function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

const handleSearchInput = debounce(async (e) => {
  const query = e.target.value.trim();
  if (query.length < 3) {
    closeAutocomplete();
    return;
  }
  
  const geoUrl = state.useVercelApi
    ? `/api/geocoding?q=${encodeURIComponent(query)}`
    : `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${state.apiKey}`;
  
  try {
    const response = await fetch(geoUrl);
    if (!response.ok) throw new Error('Geocoding fail');
    const data = await response.json();
    state.suggestions = data;
    state.activeSuggestionIndex = -1;
    renderAutocompleteDropdown();
  } catch (err) {
    console.error('Error fetching suggestions:', err);
    closeAutocomplete();
  }
}, 300);

function handleSearchKeydown(e) {
  const items = dom.autocompleteList.querySelectorAll('.autocomplete-item');
  if (dom.autocompleteList.classList.contains('hidden') || items.length === 0) return;
  
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    state.activeSuggestionIndex = (state.activeSuggestionIndex + 1) % items.length;
    updateActiveSuggestion(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    state.activeSuggestionIndex = (state.activeSuggestionIndex - 1 + items.length) % items.length;
    updateActiveSuggestion(items);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    closeAutocomplete();
  } else if (e.key === 'Enter') {
    if (state.activeSuggestionIndex >= 0) {
      e.preventDefault();
      selectSuggestion(state.activeSuggestionIndex);
    }
  }
}

function updateActiveSuggestion(items) {
  items.forEach((item, index) => {
    if (index === state.activeSuggestionIndex) {
      item.classList.add('active');
      dom.searchInput.setAttribute('aria-activedescendant', item.id);
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.classList.remove('active');
    }
  });
}

function selectSuggestion(index) {
  const item = state.suggestions[index];
  if (item) {
    fetchWeatherData({ lat: item.lat, lon: item.lon, name: item.name });
    closeAutocomplete();
    dom.searchInput.value = '';
    dom.searchInput.blur();
  }
}

function handleOutsideClick(e) {
  if (!dom.searchForm.contains(e.target)) {
    closeAutocomplete();
  }
}

function renderAutocompleteDropdown() {
  dom.autocompleteList.innerHTML = '';
  
  if (state.suggestions.length === 0) {
    closeAutocomplete();
    return;
  }
  
  dom.autocompleteList.classList.remove('hidden');
  dom.searchInput.setAttribute('aria-expanded', 'true');
  
  state.suggestions.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'autocomplete-item';
    li.role = 'option';
    li.id = `autocomplete-option-${index}`;
    
    // Icon
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined location-icon';
    icon.textContent = 'location_on';
    li.appendChild(icon);
    
    // Details
    const details = document.createElement('div');
    details.className = 'location-details';
    
    const title = document.createElement('span');
    title.className = 'location-title';
    title.textContent = item.name;
    details.appendChild(title);
    
    const subtitle = document.createElement('span');
    subtitle.className = 'location-subtitle';
    // Format label as "State, Country" or just "Country"
    const stateStr = item.state ? `${item.state}, ` : '';
    subtitle.textContent = `${stateStr}${item.country}`;
    details.appendChild(subtitle);
    
    li.appendChild(details);
    
    // Hover event sets index
    li.addEventListener('mouseenter', () => {
      state.activeSuggestionIndex = index;
      const items = dom.autocompleteList.querySelectorAll('.autocomplete-item');
      updateActiveSuggestion(items);
    });
    
    // Click event selects
    li.addEventListener('click', () => {
      selectSuggestion(index);
    });
    
    dom.autocompleteList.appendChild(li);
  });
}

function closeAutocomplete() {
  state.suggestions = [];
  state.activeSuggestionIndex = -1;
  dom.autocompleteList.classList.add('hidden');
  dom.autocompleteList.innerHTML = '';
  dom.searchInput.setAttribute('aria-expanded', 'false');
  dom.searchInput.removeAttribute('aria-activedescendant');
}


function addToHistory(city) {
  // Check case-insensitive duplication
  const existingIndex = state.history.findIndex(item => item.toLowerCase() === city.toLowerCase());
  if (existingIndex !== -1) {
    state.history.splice(existingIndex, 1);
  }
  
  state.history.unshift(city);
  
  if (state.history.length > MAX_HISTORY_ITEMS) {
    state.history.pop();
  }
  
  localStorage.setItem('weather_planner_history', JSON.stringify(state.history));
  renderHistoryChips();
}

function removeFromHistory(city, e) {
  e.stopPropagation(); // Avoid triggering search on chip click
  state.history = state.history.filter(item => item.toLowerCase() !== city.toLowerCase());
  localStorage.setItem('weather_planner_history', JSON.stringify(state.history));
  renderHistoryChips();
}

function renderHistoryChips() {
  dom.searchHistory.innerHTML = '';
  if (state.history.length === 0) {
    dom.searchHistory.parentNode.classList.add('hidden');
    return;
  }
  
  dom.searchHistory.parentNode.classList.remove('hidden');
  
  state.history.forEach(city => {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.setAttribute('type', 'button');
    chip.setAttribute('aria-label', `Search ${city}`);
    
    const cityNameSpan = document.createElement('span');
    cityNameSpan.textContent = city;
    chip.appendChild(cityNameSpan);
    
    const closeBtn = document.createElement('span');
    closeBtn.className = 'material-symbols-outlined chip-close';
    closeBtn.textContent = 'close';
    closeBtn.setAttribute('title', `Remove ${city} from search history`);
    closeBtn.addEventListener('click', (e) => removeFromHistory(city, e));
    
    chip.appendChild(closeBtn);
    chip.addEventListener('click', () => fetchWeatherData(city));
    
    dom.searchHistory.appendChild(chip);
  });
}

// --- Settings Actions ---
function handleSettingsSave(e) {
  e.preventDefault();
  
  const rawKey = dom.inputApiKey.value.trim();
  const selectedKey = rawKey === '' ? (state.envApiKey || '') : rawKey;
  const selectedUnits = document.querySelector('input[name="unit-selection"]:checked').value;
  
  state.apiKey = selectedKey;
  state.units = selectedUnits;
  
  if (rawKey === '') {
    localStorage.removeItem('weather_planner_api_key');
  } else {
    localStorage.setItem('weather_planner_api_key', selectedKey);
  }
  localStorage.setItem('weather_planner_units', selectedUnits);
  
  dom.settingsDialog.close();
  
  // Re-fetch weather with new settings for current active city
  fetchWeatherData(state.currentCity);
}

function handleSettingsReset() {
  dom.inputApiKey.value = '';
}

// --- Icon & Theme Maps ---
function getWeatherIconName(weatherMain, id) {
  // Detailed mapping based on OpenWeatherMap weather code IDs
  if (id >= 200 && id < 300) return 'thunderstorm';
  if (id >= 300 && id < 600) return 'rainy';
  if (id >= 600 && id < 700) return 'ac_unit';
  if (id >= 700 && id < 800) return 'foggy';
  if (id === 800) return 'sunny';
  if (id === 801 || id === 802) return 'partly_cloudy_day';
  return 'cloudy';
}

function setWeatherTheme(weatherMain) {
  let themeName = 'clouds'; // Default
  const condition = weatherMain.toLowerCase();
  
  if (condition.includes('clear')) {
    themeName = 'clear';
  } else if (condition.includes('cloud')) {
    themeName = 'clouds';
  } else if (condition.includes('rain') || condition.includes('drizzle')) {
    themeName = 'rain';
  } else if (condition.includes('snow')) {
    themeName = 'snow';
  } else if (condition.includes('thunder')) {
    themeName = 'thunderstorm';
  } else if (
    condition.includes('mist') || 
    condition.includes('fog') || 
    condition.includes('haze') || 
    condition.includes('smoke') || 
    condition.includes('dust')
  ) {
    themeName = 'mist';
  }
  
  state.activeWeatherTheme = themeName;
  document.documentElement.setAttribute('data-theme', themeName);
}

// --- Weather View Rendering ---
function renderCurrentWeather(data) {
  // Apply theme dynamically
  const weatherMain = data.weather[0].main;
  const weatherId = data.weather[0].id;
  setWeatherTheme(weatherMain);
  
  // Set UI contents
  dom.cityName.textContent = data.name;
  dom.countryName.textContent = data.sys.country;
  dom.weatherDescription.textContent = data.weather[0].description;
  
  // Map icon
  dom.weatherIcon.textContent = getWeatherIconName(weatherMain, weatherId);
  
  // Units symbols
  const tempSymbol = state.units === 'metric' ? '°C' : '°F';
  const speedSymbol = state.units === 'metric' ? 'm/s' : 'mph';
  
  dom.tempDisplay.textContent = `${Math.round(data.main.temp)}${tempSymbol}`;
  dom.feelsLikeDisplay.textContent = `${Math.round(data.main.feels_like)}${tempSymbol}`;
  
  dom.humidityDisplay.textContent = `${data.main.humidity}%`;
  dom.windDisplay.textContent = `${data.wind.speed} ${speedSymbol}`;
  dom.pressureDisplay.textContent = `${data.main.pressure} hPa`;
  
  // Visibility conversion (OpenWeather outputs in meters)
  const visibilityDistance = data.visibility ? (data.visibility / 1000).toFixed(1) : 'N/A';
  dom.visibilityDisplay.textContent = `${visibilityDistance} km`;
  
  // Sunrise/Sunset times
  const formatTime = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  dom.sunriseDisplay.textContent = formatTime(data.sys.sunrise);
  dom.sunsetDisplay.textContent = formatTime(data.sys.sunset);
  
  // Trigger entry animation
  dom.weatherContent.classList.remove('animate-in');
  void dom.weatherContent.offsetWidth; // Trigger reflow
  dom.weatherContent.classList.add('animate-in');
}

// --- Forecast Processing ---
function renderForecast(forecastData) {
  dom.forecastGrid.innerHTML = '';
  
  // Group forecasts by day
  const groupedForecasts = {};
  const todayStr = new Date().toDateString();
  
  forecastData.list.forEach(item => {
    const date = new Date(item.dt * 1000);
    const dayStr = date.toDateString();
    
    // Skip today's remaining predictions to ensure a true 3-day future forecast
    if (dayStr === todayStr) return;
    
    if (!groupedForecasts[dayStr]) {
      groupedForecasts[dayStr] = [];
    }
    groupedForecasts[dayStr].push(item);
  });
  
  // Extract list of dates
  const forecastDays = Object.keys(groupedForecasts).slice(0, 3);
  
  forecastDays.forEach((dayStr, index) => {
    const dayList = groupedForecasts[dayStr];
    
    // Aggregate min/max temp across the day
    let tempMin = Infinity;
    let tempMax = -Infinity;
    dayList.forEach(item => {
      if (item.main.temp_min < tempMin) tempMin = item.main.temp_min;
      if (item.main.temp_max > tempMax) tempMax = item.main.temp_max;
    });
    
    // Select the representative entry closest to 12:00 PM (noon)
    let noonEntry = dayList[0];
    let minDiff = Infinity;
    dayList.forEach(item => {
      const date = new Date(item.dt * 1000);
      const hour = date.getHours();
      const diff = Math.abs(hour - 12);
      if (diff < minDiff) {
        minDiff = diff;
        noonEntry = item;
      }
    });
    
    const dayDate = new Date(dayStr);
    const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
    const formattedDateStr = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    const weatherMain = noonEntry.weather[0].main;
    const weatherId = noonEntry.weather[0].id;
    const iconName = getWeatherIconName(weatherMain, weatherId);
    
    const tempSymbol = state.units === 'metric' ? '°C' : '°F';
    
    // Build card
    const card = document.createElement('div');
    card.className = 'card forecast-card animate-in';
    card.style.animationDelay = `${index * 0.1}s`;
    
    card.innerHTML = `
      <span class="forecast-day" title="${dayStr}">${dayName}, ${formattedDateStr}</span>
      <span class="material-symbols-outlined forecast-icon" aria-hidden="true">${iconName}</span>
      <div class="forecast-temp">
        <span class="forecast-temp-max">${Math.round(tempMax)}${tempSymbol}</span>
        <span class="forecast-temp-min">${Math.round(tempMin)}${tempSymbol}</span>
      </div>
      <span class="forecast-desc">${noonEntry.weather[0].description}</span>
    `;
    
    dom.forecastGrid.appendChild(card);
  });
}

// --- Packing Recommendation Planner ---
function renderPackingList(currentData, forecastData) {
  dom.packingList.innerHTML = '';
  
  const cityName = currentData.name;
  
  // Load checked items map for this city from localStorage
  const checkedStorageKey = `weather_planner_checked_${cityName.toLowerCase()}`;
  const savedChecks = JSON.parse(localStorage.getItem(checkedStorageKey)) || {};
  
  const tempCelsius = state.units === 'metric' ? currentData.main.temp : ((currentData.main.temp - 32) * 5/9);
  const windMetersPerSec = state.units === 'metric' ? currentData.wind.speed : (currentData.wind.speed * 0.44704);
  
  // Rule engine outputs
  const recommendations = [];
  
  // Helper to add unique item
  const addItem = (name, icon) => {
    if (!recommendations.some(item => item.name === name)) {
      recommendations.push({ name, icon });
    }
  };
  
  // Rain/Drizzle Check (Check current + forecast)
  let isRainy = currentData.weather[0].main.toLowerCase().includes('rain') || 
                 currentData.weather[0].main.toLowerCase().includes('drizzle') ||
                 currentData.weather[0].main.toLowerCase().includes('thunderstorm');
                 
  // Scan forecast for any rain
  forecastData.list.slice(0, 8).forEach(item => { // Next 24 hours
    if (item.weather[0].main.toLowerCase().includes('rain') || 
        item.weather[0].main.toLowerCase().includes('drizzle')) {
      isRainy = true;
    }
  });
  
  if (isRainy) {
    addItem('Umbrella', 'umbrella');
    addItem('Waterproof Jacket', 'checkroom');
    addItem('Waterproof Boots', 'hiking');
  }
  
  // Temperature Checks (Values checked in Celsius)
  if (tempCelsius < 12) {
    addItem('Heavy Coat', 'checkroom');
    addItem('Warm Beanie', 'sports_hockey');
  }
  if (tempCelsius < 5) {
    addItem('Thick Gloves', 'front_hand');
    addItem('Thermal Base Layer', 'dry_cleaning');
    addItem('Insulated Flask', 'local_cafe');
  }
  
  if (tempCelsius > 22) {
    addItem('Sunscreen SPF 50', 'wb_sunny');
    addItem('Breathable Clothing', 'styler');
  }
  
  // Condition Checks
  const condition = currentData.weather[0].main.toLowerCase();
  if (condition.includes('clear')) {
    addItem('Sunglasses', 'light_mode');
    if (tempCelsius > 18) {
      addItem('Sun Hat', 'face_retouching_natural');
    }
  }
  
  if (condition.includes('snow')) {
    addItem('Snow Boots', 'hiking');
    addItem('Thick Socks', 'styler');
    addItem('Heavy Coat', 'checkroom');
    addItem('Thick Gloves', 'front_hand');
  }
  
  // Wind Speed check
  if (windMetersPerSec > 6.0) {
    addItem('Windbreaker Jacket', 'air');
    addItem('Lip Balm', 'medical_services');
  }
  
  // General Always-Recommended items
  addItem('Water Bottle', 'water_bottle');
  addItem('Personal ID & Wallet', 'wallet');
  addItem('Mobile Charger', 'battery_charging_full');
  
  // Render list items
  recommendations.forEach((item, index) => {
    const isChecked = savedChecks[item.name] || false;
    
    const li = document.createElement('li');
    li.className = 'packing-item animate-in';
    li.style.animationDelay = `${index * 0.05}s`;
    
    // Create checkbox label
    const label = document.createElement('label');
    label.className = 'packing-checkbox-wrapper';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = isChecked;
    checkbox.setAttribute('aria-label', `Pack ${item.name}`);
    
    checkbox.addEventListener('change', () => {
      // Save state to local storage
      const currentChecks = JSON.parse(localStorage.getItem(checkedStorageKey)) || {};
      currentChecks[item.name] = checkbox.checked;
      localStorage.setItem(checkedStorageKey, JSON.stringify(currentChecks));
    });
    
    const customCheckboxSpan = document.createElement('span');
    customCheckboxSpan.className = 'custom-checkbox';
    
    label.appendChild(checkbox);
    label.appendChild(customCheckboxSpan);
    
    li.appendChild(label);
    
    // Icon
    const iconSpan = document.createElement('span');
    iconSpan.className = 'material-symbols-outlined packing-item-icon';
    iconSpan.textContent = item.icon;
    iconSpan.setAttribute('aria-hidden', 'true');
    li.appendChild(iconSpan);
    
    // Text name
    const textSpan = document.createElement('span');
    textSpan.className = 'packing-item-name';
    textSpan.textContent = item.name;
    li.appendChild(textSpan);
    
    // Make entire list item clickable (for toggle checkbox)
    li.addEventListener('click', (e) => {
      // Avoid infinite loop if clicking label itself
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SPAN' && !e.target.classList.contains('chip-close')) {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
      }
    });
    
    dom.packingList.appendChild(li);
  });
  
  // Trigger entrance transition
  dom.packingContent.classList.remove('animate-in');
  void dom.packingContent.offsetWidth; // Trigger reflow
  dom.packingContent.classList.add('animate-in');
}
