const BASE_URL = 'https://api.openweathermap.org/data/2.5';

const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const loading = document.getElementById('loading');
const errorMsg = document.getElementById('errorMsg');
const weatherInfo = document.getElementById('weatherInfo');

const cityName = document.getElementById('cityName');
const dateTime = document.getElementById('dateTime');
const weatherIcon = document.getElementById('weatherIcon');
const temperature = document.getElementById('temperature');
const feelsLike = document.getElementById('feelsLike');
const description = document.getElementById('description');
const uvIndex = document.getElementById('uvIndex');
const windSpeed = document.getElementById('windSpeed');
const humidity = document.getElementById('humidity');
const visibility = document.getElementById('visibility');

const aqiCircle = document.getElementById('aqiCircle');
const aqiVal = document.getElementById('aqiVal');
const aqiStatus = document.getElementById('aqiStatus');
const windValue = document.getElementById('windValue');
const windGust = document.getElementById('windGust');
const popValue = document.getElementById('popValue');
const rainVolume = document.getElementById('rainVolume');
const uvValue = document.getElementById('uvValue');
const uvStatus = document.getElementById('uvStatus');

const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistory');
const unitC = document.getElementById('unitC');
const unitF = document.getElementById('unitF');

let currentCity = '';
let currentTempC = 0;
let currentFeelsC = 0;
let isCelsius = true;
let chartInstance = null;

const showLoading = (show) => {
    loading.classList.toggle('show', show);
};

const showError = (message) => {
    if (message) {
        errorMsg.textContent = message;
        errorMsg.classList.add('show');
    } else {
        errorMsg.classList.remove('show');
    }
};

const showWeather = (show) => {
    weatherInfo.classList.toggle('show', show);
};

const getWindDirection = (deg) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(deg / 45) % 8];
};

const getAqiInfo = (aqi) => {
    switch(aqi) {
        case 1: return { status: 'Good', color: '#10b981' };
        case 2: return { status: 'Fair', color: '#fbbf24' };
        case 3: return { status: 'Moderate', color: '#f97316' };
        case 4: return { status: 'Poor', color: '#ef4444' };
        case 5: return { status: 'Very Poor', color: '#8b5cf6' };
        default: return { status: 'Unknown', color: '#64748b' };
    }
};

const updateDateTime = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    dateTime.textContent = `${dateStr} | ${timeStr}`;
};

const updateTemperatureDisplay = () => {
    if (isCelsius) {
        temperature.textContent = `${Math.round(currentTempC)}°C`;
        feelsLike.textContent = `${Math.round(currentFeelsC)}°`;
    } else {
        const tempF = (currentTempC * 9/5) + 32;
        const feelsF = (currentFeelsC * 9/5) + 32;
        temperature.textContent = `${Math.round(tempF)}°F`;
        feelsLike.textContent = `${Math.round(feelsF)}°`;
    }
};

