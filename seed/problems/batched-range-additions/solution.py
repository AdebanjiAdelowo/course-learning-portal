def apply_updates(length, updates):
    difference = [0] * (length + 1)
    for left, right, value in updates:
        difference[left] += value
        difference[right] -= value
    answer = []
    running = 0
    for i in range(length):
        running += difference[i]
        answer.append(running)
    return answer
