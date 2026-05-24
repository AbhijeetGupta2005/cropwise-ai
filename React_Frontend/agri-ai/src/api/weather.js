import api from "./recommenderapi";

export const getWeatherData = async (city) => {
  try {
    const response = await api.get("/weather", {
      params: { city },
    });

    return {
      temperature: response.data?.temperature,
      humidity: response.data?.humidity,
      rainfall: response.data?.rainfall ?? 0,
    };
  } catch (error) {
    console.error(error);
    return null;
  }
};
