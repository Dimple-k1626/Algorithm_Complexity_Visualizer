def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        swapped = False
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
        if not swapped:
            break
    return arr

def merge_sort(arr):
    if len(arr) > 1:
        mid = len(arr) // 2
        L = arr[:mid]
        R = arr[mid:]

        merge_sort(L)
        merge_sort(R)

        i = j = k = 0
        while i < len(L) and j < len(R):
            if L[i] <= R[j]:
                arr[k] = L[i]
                i += 1
            else:
                arr[k] = R[j]
                j += 1
            k += 1

        while i < len(L):
            arr[k] = L[i]
            i += 1
            k += 1

        while j < len(R):
            arr[k] = R[j]
            j += 1
            k += 1
    return arr

def quick_sort(arr):
    # Iterative implementation to prevent stack overflow on large inputs
    size = len(arr)
    if size <= 1:
        return arr
        
    stack = [0] * (size + 1)
    top = -1
    
    top += 1
    stack[top] = 0
    top += 1
    stack[top] = size - 1
    
    while top >= 0:
        high = stack[top]
        top -= 1
        low = stack[top]
        top -= 1
        
        p = _partition(arr, low, high)
        
        if p - 1 > low:
            top += 1
            stack[top] = low
            top += 1
            stack[top] = p - 1
            
        if p + 1 < high:
            top += 1
            stack[top] = p + 1
            top += 1
            stack[top] = high
            
    return arr

def _partition(arr, low, high):
    pivot = arr[high]
    i = low - 1
    for j in range(low, high):
        if arr[j] <= pivot:
            i += 1
            arr[i], arr[j] = arr[j], arr[i]
    arr[i + 1], arr[high] = arr[high], arr[i + 1]
    return i + 1
