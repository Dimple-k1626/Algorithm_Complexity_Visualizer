import time
import math
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

from algorithms.search import linear_search, binary_search
from algorithms.sort import bubble_sort, merge_sort, quick_sort
from utils.generator import generate_test_data
from utils.pdf_report import generate_pdf

app = Flask(__name__)
# Enable CORS so the React frontend can make requests
CORS(app)

# Limit O(n^2) algorithms to prevent server hang
MAX_O_N_SQUARED_SIZE = 10000

ALGORITHMS = {
    'linear': linear_search,
    'binary': binary_search,
    'bubble': bubble_sort,
    'merge': merge_sort,
    'quick': quick_sort
}

@app.route('/run', methods=['POST'])
def run_algorithm():
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Invalid JSON format'}), 400
        
    algo_name = data.get('algorithm')
    size = data.get('size')
    case_type = data.get('case') # best, worst, average
    
    if algo_name not in ALGORITHMS:
        return jsonify({'error': f'Algorithm {algo_name} not supported'}), 400
        
    if not isinstance(size, int) or size <= 0:
        return jsonify({'error': 'Size must be a positive integer'}), 400
        
    if case_type not in ['best', 'worst', 'average']:
        return jsonify({'error': 'Case must be best, worst, or average'}), 400

    # Safety checks
    if algo_name == 'bubble' and size > MAX_O_N_SQUARED_SIZE:
        return jsonify({
            'error': f'Input size too large for {algo_name} sort. Maximum allowed is {MAX_O_N_SQUARED_SIZE}.'
        }), 400
        
    if algo_name == 'quick' and case_type == 'worst' and size > MAX_O_N_SQUARED_SIZE:
        return jsonify({
            'error': f'Input size too large for quick sort (worst case). Maximum allowed is {MAX_O_N_SQUARED_SIZE}.'
        }), 400

    arr, target = generate_test_data(algo_name, size, case_type)
    func = ALGORITHMS[algo_name]
    
    start_time = time.perf_counter()
    if algo_name in ['linear', 'binary']:
        func(arr, target)
    else:
        func(arr)
    end_time = time.perf_counter()
    
    time_ms = (end_time - start_time) * 1000
    
    return jsonify({
        'algorithm': algo_name,
        'n': size,
        'case': case_type,
        'time': time_ms
    })

@app.route('/explain', methods=['POST'])
def explain_algorithm():
    data = request.get_json()
    algo_name = data.get('algorithm')
    
    explanations = {
        'linear': {
            'time_complexity': 'O(n) - The time taken grows linearly with the number of elements.',
            'best_worst': 'Best case is O(1) when the target is the first element. Worst case is O(n) when the target is at the very end or not in the array.',
            'use_cases': 'Used for small, unsorted datasets or when memory space is severely limited.'
        },
        'binary': {
            'time_complexity': 'O(log n) - The search space is halved with each step.',
            'best_worst': 'Best case is O(1) when the middle element is the target. Worst case is O(log n) when the target is at the extremities or absent.',
            'use_cases': 'Used extensively in databases, finding elements in sorted arrays, and standard libraries.'
        },
        'bubble': {
            'time_complexity': 'O(n²) - Requires iterating through the array multiple times.',
            'best_worst': 'Best case is O(n) if the array is already sorted (with an early exit optimization). Worst case is O(n²) when the array is reverse sorted.',
            'use_cases': 'Rarely used in the real world due to inefficiency, but excellent for educational purposes to introduce sorting algorithms.'
        },
        'merge': {
            'time_complexity': 'O(n log n) - Consistently divides the array and merges them back in linear time.',
            'best_worst': 'It has the same O(n log n) complexity for best, average, and worst cases because it always divides the array completely before merging.',
            'use_cases': 'Standard in e-commerce sorting, external sorting (data too large for RAM), and Python\'s native sort uses its principles (Timsort).'
        },
        'quick': {
            'time_complexity': 'O(n log n) average, but degrades to O(n²) in the worst case.',
            'best_worst': 'Best/Average is O(n log n) when the pivot divides the array roughly in half. Worst case is O(n²) when the array is already sorted and the pivot is the largest/smallest element.',
            'use_cases': 'The default sorting algorithm in many languages (C, C++, Java for primitives) due to extremely fast average performance and cache-friendly in-place sorting.'
        }
    }
    
    if algo_name not in explanations:
        return jsonify({'error': 'Algorithm not found'}), 404
        
    return jsonify(explanations[algo_name])

@app.route('/guess_complexity', methods=['POST'])
def guess_complexity():
    data = request.get_json()
    results = data.get('results', [])
    if len(results) < 2:
        return jsonify({'guess': 'Requires at least 2 data points', 'confidence': '0%', 'ratio_analysis': ''})
        
    # Sort results by size
    results = sorted(results, key=lambda x: x['n'])
    
    # Use the largest two points for comparison to minimize early noise
    p1 = results[-2]
    p2 = results[-1]
    
    n1, t1 = p1['n'], max(p1['time'], 0.0001)
    n2, t2 = p2['n'], max(p2['time'], 0.0001)
    
    size_ratio = n2 / n1
    time_ratio = t2 / t1
    
    expected_o_1 = 1
    expected_o_logn = math.log2(n2) / math.log2(n1) if n1 > 1 else 1
    expected_o_n = size_ratio
    expected_o_nlogn = size_ratio * expected_o_logn
    expected_o_n2 = size_ratio ** 2
    
    diffs = {
        'O(1) Constant': abs(time_ratio - expected_o_1),
        'O(log n) Logarithmic': abs(time_ratio - expected_o_logn),
        'O(n) Linear': abs(time_ratio - expected_o_n),
        'O(n log n) Linearithmic': abs(time_ratio - expected_o_nlogn),
        'O(n²) Quadratic': abs(time_ratio - expected_o_n2)
    }
    
    best_guess = min(diffs, key=diffs.get)
    
    return jsonify({
        'guess': best_guess,
        'confidence': f"{(1 / (1 + diffs[best_guess])) * 100:.1f}%",
        'ratio_analysis': f"N grew {size_ratio:.1f}x. Time grew {time_ratio:.1f}x."
    })

@app.route('/report', methods=['POST'])
def create_report():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid JSON format'}), 400
        
    try:
        pdf_buffer = generate_pdf(data)
        return send_file(
            pdf_buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name='complexity_report.pdf'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