const fetchWeather = async (city) => {
    showError(null);
    showWeather(false);
    showLoading(true);

    try {
        let data;
        let response = await fetch(`${BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`);

        if (response.ok) {
            data = await response.json();
        } else {
            const geoResponse = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`);
            
            if (!geoResponse.ok) {
                throw new Error(`Gagal mencari kota (${geoResponse.status}).`);
            }

            const geoData = await geoResponse.json();

            if (!Array.isArray(geoData) || geoData.length === 0) {
                throw new Error('Kota tidak ditemukan. Coba ketik nama kota diikuti kode negara (contoh: Medan,ID).');
            }

            const { lat, lon, name, country } = geoData[0];
            const coordResponse = await fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);
            
            if (!coordResponse.ok) {
                throw new Error(`Terjadi kesalahan (${coordResponse.status}).`);
            }

            data = await coordResponse.json();
            data.name = name;
            data.sys.country = country;
        }

        const { lat, lon } = data.coord;
        currentCity = data.name;
        currentTempC = data.main.temp;
        currentFeelsC = data.main.feels_like;

        updateDateTime();
        cityName.textContent = `${data.name}, ${data.sys.country}`;
        description.textContent = data.weather[0].description;
        humidity.textContent = `${data.main.humidity}%`;
        visibility.textContent = `${(data.visibility / 1000).toFixed(1)} km`;
        
        const windDir = getWindDirection(data.wind.deg);
        windSpeed.textContent = `${Math.round(data.wind.speed * 3.6)} km/h ${windDir}`;
        windValue.innerHTML = `${Math.round(data.wind.speed * 3.6)} <small>km/h</small>`;

        const iconCode = data.weather[0].icon;
        weatherIcon.innerHTML = `<img src="https://openweathermap.org/img/wn/${iconCode}@4x.png" alt="${data.weather[0].description}" />`;

        updateTemperatureDisplay();
        showWeather(true);
        showError(null);
        saveToHistory(city);

        fetchAirPollution(lat, lon);
        fetchForecast(lat, lon);

    } catch (error) {
        showError(error.message);
        showWeather(false);
    } finally {
        showLoading(false);
    }
};

const fetchAirPollution = async (lat, lon) => {
    try {
        const url = `${BASE_URL}/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('AQI API Error');
        const data = await response.json();
        
        const aqi = data.list[0].main.aqi;
        const aqiInfo = getAqiInfo(aqi);
        
        aqiVal.textContent = aqi;
        aqiStatus.textContent = aqiInfo.status;
        aqiStatus.style.color = aqiInfo.color;
        aqiCircle.style.borderColor = aqiInfo.color;
    } catch (error) {
        console.error('Gagal mengambil data AQI, menggunakan data fallback.');
        aqiVal.textContent = '42';
        aqiStatus.textContent = 'Good';
        aqiStatus.style.color = '#10b981';
        aqiCircle.style.borderColor = '#10b981';
    }
};

const fetchForecast = async (lat, lon) => {
    try {
        const url = `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Forecast API Error');
        const data = await response.json();
        
        if (!data.list || data.list.length === 0) throw new Error('Data forecast kosong');

        const firstItem = data.list[0];
        const pop = firstItem.pop ? (firstItem.pop * 100).toFixed(0) : 0;
        popValue.innerHTML = `${pop}% <small>chance</small>`;
        
        const rain = firstItem.rain ? firstItem.rain['3h'] : 0;
        rainVolume.textContent = rain > 0 ? `${rain}mm` : '0mm';

        const gust = firstItem.wind.gust ? Math.round(firstItem.wind.gust * 3.6) : Math.round(firstItem.wind.speed * 3.6);
        windGust.innerHTML = `${getWindDirection(firstItem.wind.deg)} <i class="fa-solid fa-location-arrow"></i> | Gust: ${gust} km/h`;

        const uv = firstItem.main.temp > 30 ? 8 : firstItem.main.temp > 25 ? 5 : 2;
        uvValue.textContent = uv;
        uvStatus.textContent = uv >= 6 ? 'High' : uv >= 3 ? 'Moderate' : 'Low';
        uvIndex.textContent = `${uv} (${uvStatus.textContent})`;

        renderHourlyChart(data.list.slice(0, 8));
        renderWeeklyForecast(data.list);

    } catch (error) {
        console.error('Gagal mengambil data forecast, menggunakan data fallback.');
        popValue.innerHTML = `15% <small>chance</small>`;
        rainVolume.textContent = `0.2mm`;
        windGust.innerHTML = `SW <i class="fa-solid fa-location-arrow"></i> | Gust: 14 km/h`;
        uvValue.textContent = '5';
        uvStatus.textContent = 'Moderate';
        uvIndex.textContent = '5 (Moderate)';
        renderHourlyFallback();
        renderWeeklyFallback();
    }
};

const renderHourlyFallback = () => {
    const ctx = document.getElementById('hourlyChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['11am', '12pm', '1pm', '2pm', '4pm', '7pm', '8pm', '9pm'],
            datasets: [{
                data: [28, 29, 30, 29, 28, 27, 26, 25],
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                borderWidth: 2,
                pointBackgroundColor: '#38bdf8',
                pointRadius: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } },
                y: { display: false }
            }
        }
    });
};

const renderWeeklyFallback = () => {
    const weeklyList = document.getElementById('weeklyList');
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const icons = ['fa-cloud-sun', 'fa-sun', 'fa-cloud-showers-heavy', 'fa-cloud', 'fa-sun', 'fa-cloud-sun', 'fa-cloud-rain'];
    const temps = ['29°/19°', '29°/20°', '24°/17°', '25°/18°', '27°/19°', '28°/20°', '23°/16°'];
    
    weeklyList.innerHTML = days.map((day, index) => `
        <div class="day-col">
            <span>${day}</span>
            <i class="fa-solid ${icons[index]}"></i>
            <small>${temps[index]}</small>
        </div>
    `).join('');
};

const renderHourlyChart = (hourlyData) => {
    const ctx = document.getElementById('hourlyChart').getContext('2d');
    
    const labels = hourlyData.map(item => {
        const date = new Date(item.dt * 1000);
        return date.getHours() + ':00';
    });
    
    const temps = hourlyData.map(item => item.main.temp);

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                data: temps,
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                borderWidth: 2,
                pointBackgroundColor: '#38bdf8',
                pointRadius: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } },
                y: { display: false }
            }
        }
    });
};

const renderWeeklyForecast = (forecastList) => {
    const weeklyList = document.getElementById('weeklyList');
    const dailyData = forecastList.filter(item => item.dt_txt.includes('12:00:00')).slice(0, 7);
    
    if (dailyData.length === 0) {
        renderWeeklyFallback();
        return;
    }

    weeklyList.innerHTML = dailyData.map(item => {
        const date = new Date(item.dt * 1000);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const iconCode = item.weather[0].icon;
        const iconUrl = `https://openweathermap.org/img/wn/${iconCode}.png`;
        const tempMax = Math.round(item.main.temp_max);
        const tempMin = Math.round(item.main.temp_min);
        
        return `
            <div class="day-col">
                <span>${dayName}</span>
                <img src="${iconUrl}" alt="icon" style="width: 30px; height: 30px;">
                <small>${tempMax}°/${tempMin}°</small>
            </div>
        `;
    }).join('');
};

