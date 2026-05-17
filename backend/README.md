# Algorithm Complexity Visualizer - Backend

This is the Flask backend for the Algorithm Complexity Visualizer. It provides an API to generate test data, execute searching/sorting algorithms, and measure their empirical execution time.

## Requirements
- Python 3.8+

## Setup Instructions

1. **Create a virtual environment (optional but recommended)**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the Server**
   ```bash
   python app.py
   ```
   The server will start on `http://127.0.0.1:5000`.

## API Reference

### `POST /run`
Executes an algorithm and returns the execution time in milliseconds.

**Request Body:**
```json
{
  "algorithm": "bubble", // "linear", "binary", "bubble", "merge", "quick"
  "size": 1000,          // Positive integer
  "case": "worst"        // "best", "worst", "average"
}
```

**Response:**
```json
{
  "algorithm": "bubble",
  "n": 1000,
  "case": "worst",
  "time": 12.34
}
```
