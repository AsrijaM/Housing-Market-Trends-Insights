#!/usr/bin/env python3
"""
Housing Market Trends: Data Preparation Script
Author: Antigravity Code Assistant
Description: Prepares and cleans raw housing sales data. 
             If no raw data exists, it generates a realistic sample dataset
             for testing. It then cleans it, performs feature engineering,
             and exports the structured output for Tableau ingestion.
"""

import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def generate_mock_raw_data(filepath, n_samples=1000):
    """Generates a realistic mock dataset simulating the King County House Sales data."""
    print(f"Generating {n_samples} mock housing records at {filepath}...")
    np.random.seed(42)
    
    # Generate dates over the last 2 years
    start_date = datetime.now() - timedelta(days=730)
    dates = [start_date + timedelta(days=int(np.random.randint(0, 730))) for _ in range(n_samples)]
    
    # Generate features
    bedrooms = np.random.choice([1, 2, 3, 4, 5, 6], size=n_samples, p=[0.05, 0.20, 0.45, 0.22, 0.06, 0.02])
    # Bathrooms: bedrooms determine bathrooms generally
    bathrooms = np.round(bedrooms * 0.5 + np.random.choice([0, 0.25, 0.5, 0.75], size=n_samples, p=[0.2, 0.3, 0.4, 0.1]), 2)
    floors = np.random.choice([1.0, 1.5, 2.0, 2.5, 3.0], size=n_samples, p=[0.5, 0.1, 0.35, 0.02, 0.03])
    
    yr_built = np.random.randint(1900, 2021, size=n_samples)
    
    # Renovation: ~15% of homes are renovated
    is_renovated = np.random.choice([0, 1], size=n_samples, p=[0.85, 0.15])
    yr_renovated = []
    for i in range(n_samples):
        if is_renovated[i] == 1:
            # Renovated after build year
            yr_renovated.append(np.random.randint(max(yr_built[i], 1980), 2025))
        else:
            yr_renovated.append(0)
    yr_renovated = np.array(yr_renovated)
    
    # Living area and lot size
    sqft_living = bedrooms * 500 + np.random.randint(200, 1500, size=n_samples)
    sqft_lot = sqft_living * np.random.choice([2, 3, 5, 8], size=n_samples) + np.random.randint(100, 5000, size=n_samples)
    
    # Waterfront and views
    waterfront = np.random.choice([0, 1], size=n_samples, p=[0.98, 0.02])
    view_rating = np.random.choice([0, 1, 2, 3, 4], size=n_samples, p=[0.90, 0.04, 0.03, 0.02, 0.01])
    condition_rating = np.random.choice([1, 2, 3, 4, 5], size=n_samples, p=[0.01, 0.05, 0.65, 0.22, 0.07])
    grade = np.random.choice([4, 5, 6, 7, 8, 9, 10, 11, 12], size=n_samples, p=[0.01, 0.03, 0.15, 0.50, 0.20, 0.07, 0.03, 0.008, 0.002])
    
    # Calculate price based on features with some random noise
    # Base price: $100k + $150 per sqft living + $10 per sqft lot
    # Premium for bathrooms ($20k each), bedrooms ($15k each), floors ($10k each)
    # Huge premium for waterfront ($300k), view rating ($30k per star), grade ($50k per point above 6)
    # Age discount (-$1.5k per year since built)
    # Renovation premium (+$80k if renovated, depreciating by -$2.5k per year since renovation)
    price = 100000 + sqft_living * 180 + sqft_lot * 5 + bathrooms * 25000 + bedrooms * 12000 + floors * 15000
    price += waterfront * 350000 + view_rating * 40000 + (grade - 6) * 60000
    
    for i in range(n_samples):
        age_at_sale = dates[i].year - yr_built[i]
        price[i] -= age_at_sale * 1200 # Age depreciation
        
        if yr_renovated[i] > 0:
            renovation_age = dates[i].year - yr_renovated[i]
            # Renovation appreciation minus depreciation of renovation
            price[i] += max(15000, 95000 - renovation_age * 3000)
            
        # Add random noise (+/- 15%)
        noise = np.random.uniform(-0.15, 0.15)
        price[i] = round(price[i] * (1 + noise), -2)
        
    # Ensure minimum price limits
    price = np.clip(price, 80000, 5000000)
    
    # Location coordinates around Seattle area (lat 47.5, lon -122.3)
    lat = 47.5 + np.random.normal(0, 0.15, n_samples)
    long = -122.3 + np.random.normal(0, 0.15, n_samples)
    zipcodes = np.random.choice(['98101', '98103', '98105', '98115', '98004', '98006', '98052', '98033'], size=n_samples)
    
    # Introduce some missing/dirty data for cleaner demonstration
    # 2% of bedrooms are null
    bedrooms_float = bedrooms.astype(float)
    bedrooms_float[np.random.choice(n_samples, int(n_samples * 0.02), replace=False)] = np.nan
    
    # 1.5% of bathrooms are null
    bathrooms_float = bathrooms.astype(float)
    bathrooms_float[np.random.choice(n_samples, int(n_samples * 0.015), replace=False)] = np.nan

    df = pd.DataFrame({
        'id': range(100000, 100000 + n_samples),
        'sale_date': [d.strftime('%Y-%m-%d %H:%M:%S') for d in dates],
        'price': price,
        'bedrooms': bedrooms_float,
        'bathrooms': bathrooms_float,
        'sqft_living': sqft_living,
        'sqft_lot': sqft_lot,
        'floors': floors,
        'waterfront': waterfront,
        'view_rating': view_rating,
        'condition_rating': condition_rating,
        'grade': grade,
        'yr_built': yr_built,
        'yr_renovated': yr_renovated,
        'zipcode': zipcodes,
        'lat': lat,
        'long': long
    })
    
    df.to_csv(filepath, index=False)
    print(f"Mock dataset created successfully at {filepath}.")

