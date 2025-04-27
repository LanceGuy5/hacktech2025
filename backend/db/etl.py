# etl.py
import pandas as pd
from sqlalchemy import create_engine
import numpy as np

# 1. Columns to keep (original names)
keep = [
    'ID',
    'MNAME',
    'MLOCADDR',
    'MLOCCITY',
    'MSTATE',
    'MLOCZIP',
    'LAT',
    'LONG',
    'EMDEPHOS',
    'TRAUMHOS',
    'TRAUML90',
    'HOSPBD',
    'YEAR',
    'CTSCNHOS',
    'MRIHOS',
    'PETCTHOS',
    'ULTSNHOS',
    'BRNBD',
    'MSICBD',
    'NICBD',
    'PEDICBD'
]

# 2. Load & filter
aha_df = pd.read_csv(
    'data/raw/albert_aha.csv',
    usecols=keep,
    encoding='latin1'
)
aha_df = aha_df[aha_df['YEAR'] == 2023]

# 3. Rename to best-practice snake_case
aha_df = aha_df.rename(columns={
    'ID':                 'hospital_id',
    'MNAME':              'name',
    'MLOCADDR':           'address',
    'MLOCCITY':           'city',
    'MSTATE':             'state',
    'MLOCZIP':            'zip_code',
    'LAT':                'latitude',
    'LONG':               'longitude',
    'EMDEPHOS':           'has_ed',
    'TRAUMHOS':           'is_trauma_center',
    'TRAUML90':           'trauma_level',
    'HOSPBD':             'total_beds',
    'YEAR':               'year',
    'CTSCNHOS':           'has_ct',
    'MRIHOS':             'has_mri',
    'PETCTHOS':           'has_pet_ct',
    'ULTSNHOS':           'has_ultrasound',
    'BRNBD':              'burn_care_beds',
    'MSICBD':             'icu_med_surg_beds',
    'NICBD':              'icu_neonatal_beds',
    'PEDICBD':            'icu_pediatric_beds'
})

# 1. Ensure reproducibility
np.random.seed(42)

# 2. Specify which bed types to simulate load for
bed_cols = [
    'total_beds',
    'icu_med_surg_beds',
    'icu_neonatal_beds',
    'icu_pediatric_beds',
    'burn_care_beds'
]

# 3. Generate synthetic occupancy data
for col in bed_cols:
    # fill na with 0
    aha_df[col] = aha_df[col].fillna(0)
    # generate random percentage between 20% and 95%
    pct = np.clip(np.random.normal(loc=0.6, scale=0.15, size=len(aha_df)), 0.2, 0.95)
    # Create a new column with the calculated load
    load = (aha_df[col] * pct).round()
    aha_df[f'{col}_load'] = load.astype(int)

# 4. Persist to MySQL
engine = create_engine("mysql+pymysql://root:pass@localhost:3306/hospitals")
aha_df.to_sql('aha_hospitals', engine, if_exists='replace', index=False)
print("✅ ETL complete: 'aha_hospitals' written to MySQL")