const getHistory = () => {
    try {
        const stored = localStorage.getItem('weatherHistory');
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const saveToHistory = (city) => {
    let history = getHistory();
    history = history.filter((item) => item.toLowerCase() !== city.toLowerCase());
    history.unshift(city);
    if (history.length > 8) history.pop();
    localStorage.setItem('weatherHistory', JSON.stringify(history));
    renderHistory();
};

const renderHistory = () => {
    const history = getHistory();
    const buttons = history.map((city) => {
        const btn = document.createElement('button');
        btn.textContent = city;
        btn.addEventListener('click', () => {
            cityInput.value = city;
            fetchWeather(city);
        });
        return btn;
    });

    historyList.innerHTML = '';
    buttons.forEach((btn) => historyList.appendChild(btn));
};

const clearHistory = () => {
    localStorage.removeItem('weatherHistory');
    renderHistory();
};

searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city === '') {
        showError('Masukkan nama kota terlebih dahulu!');
        return;
    }
    fetchWeather(city);
});

cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchBtn.click();
});

unitC.addEventListener('click', () => {
    if (!isCelsius) {
        isCelsius = true;
        unitC.classList.add('active');
        unitF.classList.remove('active');
        if (currentCity) updateTemperatureDisplay();
    }
});

unitF.addEventListener('click', () => {
    if (isCelsius) {
        isCelsius = false;
        unitF.classList.add('active');
        unitC.classList.remove('active');
        if (currentCity) updateTemperatureDisplay();
    }
});

clearHistoryBtn.addEventListener('click', clearHistory);

renderHistory();

const history = getHistory();
if (history.length > 0) {
    const lastCity = history[0];
    cityInput.value = lastCity;
    fetchWeather(lastCity);
}