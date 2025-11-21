# Dynamic Forecasting - Web Application

This is the web-based version of Dynamic Forecasting, providing NWS-style weather forecasts through an intuitive browser interface.

## Live Demo

Visit the live application: [https://inasjackw321.github.io/Dynamic-Forecasting/](https://inasjackw321.github.io/Dynamic-Forecasting/)

## Features

- **Interactive Interface**: Easy-to-use web interface for generating forecasts
- **Multiple Input Methods**:
  - Enter coordinates directly
  - Search for locations by name
  - Select from major US cities
- **Comprehensive Forecasts**:
  - Current conditions
  - 6-hour forecast periods
  - 24-hour detailed hourly forecast
  - Multi-day daily summary
- **Customizable Options**:
  - Choose forecast duration (24h to 7 days)
  - Select temperature unit (°F or °C)
- **Export & Share**:
  - Download forecasts as text or JSON
  - Share forecast links with others
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Technology

Built with:
- Vanilla JavaScript (no frameworks required)
- Open-Meteo API for weather data
- Modern CSS with responsive design
- GitHub Pages for hosting

## Local Development

To run locally:

1. Clone the repository:
   ```bash
   git clone https://github.com/Inasjackw321/Dynamic-Forecasting.git
   cd Dynamic-Forecasting/docs
   ```

2. Start a local server:
   ```bash
   # Using Python 3
   python -m http.server 8000

   # Using Node.js
   npx serve

   # Using PHP
   php -S localhost:8000
   ```

3. Open http://localhost:8000 in your browser

## API Usage

The web app uses the Open-Meteo API, which is free and requires no authentication:
- Weather forecasts: https://api.open-meteo.com/v1/forecast
- Geocoding: https://geocoding-api.open-meteo.com/v1/search

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS Safari, Chrome Mobile

## Contributing

Found a bug or have a feature request? Please open an issue on GitHub.

## License

MIT License - see [LICENSE](../LICENSE) file for details.

## Credits

- Weather data: [Open-Meteo](https://open-meteo.com/)
- Icons: Emoji weather symbols
- Fonts: Inter by Google Fonts
