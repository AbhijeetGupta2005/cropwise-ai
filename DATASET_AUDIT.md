# Dataset Audit and Model Alignment

This note records the Step 6 audit of the datasets currently present in:

- [datasets/Crop_recommendation.csv](C:\Users\HP\Downloads\AgriAI_WebApp-main\AgriAI_WebApp-main\datasets\Crop_recommendation.csv)
- [datasets/Fertilizer Prediction.csv](C:\Users\HP\Downloads\AgriAI_WebApp-main\AgriAI_WebApp-main\datasets\Fertilizer Prediction.csv)

It focuses on dataset quality, class balance, and whether the live app inputs align with the saved model pipelines.

## 1. Crop dataset

- File: `Crop_recommendation.csv`
- Shape: `2200 rows x 8 columns`
- Columns:
  - `N`
  - `P`
  - `K`
  - `temperature`
  - `humidity`
  - `ph`
  - `rainfall`
  - `label`

### Quality summary

- Missing values: `0`
- Duplicate rows: `0`
- Target labels: `22`
- Class balance: perfectly balanced at `100 rows per crop`

### Numeric range summary

- `N`: `0` to `140`
- `P`: `5` to `145`
- `K`: `5` to `205`
- `temperature`: `8.826` to `43.675`
- `humidity`: `14.258` to `99.982`
- `ph`: `3.505` to `9.935`
- `rainfall`: `20.211` to `298.560`

### Important finding

The backend originally validated `P` only up to `140`, but the dataset includes values up to `145`.

- Rows with `P > 140`: `44`

This was a real inference mismatch, so the backend validation range was updated in:

- [Flask_API/app.py](C:\Users\HP\Downloads\AgriAI_WebApp-main\AgriAI_WebApp-main\Flask_API\app.py)

from:

- `P: (0, 140)`

to:

- `P: (0, 145)`

That brings runtime validation closer to the training data boundary.

## 2. Fertilizer dataset

- File: `Fertilizer Prediction.csv`
- Shape: `99 rows x 9 columns`
- Columns:
  - `Temperature`
  - `Humidity`
  - `Moisture`
  - `Soil Type`
  - `Crop Type`
  - `Nitrogen`
  - `Potassium`
  - `Phosphorous`
  - `Fertilizer Name`

### Quality summary

- Missing values: `0`
- Duplicate rows: `0`
- Target labels: `7`

### Target balance

- `Urea`: `22`
- `DAP`: `18`
- `28-28`: `17`
- `14-35-14`: `14`
- `20-20`: `14`
- `17-17-17`: `7`
- `10-26-26`: `7`

### Key observation

The fertilizer dataset is clean, but it is small.

- Only `99` total rows
- Only `7` fertilizer classes
- Some classes have only `7` samples

This makes the fertilizer side more vulnerable to overfitting and less reliable as a general-purpose model than the crop side.

## 3. Fertilizer category alignment

### Soil categories in dataset

- `Sandy`
- `Loamy`
- `Black`
- `Red`
- `Clayey`

### Crop categories in dataset

- `Maize`
- `Sugarcane`
- `Cotton`
- `Tobacco`
- `Paddy`
- `Barley`
- `Wheat`
- `Millets`
- `Oil seeds`
- `Pulses`
- `Ground Nuts`

### Alignment result

The live frontend uses category mapping in:

- [FertilizerRecommender.js](C:\Users\HP\Downloads\AgriAI_WebApp-main\AgriAI_WebApp-main\React_Frontend\agri-ai\src\components\FertilizerRecommender.js)

and sends encoded numeric values for:

- `Soil Type`
- `Crop Type`

The saved fertilizer model files are calibrated estimators built on numeric pipelines, so the current inference pattern is consistent with the way the deployed models are being used.

## 4. Saved model audit

The deployed model files in `Flask_API/models/...` were inspected.

### Crop models

- `xgb_pipeline.joblib`: `CalibratedClassifierCV`
- `rf_pipeline.joblib`: `CalibratedClassifierCV`
- `knn_pipeline.joblib`: `Pipeline(StandardScaler -> KNeighborsClassifier)`

### Fertilizer models

- `xgb_pipeline.joblib`: `CalibratedClassifierCV`
- `rf_pipeline.joblib`: `CalibratedClassifierCV`
- `svm_pipeline.joblib`: `CalibratedClassifierCV`

### Practical interpretation

- Crop and fertilizer predictions are using pre-trained numeric pipelines
- Probability outputs are available because calibrated models are being used
- The fertilizer app’s numeric category encoding is consistent with the current deployed model setup

## 5. Honest conclusions

### Strong side

The crop dataset is in very good shape for a student project:

- no nulls
- no duplicates
- balanced target classes
- direct alignment with the live crop input fields

### Weak side

The fertilizer dataset is the main limitation:

- very small sample size
- fewer classes
- class imbalance at the low end

So if someone asks which module is more trustworthy from a dataset perspective, the honest answer is:

- **crop recommendation is better supported by data**
- **fertilizer recommendation is functional, but backed by a much smaller dataset**

## 6. What can be said in viva or report

You can truthfully say:

> The datasets used in the project were audited for missing values, duplicates, class balance, and alignment with the deployed model inputs. The crop dataset was found to be clean and perfectly balanced across 22 classes, while the fertilizer dataset was clean but significantly smaller, with only 99 samples across 7 fertilizer categories. During the audit, one live validation mismatch was identified in the crop phosphorous range and corrected so that the deployed backend better reflects the training data boundaries.

