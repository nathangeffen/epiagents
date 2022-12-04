import random


def createAgents(S, I, R=0):
    return ['S'] * S + ['I'] * I + ['R'] * R


def StoI(agents, beta):
    N = len(agents)
    S = len([a for a in agents if a == 'S'])
    I = len([a for a in agents if a == 'I'])
    risk = (S * I * beta / N) / S
    for i in range(len(agents)):
        if agents[i] == 'S' and random.random() < risk:
            agents[i] = 'I'


def ItoR(agents, delta):
    for i in range(len(agents)):
        if agents[i] == 'I' and random.random() < delta:
            agents[i] = 'R'


def calcCompartments(agents):
    S = len([a for a in agents if a == 'S'])
    I = len([a for a in agents if a == 'I'])
    R = len([a for a in agents if a == 'R'])
    return (S, I, R)


def iterate(agents, beta, delta, iterations=100, output=True):
    for i in range(iterations):
        StoI(agents, beta)
        ItoR(agents, delta)
        if output:
            print(i, calcCompartments(agents))


def sim(S, I, R=0, beta=0.2, delta=0.1, iterations=100, output=True):
    agents = createAgents(S, I, R)
    iterate(agents, beta, delta, iterations, output)
    return calcCompartments(agents)


def multisim(S, I, R=0, beta=0.2, delta=0.1, iterations=100, output=True,
             sims=100):
    results = []
    for i in range(sims):
        results.append(sim(S, I, R, beta, delta, iterations, output))
    return results


def SIR(S, I_, R=0, beta=0.2, delta=0.1, iterations=100, output=True):
    results = []
    for i in range(iterations):
        lambda_ = beta * I_
        S_I = S * lambda_
        I_R = I_ * delta
        print("S_I", lambda_, S_I)
        S -= S_I
        I_ += S_I - I_R
        R += I_R
        results.append((S, I_, R))
        if output:
            print(i, S, I_, R)
    return results
