def question(prompt):
    i = 0
    while i < 2:
        answer = input(prompt)
        if any(answer.lower() == f for f in ["yes", 'y']):
            return True
        elif any(answer.lower() == f for f in ['no', 'n']):
            return False
        else:
            i += 1
            if i < 2:
                print('Please enter yes or no')
            else:
                return False

def prompt(prompt):
    state = question(prompt)
    return state

def fileLinesToSet(filename):
    # Dict that will contain keys and values
    results=set()
    with open(filename, "r") as f:
        for line in f:
            results.add(line.rstrip())
        return results