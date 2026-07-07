-- ==============================================================================
-- DATABASE SCHEMA & DATA EXTRACTION SCRIPT
-- Project: Visualizing Housing Market Trends (Tableau Analysis)
-- Target DBMS: PostgreSQL / MySQL
-- Description: Extracts raw residential sales records and computes key metrics
--              for Tableau visualization (e.g., House Age, Years Since Renovation).
-- ==============================================================================

-- 1. Table Schema Definition (For Reference)
CREATE TABLE IF NOT EXISTS staging_house_sales (
    id BIGINT PRIMARY KEY,
    sale_date TIMESTAMP NOT NULL,
    price DECIMAL(12, 2) NOT NULL,
    bedrooms INT,
    bathrooms DECIMAL(3, 2),
    sqft_living INT,
    sqft_lot INT,
    floors DECIMAL(2, 1),
    waterfront INT DEFAULT 0,
    view_rating INT DEFAULT 0,
    condition_rating INT DEFAULT 3,
    grade INT DEFAULT 7,
    sqft_above INT,
    sqft_basement INT,
    yr_built INT NOT NULL,
    yr_renovated INT DEFAULT 0,
    zipcode VARCHAR(10),
    lat DECIMAL(9, 6),
    long DECIMAL(9, 6),
    sqft_living15 INT,
    sqft_lot15 INT
);

-- Indexing for performance optimization during Tableau extracts
CREATE INDEX IF NOT EXISTS idx_sales_date_price ON staging_house_sales (sale_date, price);
CREATE INDEX IF NOT EXISTS idx_sales_features ON staging_house_sales (bedrooms, bathrooms, floors);

-- 2. Data Extraction and Transformation Query
-- This query prepares the final view imported into Tableau extracts.
-- It pre-calculates structural age features to reduce Tableau computational overhead.
SELECT 
    id,
    sale_date,
    -- Extract sale year for age calculations
    EXTRACT(YEAR FROM sale_date) AS sale_year,
    price,
    bedrooms,
    bathrooms,
    floors,
    sqft_living,
    sqft_lot,
    waterfront,
    view_rating,
    condition_rating,
    grade,
    yr_built,
    yr_renovated,
    
    -- Calculated Feature 1: House Age at the time of sale
    (EXTRACT(YEAR FROM sale_date) - yr_built) AS house_age,
    
    -- Calculated Feature 2: Renovation Flag (binary)
    CASE 
        WHEN yr_renovated > 0 THEN 1 
        ELSE 0 
    END AS is_renovated,
    
    -- Calculated Feature 3: Years since last renovation at time of sale
    -- If never renovated, defaults to house_age (representing years since built)
    CASE 
        WHEN yr_renovated > 0 THEN (EXTRACT(YEAR FROM sale_date) - yr_renovated)
        ELSE (EXTRACT(YEAR FROM sale_date) - yr_built)
    END AS years_since_renovation,
    
    -- Calculated Feature 4: Renovation Status Category
    CASE 
        WHEN yr_renovated = 0 THEN 'Never Renovated'
        WHEN (EXTRACT(YEAR FROM sale_date) - yr_renovated) <= 5 THEN 'Recently Renovated (<5 yrs)'
        WHEN (EXTRACT(YEAR FROM sale_date) - yr_renovated) <= 15 THEN 'Moderately Renovated (5-15 yrs)'
        ELSE 'Long-term Renovated (>15 yrs)'
    END AS renovation_category,
    
    zipcode,
    lat,
    long
FROM 
    staging_house_sales
WHERE 
    price > 0 
    AND bedrooms IS NOT NULL 
    AND bathrooms IS NOT NULL
ORDER BY 
    sale_date DESC;
