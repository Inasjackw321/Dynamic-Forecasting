#!/usr/bin/env python3
"""
Main CLI entry point for Dynamic Forecasting.
"""

import logging
import sys
from datetime import datetime
from typing import Optional

import click
from rich.console import Console
from rich.logging import RichHandler
from rich.panel import Panel
from rich.table import Table

from .forecast.generator import ForecastGenerator


# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",
    handlers=[RichHandler(rich_tracebacks=True)]
)

logger = logging.getLogger(__name__)
console = Console()


@click.group()
@click.option("--debug", is_flag=True, help="Enable debug logging")
@click.pass_context
def cli(ctx, debug):
    """
    Dynamic Forecasting - Automated NWS forecast generation.

    Uses Herbie and Open-Meteo to create comprehensive weather forecasts.
    """
    if debug:
        logging.getLogger().setLevel(logging.DEBUG)
        logger.debug("Debug logging enabled")

    ctx.ensure_object(dict)


@cli.command()
@click.option(
    "--lat",
    "--latitude",
    type=float,
    required=True,
    help="Latitude of location"
)
@click.option(
    "--lon",
    "--longitude",
    type=float,
    required=True,
    help="Longitude of location"
)
@click.option(
    "--name",
    type=str,
    default=None,
    help="Name of location"
)
@click.option(
    "--hours",
    type=int,
    default=48,
    help="Forecast hours (default: 48)"
)
@click.option(
    "--source",
    type=click.Choice(["both", "herbie", "openmeteo"], case_sensitive=False),
    default="both",
    help="Data source to use"
)
@click.option(
    "--model",
    type=click.Choice(["hrrr", "gfs", "nam", "rap"], case_sensitive=False),
    default="hrrr",
    help="Herbie model to use (default: hrrr)"
)
@click.option(
    "--timezone",
    type=str,
    default="America/New_York",
    help="Timezone for forecast times"
)
@click.option(
    "--output",
    type=click.Path(),
    default=None,
    help="Output file (default: print to console)"
)
@click.option(
    "--format",
    "output_format",
    type=click.Choice(["text", "json"], case_sensitive=False),
    default="text",
    help="Output format"
)
def forecast(
    lat: float,
    lon: float,
    name: Optional[str],
    hours: int,
    source: str,
    model: str,
    timezone: str,
    output: Optional[str],
    output_format: str
):
    """
    Generate a weather forecast for a specific location.

    Example:
        dynamic-forecast forecast --lat 40.7128 --lon -74.0060 --name "New York City"
    """
    try:
        # Determine which sources to use
        use_herbie = source in ["both", "herbie"]
        use_openmeteo = source in ["both", "openmeteo"]

        # Initialize generator
        console.print("\n[bold blue]Initializing forecast generator...[/bold blue]")
        generator = ForecastGenerator(
            use_herbie=use_herbie,
            use_openmeteo=use_openmeteo,
            herbie_model=model,
            timezone=timezone
        )

        # Generate forecast
        console.print(f"[bold blue]Generating {hours}-hour forecast...[/bold blue]\n")

        forecast_data = generator.generate_forecast(
            latitude=lat,
            longitude=lon,
            location_name=name,
            forecast_hours=hours
        )

        # Output results
        if output_format == "json":
            import json

            # Convert non-serializable objects
            output_data = {
                "location": forecast_data["location"],
                "issue_time": forecast_data["issue_time"].isoformat(),
                "forecast_hours": forecast_data["forecast_hours"],
                "periods": [
                    {
                        **period,
                        "time": period["time"].isoformat() if "time" in period else None
                    }
                    for period in forecast_data.get("periods", [])
                ]
            }

            json_output = json.dumps(output_data, indent=2)

            if output:
                with open(output, "w") as f:
                    f.write(json_output)
                console.print(f"[green]Forecast saved to {output}[/green]")
            else:
                console.print(json_output)

        else:  # text format
            formatted = forecast_data.get("formatted_forecast", "No forecast available")

            if output:
                with open(output, "w") as f:
                    f.write(formatted)
                console.print(f"\n[green]Forecast saved to {output}[/green]")
            else:
                console.print(Panel(formatted, title="Weather Forecast", border_style="blue"))

            # Show hourly table if available
            if "hourly_table" in forecast_data:
                console.print("\n[bold]24-Hour Hourly Forecast:[/bold]")
                console.print(forecast_data["hourly_table"])

        console.print("\n[bold green]✓ Forecast generated successfully![/bold green]\n")

    except Exception as e:
        console.print(f"\n[bold red]Error:[/bold red] {e}\n", style="red")
        logger.exception("Error generating forecast")
        sys.exit(1)


