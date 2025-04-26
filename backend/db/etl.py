# etl.py
import pandas as pd
from sqlalchemy import create_engine

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
    'MSCTHOS',
    'MSCTGHOS',
    'MRIHOS',
    'PETCTHOS',
    'SPECTHOS',
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
    'CTSCNHOS':           'ct_scanners',
    'MSCTHOS':            'ct_multislice_lt64',
    'MSCTGHOS':           'ct_multislice_gte64',
    'MRIHOS':             'mri_units',
    'PETCTHOS':           'pet_ct_units',
    'SPECTHOS':           'spect_units',
    'ULTSNHOS':           'ultrasound_units',
    'BRNBD':              'burn_care_beds',
    'MSICBD':             'icu_med_surg_beds',
    'NICBD':              'icu_neonatal_beds',
    'PEDICBD':            'icu_pediatric_beds'
})

# 4. Persist to MySQL
engine = create_engine("mysql+pymysql://root:pass@localhost:3306/hospitals")
aha_df.to_sql('aha_hospitals', engine, if_exists='replace', index=False)
print("✅ ETL complete: 'aha_hospitals' written to MySQL")
