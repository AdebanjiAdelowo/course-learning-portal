def prefix_totals(items):
    answer = [0]
    for value in items:
        answer.append(answer[-1] + value)
    return answer