def clean_and_prepare_data(raw_path, clean_path):
    """Loads raw housing sales data, cleans it, calculates housing metrics and saves clean CSV."""
    if not os.path.exists(raw_path):
        print(f"Raw data file not found at {raw_path}.")
        generate_mock_raw_data(raw_path)
        
    print(f"Loading raw data from {raw_path}...")
    df = pd.read_csv(raw_path)
    
    print(f"Initial raw dataset shape: {df.shape}")
    
    # 1. Handle Missing Values
    # Impute missing bedrooms with median
    if df['bedrooms'].isnull().sum() > 0:
        median_bedrooms = df['bedrooms'].median()
        print(f"Imputing {df['bedrooms'].isnull().sum()} missing bedrooms with median: {median_bedrooms}")
        df['bedrooms'] = df['bedrooms'].fillna(median_bedrooms).astype(int)
    else:
        df['bedrooms'] = df['bedrooms'].astype(int)
        
    # Impute missing bathrooms with median
    if df['bathrooms'].isnull().sum() > 0:
        median_bathrooms = df['bathrooms'].median()
        print(f"Imputing {df['bathrooms'].isnull().sum()} missing bathrooms with median: {median_bathrooms}")
        df['bathrooms'] = df['bathrooms'].fillna(median_bathrooms)

    # Convert sale_date to datetime object
    df['sale_date'] = pd.to_datetime(df['sale_date'])
    df['sale_year'] = df['sale_date'].dt.year
    
    # 2. Data Filtering & Outlier Removal
    # Keep only records where price is positive, and structural elements are realistic
    initial_count = len(df)
    df = df[(df['price'] > 0) & (df['bedrooms'] > 0) & (df['bedrooms'] < 10) & (df['bathrooms'] > 0)]
    dropped_count = initial_count - len(df)
    if dropped_count > 0:
        print(f"Dropped {dropped_count} invalid outlier/dirty records.")

    # 3. Feature Engineering (Derived Variables)
    # A. House Age at the time of sale
    df['house_age'] = df['sale_year'] - df['yr_built']
    # If negative (e.g. sale date year before build year due to pre-sale/timing), set to 0
    df['house_age'] = df['house_age'].clip(lower=0)
    
    # B. Renovation Status Flag
    df['is_renovated'] = (df['yr_renovated'] > 0).astype(int)
    
    # C. Years Since Renovation (if renovated, else years since built)
    df['years_since_renovation'] = np.where(
        df['yr_renovated'] > 0,
        df['sale_year'] - df['yr_renovated'],
        df['sale_year'] - df['yr_built']
    )
    df['years_since_renovation'] = df['years_since_renovation'].clip(lower=0)
    
    # D. Renovation Category
    def get_renovation_category(row):
        if row['yr_renovated'] == 0:
            return 'Never Renovated'
        age_renov = row['sale_year'] - row['yr_renovated']
        if age_renov <= 5:
            return 'Recently Renovated (<5 yrs)'
        elif age_renov <= 15:
            return 'Moderately Renovated (5-15 yrs)'
        else:
            return 'Long-term Renovated (>15 yrs)'
            
    df['renovation_category'] = df.apply(get_renovation_category, axis=1)
    
    # E. Age Group Category
    def get_age_group(age):
        if age <= 5:
            return 'New Construction (<5 yrs)'
        elif age <= 15:
            return 'Modern (5-15 yrs)'
        elif age <= 30:
            return 'Established (15-30 yrs)'
        elif age <= 50:
            return 'Mid-Century (30-50 yrs)'
        else:
            return 'Vintage (>50 yrs)'
            
    df['age_group'] = df['house_age'].apply(get_age_group)

    # Save cleaned data
    df.to_csv(clean_path, index=False)
    print(f"Cleaned dataset saved successfully to {clean_path}.")
    print(f"Final dataset shape: {df.shape}\n")
    
    # 4. Generate Summary Analytics for Verification
    print("=== SUMMARY METRICS ===")
    print(f"Average Sale Price: ${df['price'].mean():,.2f}")
    print(f"Median Sale Price: ${df['price'].median():,.2f}")
    print(f"Average House Age at Sale: {df['house_age'].mean():.1f} years")
    print(f"Renovated Properties Percentage: {df['is_renovated'].mean() * 100:.1f}%")
    print("\nAverage Price by Renovation Status:")
    print(df.groupby('renovation_category')['price'].agg(['count', 'mean', 'median']))
    print("\nAverage Price by Age Group:")
    print(df.groupby('age_group')['price'].agg(['count', 'mean', 'median']))
    
if __name__ == '__main__':
    raw_csv = 'raw_house_sales.csv'
    clean_csv = 'clean_house_sales.csv'
    clean_and_prepare_data(raw_csv, clean_csv)