@cli.command()
@click.argument("locations_file", type=click.Path(exists=True))
@click.option(
    "--hours",
    type=int,
    default=48,
    help="Forecast hours (default: 48)"
)
@click.option(
    "--output-dir",
    type=click.Path(),
    default="./forecasts",
    help="Output directory for forecasts"
)
def batch(locations_file: str, hours: int, output_dir: str):
    """
    Generate forecasts for multiple locations from a file.

    LOCATIONS_FILE should be a YAML or JSON file with location data.

    Example locations.yaml:
    \b
        - name: "New York City"
          latitude: 40.7128
          longitude: -74.0060
        - name: "Los Angeles"
          latitude: 34.0522
          longitude: -118.2437
    """
    import os
    import yaml

    try:
        # Load locations
        with open(locations_file, "r") as f:
            if locations_file.endswith(".yaml") or locations_file.endswith(".yml"):
                locations = yaml.safe_load(f)
            else:
                import json
                locations = json.load(f)

        console.print(f"\n[bold blue]Generating forecasts for {len(locations)} locations...[/bold blue]\n")

        # Create output directory
        os.makedirs(output_dir, exist_ok=True)

        # Initialize generator
        generator = ForecastGenerator()

        # Generate forecasts
        for i, loc in enumerate(locations, 1):
            console.print(f"[{i}/{len(locations)}] {loc.get('name', 'Unknown')}...")

            try:
                forecast_data = generator.generate_forecast(
                    latitude=loc["latitude"],
                    longitude=loc["longitude"],
                    location_name=loc.get("name"),
                    forecast_hours=hours
                )

                # Save to file
                filename = f"{loc.get('name', f'location_{i}').replace(' ', '_')}.txt"
                filepath = os.path.join(output_dir, filename)

                with open(filepath, "w") as f:
                    f.write(forecast_data["formatted_forecast"])

                console.print(f"  [green]✓[/green] Saved to {filepath}")

            except Exception as e:
                console.print(f"  [red]✗[/red] Error: {e}")
                continue

        console.print(f"\n[bold green]Batch processing complete![/bold green]\n")

    except Exception as e:
        console.print(f"\n[bold red]Error:[/bold red] {e}\n", style="red")
        logger.exception("Error in batch processing")
        sys.exit(1)


@cli.command()
@click.option(
    "--model",
    type=click.Choice(["hrrr", "gfs", "nam", "rap"], case_sensitive=False),
    default="hrrr",
    help="Model to check"
)
def info(model: str):
    """
    Display information about available data sources.
    """
    try:
        console.print("\n[bold blue]Data Source Information[/bold blue]\n")

        # Herbie info
        table = Table(title="Herbie (NWS Models)")
        table.add_column("Property", style="cyan")
        table.add_column("Value", style="green")

        try:
            from .integrations.herbie_client import HerbieClient

            client = HerbieClient(model=model)
            info_data = client.get_model_info()

            table.add_row("Model", info_data.get("model", "N/A"))
            table.add_row("Product", info_data.get("product", "N/A"))
            table.add_row("Latest Run", str(info_data.get("latest_run", "N/A")))
            table.add_row("Status", "[green]Available[/green]")

        except Exception as e:
            table.add_row("Status", f"[red]Error: {e}[/red]")

        console.print(table)
        console.print()

        # Open-Meteo info
        table2 = Table(title="Open-Meteo API")
        table2.add_column("Property", style="cyan")
        table2.add_column("Value", style="green")

        try:
            from .integrations.openmeteo_client import OpenMeteoClient

            client = OpenMeteoClient()
            table2.add_row("Base URL", client.base_url)
            table2.add_row("Cache Enabled", "Yes")
            table2.add_row("Status", "[green]Available[/green]")

        except Exception as e:
            table2.add_row("Status", f"[red]Error: {e}[/red]")

        console.print(table2)
        console.print()

    except Exception as e:
        console.print(f"\n[bold red]Error:[/bold red] {e}\n", style="red")
        sys.exit(1)


if __name__ == "__main__":
    cli()
