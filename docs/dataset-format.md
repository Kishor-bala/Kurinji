# DATASET SPECIFICATION & SCHEMA
## Mother Tongue Recordings Log.xlsx

### 1. Sheet: `Recordings`
Contains 635 non-empty vocabulary entries.
- `Timestamp`: Datetime of recording event
- `Language`: `Badaga` or `Marwari`
- `Pack`: Folder partition (`P01`, `P02`, `P15`, `P17`, `P18`, `P19`, `P20`)
- `Word ID`: Unique external identifier (`W0001` through `W0900+`)
- `English`: Canonical English translation (`head`, `eye`, `water`, `sun`)
- `Tamil`: Canonical Tamil translation (`தலை`, `கண்`, `தண்ணீர்`, `சூரியன்`)
- `Speaker ID`: Scoped speaker reference (`S01`, `S02`, ...)
- `Status`: Recording lifecycle status (`recorded`)
- `File name`: Associated WAV binary filename (e.g. `BDG_P01_W0001_S01.wav`)
- `File link`: Source cloud storage link
- `Seconds`: Recorded audio duration
- `Spelling`: Native phonetic transliteration if available
- `Note`: Reviewer / speaker notes

### 2. Sheet: `Speakers`
Contains 22 verified native speakers across Badaga and Marwari communities.
- `Speaker ID`: Alphanumeric identifier (`S01`, `S02`, ...)
- `Language`: `Badaga` or `Marwari`
- `Name`: Speaker display name
- `Village / area`: Geographical origin (e.g., Ooty, Jakkanarai, Jodhpur, Khetri)
- `Gender`: `Male` or `Female`
- `Age band`: Demographic range (`18-30`, `31-50`, `51+`)
- `Consent`: Explicit consent flag (`Yes`)
- `Device`: Recording hardware hash
