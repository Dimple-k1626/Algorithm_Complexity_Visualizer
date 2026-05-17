import random

def generate_test_data(algorithm, size, case_type):
    """
    Returns (array, target)
    target is None for sorting algorithms.
    """
    if algorithm in ['linear', 'binary']:
        # For searching, array needs to be sorted for binary search
        arr = list(range(1, size + 1))
        
        if case_type == 'best':
            target = arr[0] if algorithm == 'linear' else arr[size // 2]
        elif case_type == 'worst':
            target = size + 1  # Element not present
        else:  # average
            target = arr[random.randint(0, size - 1)]
            
        return arr, target
        
    else:
        # Sorting algorithms
        if case_type == 'best':
            if algorithm == 'bubble':
                return list(range(1, size + 1)), None
            else:
                arr = list(range(1, size + 1))
                random.shuffle(arr)
                return arr, None
                
        elif case_type == 'worst':
            if algorithm == 'bubble':
                return list(range(size, 0, -1)), None
            elif algorithm == 'quick':
                # Sorted array is worst case for naive quicksort (pivot=last)
                return list(range(1, size + 1)), None
            elif algorithm == 'merge':
                # Reverse sorted is a common proxy for worst-ish case in typical usage
                return list(range(size, 0, -1)), None
            else:
                return list(range(size, 0, -1)), None
                
        else:  # average
            arr = list(range(1, size + 1))
            random.shuffle(arr)
            return arr, None
