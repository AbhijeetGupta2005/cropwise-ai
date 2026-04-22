const API_KEY = "7e20465abe70c32eb06449eda628112a"; // ← replace this

export const getWeatherData = async (city) => {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}`
    );

    const data = await res.json();

    if (data.cod !== 200) {
      throw new Error("City not found");
    }

    return {
      temperature: data.main.temp,
      humidity: data.main.humidity,
      rainfall: data.rain ? data.rain["1h"] || 0 : 0,
    };
  } catch (err) {
    console.error(err);
    return null;
  }
};