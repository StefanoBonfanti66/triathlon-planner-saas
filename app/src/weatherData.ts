export const regionalWeather: Record<string, Record<number, { temp: number, rain: number }>> = {
  "Lombardia": {
    1: { temp: 3, rain: 15 }, 2: { temp: 5, rain: 12 }, 3: { temp: 10, rain: 18 }, 4: { temp: 14, rain: 22 },
    5: { temp: 19, rain: 25 }, 6: { temp: 23, rain: 20 }, 7: { temp: 26, rain: 15 }, 8: { temp: 25, rain: 18 },
    9: { temp: 20, rain: 22 }, 10: { temp: 14, rain: 25 }, 11: { temp: 8, rain: 20 }, 12: { temp: 4, rain: 15 }
  },
  "Sicilia": {
    1: { temp: 11, rain: 10 }, 2: { temp: 12, rain: 8 }, 3: { temp: 14, rain: 10 }, 4: { temp: 17, rain: 12 },
    5: { temp: 21, rain: 8 }, 6: { temp: 26, rain: 4 }, 7: { temp: 29, rain: 2 }, 8: { temp: 30, rain: 3 },
    9: { temp: 26, rain: 10 }, 10: { temp: 21, rain: 15 }, 11: { temp: 16, rain: 18 }, 12: { temp: 13, rain: 15 }
  },
  "Trentino-Alto Adige/Südtirol": {
    1: { temp: -1, rain: 10 }, 2: { temp: 1, rain: 8 }, 3: { temp: 6, rain: 12 }, 4: { temp: 11, rain: 18 },
    5: { temp: 16, rain: 22 }, 6: { temp: 20, rain: 25 }, 7: { temp: 23, rain: 28 }, 8: { temp: 22, rain: 25 },
    9: { temp: 17, rain: 18 }, 10: { temp: 11, rain: 15 }, 11: { temp: 5, rain: 12 }, 12: { temp: 0, rain: 10 }
  },
  "Veneto": {
    1: { temp: 3, rain: 12 }, 2: { temp: 5, rain: 10 }, 3: { temp: 10, rain: 15 }, 4: { temp: 14, rain: 20 },
    5: { temp: 19, rain: 22 }, 6: { temp: 23, rain: 25 }, 7: { temp: 26, rain: 20 }, 8: { temp: 25, rain: 22 },
    9: { temp: 21, rain: 18 }, 10: { temp: 15, rain: 25 }, 11: { temp: 9, rain: 20 }, 12: { temp: 4, rain: 15 }
  },
  "Toscana": {
    1: { temp: 7, rain: 15 }, 2: { temp: 8, rain: 12 }, 3: { temp: 11, rain: 15 }, 4: { temp: 15, rain: 18 },
    5: { temp: 20, rain: 15 }, 6: { temp: 24, rain: 10 }, 7: { temp: 27, rain: 5 }, 8: { temp: 27, rain: 8 },
    9: { temp: 23, rain: 15 }, 10: { temp: 18, rain: 22 }, 11: { temp: 12, rain: 25 }, 12: { temp: 8, rain: 18 }
  },
  "Emilia-Romagna": {
    1: { temp: 4, rain: 12 }, 2: { temp: 6, rain: 10 }, 3: { temp: 11, rain: 15 }, 4: { temp: 15, rain: 20 },
    5: { temp: 20, rain: 18 }, 6: { temp: 24, rain: 15 }, 7: { temp: 27, rain: 10 }, 8: { temp: 27, rain: 12 },
    9: { temp: 23, rain: 18 }, 10: { temp: 17, rain: 22 }, 11: { temp: 10, rain: 25 }, 12: { temp: 5, rain: 15 }
  },
  "Lazio": {
    1: { temp: 8, rain: 18 }, 2: { temp: 9, rain: 15 }, 3: { temp: 12, rain: 15 }, 4: { temp: 15, rain: 12 },
    5: { temp: 20, rain: 10 }, 6: { temp: 24, rain: 5 }, 7: { temp: 27, rain: 3 }, 8: { temp: 27, rain: 5 },
    9: { temp: 24, rain: 12 }, 10: { temp: 19, rain: 20 }, 11: { temp: 13, rain: 25 }, 12: { temp: 9, rain: 20 }
  }
};

export const getWeatherData = (region: string, dateStr: string) => {
  const month = parseInt(dateStr.split("-")[1]);
  // Fallback se la regione specifica non è mappata (media centro italia)
  const stats = regionalWeather[region] || regionalWeather["Toscana"];
  return stats[month];
};
