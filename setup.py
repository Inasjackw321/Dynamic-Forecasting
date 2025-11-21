from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="dynamic-forecasting",
    version="0.1.0",
    author="Dynamic Forecasting Team",
    description="Automated NWS forecast generation using Herbie and Open-Meteo",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/Inasjackw321/Dynamic-Forecasting",
    package_dir={"": "src"},
    packages=find_packages(where="src"),
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Science/Research",
        "Topic :: Scientific/Engineering :: Atmospheric Science",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.9",
    install_requires=[
        "herbie-data>=2024.0.0",
        "openmeteo-requests>=1.1.0",
        "requests-cache>=1.1.0",
        "retry-requests>=2.0.0",
        "numpy>=1.24.0",
        "pandas>=2.0.0",
        "xarray>=2023.0.0",
        "click>=8.1.0",
        "rich>=13.0.0",
        "pyyaml>=6.0.0",
        "python-dotenv>=1.0.0",
    ],
    entry_points={
        "console_scripts": [
            "dynamic-forecast=dynamic_forecasting.main:cli",
        ],
    },
)
