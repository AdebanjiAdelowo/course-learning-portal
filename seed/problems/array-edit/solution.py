def array_edit(items, operation, index, value):
    answer = list(items)
    if operation == 'insert':
        answer.append(None)
        for i in range(len(answer) - 1, index, -1):
            answer[i] = answer[i - 1]
        answer[index] = value
    else:
        for i in range(index, len(answer) - 1):
            answer[i] = answer[i + 1]
        answer.pop()
    return answer
