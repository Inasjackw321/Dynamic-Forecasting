# Dynamic Forecasting

Automated NWS-style weather forecast generation using Herbie and Open-Meteo.

## 🌐 Web Application

**Try it now:** [https://inasjackw321.github.io/Dynamic-Forecasting/](https://inasjackw321.github.io/Dynamic-Forecasting/)

The easiest way to use Dynamic Forecasting is through our web interface. No installation required - just open your browser and start generating forecasts!

## Overview

Dynamic Forecasting is a weather forecasting system that combines data from multiple sources to generate comprehensive, NWS-style weather forecasts. Available as both a **web application** and a **Python CLI tool**:

- **Herbie**: Access to NWS numerical weather prediction models (HRRR, GFS, NAM, RAP)
- **Open-Meteo**: Free weather forecast API with global coverage

## Features

### Web Application
- 🌐 **No Installation**: Use directly in your browser
- 🎨 **Interactive UI**: Beautiful, responsive interface for all devices
- 📍 **Location Search**: Find locations by name or coordinates
- 🏙️ **Quick Access**: Preset buttons for major US cities
- 📥 **Export Options**: Download forecasts as text or JSON
- 🔗 **Shareable Links**: Share forecasts with others

### Python CLI
- 🌤️ **Multi-Source Data**: Combines Herbie (NWS models) and Open-Meteo for comprehensive forecasts
- 📊 **NWS-Style Formatting**: Professional forecast output similar to National Weather Service
- 🎯 **Point Forecasts**: Get detailed forecasts for specific coordinates
- 📍 **Batch Processing**: Generate forecasts for multiple locations at once
- 🔧 **Flexible Configuration**: Choose data sources, models, and output formats
- 💾 **Smart Caching**: Reduces API calls and improves performance
- 🖥️ **CLI Interface**: Easy-to-use command-line interface with rich output

## Installation

### Web Application (Recommended for Most Users)

No installation needed! Visit: [https://inasjackw321.github.io/Dynamic-Forecasting/](https://inasjackw321.github.io/Dynamic-Forecasting/)

### Python CLI Installation

#### Prerequisites

- Python 3.9 or higher
- pip package manager

#### Install from source

```bash
# Clone the repository
git clone https://github.com/Inasjackw321/Dynamic-Forecasting.git
cd Dynamic-Forecasting

# Install dependencies
pip install -r requirements.txt

# Install the package
pip install -e .
```

## Quick Start

### Generate a simple forecast

```bash
dynamic-forecast forecast --lat 40.7128 --lon -74.0060 --name "New York City"
```

### Generate a 7-day forecast using GFS model

```bash
dynamic-forecast forecast \
  --lat 34.0522 \
  --lon -118.2437 \
  --name "Los Angeles" \
  --hours 168 \
  --model gfs
```

### Use only Open-Meteo (faster, no model data download required)

```bash
dynamic-forecast forecast \
  --lat 41.8781 \
  --lon -87.6298 \
  --name "Chicago" \
  --source openmeteo
```

### Save forecast to a file

```bash
dynamic-forecast forecast \
  --lat 29.7604 \
  --lon -95.3698 \
  --name "Houston" \
  --output houston_forecast.txt
```

### Get JSON output

```bash
dynamic-forecast forecast \
  --lat 37.7749 \
  --lon -122.4194 \
  --name "San Francisco" \
  --format json \
  --output sf_forecast.json
```

## Usage

### CLI Commands

#### forecast

Generate a weather forecast for a specific location.

```bash
dynamic-forecast forecast [OPTIONS]
```

**Options:**
- `--lat, --latitude FLOAT`: Latitude of location (required)
- `--lon, --longitude FLOAT`: Longitude of location (required)
- `--name TEXT`: Name of location (optional)
- `--hours INTEGER`: Forecast hours (default: 48)
- `--source [both|herbie|openmeteo]`: Data source to use (default: both)
- `--model [hrrr|gfs|nam|rap]`: Herbie model to use (default: hrrr)
- `--timezone TEXT`: Timezone for forecast times (default: America/New_York)
- `--output PATH`: Output file (default: print to console)
- `--format [text|json]`: Output format (default: text)
- `--debug`: Enable debug logging

#### batch

Generate forecasts for multiple locations from a file.

```bash
dynamic-forecast batch LOCATIONS_FILE [OPTIONS]
```

**Options:**
- `--hours INTEGER`: Forecast hours (default: 48)
- `--output-dir PATH`: Output directory for forecasts (default: ./forecasts)

**Example locations.yaml:**

```yaml
- name: "New York City"
  latitude: 40.7128
  longitude: -74.0060

- name: "Los Angeles"
  latitude: 34.0522
  longitude: -118.2437

- name: "Chicago"
  latitude: 41.8781
  longitude: -87.6298
```

**Run batch processing:**

```bash
dynamic-forecast batch locations.yaml --hours 72 --output-dir ./my_forecasts
```

#### info

Display information about available data sources.

```bash
dynamic-forecast info [OPTIONS]
```

**Options:**
- `--model [hrrr|gfs|nam|rap]`: Model to check (default: hrrr)

## Python API

You can also use Dynamic Forecasting as a Python library:

```python
from dynamic_forecasting import ForecastGenerator

# Initialize generator
generator = ForecastGenerator(
    use_herbie=True,
    use_openmeteo=True,
    herbie_model="hrrr"
)

# Generate forecast
forecast = generator.generate_forecast(
    latitude=40.7128,
    longitude=-74.0060,
    location_name="New York City",
    forecast_hours=48
)

# Access formatted forecast
print(forecast["formatted_forecast"])

# Access raw data
hourly_data = forecast["openmeteo"]["hourly"]
periods = forecast["periods"]
```

### Generate forecasts for multiple locations

```python
locations = [
    {"latitude": 40.7128, "longitude": -74.0060, "name": "New York"},
    {"latitude": 34.0522, "longitude": -118.2437, "name": "Los Angeles"},
]

forecasts = generator.generate_multi_location(locations, forecast_hours=48)

for forecast in forecasts:
    print(forecast["formatted_forecast"])
    print("\n" + "="*70 + "\n")
```

## Data Sources

### Herbie (NWS Models)

Herbie provides access to NOAA's numerical weather prediction models:

- **HRRR** (High-Resolution Rapid Refresh): 3km resolution, hourly updates, CONUS coverage
- **GFS** (Global Forecast System): 0.25° resolution, global coverage, 16-day forecasts
- **NAM** (North American Mesoscale): 12km resolution, North America coverage
- **RAP** (Rapid Refresh): 13km resolution, hourly updates, North America coverage

**Pros:**
- High-resolution data from official NWS models
- Detailed atmospheric variables
- Direct access to model output

**Cons:**
- Requires downloading GRIB2 files (can be slow)
- Limited to model coverage areas
- Requires more storage and processing

### Open-Meteo

Free weather API providing forecasts from various sources:

**Pros:**
- Fast and reliable API
- Global coverage
- No authentication required
- Automatic model selection (best available for location)
- Built-in caching

**Cons:**
- Less control over specific model selection
- API rate limits (free tier)

## Configuration

### Environment Variables

Create a `.env` file in your project directory:

```bash
# Timezone
FORECAST_TIMEZONE=America/New_York

# Default forecast hours
DEFAULT_FORECAST_HOURS=48

# Herbie settings
HERBIE_MODEL=hrrr
HERBIE_CACHE_DIR=./cache/herbie

# Open-Meteo settings
OPENMETEO_CACHE_EXPIRE_HOURS=1
```

## Development

### Running tests

```bash
pytest tests/
```

### Code formatting

```bash
black src/
```

### Type checking

```bash
mypy src/
```

## Examples

See the `examples/` directory for more usage examples:

- `simple_forecast.py`: Basic forecast generation
- `batch_forecasts.py`: Process multiple locations
- `custom_formatting.py`: Customize forecast output
- `compare_sources.py`: Compare Herbie vs Open-Meteo data

## Troubleshooting

### Herbie downloads are slow

Herbie downloads GRIB2 files which can be large. Consider:
- Using `--source openmeteo` for faster results
- Enabling caching with `HERBIE_CACHE_DIR`
- Using a faster internet connection
- Requesting fewer variables or smaller forecast windows

### "No module named 'herbie'"

Install the herbie-data package:
```bash
pip install herbie-data
```

### Open-Meteo API errors

Check:
- Your internet connection
- API rate limits (free tier has limits)
- Coordinate validity (must be -90 to 90 for lat, -180 to 180 for lon)

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- **Herbie**: Developed by Brian Blaylock - https://github.com/blaylockbk/Herbie
- **Open-Meteo**: Free weather API - https://open-meteo.com/
- **NOAA/NWS**: For providing weather model data

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review examples in the `examples/` directory

## Roadmap

- [ ] Add support for more weather models
- [ ] Implement forecast verification
- [ ] Add graphical output (maps, charts)
- [ ] Support for ensemble forecasts
- [ ] Web interface
- [ ] Docker containerization
- [ ] Automated forecast scheduling

---

**Dynamic Forecasting** - Bringing professional weather forecasting to everyone.
